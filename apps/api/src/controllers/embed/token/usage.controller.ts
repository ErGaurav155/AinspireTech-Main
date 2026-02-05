import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { usedTokens } from "@/services/token.service";

// POST /api/embed/token/usage - Record token usage
export const postTokenUsageController = async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    // Parse request body
    const { userId, chatbotType, tokensUsed } = req.body;

    // Validate required fields
    if (!userId || !chatbotType || tokensUsed === undefined) {
      return res.status(400).json({
        error: "Missing required fields: userId, chatbotType, tokensUsed",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate tokensUsed is a positive number
    if (typeof tokensUsed !== "number" || tokensUsed <= 0) {
      return res.status(400).json({
        error: "tokensUsed must be a positive number",
        timestamp: new Date().toISOString(),
      });
    }

    // Connect to database
    await connectToDatabase();

    // Use tokens with approximate cost calculation (0.0000014 per token)
    const tokenResult = await usedTokens(
      userId,
      tokensUsed,
      chatbotType,
      tokensUsed * 0.0000014, // Approximate cost calculation
    );

    if (!tokenResult.success) {
      return res.status(400).json({
        error: "Failed to update token usage",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token usage tracked successfully",
      data: {
        remainingTokens: tokenResult.remainingTokens,
        freeTokensRemaining: tokenResult.freeTokensRemaining,
        purchasedTokensRemaining: tokenResult.purchasedTokensRemaining,
        tokensUsed: tokensUsed,
        usageId: tokenResult.tokenUsage._id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error tracking token usage:", error);

    // Handle specific error cases
    if (error.message === "Insufficient tokens") {
      return res.status(400).json({
        success: false,
        error: "Insufficient tokens",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
