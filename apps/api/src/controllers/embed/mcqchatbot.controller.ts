// apps/api/controllers/embed/mcqchatbot.controller.ts
// POST /api/embed/mcqchatbot

import { generateMcqResponse } from "@/services/ai.service";
import { Request, Response } from "express";
import { usedTokens } from "@/services/token.service";
import { connectToDatabase } from "@/config/database.config";

// POST /api/embed/mcqchatbot - Handle MCQ chatbot requests
export const handleMcqChatbotRequest = async (req: Request, res: Response) => {
  try {
    // API key validation is handled by embedAuth middleware

    const { userInput, userId, chatbotType, isMCQRequest } = req.body;

    if (!userInput || !userId || !chatbotType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userInput, userId, chatbotType",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Generate AI response
    const result = await generateMcqResponse({
      userInput: userInput,
      isMCQRequest: isMCQRequest || false,
    });

    // Deduct tokens from user's balance
    const tokensUsed = result.tokens || 0;

    if (tokensUsed > 0) {
      try {
        const tokenResult = await usedTokens(
          userId,
          tokensUsed,
          chatbotType,
          tokensUsed * 0.0000014, // Approximate cost
        );

        return res.status(200).json({
          success: true,
          data: {
            response: result.content,
            tokens: tokensUsed,
            remainingTokens: tokenResult.remainingTokens,
            freeTokensRemaining: tokenResult.freeTokensRemaining,
            purchasedTokensRemaining: tokenResult.purchasedTokensRemaining,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (tokenError: any) {
        // If insufficient tokens, return error
        if (tokenError.message === "Insufficient tokens") {
          return res.status(402).json({
            success: false,
            error:
              "Insufficient tokens. Please purchase more tokens to continue.",
            timestamp: new Date().toISOString(),
          });
        }
        throw tokenError;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        response: result.content,
        tokens: tokensUsed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MCQ Chatbot API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
