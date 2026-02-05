import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import User from "@/models/user.model";

// Helper function to handle Instagram account cleanup
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

      // Get IDs of accounts to delete (all except the oldest)
      const accountsToDelete = userAccounts
        .slice(1)
        .map((account) => account._id);

      // Delete the accounts
      const deleteResult = await InstagramAccount.deleteMany({
        _id: { $in: accountsToDelete },
        userId,
      });

      console.log(
        `Cleaned up ${deleteResult.deletedCount} Instagram accounts for user ${userId}, kept account: ${accountToKeep._id}`,
      );
    }

    // Update user's account limit to 1 (free plan limit)
    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: {
          accountLimit: 1,
          totalReplies: 0,
          replyLimit: 500,
          updatedAt: new Date(),
        },
      },
    );

    console.log(`Updated user ${userId} to free plan limits`);
  } catch (error) {
    console.error(
      `Error cleaning up Instagram accounts for user ${userId}:`,
      error,
    );
  }
}

// Helper function to handle cancellation
async function handleSubscriptionCancelled(subscriptionId: string) {
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
      `Instagram subscription ${subscriptionId} cancelled for user ${updatedSub.clerkId}`,
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
        `Web subscription ${subscriptionId} cancelled for user ${updatedSub.clerkId}`,
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

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "No subscription ID found in webhook payload",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("Processing Razorpay webhook:", {
      event: body.event,
      subscriptionId,
      timestamp: new Date().toISOString(),
    });
    await connectToDatabase();

    // Handle different webhook events
    switch (body.event) {
      case "subscription.cancelled":
      case "subscription.halted":
        await handleSubscriptionCancelled(subscriptionId);
        break;
      default:
        console.log(`Unhandled Razorpay event: ${body.event}`);
        return res.status(400).json({
          success: false,
          error: "Unhandled event type",
          timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Webhook processed successfully",
        event: body.event,
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
