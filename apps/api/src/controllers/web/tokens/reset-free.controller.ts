import { resetFreeTokens } from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// POST /api/tokens/reset-free - Reset free tokens
export const resetFreeTokensController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get userId from auth headers
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await resetFreeTokens(userId);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: "Not time to reset yet",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: result.message,
        newFreeTokens: result.newFreeTokens,
        nextReset: result.nextReset,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resetting free tokens:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
