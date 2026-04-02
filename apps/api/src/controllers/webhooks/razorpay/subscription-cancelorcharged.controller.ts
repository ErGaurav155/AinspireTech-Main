import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import ReplyLog from "@/models/insta/ReplyLog.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import User from "@/models/user.model";
import UserRateLimit from "@/models/Rate/UserRateLimit.model";
import { getCurrentWindow } from "@/services/rate-limit.service";

// Helper function to remove Instagram account from UserRateLimit tracking
const removeInstagramAccountFromRateLimit = async (
  clerkId: string,
  instagramAccountId: string,
): Promise<void> => {
  try {
    // Get current window
    const window = getCurrentWindow();

    await connectToDatabase();

    // Find user rate limit record for current window
    const userRateLimit = await UserRateLimit.findOne({
      clerkId,
      windowStart: window.start,
    });

    if (userRateLimit) {
      // Remove the account from accountUsage array
      const initialLength = userRateLimit.accountUsage.length;
      userRateLimit.accountUsage = userRateLimit.accountUsage.filter(
        (acc: any) => acc.instagramAccountId !== instagramAccountId,
      );

      // If account was removed, save the changes
      if (userRateLimit.accountUsage.length < initialLength) {
        await userRateLimit.save();
        console.log(
          `✅ Removed Instagram account ${instagramAccountId} from rate limit tracking for user ${clerkId}`,
        );
      } else {
        console.log(
          `ℹ️ Instagram account ${instagramAccountId} not found in rate limit tracking for user ${clerkId}`,
        );
      }
    }

    // Also clean up any old window records (optional, for cleanup)
    // Remove from all windows older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    twentyFourHoursAgo.setUTCMinutes(0, 0, 0);

    await UserRateLimit.updateMany(
      {
        clerkId,
        windowStart: { $lt: twentyFourHoursAgo },
        "accountUsage.instagramAccountId": instagramAccountId,
      },
      {
        $pull: {
          accountUsage: { instagramAccountId: instagramAccountId },
        },
      },
    );
  } catch (error) {
    console.error(
      "Error removing Instagram account from rate limit tracking:",
      error,
    );
  }
};

// Helper function to delete all related data for an Instagram account
async function deleteAllAccountRelatedData(accountId: string, userId: string) {
  // Get counts before deleting
  const templatesCount = await ReplyTemplate.countDocuments({
    accountId: accountId,
  });
  const logsCount = await ReplyLog.countDocuments({
    accountId: accountId,
  });
  const leadsCount = await InstaLeadCollection.countDocuments({
    accountId: accountId,
  });

  // Delete related templates
  await ReplyTemplate.deleteMany({
    accountId: accountId,
  });

  // Delete related reply logs
  await ReplyLog.deleteMany({
    accountId: accountId,
  });

  // Delete related leads
  await InstaLeadCollection.deleteMany({
    accountId: accountId,
  });

  console.log(
    `Deleted related data for account ${accountId}: templates=${templatesCount}, logs=${logsCount}, leads=${leadsCount}`,
  );

  return { templatesCount, logsCount, leadsCount };
}

// Helper function to handle Instagram account cleanup on subscription cancellation
async function handleInstaAccountLimit(userId: string) {
  try {
    // Find all active Instagram accounts for the user, sorted by creation date (oldest first)
    const userAccounts = await InstagramAccount.find({
      userId,
      isActive: true,
    }).sort({ createdAt: 1 }); // Sort by oldest first

    // If user has more than 1 account, delete all except the oldest one
    if (userAccounts.length > 1) {
      // Keep the oldest account (first in the sorted array)
      const accountToKeep = userAccounts[0];

      // Get accounts to delete (all except the oldest)
      const accountsToDelete = userAccounts.slice(1);

      for (const account of accountsToDelete) {
        // Delete all related data for each account
        const { templatesCount, logsCount, leadsCount } =
          await deleteAllAccountRelatedData(account.instagramId, userId);

        // Remove account from rate limit tracking
        await removeInstagramAccountFromRateLimit(userId, account.instagramId);

        // Delete the account
        await InstagramAccount.deleteOne({ _id: account._id, userId });

        console.log(
          `Deleted Instagram account ${account.instagramId} (${account.username}) for user ${userId}`,
        );
        console.log(
          `  - Templates deleted: ${templatesCount}`,
          `  - Logs deleted: ${logsCount}`,
          `  - Leads deleted: ${leadsCount}`,
        );
      }

      console.log(
        `Cleaned up ${accountsToDelete.length} Instagram accounts for user ${userId}, kept account: ${accountToKeep.instagramId} (${accountToKeep.username})`,
      );
    } else if (userAccounts.length === 1) {
      // User has exactly 1 account, keep it but still update user limits
      console.log(
        `User ${userId} has 1 Instagram account (${userAccounts[0].username}), keeping it active`,
      );
    } else {
      console.log(`User ${userId} has no Instagram accounts to clean up`);
    }

    // Update user's account limit to 1 (free plan limit)
    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: {
          accountLimit: 1,
          updatedAt: new Date(),
        },
      },
    );

    console.log(`Updated user ${userId} to free plan limits (accountLimit: 1)`);
  } catch (error) {
    console.error(
      `Error cleaning up Instagram accounts for user ${userId}:`,
      error,
    );
  }
}

// Helper function to handle subscription cancelled/expired/halted
async function handleSubscriptionEnded(subscriptionId: string) {
  // Try to update in InstaSubscription first
  let updatedSub = await InstaSubscription.findOneAndUpdate(
    { subscriptionId },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  // If it's an Instagram subscription, handle account cleanup
  if (updatedSub) {
    console.log(
      `Instagram subscription ${subscriptionId} ended for user ${updatedSub.clerkId}`,
    );
    await handleInstaAccountLimit(updatedSub.clerkId);
  } else {
    // If not found, try WebSubscription
    updatedSub = await WebSubscription.findOneAndUpdate(
      { subscriptionId },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    // For web subscriptions, just update the status without account cleanup
    if (updatedSub) {
      console.log(
        `Web subscription ${subscriptionId} ended for user ${updatedSub.clerkId}`,
      );
    } else {
      console.warn(`Subscription ${subscriptionId} not found in any model`);
    }
  }
}

// POST /api/razorpay/subscription-cancel - Handle Razorpay subscription webhooks
export const razorpaySubsCancelWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get raw body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    // Verify Razorpay signature
    const razorpaySignature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return res.status(500).json({
        success: false,
        error: "Webhook configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      console.error("Invalid Razorpay webhook signature");
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
        timestamp: new Date().toISOString(),
      });
    }

    const subscriptionId = body.payload?.subscription?.entity?.id;
    const event = body.event;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "No subscription ID found in webhook payload",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("Processing Razorpay webhook:", {
      event,
      subscriptionId,
      timestamp: new Date().toISOString(),
    });

    await connectToDatabase();

    // Handle subscription ended events (cancelled, halted, expired)
    // All have the same behavior - downgrade user to free plan
    if (
      event === "subscription.cancelled" ||
      event === "subscription.halted" ||
      event === "subscription.expired"
    ) {
      await handleSubscriptionEnded(subscriptionId);
    } else {
      console.log(`Unhandled Razorpay event: ${event}`);
      // Return 200 for unhandled events to avoid retries
      return res.status(200).json({
        success: true,
        data: {
          message: "Event received but not processed",
          event: event,
          subscriptionId,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Webhook processed successfully",
        event: event,
        subscriptionId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({
      success: false,
      error: "Webhook handler failed",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
