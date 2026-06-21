import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import { getUserById } from "@/services/user.service";
import {
  formDataToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";
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

    const resolvedSessionId =
      sessionId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const normalizedMessages = messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    const result = await WebChatConversation.findOneAndUpdate(
      {
        clerkId: userId,
        sessionId: resolvedSessionId,
      },
      {
        $set: {
          chatbotType,
          customerName: customerName || "Anonymous",
          customerEmail: customerEmail || null,
          messages: normalizedMessages,
          formData: formData || [],
          status: status || (formData && formData.length > 0 ? "completed" : "active"),
          totalTokensUsed: 0,
          totalMessages: messages.length,
          hasAppointment: !!(formData && formData.length > 0),
          lastActivity: new Date(),
        },
        $setOnInsert: {
          sessionId: resolvedSessionId,
          tags: [],
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    // Send notifications for lead generation chatbot
    if (chatbotType === "chatbot-lead-generation") {
      try {
        await sendAppointmentNotifications({
          userId,
          source: "web",
          sourceRef: String(result._id),
          appointment: formDataToAppointmentAlert(formData || []),
          ownerEmail: user.email,
          ownerWhatsAppNumber: chatbot.phone,
          dashboardPath: `/web/${chatbotType}/conversations`,
        });
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
