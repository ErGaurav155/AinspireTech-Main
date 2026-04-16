// apps/api/controllers/embed/chat-conversation.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import { getUserById } from "@/services/user.service";

// POST /api/embed/chat-conversation - Create or update a chat conversation
export const handleChatConversationRequest = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      chatbotType,
      userId,
      sessionId,
      visitorId,
      customerEmail,
      customerName,
      messages,
      totalTokensUsed,
      hasAppointment,
      status,
    } = req.body;

    if (!chatbotType || !userId || !sessionId || !messages) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Get user
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User Not Found",
        timestamp: new Date().toISOString(),
      });
    }

    // Find existing conversation or create new one
    let conversation = await WebChatConversation.findOne({
      clerkId: userId,
      sessionId,
    });

    const messageCount = messages.length;
    const tokensUsed = totalTokensUsed || 0;

    if (conversation) {
      // Update existing conversation
      conversation.messages = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      conversation.totalTokensUsed = tokensUsed;
      conversation.totalMessages = messageCount;
      conversation.hasAppointment = hasAppointment || false;
      conversation.status = status || "active";
      conversation.lastActivity = new Date();
      if (customerEmail) conversation.customerEmail = customerEmail;
      if (customerName) conversation.customerName = customerName;
      if (visitorId) conversation.visitorId = visitorId;

      await conversation.save();
    } else {
      // Create new conversation
      conversation = await WebChatConversation.create({
        chatbotType,
        clerkId: userId,
        sessionId,
        visitorId,
        customerEmail,
        customerName,
        messages: messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
        totalTokensUsed: tokensUsed,
        totalMessages: messageCount,
        hasAppointment: hasAppointment || false,
        status: status || "active",
        lastActivity: new Date(),
        tags: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Chat conversation saved successfully",
        conversationId: conversation._id,
        sessionId: conversation.sessionId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat conversation save error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/embed/chat-conversations - Get chat conversations for a user
export const getChatConversationsRequest = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, chatbotType, limit = 20, offset = 0 } = req.query;

    if (!userId || !chatbotType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const conversations = await WebChatConversation.find({
      clerkId: userId as string,
      chatbotType: chatbotType as string,
    })
      .sort({ lastActivity: -1 })
      .skip(parseInt(offset as string))
      .limit(parseInt(limit as string))
      .lean();

    const totalCount = await WebChatConversation.countDocuments({
      clerkId: userId as string,
      chatbotType: chatbotType as string,
    });

    return res.status(200).json({
      success: true,
      data: {
        conversations,
        totalCount,
        hasMore:
          totalCount > parseInt(offset as string) + parseInt(limit as string),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get chat conversations error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
