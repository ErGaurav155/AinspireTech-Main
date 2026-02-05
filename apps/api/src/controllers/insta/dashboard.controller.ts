import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyLog from "@/models/insta/ReplyLog.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import UserRateLimit from "@/models/Rate/UserRateLimit.model";
import User from "@/models/user.model";
import { getAuth } from "@clerk/express";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import { getCurrentWindow, getUserTier } from "@/services/rate-limit.service";
import { redisHelpers } from "@/config/redis.config"; // Updated import

// GET /api/insta/dashboard - Get Instagram dashboard stats
export const getInstaDashboardController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Get user data from User model
    const userData = await User.findOne({ clerkId: userId });
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get all accounts with enhanced data
    const accounts = await InstagramAccount.find({ userId: userId }).sort({
      createdAt: -1,
    });

    if (accounts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          accounts: [],
          totalReplies: 0,
          accountLimit: userData.accountLimit || 1,
          replyLimit: userData.replyLimit || 100,
          totalAccounts: 0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Get current window rate limit data
    const window = getCurrentWindow(); // Remove await - it's not async

    const rateLimitData = await UserRateLimit.findOne({
      clerkId: userId,
      windowStart: window.start,
    });

    // Create a map for quick lookup of callsMade by instagramAccountId
    const accountCallsMap = new Map<string, number>();
    if (rateLimitData && rateLimitData.accountUsage) {
      rateLimitData.accountUsage.forEach((accountUsage: any) => {
        accountCallsMap.set(
          accountUsage.instagramAccountId,
          accountUsage.callsMade || 0,
        );
      });
    }

    // Get user tier
    const userTier = await getUserTier(userId);

    // Get subscription data
    const subscription = await InstaSubscription.findOne({
      clerkId: userId,
      chatbotType: "Insta-Automation-Pro",
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    const enhancedAccounts = await Promise.all(
      accounts.map(async (account) => {
        // Get template count (using instagramId as accountId in ReplyTemplate model)
        const templatesCount = await ReplyTemplate.countDocuments({
          accountId: account.instagramId,
          isActive: true,
        });

        // Get reply count (callsMade) from rate limit data or calculate from logs
        let replyCount = accountCallsMap.get(account.instagramId) || 0;

        // If not found in rate limit data, calculate from reply logs as fallback
        if (replyCount === 0) {
          replyCount = await ReplyLog.countDocuments({
            accountId: account.instagramId,
            success: true,
          });
        }

        // Get average response time
        const avgResTimeResult = await ReplyLog.aggregate([
          {
            $match: {
              accountId: account.instagramId,
              success: true,
              responseTime: { $exists: true, $gt: 0 },
            },
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: "$responseTime" },
            },
          },
        ]);

        const avgResponseTime = avgResTimeResult[0]?.avgResponseTime || 0;

        return {
          _id: account._id,
          userId: account.userId,
          instagramId: account.instagramId,
          userInstaId: account.userInstaId,
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
          tokenExpiresAt: account.tokenExpiresAt,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          templatesCount,
          replyCount,
          avgResponseTime: Math.round(avgResponseTime),
          callsMade: accountCallsMap.get(account.instagramId) || 0,
        };
      }),
    );

    // Get tier limits
    const TIER_LIMITS = {
      free: 100,
      pro: 999999,
    } as const;

    const tierLimit = TIER_LIMITS[userTier as keyof typeof TIER_LIMITS] || 100;

    // Get current hour calls from Redis - UPDATED
    try {
      const userKey = `user:calls:${userId}:${window.key}`;
      const currentHourCallsStr = await redisHelpers.get(userKey);
      const currentHourCalls = parseInt(currentHourCallsStr || "0");

      return res.status(200).json({
        success: true,
        data: {
          accounts: enhancedAccounts,
          totalReplies: currentHourCalls,
          accountLimit: userData.accountLimit || 1,
          replyLimit: tierLimit,
          totalAccounts: accounts.length,
          userTier: userTier,
          subscriptionActive: !!subscription,
          subscriptionPlan: subscription?.plan || "Free",
          callsRemaining: Math.max(0, tierLimit - currentHourCalls),
          callsUsed: currentHourCalls,
          usagePercentage:
            tierLimit > 0 ? (currentHourCalls / tierLimit) * 100 : 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (redisError) {
      console.warn("Redis not available, using database fallback:", redisError);

      // Fallback: Calculate from rate limit data
      const totalCallsMade = rateLimitData?.totalCallsMade || 0;

      return res.status(200).json({
        success: true,
        data: {
          accounts: enhancedAccounts,
          totalReplies: totalCallsMade,
          accountLimit: userData.accountLimit || 1,
          replyLimit: tierLimit,
          totalAccounts: accounts.length,
          userTier: userTier,
          subscriptionActive: !!subscription,
          subscriptionPlan: subscription?.plan || "Free",
          callsRemaining: Math.max(0, tierLimit - totalCallsMade),
          callsUsed: totalCallsMade,
          usagePercentage:
            tierLimit > 0 ? (totalCallsMade / tierLimit) * 100 : 0,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard stats",
      timestamp: new Date().toISOString(),
    });
  }
};
