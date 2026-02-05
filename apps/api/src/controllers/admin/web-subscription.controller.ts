import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebSubscription from "@/models/web/Websubcription.model";

// GET /api/admin/web-subscriptions - Get all web subscriptions
export const getWebSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Connect to database
    await connectToDatabase();

    // Get all web subscriptions sorted by creation date (newest first)
    const subscriptions = await WebSubscription.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching web subscriptions:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
