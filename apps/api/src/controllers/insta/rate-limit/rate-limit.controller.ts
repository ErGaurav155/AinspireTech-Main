import { Request, Response } from "express";
import {
  getCurrentWindow,
  canMakeCall,
  recordCall,
  getUserRateLimitStats,
  processQueuedCalls,
  resetHourlyWindow,
  isAppLimitReached,
} from "@/services/rate-limit.service";
import { getAuth } from "@clerk/express";

// GET /api/rate-limit/stats
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

// POST /api/rate-limit/check
export const checkRateLimitController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    const { accountId, actionType, isFollowCheck } = req.body;

    if (!accountId || !actionType) {
      return res.status(400).json({
        success: false,
        error: "accountId and actionType are required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await canMakeCall(
      userId,
      accountId,
      actionType,
      isFollowCheck || false,
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking rate limit:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check rate limit",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/rate-limit/record
export const recordRateLimitController = async (
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
    const { accountId, actionType, metaCalls, metadata } = req.body;

    if (!accountId || !actionType) {
      return res.status(400).json({
        success: false,
        error: "accountId and actionType are required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await recordCall(
      userId,
      accountId,
      actionType,
      metaCalls || 1,
      metadata || {},
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording rate limit:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record rate limit",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/rate-limit/queue/process
export const processQueueController = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await processQueuedCalls(limit);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing queue:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process queue",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/rate-limit/window/reset
export const resetWindowController = async (req: Request, res: Response) => {
  try {
    const result = await resetHourlyWindow();

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resetting window:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset window",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/rate-limit/window/current
export const getCurrentWindowController = async (
  req: Request,
  res: Response,
) => {
  try {
    const window = getCurrentWindow();

    res.json({
      success: true,
      data: window,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting current window:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get current window",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/rate-limit/app-limit
export const getAppLimitController = async (req: Request, res: Response) => {
  try {
    const appLimit = await isAppLimitReached();

    res.json({
      success: true,
      data: appLimit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting app limit:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get app limit",
      timestamp: new Date().toISOString(),
    });
  }
};
