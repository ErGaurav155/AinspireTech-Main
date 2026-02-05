import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Conversation from "@/models/web/Conversation.model";
import { getUserById } from "@/services/user.service";
import {
  sendAppointmentEmailToUser,
  sendWhatsAppInfo,
} from "@/services/sendEmail.service";

// POST /api/embed/conversation - Handle conversation creation
export const handleConversationRequest = async (
  req: Request,
  res: Response,
) => {
  try {
    // Check API key
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      chatbotType,
      userId,
      customerEmail,
      customerName,
      messages,
      formData,
      status,
    } = req.body;

    if (!chatbotType || !userId || !messages) {
      return res.status(400).json({
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Get user
    const user = await getUserById(userId);
    if (!user) {
      return res.status(200).json({
        message: "User Not Found",
        timestamp: new Date().toISOString(),
      });
    }

    // Create conversation
    const newConversation = {
      chatbotType: chatbotType,
      clerkId: userId,
      customerName: customerName || "Anonymous",
      customerEmail: customerEmail || null,
      messages: messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
      formData: formData || null,
      status: status || "active",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await Conversation.create(newConversation);

    // Send notifications for lead generation chatbot
    if (chatbotType === "chatbot-lead-generation") {
      try {
        await sendAppointmentEmailToUser({
          email: user.email,
          data: formData,
        });

        if (user.phone) {
          await sendWhatsAppInfo({
            data: formData,
            userId,
          });
        }
      } catch (notificationError) {
        console.error("Notification error:", notificationError);
        // Continue even if notifications fail
      }
    }

    return res.status(200).json({
      message: "Conversation created successfully",
      conversationId: result._id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Conversation creation error:", error);
    return res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
