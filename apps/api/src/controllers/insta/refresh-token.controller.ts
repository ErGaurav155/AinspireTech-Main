import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { getAuth } from "@clerk/express";

/**
 * POST /api/insta/refresh-token - Refresh Instagram token
 *
 * This is a DASHBOARD operation (user-initiated)
 * NO rate limiting, NO queueing - just refresh and return
 */
export const refreshInstagramTokenController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { accountId } = req.params;

    if (!userId || !accountId) {
      return res.status(400).json({
        success: false,
        error: "UserId and AccountId is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Find account by instagramId (accountId parameter is the instagramId)
    const account = await InstagramAccount.findOne({
      userId: userId,
      instagramId: accountId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Instagram account not found for this user",
        timestamp: new Date().toISOString(),
      });
    }

    if (!account.accessToken) {
      return res.status(400).json({
        success: false,
        error: "No access token found for this account",
        timestamp: new Date().toISOString(),
      });
    }

    // Refresh if token expires in less than 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (account.tokenExpiresAt && account.tokenExpiresAt > sevenDaysFromNow) {
      return res.status(200).json({
        success: true,
        data: {
          message: "Token is still valid (expires in more than 7 days)",
          account: {
            _id: account._id,
            instagramId: account.instagramId,
            username: account.username,
            tokenExpiresAt: account.tokenExpiresAt,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // NO rate limiting for dashboard operations
    // This is a user-initiated request, not an incoming webhook
    // Just refresh the token directly

    // Optional: Simple throttling to prevent abuse (refresh max once per minute)
    if (account.lastMetaCallAt) {
      const timeSinceLastRefresh =
        now.getTime() - account.lastMetaCallAt.getTime();
      const oneMinute = 60 * 1000;

      if (timeSinceLastRefresh < oneMinute) {
        return res.status(429).json({
          success: false,
          error: "Please wait a moment before refreshing again",
          retryAfter: Math.ceil((oneMinute - timeSinceLastRefresh) / 1000),
          timestamp: new Date().toISOString(),
        });
      }
    }

    const refreshUrl = new URL(
      "https://graph.instagram.com/refresh_access_token",
    );
    refreshUrl.searchParams.append("grant_type", "ig_refresh_token");
    refreshUrl.searchParams.append("access_token", account.accessToken);

    const refreshRes = await fetch(refreshUrl.toString());

    if (!refreshRes.ok) {
      const errorData = await refreshRes.json();
      console.error("Instagram token refresh error:", errorData);

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

      return res.status(refreshRes.status).json({
        success: false,
        error: errorData.error?.message || "Failed to refresh token",
        timestamp: new Date().toISOString(),
      });
    }

    const refreshData = await refreshRes.json();

    if (!refreshData.access_token) {
      return res.status(500).json({
        success: false,
        error: "Failed to refresh token - no access token in response",
        timestamp: new Date().toISOString(),
      });
    }

    const expiresIn = refreshData.expires_in || 5184000; // Default 60 days
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    const updatedAccount = await InstagramAccount.findOneAndUpdate(
      { userId: userId, instagramId: accountId },
      {
        accessToken: refreshData.access_token,
        lastActivity: new Date(),
        lastMetaCallAt: new Date(),
        tokenExpiresAt: tokenExpiresAt,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedAccount) {
      return res.status(500).json({
        success: false,
        error: "Failed to update account after token refresh",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Token refreshed successfully",
        account: {
          _id: updatedAccount._id,
          instagramId: updatedAccount.instagramId,
          username: updatedAccount.username,
          tokenExpiresAt: updatedAccount.tokenExpiresAt,
          lastActivity: updatedAccount.lastActivity,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error refreshing Instagram token:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to refresh Instagram token",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
