// apps/api/controllers/embed/token/balance.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { getTokenBalanceSummary } from "@/services/token.service";

// GET /api/embed/token/balance - Get user's token balance
export const getTokenBalanceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const tokenBalance = await getTokenBalanceSummary(userId);

    return res.status(200).json({
      success: true,
      data: tokenBalance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
