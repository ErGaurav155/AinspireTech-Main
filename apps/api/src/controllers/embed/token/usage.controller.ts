// apps/api/controllers/embed/token/usage.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { usedTokens, getTokenBalanceSummary } from "@/services/token.service";

// POST /api/embed/token/usage - Record token usage
export const postTokenUsageController = async (req: Request, res: Response) => {
  try {
    const { userId, chatbotType, tokensUsed } = req.body;

    if (!userId || !chatbotType || tokensUsed === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, chatbotType, tokensUsed",
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof tokensUsed !== "number" || tokensUsed <= 0) {
      return res.status(400).json({
        success: false,
        error: "tokensUsed must be a positive number",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    try {
      const tokenResult = await usedTokens(
        userId,
        tokensUsed,
        chatbotType,
        tokensUsed * 0.0000014,
      );

      return res.status(200).json({
        success: true,
        data: {
          remainingTokens: tokenResult.remainingTokens,
          freeTokensRemaining: tokenResult.freeTokensRemaining,
          purchasedTokensRemaining: tokenResult.subscriptionTokensRemaining,
          tokensUsed: tokensUsed,
          usageId: tokenResult.tokenUsage._id,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.message === "Insufficient tokens") {
        const balance = await getTokenBalanceSummary(userId);
        return res.status(402).json({
          success: false,
          error: "Insufficient tokens",
          availableTokens: balance.availableTokens,
          requiredTokens: tokensUsed,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error tracking token usage:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
