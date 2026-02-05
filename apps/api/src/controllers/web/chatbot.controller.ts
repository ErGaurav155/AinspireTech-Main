import { Request, Response } from "express";
import { connectToDatabase } from "../../config/database.config";
import WebChatbot from "../../models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";

// GET /api/web/chatbot - Get all chatbots for authenticated user
export const getUserChatbotsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    // Connect to database
    await connectToDatabase();

    // Fetch user chatbots
    const userChatbots = await WebChatbot.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        chatbots: userChatbots,
      },
    });
  } catch (error) {
    console.error("Chatbots fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
