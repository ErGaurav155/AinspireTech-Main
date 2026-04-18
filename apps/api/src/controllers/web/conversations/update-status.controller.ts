// apps/api/src/controllers/web/conversations/update-status.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import { getAuth } from "@clerk/express";

// PUT /api/web/conversations/:conversationId/status - Update conversation status
export const updateConversationStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    if (!status || !["active", "completed", "abandoned"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be one of: active, completed, abandoned",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Find and update the conversation
    const conversation = await WebChatConversation.findOneAndUpdate(
      { _id: conversationId, clerkId: userId },
      { status, lastActivity: new Date() },
      { new: true },
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Conversation status updated successfully",
        conversation: {
          _id: conversation._id,
          status: conversation.status,
          lastActivity: conversation.lastActivity,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Conversation status update error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
