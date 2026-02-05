import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Conversation from "@/models/web/Conversation.model";
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

    // Get existing conversations
    const existingConversations = await Conversation.find({
      clerkId: userId,
      chatbotType: chatbotType,
    })
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // If no conversations exist, generate mock data
    if (existingConversations.length === 0) {
      const mockConversations = [
        {
          _id: "mock1",
          chatbotId: "chatbot1",
          chatbotType: chatbotType,
          clerkId: userId,
          customerName: "John Doe",
          customerEmail: "john@example.com",
          messages: [
            {
              id: "msg1",
              type: "user" as const,
              content: "I want to book an appointment",
              timestamp: new Date(Date.now() - 120000),
            },
            {
              id: "msg2",
              type: "bot" as const,
              content:
                "I'd be happy to help you book an appointment. Let me get some details from you.",
              timestamp: new Date(Date.now() - 110000),
            },
          ],
          formData: {
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            service: "Consultation",
            date: "2024-01-15",
            message: "Looking for AI consultation services",
          },
          status: "answered" as const,
          tags: [],
          createdAt: new Date(Date.now() - 120000),
          updatedAt: new Date(Date.now() - 110000),
        },
        {
          _id: "mock2",
          chatbotId: "chatbot1",
          chatbotType: chatbotType,
          clerkId: userId,
          customerName: "Jane Smith",
          customerEmail: "jane@example.com",
          messages: [
            {
              id: "msg3",
              type: "user" as const,
              content: "What are your business hours?",
              timestamp: new Date(Date.now() - 300000),
            },
            {
              id: "msg4",
              type: "bot" as const,
              content:
                "Our business hours are Monday-Friday 9AM-6PM. How can I assist you today?",
              timestamp: new Date(Date.now() - 290000),
            },
          ],
          status: "answered" as const,
          tags: [],
          createdAt: new Date(Date.now() - 300000),
          updatedAt: new Date(Date.now() - 290000),
        },
        {
          _id: "mock3",
          chatbotId: "chatbot1",
          chatbotType: chatbotType,
          clerkId: userId,
          customerName: "Mike Johnson",
          customerEmail: "mike@example.com",
          messages: [
            {
              id: "msg5",
              type: "user" as const,
              content: "I need help with pricing",
              timestamp: new Date(Date.now() - 600000),
            },
          ],
          formData: {
            name: "Mike Johnson",
            email: "mike@example.com",
            phone: "+1987654321",
            service: "Service A",
            date: "2024-01-16",
            message: "Interested in your premium services",
          },
          status: "pending" as const,
          tags: [],
          createdAt: new Date(Date.now() - 600000),
          updatedAt: new Date(Date.now() - 600000),
        },
      ];

      return res.status(200).json({
        success: true,
        data: {
          conversations: mockConversations,
          total: mockConversations.length,
          hasMore: false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Get total count for pagination
    const total = await Conversation.countDocuments({
      clerkId: userId,
      chatbotType: chatbotType,
    });

    return res.status(200).json({
      success: true,
      data: {
        conversations: existingConversations,
        total,
        hasMore: offset + limit < total,
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
