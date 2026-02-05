import { connectToDatabase } from "../config/database.config";
import Affiliate from "../models/affiliate/Affiliate";
import AffiReferral from "../models/affiliate/Referral";
import InstagramAccount from "../models/insta/InstagramAccount.model";
import InstaSubscription from "../models/insta/InstaSubscription.model";
import InstaReplyLog from "../models/insta/ReplyLog.model";
import InstaReplyTemplate from "../models/insta/ReplyTemplate.model";
import RateLimitQueue from "../models/Rate/RateLimitQueue.model";
import RateUserRateLimit from "../models/Rate/UserRateLimit.model";
import WebAppointmentQuestions from "../models/web/AppointmentQuestions.model";
import WebConversation from "../models/web/Conversation.model";
import WebSubscription from "../models/web/Websubcription.model";
import WebChatbot from "../models/web/WebChatbot.model";
import { getCurrentWindow } from "./rate-limit.service";
import { getRazorpay } from "@/utils/util";
import User from "@/models/user.model";
import { TIER_LIMITS } from "@ainspiretech/shared";
import { getRedisClient, redisHelpers } from "@/config/redis.config";

// Types
export interface CreateUserParams {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tier?: string;
}

export interface UpdateUserParams {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tier?: string;
  replyLimit?: number;
  accountLimit?: number;
}

export interface CheckScrapeInput {
  userId: string;
  url: string;
  chatbotId: string;
}

export interface SubscriptionCheckResult {
  webSubscriptionIds: string[];
  instaSubscriptionIds: string[];
}

export interface UserLimitsUpdateResult {
  success: boolean;
  tier?: string;
  tierLimit?: number;
  accountLimit?: number;
  replyLimit?: number;
  error?: string;
}

// CREATE
export async function createUser(user: CreateUserParams) {
  await connectToDatabase();
  const newUser = await User.create(user);
  return newUser;
}

// READ
export async function getUserById(userId: string) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  await connectToDatabase();
  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getUserByEmail(email: string) {
  await connectToDatabase();
  return await User.findOne({ email });
}

// UPDATE
export async function updateUser(clerkId: string, updates: UpdateUserParams) {
  await connectToDatabase();

  const updatedUser = await User.findOneAndUpdate({ clerkId }, updates, {
    new: true,
  });

  if (!updatedUser) {
    throw new Error("User update failed");
  }

  return updatedUser;
}

export async function updatePhoneNumber(userId: string, phone: string) {
  await connectToDatabase();

  const user = await User.findOneAndUpdate(
    { userId },
    { phone },
    { new: true },
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function updateUserLimits(
  userId: string,
  replyLimit: number,
  accountLimit: number,
): Promise<UserLimitsUpdateResult> {
  try {
    await connectToDatabase();

    // Determine tier based on account limit
    let tier: "free" | "pro" = "free";
    let tierLimit = TIER_LIMITS.free; // Default to free tier limit

    if (accountLimit === 3) {
      tier = "pro";
      tierLimit = TIER_LIMITS.pro; // 999999 for unlimited
    } else {
      tier = "free";
      tierLimit = TIER_LIMITS.free;
    }

    // Validate reply limit based on tier
    if (tier === "free" && replyLimit > 100) {
      return {
        success: false,
        error: "Free users cannot have reply limit above 100",
      };
    }

    // Update User model
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        replyLimit: Math.max(0, replyLimit),
        accountLimit: Math.max(1, accountLimit),
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    if (!updatedUser) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Update all active windows for this user
    const { start: currentWindowStart } = getCurrentWindow();

    // Update UserRateLimit for current window
    await RateUserRateLimit.findOneAndUpdate(
      { clerkId: userId, windowStart: currentWindowStart },
      {
        $set: {
          tier,
          tierLimit,
          isAutomationPaused: false,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Update all future windows if tier changed
    // This ensures consistency across window boundaries
    await RateUserRateLimit.updateMany(
      {
        clerkId: userId,
        windowStart: { $gt: currentWindowStart },
      },
      {
        $set: {
          tier,
          tierLimit,
          updatedAt: new Date(),
        },
      },
    );

    // Update Instagram account settings based on tier
    if (tier === "free") {
      // For free users, disable follow verification for existing accounts
      await InstagramAccount.updateMany(
        { userId },
        {
          requireFollowForFreeUsers: false,
          updatedAt: new Date(),
        },
      );
    }

    try {
      // Clear Redis cache for user tier using helpers
      await redisHelpers.del(`user:tier:${userId}`);

      // Clear user calls cache for current window
      const userKey = `user:calls:${userId}:${currentWindowStart.toISOString()}`;
      await redisHelpers.del(userKey);
    } catch (redisError) {
      console.warn("Could not clear Redis cache:", redisError);
      // Continue anyway
    }

    // Log the limit update
    console.log(`📊 User ${userId} limits updated:`, {
      tier,
      tierLimit,
      replyLimit,
      accountLimit,
      updatedAt: new Date(),
    });

    return {
      success: true,
      tier,
      tierLimit,
      accountLimit,
      replyLimit,
    };
  } catch (error: any) {
    console.error("Error updating user limits:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}
// DELETE
export async function deleteUserData(clerkId: string) {
  await connectToDatabase();

  // Check for active subscriptions
  const { webSubscriptionIds, instaSubscriptionIds } =
    await checkActiveSubscriptions(clerkId);
  const subscriptionIds = [...webSubscriptionIds, ...instaSubscriptionIds];

  // Cancel all subscriptions
  if (subscriptionIds.length > 0) {
    const razorpay = getRazorpay();
    await Promise.all(
      subscriptionIds.map(async (id) => {
        try {
          await razorpay.subscriptions.cancel(id, false);
        } catch (error) {
          console.error(`Failed to cancel subscription ${id}:`, error);
        }
      }),
    );
  }

  // Data deletion promises
  const deletionPromises = [
    // Web-related data
    WebSubscription.deleteMany({ clerkId }),
    WebConversation.deleteMany({ clerkId }),
    WebAppointmentQuestions.deleteMany({ clerkId }),
    // Instagram-related data
    InstaReplyTemplate.deleteMany({ userId: clerkId }),
    InstaReplyLog.deleteMany({ userId: clerkId }),
    InstaSubscription.deleteMany({ clerkId }),
    InstagramAccount.deleteMany({ userId: clerkId }),
    RateLimitQueue.deleteMany({ clerkId }),
    RateUserRateLimit.deleteMany({ clerkId }),
    // Affiliate Data
    Affiliate.deleteMany({ userId: clerkId }),
    AffiReferral.deleteMany({ referredUserId: clerkId }),
    AffiReferral.deleteMany({ affiliateUserId: clerkId }),
    // User
    User.deleteOne({ clerkId }),
  ];

  const results = await Promise.allSettled(deletionPromises);

  const failedDeletions = results.filter(
    (result) => result.status === "rejected",
  );

  if (failedDeletions.length > 0) {
    throw new Error(
      `Failed to delete ${failedDeletions.length} data collections`,
    );
  }

  return { success: true, message: "All user data cleaned up successfully" };
}

// HELPER METHODS
export async function checkActiveSubscriptions(
  clerkId: string,
): Promise<SubscriptionCheckResult> {
  await connectToDatabase();

  const [webSubscriptions, instaSubscriptions] = await Promise.all([
    WebSubscription.find({ clerkId, status: "active" }),
    InstaSubscription.find({ clerkId, status: "active" }),
  ]);

  return {
    webSubscriptionIds: webSubscriptions.map((sub) => sub.subscriptionId),
    instaSubscriptionIds: instaSubscriptions.map((sub) => sub.subscriptionId),
  };
}

export async function resetFreeRepliesForAllUsers(): Promise<number> {
  await connectToDatabase();

  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  let processedCount = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await User.updateMany(
      {
        updatedAt: { $lte: twentyEightDaysAgo },
      },
      {
        $set: {
          totalReplies: 0,
          updatedAt: new Date(),
        },
      },
    ).limit(batchSize);

    processedCount += result.modifiedCount;

    if (result.modifiedCount < batchSize) {
      hasMore = false;
    }

    console.log(`Processed batch: ${result.modifiedCount} users`);
  }

  console.log(`Total free coupons reset for ${processedCount} users`);
  return processedCount;
}

export async function getAffiliateUser(userId: string) {
  await connectToDatabase();

  const user = await Affiliate.findOne({ userId });

  if (!user) {
    throw new Error("Affiliate user not found");
  }

  return user;
}

export async function checkAndPrepareScrape({
  userId,
  url,
  chatbotId,
}: CheckScrapeInput) {
  if (!url || !chatbotId) {
    throw new Error("Missing required inputs");
  }

  await connectToDatabase();

  const chatbot = await WebChatbot.findOne({
    _id: chatbotId,
    clerkId: userId,
  });

  if (!chatbot) {
    throw new Error("Chatbot not found or unauthorized");
  }

  // ✅ Already scraped
  if (chatbot.isScrapped) {
    return {
      alreadyScrapped: true,
      message: "Website already scraped, skipping process",
      data: {
        fileName: chatbot.scrappedFile || "",
        domain: new URL(chatbot.websiteUrl).hostname,
        userId,
        chatbotId,
        totalPages: 0,
        maxLevel: 0,
        scrapedPages: [],
      },
    };
  }

  // 🚀 Ready to scrape
  return {
    alreadyScrapped: false,
    message: "Ready to start scraping",
    data: {
      domain: new URL(url).hostname,
      userId,
      chatbotId,
    },
  };
}
