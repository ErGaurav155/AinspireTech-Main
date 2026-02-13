import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import { getAuth } from "@clerk/express";
import { getCurrentWindow, getUserTier } from "@/services/rate-limit.service";
import RateUserRateLimit from "@/models/Rate/UserRateLimit.model";

// Helper function to get Instagram user info
const getInstagramUser = async (accessToken: string, fields: string[]) => {
  const fieldsStr = fields.join(",");
  const url = `https://graph.instagram.com/v23.0/me?fields=${fieldsStr}&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching Instagram user:", error);
    throw error;
  }
};

// Helper function to add Instagram account to UserRateLimit tracking
const addInstagramAccountToRateLimit = async (
  clerkId: string,
  instagramAccountId: string,
  username?: string,
  profilePicture?: string,
): Promise<void> => {
  try {
    // Import our rate limit service

    // Get current window
    const window = getCurrentWindow();

    // Import UserRateLimit model
    await connectToDatabase();

    // Find or create user rate limit record for current window
    let userRateLimit = await RateUserRateLimit.findOne({
      clerkId,
      windowStart: window.start,
    });

    if (!userRateLimit) {
      // Get user tier
      const tier = await getUserTier(clerkId);
      const TIER_LIMITS = {
        free: 100,
        pro: 999999,
      } as const;

      // Create new record if doesn't exist
      userRateLimit = await RateUserRateLimit.create({
        clerkId,
        windowStart: window.start,
        totalCallsMade: 0,
        tier: tier,
        tierLimit: TIER_LIMITS[tier as keyof typeof TIER_LIMITS],
        isAutomationPaused: false,
        accountUsage: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Check if account already exists in accountUsage
    const accountIndex = userRateLimit.accountUsage.findIndex(
      (acc: any) => acc.instagramAccountId === instagramAccountId,
    );

    if (accountIndex === -1) {
      // Add new account to tracking
      userRateLimit.accountUsage.push({
        instagramAccountId,
        callsMade: 0,
        lastCallAt: new Date(),
        accountUsername: username,
        accountProfile: profilePicture,
      });

      await userRateLimit.save();
      console.log(
        `✅ Added Instagram account ${instagramAccountId} to rate limit tracking for user ${clerkId}`,
      );
    } else {
      console.log(
        `ℹ️ Instagram account ${instagramAccountId} already tracked for user ${clerkId}`,
      );
    }
  } catch (error) {
    console.error(
      "Error adding Instagram account to rate limit tracking:",
      error,
    );
  }
};

// GET /api/insta/callback - Handle Instagram OAuth callback
export const handleInstaCallbackController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const code = req.query.code as string;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "No authorization code received",
        timestamp: new Date().toISOString(),
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "No user ID received",
        timestamp: new Date().toISOString(),
      });
    }
    await connectToDatabase();

    // Note: For Clerk authentication in Express, you'll need to implement proper auth
    // For now, we'll trust the userId from query params
    const clerkId = userId as string;

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.INSTAGRAM_APP_ID!,
          client_secret: process.env.INSTAGRAM_APP_SECRET!,
          grant_type: "authorization_code",
          redirect_uri:
            process.env.INSTAGRAM_REDIRECT_URI ||
            "https://rocketreplai.com/insta/pricing",
          code: code as string,
        }),
      },
    );

    if (!tokenRes.ok) {
      throw new Error(`Instagram API error: ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData?.access_token) {
      throw new Error("Failed to obtain access token from Instagram");
    }

    const { access_token: shortLivedToken, user_id: instagramId } = tokenData;

    // Exchange for long-lived token
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.append("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.append(
      "client_secret",
      process.env.INSTAGRAM_APP_SECRET!,
    );
    longLivedUrl.searchParams.append("access_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    if (!longLivedRes.ok) {
      throw new Error(`Instagram API error: ${longLivedRes.statusText}`);
    }

    const longLivedData = await longLivedRes.json();
    if (!longLivedData?.access_token) {
      throw new Error("Failed to obtain long-lived token");
    }

    // Calculate expiration date
    const expiresIn = longLivedData.expires_in || 5184000; // Default 60 days if not provided
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get Instagram user info
    const user = await getInstagramUser(longLivedData.access_token, [
      "username",
      "id",
      "user_id",
      "profile_picture_url",
    ]);

    if (!user) {
      throw new Error("Failed to fetch Instagram user information");
    }

    // Check existing accounts and subscriptions
    const [existingAccounts, subscriptions] = await Promise.all([
      InstagramAccount.find({ userId: clerkId }),
      InstaSubscription.find({
        clerkId: clerkId,
        chatbotType: "Insta-Automation-Pro",
        status: "active",
      }),
    ]);

    // Determine account limit based on subscription
    let accountLimit = 1; // Default free plan limit

    if (subscriptions.length > 0) {
      const subscription = subscriptions[0];
      if (subscription.chatbotType === "Insta-Automation-Pro") {
        accountLimit = 3;
      }
    }

    // Check if user has reached account limit
    if (existingAccounts.length >= accountLimit) {
      return res.status(400).json({
        success: false,
        error: `You have reached the limit of ${accountLimit} Instagram account${
          accountLimit > 1 ? "s" : ""
        }. Please upgrade your plan to add more accounts.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if account already exists for this user
    const existingAccountWithUser = await InstagramAccount.findOne({
      userId: clerkId,
      instagramId: user.user_id,
    });

    if (existingAccountWithUser) {
      // Update existing account
      existingAccountWithUser.accessToken = longLivedData.access_token;
      existingAccountWithUser.lastActivity = new Date();
      existingAccountWithUser.tokenExpiresAt = expiresAt;
      existingAccountWithUser.isActive = true;

      await existingAccountWithUser.save();

      // Add this Instagram account to UserRateLimit for tracking
      await addInstagramAccountToRateLimit(
        clerkId,
        user.user_id,
        user.username,
        user.profile_picture_url,
      );

      return res.status(200).json({
        success: true,
        account: existingAccountWithUser,
        message: "Account updated successfully",
        timestamp: new Date().toISOString(),
      });
    }

    const existingAccount = await InstagramAccount.findOne({
      instagramId: user.user_id,
    });

    if (existingAccount) {
      return res.status(200).json({
        success: false,
        account: existingAccount,
        message: "Duplicate Account Found",
        timestamp: new Date().toISOString(),
      });
    }

    // Create new account
    const newAccount = await InstagramAccount.create({
      userId: clerkId,
      instagramId: user.user_id,
      userInstaId: user.id,
      username: user.username,
      profilePicture: user.profile_picture_url,
      accessToken: longLivedData.access_token,
      lastActivity: new Date(),
      accountReply: 0,
      isActive: true,
      tokenExpiresAt: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add this Instagram account to UserRateLimit for tracking
    await addInstagramAccountToRateLimit(
      clerkId,
      user.user_id,
      user.username,
      user.profile_picture_url,
    );

    return res.status(200).json({
      success: true,
      account: newAccount,
      message: "Account connected successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Instagram callback error:", error);

    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "Failed to process Instagram account connection",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};
