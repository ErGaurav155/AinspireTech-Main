import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { getAuth } from "@clerk/express";
import { recordCall } from "@/services/rate-limit.service";

// GET /api/insta/user-info - Get Instagram user info
export const getInstaUserInfoController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { accountId, fields } = req.body;

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

    if (!account.accessToken) {
      return res.status(400).json({
        success: false,
        error: "Instagram account not properly connected",
        timestamp: new Date().toISOString(),
      });
    }

    // Record Meta API call for rate limiting
    try {
      await recordCall(userId, account.instagramId, "meta_api_user_info", 1, {
        stage: "user_info_fetch",
        isFollowCheck: false,
      });
    } catch (rateLimitError) {
      console.log("Rate limit check for user info:", rateLimitError);
      return res.status(429).json({
        success: false,
        error: "Rate limited, please try again later",
        timestamp: new Date().toISOString(),
      });
    }

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
    const url = `https://graph.instagram.com/v23.0/me?fields=${fieldsStr}&access_token=${account.accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Instagram API error:", errorData);

      // Update account meta rate limit status if needed
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
        timestamp: new Date().toISOString(),
      });
    }

    const data = await response.json();

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

    // Format response with account info
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
        isActive: account.isActive,
        autoReplyEnabled: account.autoReplyEnabled,
        autoDMEnabled: account.autoDMEnabled,
        followCheckEnabled: account.followCheckEnabled,
        requireFollowForFreeUsers: account.requireFollowForFreeUsers,
        metaCallsThisHour: account.metaCallsThisHour,
        isMetaRateLimited: account.isMetaRateLimited,
        tokenExpiresAt: account.tokenExpiresAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      rateLimitInfo: {
        metaCallsUsed: account.metaCallsThisHour,
        metaCallsRemaining: Math.max(0, 200 - account.metaCallsThisHour),
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
