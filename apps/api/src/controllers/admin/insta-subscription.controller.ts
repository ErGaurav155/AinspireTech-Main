import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";

// GET /api/admin/insta-subscriptions - Get all Instagram subscriptions
export const getInstaSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Connect to database
    await connectToDatabase();

    // Get all subscriptions sorted by creation date (newest first)
    const subscriptions = await InstaSubscription.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Instagram subscriptions:", error);

    // Handle auth errors specifically
    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: error.message || "ACCESS_DENIED: You are not the owner",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
