import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import TokenBalance from "@/models/web/token/TokenBalance.model";

// GET /api/cron/web-token - Reset free web tokens for users
export const resetWebTokensController = async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const now = new Date();
    const usersToReset = await TokenBalance.find({
      nextResetAt: { $lte: now },
    });

    let resetCount = 0;

    for (const userTokenBalance of usersToReset) {
      try {
        // Reset tokens logic
        userTokenBalance.freeTokens = 10000; // Set your default free tokens amount
        userTokenBalance.lastResetAt = new Date(Date.now());
        userTokenBalance.nextResetAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ); // Reset in 30 days
        await userTokenBalance.save();
        resetCount++;
      } catch (error) {
        console.error(
          `Error resetting tokens for user ${userTokenBalance.userId}:`,
          error,
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `Reset free tokens for ${resetCount} users`,
        resetCount,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
