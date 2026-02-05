import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebSubscription from "@/models/web/Websubcription.model";
import { getAuth } from "@clerk/express";

// GET /api/web/subscription/list - Get active subscriptions for user
export const listSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Define allowed chatbot types
    const allowedChatbotTypes = [
      "chatbot-customer-support",
      "chatbot-e-commerce",
      "chatbot-lead-generation",
      "chatbot-education",
    ];

    const subscriptions = await WebSubscription.find({
      clerkId: userId,
      chatbotType: {
        $in: allowedChatbotTypes,
      },
      status: "active",
    }).sort({ createdAt: -1 });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch subscription information",
      timestamp: new Date().toISOString(),
    });
  }
};
