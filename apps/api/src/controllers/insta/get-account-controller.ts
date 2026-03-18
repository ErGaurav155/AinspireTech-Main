import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { getAuth } from "@clerk/express";

// Helper function to get Instagram user media count
const getInstagramUserMediaCount = async (
  accessToken: string,
  instagramId: string,
): Promise<number> => {
  try {
    const url = `https://graph.instagram.com/v23.0/${instagramId}/media?fields=id&access_token=${accessToken}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`);
    }

    const data = await response.json();

    // If we have paging with next, we could paginate to get exact count
    // But for efficiency, we'll just return 0 as Instagram Basic API doesn't provide total count
    return 0;
  } catch (error) {
    console.error("Error fetching Instagram media count:", error);
    return 0;
  }
};

// Helper function to get Instagram user info including followers count (for Business accounts)
const getInstagramUserInfo = async (
  accessToken: string,
  instagramId: string,
): Promise<{
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  profilePicture?: string;
  username?: string;
}> => {
  try {
    // Try with Instagram Graph API (for Business/Creator accounts)
    // This requires the instagram_business_accounts permission
    const url = `https://graph.facebook.com/v23.0/${instagramId}?fields=followers_count,follows_count,media_count,profile_picture_url,username&access_token=${accessToken}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return {
        followersCount: data.followers_count,
        followingCount: data.follows_count,
        mediaCount: data.media_count,
        profilePicture: data.profile_picture_url,
        username: data.username,
      };
    }

    // If that fails, try with Instagram Basic Display API
    const basicUrl = `https://graph.instagram.com/v23.0/me?fields=id,username,profile_picture_url&access_token=${accessToken}`;
    const basicResponse = await fetch(basicUrl);

    if (basicResponse.ok) {
      const data = await basicResponse.json();
      return {
        followersCount: 0, // Basic API doesn't provide this
        followingCount: 0, // Basic API doesn't provide this
        mediaCount: 0, // Basic API doesn't provide this
        profilePicture: data.profile_picture_url,
        username: data.username,
      };
    }

    return {};
  } catch (error) {
    console.error("Error fetching Instagram user info:", error);
    return {};
  }
};

// GET /api/insta/getAccount - Get Instagram accounts with fresh data
export const getUserInstaAccountController = async (
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

    const accounts = await InstagramAccount.find({ userId: userId }).sort({
      createdAt: -1,
    });

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({
        success: true,
        error: "No Instagram accounts found",
        data: { accounts: [] },
        timestamp: new Date().toISOString(),
      });
    }

    // For each account, try to fetch fresh data from Instagram API
    // But do it in parallel for better performance
    const updatedAccounts = await Promise.all(
      accounts.map(async (account) => {
        try {
          // Try to fetch fresh data from Instagram
          const freshData = await getInstagramUserInfo(
            account.accessToken,
            account.instagramId,
          );

          // Update the account with fresh data if available
          if (Object.keys(freshData).length > 0) {
            // Only update if we got new data
            if (freshData.followersCount !== undefined) {
              account.followersCount = freshData.followersCount;
            }
            if (freshData.followingCount !== undefined) {
              account.followingCount = freshData.followingCount;
            }
            if (freshData.mediaCount !== undefined) {
              account.mediaCount = freshData.mediaCount;
            }
            if (freshData.profilePicture) {
              account.profilePicture = freshData.profilePicture;
            }
            if (freshData.username) {
              account.username = freshData.username;
            }

            // Save the updated account
            await account.save();
          }
        } catch (error) {
          console.error(
            `Failed to fetch fresh data for account ${account.instagramId}:`,
            error,
          );
          // Continue with existing data from DB
        }

        // Return the account (either updated or original)
        return {
          instagramId: account.instagramId,
          username: account.username,
          profilePicture: account.profilePicture,
          followersCount: account.followersCount || 0,
          followingCount: account.followingCount || 0,
          mediaCount: account.mediaCount || 0,
          isActive: account.isActive,
          autoReplyEnabled: account.autoReplyEnabled,
          autoDMEnabled: account.autoDMEnabled,
          followCheckEnabled: account.followCheckEnabled,
          accountReply: account.accountReply || 0,
          accountDMSent: account.accountDMSent || 0,
          accountFollowCheck: account.accountFollowCheck || 0,
          lastActivity: account.lastActivity,
          tokenExpiresAt: account.tokenExpiresAt,
          isMetaRateLimited: account.isMetaRateLimited,
          createdAt: account.createdAt,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: {
        accounts: updatedAccounts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Instagram accounts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch Instagram accounts",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
