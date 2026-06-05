// apps/api/services/token.service.ts
import { connectToDatabase } from "@/config/database.config";
import TokenBalance from "@/models/web/token/TokenBalance.model";
import TokenUsage from "@/models/web/token/TokenUsage.model";
import WebSubscription from "@/models/web/Websubcription.model";
import { sendWebTokenExhaustedEmailToUser } from "@/services/sendEmail.service";

export const SUBSCRIPTION_TOKEN_ALLOWANCE = 2000000;

// Get user's token balance
export async function getUserTokenBalance(userId: string) {
  await connectToDatabase();

  const tokenBalance = await TokenBalance.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        freeTokens: 10000,
        subscriptionTokens: new Map(),
        usedFreeTokens: 0,
        usedSubscriptionTokens: new Map(),
        totalTokensUsed: 0,
        lastResetAt: new Date(),
        nextResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    { new: true, upsert: true },
  );

  // Ensure Maps are properly initialized (MongoDB may return plain objects)
  if (!(tokenBalance.subscriptionTokens instanceof Map)) {
    tokenBalance.subscriptionTokens = new Map(
      Object.entries(tokenBalance.subscriptionTokens || {}),
    );
  }
  if (!(tokenBalance.usedSubscriptionTokens instanceof Map)) {
    tokenBalance.usedSubscriptionTokens = new Map(
      Object.entries(tokenBalance.usedSubscriptionTokens || {}),
    );
  }

  return tokenBalance;
}

// Initialize subscription tokens for a chatbot.
export async function initializeSubscriptionTokens(
  userId: string,
  chatbotId: string,
) {
  await connectToDatabase();

  const tokenBalance = await getUserTokenBalance(userId);

  // Ensure Maps are properly initialized
  if (!(tokenBalance.subscriptionTokens instanceof Map)) {
    tokenBalance.subscriptionTokens = new Map(
      Object.entries(tokenBalance.subscriptionTokens || {}),
    );
  }
  if (!(tokenBalance.usedSubscriptionTokens instanceof Map)) {
    tokenBalance.usedSubscriptionTokens = new Map(
      Object.entries(tokenBalance.usedSubscriptionTokens || {}),
    );
  }

  tokenBalance.subscriptionTokens.set(chatbotId, SUBSCRIPTION_TOKEN_ALLOWANCE);

  // A new paid subscription or billing-cycle switch should restore the
  // chatbot's included token allowance.
  tokenBalance.usedSubscriptionTokens.set(chatbotId, 0);

  await tokenBalance.save();
  return tokenBalance;
}

// Helper function to get available tokens for a specific chatbot
export function getAvailableTokensForChatbot(
  tokenBalance: any,
  chatbotId?: string,
) {
  const freeAvailable = Math.max(
    0,
    tokenBalance.freeTokens - tokenBalance.usedFreeTokens,
  );

  let subscriptionAvailable = 0;
  if (
    chatbotId &&
    tokenBalance.subscriptionTokens &&
    tokenBalance.subscriptionTokens.get(chatbotId)
  ) {
    const totalSubscription = tokenBalance.subscriptionTokens.get(chatbotId);
    const usedSubscription =
      tokenBalance.usedSubscriptionTokens?.get(chatbotId) || 0;
    subscriptionAvailable = Math.max(0, totalSubscription - usedSubscription);
  }

  return freeAvailable + subscriptionAvailable;
}

// Helper function to get free tokens remaining
export function getFreeTokensRemaining(tokenBalance: any) {
  return Math.max(0, tokenBalance.freeTokens - tokenBalance.usedFreeTokens);
}

// Helper function to get subscription tokens remaining for a chatbot
export function getSubscriptionTokensRemaining(
  tokenBalance: any,
  chatbotId: string,
) {
  if (
    !tokenBalance.subscriptionTokens ||
    !tokenBalance.subscriptionTokens.get(chatbotId)
  ) {
    return 0;
  }
  const total = tokenBalance.subscriptionTokens.get(chatbotId);
  const used = tokenBalance.usedSubscriptionTokens?.get(chatbotId) || 0;
  return Math.max(0, total - used);
}

// Helper function to deduct tokens from balance
async function deductTokensFromBalance(
  tokenBalance: any,
  tokens: number,
  chatbotId?: string,
) {
  let remainingTokens = tokens;

  // First use free tokens
  const freeRemaining = getFreeTokensRemaining(tokenBalance);
  if (freeRemaining > 0) {
    const freeToUse = Math.min(freeRemaining, remainingTokens);
    tokenBalance.usedFreeTokens += freeToUse;
    remainingTokens -= freeToUse;
  }

  // Then use subscription tokens if chatbotId is provided
  if (remainingTokens > 0 && chatbotId) {
    const subscriptionRemaining = getSubscriptionTokensRemaining(
      tokenBalance,
      chatbotId,
    );
    if (subscriptionRemaining >= remainingTokens) {
      // Ensure Map is properly initialized
      if (!(tokenBalance.usedSubscriptionTokens instanceof Map)) {
        tokenBalance.usedSubscriptionTokens = new Map(
          Object.entries(tokenBalance.usedSubscriptionTokens || {}),
        );
      }
      const currentUsed =
        tokenBalance.usedSubscriptionTokens.get(chatbotId) || 0;
      tokenBalance.usedSubscriptionTokens.set(
        chatbotId,
        currentUsed + remainingTokens,
      );
      remainingTokens = 0;
    }
  }

  if (remainingTokens > 0) {
    throw new Error("Insufficient tokens");
  }

  tokenBalance.totalTokensUsed += tokens;
  await tokenBalance.save();
}

// Check if user has enough tokens for a specific chatbot
export async function hasSufficientTokens(
  userId: string,
  requiredTokens: number,
  chatbotId?: string,
) {
  const tokenBalance = await getUserTokenBalance(userId);
  const availableTokens = getAvailableTokensForChatbot(tokenBalance, chatbotId);
  return availableTokens >= requiredTokens;
}

// Use tokens
export async function usedTokens(
  userId: string,
  tokens: number,
  chatbotId?: string,
  totalCost: number = 0,
) {
  await connectToDatabase();

  const tokenBalance = await getUserTokenBalance(userId);

  if (!tokenBalance) {
    throw new Error("Token balance not found");
  }

  const availableTokens = getAvailableTokensForChatbot(tokenBalance, chatbotId);

  if (availableTokens < tokens) {
    const activeSubscriptions = await WebSubscription.countDocuments({
      clerkId: userId,
      status: "active",
    });

    if (activeSubscriptions === 0 && getFreeTokensRemaining(tokenBalance) === 0) {
      try {
        await sendWebTokenExhaustedEmailToUser({
          userId,
          chatbotType: chatbotId,
          nextResetAt: tokenBalance.nextResetAt,
        });
      } catch (error) {
        console.error("Failed to send web token exhausted email:", error);
      }
    }

    throw new Error("Insufficient tokens");
  }

  // Deduct tokens from balance
  await deductTokensFromBalance(tokenBalance, tokens, chatbotId);

  const activeSubscriptions = await WebSubscription.countDocuments({
    clerkId: userId,
    status: "active",
  });

  if (activeSubscriptions === 0 && getFreeTokensRemaining(tokenBalance) === 0) {
    try {
      await sendWebTokenExhaustedEmailToUser({
        userId,
        chatbotType: chatbotId,
        nextResetAt: tokenBalance.nextResetAt,
      });
    } catch (error) {
      console.error("Failed to send web token exhausted email:", error);
    }
  }

  // Record token usage
  const tokenUsage = await TokenUsage.create({
    userId,
    chatbotId: chatbotId || "unknown",
    tokensUsed: tokens,
    totalCost,
    timestamp: new Date(),
  });

  return {
    success: true,
    tokenUsage,
    remainingTokens: getAvailableTokensForChatbot(tokenBalance, chatbotId),
    freeTokensRemaining: getFreeTokensRemaining(tokenBalance),
    subscriptionTokensRemaining: chatbotId
      ? getSubscriptionTokensRemaining(tokenBalance, chatbotId)
      : 0,
  };
}

// Get token usage statistics
export async function getTokenUsageStats(
  userId: string,
  period: "day" | "week" | "month" | "year" = "month",
) {
  await connectToDatabase();

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "day":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const [usageByChatbot, dailyUsage, totalUsage] = await Promise.all([
    // Usage by chatbot
    TokenUsage.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$chatbotId",
          totalTokens: { $sum: "$tokensUsed" },
          count: { $sum: 1 },
          totalCost: { $sum: "$totalCost" },
        },
      },
      { $sort: { totalTokens: -1 } },
    ]),

    // Daily usage
    TokenUsage.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalTokens: { $sum: "$tokensUsed" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Total usage
    TokenUsage.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$tokensUsed" },
          totalCost: { $sum: "$totalCost" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const tokenBalance = await getUserTokenBalance(userId);

  // Get subscription info
  const subscriptions = await WebSubscription.find({
    clerkId: userId,
    status: "active",
  }).select("chatbotType chatbotName");

  const subscriptionTokens: Record<string, any> = {};
  subscriptions.forEach((sub) => {
    subscriptionTokens[sub.chatbotType] = {
      name: sub.chatbotName,
      tokens: SUBSCRIPTION_TOKEN_ALLOWANCE,
      used: tokenBalance.usedSubscriptionTokens.get(sub.chatbotType) || 0,
    };
  });

  return {
    period,
    startDate,
    endDate: now,
    usageByChatbot,
    dailyUsage,
    totalUsage: totalUsage[0] || { totalTokens: 0, totalCost: 0, count: 0 },
    currentBalance: {
      total:
        getFreeTokensRemaining(tokenBalance) +
        Object.values(subscriptionTokens).reduce(
          (sum: number, sub: any) => sum + Math.max(0, sub.tokens - sub.used),
          0,
        ),
      free: getFreeTokensRemaining(tokenBalance),
      subscription: subscriptionTokens,
    },
    limits: {
      freeTokens: tokenBalance.freeTokens,
      usedFreeTokens: tokenBalance.usedFreeTokens,
      subscriptionTokens,
    },
  };
}

// Reset free tokens (monthly)
export async function resetFreeTokens(userId: string) {
  await connectToDatabase();

  const tokenBalance = await getUserTokenBalance(userId);

  if (!tokenBalance) {
    throw new Error("Token balance not found");
  }

  // Reset free tokens regardless of date (for cron job)
  tokenBalance.freeTokens = 10000;
  tokenBalance.usedFreeTokens = 0;
  tokenBalance.lastResetAt = new Date();
  tokenBalance.nextResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await tokenBalance.save();

  return {
    success: true,
    message: "Free tokens reset successfully",
    newFreeTokens: tokenBalance.freeTokens,
    nextReset: tokenBalance.nextResetAt,
  };
}

// Reset subscription tokens monthly for all chatbots
export async function resetSubscriptionTokens(userId: string) {
  await connectToDatabase();

  const tokenBalance = await TokenBalance.findOne({ userId });

  if (!tokenBalance) {
    throw new Error("Token balance not found");
  }

  // Ensure Maps are properly initialized
  if (!(tokenBalance.usedSubscriptionTokens instanceof Map)) {
    tokenBalance.usedSubscriptionTokens = new Map(
      Object.entries(tokenBalance.usedSubscriptionTokens || {}),
    );
  }

  // Get active subscriptions
  const subscriptions = await WebSubscription.find({
    clerkId: userId,
    status: "active",
  }).select("chatbotType");

  // Reset subscription tokens for active chatbots
  subscriptions.forEach((sub) => {
    const chatbotId = sub.chatbotType;
    if (tokenBalance.usedSubscriptionTokens.has(chatbotId)) {
      tokenBalance.usedSubscriptionTokens.set(chatbotId, 0);
    }
  });

  await tokenBalance.save();

  return {
    success: true,
    message: "Subscription tokens reset successfully",
    resetChatbots: subscriptions.map((sub) => sub.chatbotType),
  };
}

// Get token usage by chatbot
export async function getChatbotTokenUsage(userId: string, chatbotId: string) {
  await connectToDatabase();

  const usage = await TokenUsage.aggregate([
    {
      $match: {
        userId,
        chatbotId,
      },
    },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: "$tokensUsed" },
        totalCost: { $sum: "$totalCost" },
        count: { $sum: 1 },
        lastUsed: { $max: "$timestamp" },
      },
    },
  ]);

  return usage[0] || { totalTokens: 0, totalCost: 0, count: 0, lastUsed: null };
}

// Check if user needs low token alert
export async function checkLowTokenAlert(userId: string) {
  const tokenBalance = await getUserTokenBalance(userId);

  // Get active subscriptions
  const subscriptions = await WebSubscription.find({
    clerkId: userId,
    status: "active",
  }).select("chatbotType");

  let totalAvailable = getFreeTokensRemaining(tokenBalance);

  // Add subscription tokens
  subscriptions.forEach((sub) => {
    const chatbotId = sub.chatbotType;
    const totalTokens = SUBSCRIPTION_TOKEN_ALLOWANCE;
    const usedTokens = tokenBalance.usedSubscriptionTokens.get(chatbotId) || 0;
    const remainingTokens = Math.max(0, totalTokens - usedTokens);
    totalAvailable += remainingTokens;
  });

  // Alert when less than 1000 tokens remaining
  return totalAvailable <= 1000;
}

// Get token balance summary
export async function getTokenBalanceSummary(userId: string) {
  const tokenBalance = await getUserTokenBalance(userId);

  // Get active subscriptions
  const subscriptions = await WebSubscription.find({
    clerkId: userId,
    status: "active",
  }).select("chatbotType chatbotName");

  const subscriptionTokens: Record<string, any> = {};
  subscriptions.forEach((sub) => {
    const chatbotId = sub.chatbotType;
    const totalTokens = SUBSCRIPTION_TOKEN_ALLOWANCE;
    const usedTokens = tokenBalance.usedSubscriptionTokens.get(chatbotId) || 0;
    const remainingTokens = Math.max(0, totalTokens - usedTokens);

    subscriptionTokens[chatbotId] = {
      name: sub.chatbotName,
      total: totalTokens,
      used: usedTokens,
      remaining: remainingTokens,
      display:
        remainingTokens >= SUBSCRIPTION_TOKEN_ALLOWANCE
          ? "2,000,000"
          : remainingTokens.toLocaleString(),
    };
  });

  const freeRemaining = getFreeTokensRemaining(tokenBalance);

  return {
    userId,
    availableTokens:
      freeRemaining +
      Object.values(subscriptionTokens).reduce(
        (sum: number, sub: any) => sum + sub.remaining,
        0,
      ),
    freeTokensRemaining: freeRemaining,
    subscriptionTokens,
    freeTokens: tokenBalance.freeTokens,
    usedFreeTokens: tokenBalance.usedFreeTokens,
    totalTokensUsed: tokenBalance.totalTokensUsed,
    lastResetAt: tokenBalance.lastResetAt,
    nextResetAt: tokenBalance.nextResetAt,
    isLow:
      freeRemaining +
        Object.values(subscriptionTokens).reduce(
          (sum: number, sub: any) => sum + sub.remaining,
          0,
        ) <=
      1000,
  };
}
