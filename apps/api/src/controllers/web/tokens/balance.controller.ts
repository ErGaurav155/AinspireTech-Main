import { getTokenBalanceSummary } from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// GET /api/tokens/balance - Get user token balance
export const getTokenBalanceControllerWeb = async (
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
