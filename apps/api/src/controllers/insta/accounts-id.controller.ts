import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import ReplyLog from "@/models/insta/ReplyLog.model";
import UserRateLimit from "@/models/Rate/UserRateLimit.model";
import { getAuth } from "@clerk/express";
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

// GET /api/insta/accounts/:accountId - Get specific Instagram account
export const getInstaAccountByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const accountId = (req as any).accountId;
    await connectToDatabase();

    const account = await InstagramAccount.findById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get templates count
    const templatesCount = await ReplyTemplate.countDocuments({
      accountId: accountId,
      isActive: true,
    });

    const accountData = {
      _id: account._id,
      userId: account.userId,
      instagramId: account.instagramId,
      username: account.username,
      profilePicture: account.profilePicture,
      followersCount: account.followersCount,
      followingCount: account.followingCount,
      mediaCount: account.mediaCount,
      isActive: account.isActive,
      lastActivity: account.lastActivity,
      accountReply: account.accountReply,
      accountDMSent: account.accountDMSent,
      accountFollowCheck: account.accountFollowCheck,
      autoReplyEnabled: account.autoReplyEnabled,
      autoDMEnabled: account.autoDMEnabled,
      followCheckEnabled: account.followCheckEnabled,
      requireFollowForFreeUsers: account.requireFollowForFreeUsers,
      metaCallsThisHour: account.metaCallsThisHour,
      isMetaRateLimited: account.isMetaRateLimited,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      templatesCount,
    };

    return res.status(200).json({
      success: true,
      data: accountData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch account",
      timestamp: new Date().toISOString(),
    });
  }
};

// PUT /api/insta/accounts/:accountId - Update Instagram account
export const updateInstaAccountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const accountId = (req as any).accountId;
    const { userId } = getAuth(req);

    if (!accountId || !userId) {
      return res.status(404).json({
        success: false,
        error: "userId not found",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      isActive,
      autoReplyEnabled,
      autoDMEnabled,
      followCheckEnabled,
      requireFollowForFreeUsers,
      storyAutomationsEnabled, // New field
      trackDmUrlEnabled, // New field
    } = req.body;

    await connectToDatabase();

    // Build a dynamic update object with only provided fields
    const updateFields: any = {
      lastActivity: new Date(), // Always update lastActivity
    };

    // Only add fields to update object if they are provided in the request
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (autoReplyEnabled !== undefined)
      updateFields.autoReplyEnabled = autoReplyEnabled;
    if (autoDMEnabled !== undefined) updateFields.autoDMEnabled = autoDMEnabled;
    if (followCheckEnabled !== undefined)
      updateFields.followCheckEnabled = followCheckEnabled;
    if (requireFollowForFreeUsers !== undefined)
      updateFields.requireFollowForFreeUsers = requireFollowForFreeUsers;

    // New settings fields
    if (storyAutomationsEnabled !== undefined)
      updateFields.storyAutomationsEnabled = storyAutomationsEnabled;
    if (trackDmUrlEnabled !== undefined)
      updateFields.trackDmUrlEnabled = trackDmUrlEnabled;

    const account = await InstagramAccount.findByIdAndUpdate(
      accountId,
      updateFields,
      { new: true },
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        account: account,
        message: "Account updated successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating account:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update account",
      timestamp: new Date().toISOString(),
    });
  }
};

// DELETE /api/insta/accounts/:accountId - Delete Instagram account
export const deleteInstaAccountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { accountId } = req.params;
    if (!accountId || !userId) {
      return res.status(404).json({
        success: false,
        error: "AccountId not found",
        timestamp: new Date().toISOString(),
      });
    }
    await connectToDatabase();

    // First, get the account details before deleting
    const account = await InstagramAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Delete account from database
    const deletedAccount = await InstagramAccount.findByIdAndDelete(accountId);
    if (!deletedAccount) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Delete related templates
    await ReplyTemplate.deleteMany({
      accountId: accountId,
    });

    // Delete related reply logs
    await ReplyLog.deleteMany({
      accountId: accountId,
    });

    // Remove this Instagram account from UserRateLimit tracking
    await removeInstagramAccountFromRateLimit(userId, account.instagramId);

    return res.status(200).json({
      success: true,
      data: {
        deletedAccount: {
          _id: deletedAccount._id,
          instagramId: deletedAccount.instagramId,
          username: deletedAccount.username,
        },
        message: "Account deleted successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete account",
      timestamp: new Date().toISOString(),
    });
  }
};
