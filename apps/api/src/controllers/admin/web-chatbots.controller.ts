import { Request, Response } from "express";
import { connectToDatabase } from "../../config/database.config";
import WebChatbot from "../../models/web/WebChatbot.model";

// GET /api/admin/web-chatbots - Get all chatbots (admin only)
export const getAllChatbotsController = async (req: Request, res: Response) => {
  try {
    // Connect to database
    await connectToDatabase();

    // Fetch all chatbots sorted by creation date (newest first)
    const chatbots = await WebChatbot.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: { data: chatbots, count: chatbots.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching all chatbots:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
