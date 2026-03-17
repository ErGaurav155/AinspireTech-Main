import { Request, Response } from "express";
import {
  createUser,
  getUserById,
  updatePhoneNumber,
  updateUserLimits,
  checkActiveSubscriptions,
  getAffiliateUser,
  checkAndPrepareScrape,
} from "../../services/user.service";
import { getAuth } from "@clerk/express";
import { redisHelpers } from "@/config/redis.config";
import {
  getCurrentWindow,
  getUserRateLimitStats,
} from "@/services/rate-limit.service";

// POST /api/user/create - Create a new user
export const createUserController = async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    if (!userData || !userData.clerkId) {
      return res.status(400).json({
        success: false,
        error: "User data with clerkId is required",
        timestamp: new Date().toISOString(),
      });
    }

    const newUser = await createUser(userData);

    return res.status(201).json({
      success: true,
      data: newUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create user",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/user/:userId - Get user by ID
export const getUserByIdController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await getUserById(userId);

    return res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);

    if (error.message.includes("User not found")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch user",
      timestamp: new Date().toISOString(),
    });
  }
};

// PUT /api/user/update-number - Update user phone number
export const updateUserNumberController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    const { newNumber } = req.body;

    if (!newNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number are required",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await updatePhoneNumber(userId, newNumber);

    return res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating user number:", error);

    if (error.message.includes("User not found")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update phone number",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/user/active-subscriptions - Check if user has active subscriptions
export const hasActiveSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }
    const result = await checkActiveSubscriptions(userId);

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        webCount: result.webSubscriptionIds.length,
        instaCount: result.instaSubscriptionIds.length,
        totalCount:
          result.webSubscriptionIds.length + result.instaSubscriptionIds.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking subscriptions:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to check subscriptions",
      timestamp: new Date().toISOString(),
    });
  }
};

// PUT /api/user/update-limits - Update user limits
export const updateUserLimitsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { replyLimit, accountLimit } = req.body;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate input
    if (replyLimit === undefined || accountLimit === undefined) {
      return res.status(400).json({
        success: false,
        error: "replyLimit and accountLimit are required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await updateUserLimits(userId, replyLimit, accountLimit);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to update user limits",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Invalidate Redis cache for user tier using helpers
      await redisHelpers.del(`user:tier:${userId}`);

      // Also clear any related cache
      await redisHelpers.del(`user:limits:${userId}`);

      // Clear rate limit cache

      const window = getCurrentWindow();
      await redisHelpers.del(`user:calls:${userId}:${window.key}`);

      console.log(`✅ Cleared Redis cache for user ${userId}`);
    } catch (redisError) {
      console.warn("⚠️ Could not clear Redis cache:", redisError);
      // Continue anyway - this is not critical
    }

    // Get updated user data with rate limit stats
    const updatedUser = await getUserById(userId);

    // Get rate limit stats (with fallback if Redis fails)
    let rateLimitStats = null;
    try {
      rateLimitStats = await getUserRateLimitStats(userId);
    } catch (statsError) {
      console.warn("⚠️ Could not get rate limit stats:", statsError);
      rateLimitStats = {
        tier: result.tier,
        tierLimit: result.tierLimit,
        callsMade: 0,
        remainingCalls: result.tierLimit,
        usagePercentage: 0,
        queuedItems: 0,
        nextReset: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        tier: result.tier,
        hourlyRateLimit: result.tierLimit,
        accountLimit,
        replyLimit,
        user: updatedUser,
        rateLimit: rateLimitStats,
        cacheCleared: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating user limits:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update user limits",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/user/affiliate/:userId - Get affiliate user
export const getAffiliateUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await getAffiliateUser(userId);

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching affiliate user:", error);

    if (error.message.includes("Affiliate user not found")) {
      return res.status(200).json({
        success: false,
        data: {
          message: "User Not Found",
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch affiliate user",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/user/check-scrape - Check and prepare for scraping
export const checkAndPrepareScrapeController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, url, chatbotId } = req.body;

    if (!userId || !url || !chatbotId) {
      return res.status(400).json({
        success: false,
        error: "userId, url, and chatbotId are required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await checkAndPrepareScrape({
      userId,
      url,
      chatbotId,
    });

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking scrape:", error);

    if (
      error.message.includes("Chatbot not found") ||
      error.message.includes("Missing required")
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to check scrape status",
      timestamp: new Date().toISOString(),
    });
  }
};
