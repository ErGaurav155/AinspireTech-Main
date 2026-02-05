import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { getTokenBalanceSummary } from "@/services/token.service";

// GET /api/embed/token/balance - Get user's token balance
export const getTokenBalanceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    // Get userId from query parameter
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Connect to database
    await connectToDatabase();

    // Get token balance
    const tokenBalance = await getTokenBalanceSummary(userId);

    return res.status(200).json({
      success: true,
      data: tokenBalance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
