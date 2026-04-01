import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import ReplyLog from "@/models/insta/ReplyLog.model";
import LeadCollection from "@/models/insta/LeadCollection.model";
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

interface InstagramUserInfoResponse {
  id: string;
  username?: string;
  account_type?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  profile_picture_url?: string;
}

export interface InstagramAPIError {
  error?: {
    message: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
}

// GET /api/insta/accounts - Get detailed Instagram info for ALL accounts of a user
export const getAllInstaAccountsInfoController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { fields } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Find all Instagram accounts for this user
    const accounts = await InstagramAccount.find({
      userId: userId,
    }).sort({ createdAt: -1 });

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          accounts: [],
          totalAccounts: 0,
          summary: {
            totalAccounts: 0,
            activeAccounts: 0,
            totalFollowers: 0,
            totalMedia: 0,
            totalReplies: 0,
            totalDMsSent: 0,
            totalFollowChecks: 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Define default fields to fetch
    const fieldsArray = Array.isArray(fields)
      ? fields
      : [
          "id",
          "username",
          "account_type",
          "media_count",
          "followers_count",
          "follows_count",
          "profile_picture_url",
        ];

    const fieldsStr = fieldsArray.join(",");

    // Fetch Instagram data for all accounts in parallel
    const accountsPromises = accounts.map(async (account) => {
      try {
        if (!account.accessToken) {
          // Return account with DB data even if no token
          const templatesCount = await ReplyTemplate.countDocuments({
            accountId: account.instagramId,
          });

          const leadsCount = await LeadCollection.countDocuments({
            accountId: account.instagramId,
          });

          return {
            success: false,
            error: "Account not properly connected",
            instagramInfo: {
              id: account.instagramId,
              username: account.username,
              profile_picture_url: account.profilePicture,
            },
            accountInfo: {
              _id: account._id,
              instagramId: account.instagramId,
              userId: account.userId,
              username: account.username,
              profilePicture: account.profilePicture,
              isActive: account.isActive,
              autoReplyEnabled: account.autoReplyEnabled,
              autoDMEnabled: account.autoDMEnabled,
              followCheckEnabled: account.followCheckEnabled,
              storyAutomationsEnabled: account.storyAutomationsEnabled,
              trackDmUrlEnabled: account.trackDmUrlEnabled,
              requireFollowForFreeUsers: account.requireFollowForFreeUsers,
              metaCallsThisHour: account.metaCallsThisHour,
              isMetaRateLimited: account.isMetaRateLimited,
              tokenExpiresAt: account.tokenExpiresAt,
              createdAt: account.createdAt,
              updatedAt: account.updatedAt,
              lastActivity: account.lastActivity,
              // Statistics
              accountReply: account.accountReply || 0,
              accountDMSent: account.accountDMSent || 0,
              accountFollowCheck: account.accountFollowCheck || 0,
              followersCount: account.followersCount || 0,
              followingCount: account.followingCount || 0,
              mediaCount: account.mediaCount || 0,
              templatesCount,
              leadsCount,
            },
            rateLimitInfo: {
              metaCallsUsed: account.metaCallsThisHour,
              isMetaRateLimited: account.isMetaRateLimited,
              metaRateLimitResetAt: account.metaRateLimitResetAt,
            },
          };
        }

        const url = `https://graph.instagram.com/v23.0/${account.instagramId}?fields=${fieldsStr}&access_token=${account.accessToken}`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = (await response.json()) as InstagramAPIError;
          console.error(
            `Instagram API error for account ${account.instagramId}:`,
            errorData,
          );

          // Update account meta rate limit status if Instagram's API says we're limited
          if (errorData.error?.code === 4 || errorData.error?.code === 32) {
            await InstagramAccount.updateOne(
              { instagramId: account.instagramId },
              {
                isMetaRateLimited: true,
                metaRateLimitResetAt: new Date(Date.now() + 60 * 60 * 1000),
              },
            );
          }

          // Get counts for this account
          const templatesCount = await ReplyTemplate.countDocuments({
            accountId: account.instagramId,
          });

          const leadsCount = await LeadCollection.countDocuments({
            accountId: account.instagramId,
          });

          // Return account with DB data as fallback
          return {
            success: false,
            error:
              errorData.error?.message ||
              `Instagram API error: ${response.statusText}`,
            instagramInfo: {
              id: account.instagramId,
              username: account.username,
              profile_picture_url: account.profilePicture,
            },
            accountInfo: {
              _id: account._id,
              instagramId: account.instagramId,
              userId: account.userId,
              username: account.username,
              profilePicture: account.profilePicture,
              isActive: account.isActive,
              autoReplyEnabled: account.autoReplyEnabled,
              autoDMEnabled: account.autoDMEnabled,
              followCheckEnabled: account.followCheckEnabled,
              storyAutomationsEnabled: account.storyAutomationsEnabled,
              trackDmUrlEnabled: account.trackDmUrlEnabled,
              requireFollowForFreeUsers: account.requireFollowForFreeUsers,
              metaCallsThisHour: account.metaCallsThisHour,
              isMetaRateLimited: account.isMetaRateLimited,
              tokenExpiresAt: account.tokenExpiresAt,
              createdAt: account.createdAt,
              updatedAt: account.updatedAt,
              lastActivity: account.lastActivity,
              // Statistics
              accountReply: account.accountReply || 0,
              accountDMSent: account.accountDMSent || 0,
              accountFollowCheck: account.accountFollowCheck || 0,
              followersCount: account.followersCount || 0,
              followingCount: account.followingCount || 0,
              mediaCount: account.mediaCount || 0,
              templatesCount,
              leadsCount,
            },
            rateLimitInfo: {
              metaCallsUsed: account.metaCallsThisHour,
              isMetaRateLimited: account.isMetaRateLimited,
              metaRateLimitResetAt: account.metaRateLimitResetAt,
            },
          };
        }

        const data = (await response.json()) as InstagramUserInfoResponse;

        // Update account information in database with fresh data
        const updateData: any = {
          lastActivity: new Date(),
          lastMetaCallAt: new Date(),
          isMetaRateLimited: false, // Reset rate limit status on successful call
        };

        if (data.username && data.username !== account.username) {
          updateData.username = data.username;
        }

        if (data.profile_picture_url) {
          updateData.profilePicture = data.profile_picture_url;
        }

        if (data.followers_count !== undefined) {
          updateData.followersCount = data.followers_count;
        }

        if (data.follows_count !== undefined) {
          updateData.followingCount = data.follows_count;
        }

        if (data.media_count !== undefined) {
          updateData.mediaCount = data.media_count;
        }

        await InstagramAccount.updateOne(
          { instagramId: account.instagramId },
          updateData,
        );

        // Get counts for this account
        const templatesCount = await ReplyTemplate.countDocuments({
          accountId: account.instagramId,
        });

        const leadsCount = await LeadCollection.countDocuments({
          accountId: account.instagramId,
        });

        // Return combined data for this account
        return {
          success: true,
          instagramInfo: {
            id: data.id,
            username: data.username,
            account_type: data.account_type,
            media_count: data.media_count,
            followers_count: data.followers_count,
            follows_count: data.follows_count,
            profile_picture_url: data.profile_picture_url,
          },
          accountInfo: {
            _id: account._id,
            instagramId: account.instagramId,
            userId: account.userId,
            username: data.username || account.username,
            profilePicture: data.profile_picture_url || account.profilePicture,
            isActive: account.isActive,
            autoReplyEnabled: account.autoReplyEnabled,
            autoDMEnabled: account.autoDMEnabled,
            followCheckEnabled: account.followCheckEnabled,
            storyAutomationsEnabled: account.storyAutomationsEnabled,
            trackDmUrlEnabled: account.trackDmUrlEnabled,
            requireFollowForFreeUsers: account.requireFollowForFreeUsers,
            metaCallsThisHour: account.metaCallsThisHour,
            isMetaRateLimited: false,
            tokenExpiresAt: account.tokenExpiresAt,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            lastActivity: account.lastActivity,
            // Statistics
            accountReply: account.accountReply || 0,
            accountDMSent: account.accountDMSent || 0,
            accountFollowCheck: account.accountFollowCheck || 0,
            followersCount: data.followers_count || account.followersCount || 0,
            followingCount: data.follows_count || account.followingCount || 0,
            mediaCount: data.media_count || account.mediaCount || 0,
            templatesCount,
            leadsCount,
          },
          rateLimitInfo: {
            metaCallsUsed: account.metaCallsThisHour,
            isMetaRateLimited: false,
            metaRateLimitResetAt: account.metaRateLimitResetAt,
          },
        };
      } catch (error: any) {
        console.error(
          `Error processing account ${account.instagramId}:`,
          error,
        );

        // Get counts for this account
        const templatesCount = await ReplyTemplate.countDocuments({
          accountId: account.instagramId,
        });

        const leadsCount = await LeadCollection.countDocuments({
          accountId: account.instagramId,
        });

        // Return account with DB data as fallback
        return {
          success: false,
          error: error.message || "Failed to fetch Instagram data",
          instagramInfo: {
            id: account.instagramId,
            username: account.username,
            profile_picture_url: account.profilePicture,
          },
          accountInfo: {
            _id: account._id,
            instagramId: account.instagramId,
            userId: account.userId,
            username: account.username,
            profilePicture: account.profilePicture,
            isActive: account.isActive,
            autoReplyEnabled: account.autoReplyEnabled,
            autoDMEnabled: account.autoDMEnabled,
            followCheckEnabled: account.followCheckEnabled,
            storyAutomationsEnabled: account.storyAutomationsEnabled,
            trackDmUrlEnabled: account.trackDmUrlEnabled,
            requireFollowForFreeUsers: account.requireFollowForFreeUsers,
            metaCallsThisHour: account.metaCallsThisHour,
            isMetaRateLimited: account.isMetaRateLimited,
            tokenExpiresAt: account.tokenExpiresAt,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            lastActivity: account.lastActivity,
            // Statistics
            accountReply: account.accountReply || 0,
            accountDMSent: account.accountDMSent || 0,
            accountFollowCheck: account.accountFollowCheck || 0,
            followersCount: account.followersCount || 0,
            followingCount: account.followingCount || 0,
            mediaCount: account.mediaCount || 0,
            templatesCount,
            leadsCount,
          },
          rateLimitInfo: {
            metaCallsUsed: account.metaCallsThisHour,
            isMetaRateLimited: account.isMetaRateLimited,
            metaRateLimitResetAt: account.metaRateLimitResetAt,
          },
        };
      }
    });

    // Wait for all account data to be fetched
    const accountsData = await Promise.all(accountsPromises);

    // Calculate summary statistics
    const summary = {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.isActive).length,
      totalFollowers: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.followersCount || 0),
        0,
      ),
      totalMedia: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.mediaCount || 0),
        0,
      ),
      totalReplies: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.accountReply || 0),
        0,
      ),
      totalDMsSent: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.accountDMSent || 0),
        0,
      ),
      totalFollowChecks: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.accountFollowCheck || 0),
        0,
      ),
      totalTemplates: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.templatesCount || 0),
        0,
      ),
      totalLeads: accountsData.reduce(
        (sum, acc) => sum + (acc.accountInfo?.leadsCount || 0),
        0,
      ),
      accountsWithErrors: accountsData.filter((acc) => !acc.success).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        accounts: accountsData,
        summary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching all Instagram accounts info:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch Instagram accounts data",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/insta/accounts/:accountId - Get specific Instagram account
export const getInstaAccountByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { accountId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "accountId is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Find the Instagram account
    const account = await InstagramAccount.findOne({
      userId: userId,
      instagramId: accountId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Instagram account not found",
        timestamp: new Date().toISOString(),
      });
    }
    // Get counts for this account
    const templatesCount = await ReplyTemplate.countDocuments({
      accountId: accountId,
    });

    const leadsCount = await LeadCollection.countDocuments({
      accountId: accountId,
    });

    const logsCount = await ReplyLog.countDocuments({
      accountId: accountId,
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = await ReplyLog.find({
      accountId: accountId,
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    if (!account.accessToken) {
      return res.status(400).json({
        success: false,
        error: "Instagram account not properly connected",
        data: {
          accountInfo: {
            _id: account._id,
            instagramId: account.instagramId,
            userId: account.userId,
            username: account.username,
            profilePicture: account.profilePicture,
            isActive: account.isActive,
            autoReplyEnabled: account.autoReplyEnabled,
            autoDMEnabled: account.autoDMEnabled,
            followCheckEnabled: account.followCheckEnabled,
            storyAutomationsEnabled: account.storyAutomationsEnabled,
            trackDmUrlEnabled: account.trackDmUrlEnabled,
            requireFollowForFreeUsers: account.requireFollowForFreeUsers,
            // Statistics
            accountReply: account.accountReply || 0,
            accountDMSent: account.accountDMSent || 0,
            accountFollowCheck: account.accountFollowCheck || 0,
            followersCount: account.followersCount || 0,
            followingCount: account.followingCount || 0,
            mediaCount: account.mediaCount || 0,
            metaCallsThisHour: account.metaCallsThisHour,
            isMetaRateLimited: account.isMetaRateLimited,
            tokenExpiresAt: account.tokenExpiresAt,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            lastActivity: account.lastActivity,
            templatesCount,
            leadsCount,
            logsCount,
            recentActivity: recentLogs.map((log) => ({
              type: log.automationType,
              success: log.success,
              commenterUsername: log.commenterUsername,
              createdAt: log.createdAt,
              replyType: log.replyType,
            })),
          },
          rateLimitInfo: {
            metaCallsUsed: account.metaCallsThisHour,
            isMetaRateLimited: account.isMetaRateLimited,
            metaRateLimitResetAt: account.metaRateLimitResetAt,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // NO rate limiting for dashboard operations
    const fieldsArray = [
      "id",
      "username",
      "account_type",
      "media_count",
      "followers_count",
      "follows_count",
      "profile_picture_url",
    ];

    const fieldsStr = fieldsArray.join(",");
    const url = `https://graph.instagram.com/v23.0/${account.instagramId}?fields=${fieldsStr}&access_token=${account.accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = (await response.json()) as InstagramAPIError;
      console.error("Instagram API error:", errorData);

      // Update account meta rate limit status if Instagram's API says we're limited
      if (errorData.error?.code === 4 || errorData.error?.code === 32) {
        await InstagramAccount.updateOne(
          { instagramId: accountId },
          {
            isMetaRateLimited: true,
            metaRateLimitResetAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        );
      }

      return res.status(response.status).json({
        success: false,
        error:
          errorData.error?.message ||
          `Instagram API error: ${response.statusText}`,
        data: {
          accountInfo: {
            _id: account._id,
            instagramId: account.instagramId,
            userId: account.userId,
            username: account.username,
            profilePicture: account.profilePicture,
            isActive: account.isActive,
            autoReplyEnabled: account.autoReplyEnabled,
            autoDMEnabled: account.autoDMEnabled,
            followCheckEnabled: account.followCheckEnabled,
            storyAutomationsEnabled: account.storyAutomationsEnabled,
            trackDmUrlEnabled: account.trackDmUrlEnabled,
            requireFollowForFreeUsers: account.requireFollowForFreeUsers,
            // Statistics
            accountReply: account.accountReply || 0,
            accountDMSent: account.accountDMSent || 0,
            accountFollowCheck: account.accountFollowCheck || 0,
            followersCount: account.followersCount || 0,
            followingCount: account.followingCount || 0,
            mediaCount: account.mediaCount || 0,
            metaCallsThisHour: account.metaCallsThisHour,
            isMetaRateLimited: account.isMetaRateLimited,
            tokenExpiresAt: account.tokenExpiresAt,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            lastActivity: account.lastActivity,
            templatesCount,
            leadsCount,
            logsCount,
            recentActivity: recentLogs.map((log) => ({
              type: log.automationType,
              success: log.success,
              commenterUsername: log.commenterUsername,
              createdAt: log.createdAt,
              replyType: log.replyType,
            })),
          },
          rateLimitInfo: {
            metaCallsUsed: account.metaCallsThisHour,
            isMetaRateLimited: account.isMetaRateLimited,
            metaRateLimitResetAt: account.metaRateLimitResetAt,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    const data = (await response.json()) as InstagramUserInfoResponse;

    // Update account information in database if we got new data
    const updateData: any = {
      lastActivity: new Date(),
      lastMetaCallAt: new Date(),
    };

    if (data.username && data.username !== account.username) {
      updateData.username = data.username;
    }

    if (data.profile_picture_url) {
      updateData.profilePicture = data.profile_picture_url;
    }

    if (data.followers_count !== undefined) {
      updateData.followersCount = data.followers_count;
    }

    if (data.follows_count !== undefined) {
      updateData.followingCount = data.follows_count;
    }

    if (data.media_count !== undefined) {
      updateData.mediaCount = data.media_count;
    }

    await InstagramAccount.updateOne({ instagramId: accountId }, updateData);

    // Format response with complete account info
    const formattedData = {
      instagramInfo: {
        id: data.id,
        username: data.username,
        account_type: data.account_type,
        media_count: data.media_count,
        followers_count: data.followers_count,
        follows_count: data.follows_count,
        profile_picture_url: data.profile_picture_url,
      },
      accountInfo: {
        _id: account._id,
        instagramId: account.instagramId,
        userId: account.userId,
        username: data.username || account.username,
        profilePicture: data.profile_picture_url || account.profilePicture,
        isActive: account.isActive,
        autoReplyEnabled: account.autoReplyEnabled,
        autoDMEnabled: account.autoDMEnabled,
        followCheckEnabled: account.followCheckEnabled,
        storyAutomationsEnabled: account.storyAutomationsEnabled,
        trackDmUrlEnabled: account.trackDmUrlEnabled,
        requireFollowForFreeUsers: account.requireFollowForFreeUsers,
        // Statistics
        accountReply: account.accountReply || 0,
        accountDMSent: account.accountDMSent || 0,
        accountFollowCheck: account.accountFollowCheck || 0,
        followersCount: data.followers_count || account.followersCount || 0,
        followingCount: data.follows_count || account.followingCount || 0,
        mediaCount: data.media_count || account.mediaCount || 0,
        metaCallsThisHour: account.metaCallsThisHour,
        isMetaRateLimited: false,
        tokenExpiresAt: account.tokenExpiresAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        lastActivity: account.lastActivity,
        templatesCount,
        leadsCount,
        logsCount,
        recentActivity: recentLogs.map((log) => ({
          id: log._id,
          type: log.automationType,
          success: log.success,
          commenterUsername: log.commenterUsername,
          commentText: log.commentText,
          replyText: log.replyText,
          replyType: log.replyType,
          dmFlowStage: log.dmFlowStage,
          createdAt: log.createdAt,
        })),
      },
      rateLimitInfo: {
        metaCallsUsed: account.metaCallsThisHour,
        isMetaRateLimited: account.isMetaRateLimited,
        metaRateLimitResetAt: account.metaRateLimitResetAt,
      },
    };

    return res.status(200).json({
      success: true,
      data: formattedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Instagram user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch Instagram user data",
      details: error.message,
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
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      isActive,
      autoReplyEnabled,
      autoDMEnabled,
      followCheckEnabled,
      requireFollowForFreeUsers,
      storyAutomationsEnabled,
      trackDmUrlEnabled,
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
    if (storyAutomationsEnabled !== undefined)
      updateFields.storyAutomationsEnabled = storyAutomationsEnabled;
    if (trackDmUrlEnabled !== undefined)
      updateFields.trackDmUrlEnabled = trackDmUrlEnabled;

    const account = await InstagramAccount.findOneAndUpdate(
      { instagramId: accountId },
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

    // Get counts after update
    const templatesCount = await ReplyTemplate.countDocuments({
      accountId: accountId,
    });

    const leadsCount = await LeadCollection.countDocuments({
      accountId: accountId,
    });

    return res.status(200).json({
      success: true,
      data: {
        account: {
          _id: account._id,
          instagramId: account.instagramId,
          username: account.username,
          profilePicture: account.profilePicture,
          isActive: account.isActive,
          autoReplyEnabled: account.autoReplyEnabled,
          autoDMEnabled: account.autoDMEnabled,
          followCheckEnabled: account.followCheckEnabled,
          storyAutomationsEnabled: account.storyAutomationsEnabled,
          trackDmUrlEnabled: account.trackDmUrlEnabled,
          requireFollowForFreeUsers: account.requireFollowForFreeUsers,
          accountReply: account.accountReply || 0,
          accountDMSent: account.accountDMSent || 0,
          accountFollowCheck: account.accountFollowCheck || 0,
          followersCount: account.followersCount || 0,
          followingCount: account.followingCount || 0,
          mediaCount: account.mediaCount || 0,
          templatesCount,
          leadsCount,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
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
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { accountId } = req.params;
    if (!accountId) {
      return res.status(404).json({
        success: false,
        error: "AccountId not found",
        timestamp: new Date().toISOString(),
      });
    }
    await connectToDatabase();

    // First, get the account details before deleting
    const account = await InstagramAccount.findOne({
      userId: userId,
      instagramId: accountId,
    });
    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Delete account from database
    const deletedAccount = await InstagramAccount.findOneAndDelete({
      instagramId: accountId,
    });
    if (!deletedAccount) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get counts before deleting related data
    const templatesCount = await ReplyTemplate.countDocuments({
      accountId: accountId,
    });
    const logsCount = await ReplyLog.countDocuments({
      accountId: accountId,
    });
    const leadsCount = await LeadCollection.countDocuments({
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
    await LeadCollection.deleteMany({
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
          profilePicture: deletedAccount.profilePicture,
          followersCount: deletedAccount.followersCount || 0,
          accountReply: deletedAccount.accountReply || 0,
          accountDMSent: deletedAccount.accountDMSent || 0,
          accountFollowCheck: deletedAccount.accountFollowCheck || 0,
          templatesDeleted: templatesCount,
          logsDeleted: logsCount,
          leadsDeleted: leadsCount,
        },
        message: "Account and all related data deleted successfully",
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
