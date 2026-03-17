import { Request, Response } from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "@/config/database.config";
import Conversation from "@/models/web/Conversation.model";
import { getAuth } from "@clerk/express";

// GET /api/web/conversations - Get conversations
export const getConversationsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const chatbotId = req.query.chatbotId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Build query
    const query: any = { clerkId: userId };
    if (chatbotId) {
      query.chatbotId = chatbotId;
    }

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        conversations,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Conversations fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
