import { Request, Response } from "express";
import {
  getUserRateLimitStats,
  getWindowStats,
} from "@/services/rate-limit.service";
import { getAuth } from "@clerk/express";

// GET /api/admin/window-stats
export const getWindowStatsController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }
    const stats = await getWindowStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting rate limit stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get rate limit stats",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/admin/user-stats
export const getRateLimitStatsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    const stats = await getUserRateLimitStats(userId);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting rate limit stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get rate limit stats",
      timestamp: new Date().toISOString(),
    });
  }
};
