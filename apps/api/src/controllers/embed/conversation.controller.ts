import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebConversation from "@/models/web/Conversation.model";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import { getUserById } from "@/services/user.service";
import {
  sendAppointmentEmailToUser,
  sendWhatsAppInfo,
} from "@/services/sendEmail.service";
import WebChatbot from "@/models/web/WebChatbot.model";

// POST /api/embed/conversation - Handle conversation creation
export const handleConversationRequest = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      chatbotType,
      userId,
      customerEmail,
      customerName,
      messages,
      formData,
      status,
      sessionId,
    } = req.body;

    if (!chatbotType || !userId || !messages) {
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
    const chatbot = await WebChatbot.findOne({
      clerkId: userId,
      type: chatbotType,
    });
    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot Not Found",
        timestamp: new Date().toISOString(),
      });
    }

    // Create conversation in the lead generation model
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

    const result = await WebConversation.create(newConversation);

    // Also update the general chat conversation if sessionId is provided
    if (sessionId) {
      try {
        const chatConversation = await WebChatConversation.findOne({
          clerkId: userId,
          sessionId,
        });

        if (chatConversation) {
          chatConversation.hasAppointment = true;
          chatConversation.customerEmail = customerEmail;
          chatConversation.customerName = customerName;
          chatConversation.status = "completed";
          await chatConversation.save();
        }
      } catch (chatConvError) {
        console.error("Error updating chat conversation:", chatConvError);
        // Don't fail the request
      }
    }

    // Send notifications for lead generation chatbot
    if (chatbotType === "chatbot-lead-generation") {
      try {
        await sendAppointmentEmailToUser({
          email: user.email,
          data: formData,
        });

        if (chatbot.phone) {
          await sendWhatsAppInfo({
            data: formData,
            userId,
            number: chatbot.phone,
          });
        }
      } catch (notificationError) {
        console.error("Notification error:", notificationError);
        // Continue even if notifications fail
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Conversation created successfully",
        conversationId: result._id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Conversation creation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
