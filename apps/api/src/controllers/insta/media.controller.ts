import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import { getAuth } from "@clerk/express";
import { recordCall } from "@/services/rate-limit.service";

// GET /api/insta/media - Get Instagram media for account
export const getInstaMediaController = async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const accountId = req.query.accountId as string;
    const { userId } = getAuth(req);

    if (!accountId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Account ID and User ID are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the account to get access token and Instagram ID
    const account = await InstagramAccount.findOne({
      instagramId: accountId,
      userId: userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        timestamp: new Date().toISOString(),
      });
    }

    if (!account.accessToken || !account.instagramId) {
      return res.status(400).json({
        success: false,
        error: "Instagram account not properly connected",
        timestamp: new Date().toISOString(),
      });
    }

    // Record Meta API call for rate limiting
    try {
      await recordCall(userId, account.instagramId, "meta_api_media_fetch", 1, {
        stage: "media_fetch",
        isFollowCheck: false,
      });
    } catch (rateLimitError) {
      console.log("Rate limit check for media fetch:", rateLimitError);
    }

    // Fetch media from Instagram Graph API
    const accessToken = account.accessToken;
    const igUserId = account.instagramId;

    // First, get the user's media with extended fields
    const mediaResponse = await fetch(
      `https://graph.instagram.com/v23.0/${igUserId}/media?fields=id,media_type,media_url,permalink,thumbnail_url,timestamp,caption,like_count,comments_count&limit=10&access_token=${accessToken}`,
    );

    if (!mediaResponse.ok) {
      const errorData = await mediaResponse.json();
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

      return res.status(mediaResponse.status).json({
        success: false,
        error:
          errorData.error?.message || "Failed to fetch media from Instagram",
        timestamp: new Date().toISOString(),
      });
    }

    const mediaData = await mediaResponse.json();

    // Update account last activity
    await InstagramAccount.updateOne(
      { instagramId: accountId },
      {
        lastActivity: new Date(),
        lastMetaCallAt: new Date(),
      },
    );

    // Format the media data for our application
    const formattedMedia = mediaData.data.map((item: any) => ({
      id: item.id,
      media_type: item.media_type,
      media_url:
        item.media_type === "VIDEO"
          ? item.thumbnail_url || item.media_url
          : item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
      caption: item.caption || "",
      likes: item.like_count || 0,
      comments: item.comments_count || 0,
    }));

    // Get all existing templates for this account to filter out media that already has templates
    const existingTemplates = await ReplyTemplate.find({
      userId: userId,
      accountId: account.instagramId, // Using instagramId as accountId (matching your ReplyTemplate model)
    }).select("mediaId");

    // Extract media IDs that already have templates
    const mediaIdsWithTemplates = existingTemplates
      .map((template) => template.mediaId)
      .filter(Boolean);

    // Filter out media that already has templates
    const filteredMedia = formattedMedia.filter(
      (media: any) => !mediaIdsWithTemplates.includes(media.id),
    );

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        media: filteredMedia,
        count: filteredMedia.length,
        hasMore: mediaData.paging?.next ? true : false,
        accountInfo: {
          username: account.username,
          followersCount: account.followersCount,
          mediaCount: account.mediaCount,
          metaCallsThisHour: account.metaCallsThisHour,
          isMetaRateLimited: account.isMetaRateLimited,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Instagram media:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch media",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};
