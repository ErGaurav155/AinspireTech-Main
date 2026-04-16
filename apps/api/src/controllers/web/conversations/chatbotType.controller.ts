import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import WebConversation from "@/models/web/Conversation.model";
import { getAuth } from "@clerk/express";

// GET /api/web/conversations/:chatbotType - Get conversations by chatbot type
export const getConversationsByTypeController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { chatbotType } = req.params;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    await connectToDatabase();

    // Get chat conversations
    const chatConversations = await WebChatConversation.find({
      clerkId: userId,
      chatbotType: chatbotType,
    })
      .sort({ lastActivity: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Also get appointment conversations for lead generation
    let appointmentConversations;
    if (chatbotType === "chatbot-lead-generation") {
      appointmentConversations = await WebConversation.find({
        clerkId: userId,
        chatbotType: chatbotType,
      })
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    }

    // Combine and format conversations
    const conversations = [
      ...chatConversations.map((conv) => ({
        _id: conv._id,
        chatbotType: conv.chatbotType,
        clerkId: conv.clerkId,
        sessionId: conv.sessionId,
        customerName: conv.customerName || "Anonymous",
        customerEmail: conv.customerEmail,
        messages: conv.messages,
        totalTokensUsed: conv.totalTokensUsed,
        totalMessages: conv.totalMessages,
        hasAppointment: conv.hasAppointment,
        status: conv.status,
        tags: conv.tags,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastActivity: conv.lastActivity,
        type: "chat",
      })),
      ...appointmentConversations!.map((conv) => ({
        _id: conv._id,
        chatbotType: conv.chatbotType,
        clerkId: conv.clerkId,
        customerName: conv.customerName || "Anonymous",
        customerEmail: conv.customerEmail,
        messages: conv.messages,
        formData: conv.formData,
        status: conv.status,
        tags: conv.tags,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        type: "appointment",
      })),
    ];

    // Sort by last activity/updated time
    conversations.sort((a, b) => {
      const aTime = a.updatedAt;
      const bTime = b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Apply pagination
    const paginatedConversations = conversations.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      data: {
        conversations: paginatedConversations,
        total: conversations.length,
        hasMore: conversations.length > offset + limit,
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
