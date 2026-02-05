import {
  getChatbotTokenUsage,
  getTokenUsageStats,
} from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// GET /api/tokens/usage - Get token usage statistics
export const getTokenUsageController = async (req: Request, res: Response) => {
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

    const period =
      (req.query.period as "day" | "week" | "month" | "year") || "month";
    const chatbotId = req.query.chatbotId as string;

    // Validate period parameter
    const validPeriods = ["day", "week", "month", "year"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: "Invalid period. Valid values: day, week, month, year",
        timestamp: new Date().toISOString(),
      });
    }

    if (chatbotId) {
      const usage = await getChatbotTokenUsage(userId, chatbotId);

      return res.status(200).json({
        success: true,
        data: usage,
        timestamp: new Date().toISOString(),
      });
    } else {
      const stats = await getTokenUsageStats(userId, period);

      return res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error fetching token usage:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
