// apps/api/services/token.service.ts
import { connectToDatabase } from "@/config/database.config";
import TokenBalance from "@/models/web/token/TokenBalance.model";
import TokenPurchase from "@/models/web/token/TokenPurchase.model";
import TokenUsage from "@/models/web/token/TokenUsage.model";

// Get user's token balance
export async function getUserTokenBalance(userId: string) {
  await connectToDatabase();

  let tokenBalance = await TokenBalance.findOne({ userId });

  if (!tokenBalance) {
    tokenBalance = await TokenBalance.create({
      userId,
      freeTokens: 10000,
      purchasedTokens: 0,
      usedFreeTokens: 0,
      usedPurchasedTokens: 0,
      totalTokensUsed: 0,
      lastResetAt: new Date(),
      nextResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  return tokenBalance;
}

// Helper function to get available tokens
export function getAvailableTokens(tokenBalance: any) {
  const freeAvailable = Math.max(
    0,
    tokenBalance.freeTokens - tokenBalance.usedFreeTokens,
  );
  const purchasedAvailable = Math.max(
    0,
    tokenBalance.purchasedTokens - tokenBalance.usedPurchasedTokens,
  );
  return freeAvailable + purchasedAvailable;
}

// Helper function to get free tokens remaining
export function getFreeTokensRemaining(tokenBalance: any) {
  return Math.max(0, tokenBalance.freeTokens - tokenBalance.usedFreeTokens);
}

// Helper function to get purchased tokens remaining
export function getPurchasedTokensRemaining(tokenBalance: any) {
  return Math.max(
    0,
    tokenBalance.purchasedTokens - tokenBalance.usedPurchasedTokens,
  );
}

// Helper function to deduct tokens from balance
async function deductTokensFromBalance(tokenBalance: any, tokens: number) {
  let remainingTokens = tokens;

  // First use free tokens
  const freeRemaining = getFreeTokensRemaining(tokenBalance);
  if (freeRemaining > 0) {
    const freeToUse = Math.min(freeRemaining, remainingTokens);
    tokenBalance.usedFreeTokens += freeToUse;
    remainingTokens -= freeToUse;
  }

  // Then use purchased tokens if needed
  if (remainingTokens > 0) {
    const purchasedRemaining = getPurchasedTokensRemaining(tokenBalance);
    if (purchasedRemaining >= remainingTokens) {
      tokenBalance.usedPurchasedTokens += remainingTokens;
    } else {
      // This shouldn't happen if we check availability first
      throw new Error("Insufficient tokens");
    }
  }

  tokenBalance.totalTokensUsed += tokens;
  await tokenBalance.save();
}

// Check if user has enough tokens
export async function hasSufficientTokens(
  userId: string,
  requiredTokens: number,
) {
  const tokenBalance = await getUserTokenBalance(userId);
  const availableTokens = getAvailableTokens(tokenBalance);
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

  const availableTokens = getAvailableTokens(tokenBalance);

  if (availableTokens < tokens) {
    throw new Error("Insufficient tokens");
  }

  // Deduct tokens from balance
  await deductTokensFromBalance(tokenBalance, tokens);

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
    remainingTokens: getAvailableTokens(tokenBalance),
    freeTokensRemaining: getFreeTokensRemaining(tokenBalance),
    purchasedTokensRemaining: getPurchasedTokensRemaining(tokenBalance),
  };
}

// Add purchased tokens
export async function addPurchasedTokens(
  userId: string,
  tokens: number,
  purchaseData: {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    expiresAt?: Date;
  },
) {
  await connectToDatabase();

  const tokenBalance = await getUserTokenBalance(userId);

  // Add tokens to purchased balance
  tokenBalance.purchasedTokens += tokens;
  await tokenBalance.save();

  // Record purchase
  const tokenPurchase = await TokenPurchase.create({
    userId,
    tokensPurchased: tokens,
    amount: purchaseData.amount,
    currency: purchaseData.currency,
    razorpayOrderId: purchaseData.razorpayOrderId,
    expiresAt: purchaseData.expiresAt,
    isOneTime: true,
    status: "completed",
    purchasedAt: new Date(),
  });

  return {
    success: true,
    tokenPurchase,
    newBalance: getAvailableTokens(tokenBalance),
    freeTokensRemaining: getFreeTokensRemaining(tokenBalance),
    purchasedTokensRemaining: getPurchasedTokensRemaining(tokenBalance),
  };
}

// Get token usage statistics
export async function getTokenUsageStats(
  userId: string,
  period: "day" | "week" | "month" | "year" = "month",
) {
  await connectToDatabase();

  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case "day":
      startDate.setDate(now.getDate() - 1);
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  const [usageByChatbot, dailyUsage, totalUsage] = await Promise.all([
    // Usage by chatbot
    TokenUsage.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: startDate },
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
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
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
          timestamp: { $gte: startDate },
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

  return {
    period,
    startDate,
    endDate: now,
    usageByChatbot,
    dailyUsage,
    totalUsage: totalUsage[0] || { totalTokens: 0, totalCost: 0, count: 0 },
    currentBalance: {
      total: getAvailableTokens(tokenBalance),
      free: getFreeTokensRemaining(tokenBalance),
      purchased: getPurchasedTokensRemaining(tokenBalance),
    },
    limits: {
      freeTokens: tokenBalance.freeTokens,
      purchasedTokens: tokenBalance.purchasedTokens,
      usedFreeTokens: tokenBalance.usedFreeTokens,
      usedPurchasedTokens: tokenBalance.usedPurchasedTokens,
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

// Get all token purchases for user
export async function getUserTokenPurchases(userId: string) {
  await connectToDatabase();

  const purchases = await TokenPurchase.find({ userId, status: "completed" })
    .sort({ purchasedAt: -1 })
    .lean();

  return purchases;
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
  const availableTokens = getAvailableTokens(tokenBalance);

  // Alert when less than 1000 tokens remaining
  return availableTokens <= 1000;
}

// Get token balance summary
export async function getTokenBalanceSummary(userId: string) {
  const tokenBalance = await getUserTokenBalance(userId);

  return {
    userId,
    availableTokens: getAvailableTokens(tokenBalance),
    freeTokensRemaining: getFreeTokensRemaining(tokenBalance),
    purchasedTokensRemaining: getPurchasedTokensRemaining(tokenBalance),
    freeTokens: tokenBalance.freeTokens,
    purchasedTokens: tokenBalance.purchasedTokens,
    usedFreeTokens: tokenBalance.usedFreeTokens,
    usedPurchasedTokens: tokenBalance.usedPurchasedTokens,
    totalTokensUsed: tokenBalance.totalTokensUsed,
    lastResetAt: tokenBalance.lastResetAt,
    nextResetAt: tokenBalance.nextResetAt,
    isLow: getAvailableTokens(tokenBalance) <= 1000,
  };
}
