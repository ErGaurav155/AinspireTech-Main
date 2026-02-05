import { Request, Response } from "express";
import { listInstaSubscriptions } from "@/services/subscription.service";
import { getAuth } from "@clerk/express";

// GET /api/insta/subscription/list - List Instagram subscriptions
export const listInstaSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get clerkId from auth headers or JWT token
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - User ID required",
        timestamp: new Date().toISOString(),
      });
    }

    const subscriptions = await listInstaSubscriptions(userId);
    return res.status(200).json({
      success: true,
      data: {
        subscriptions: subscriptions.length > 0 ? subscriptions[0] : [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch subscriptions",
      timestamp: new Date().toISOString(),
    });
  }
};
