// apps/api/controllers/embed/chat-conversation.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import { getUserById } from "@/services/user.service";
import WebChatbot from "@/models/web/WebChatbot.model";
import {
  formDataToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";

const normalizePhone = (value: unknown): string | undefined => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-15) : undefined;
};

const normalizeEmail = (value: unknown): string | undefined => {
  const email = String(value || "").trim().toLowerCase();
  return email || undefined;
};

const messageKey = (message: any, index: number) =>
  message?.id ||
  `${message?.role || "unknown"}:${message?.timestamp || ""}:${message?.content || ""}:${index}`;

/**
 * The widget sends the full local history each time it saves.  Merge by message
 * id instead of replacing the persisted array, so a returning customer never
 * loses yesterday's transcript when a new session is opened.
 */
const mergeMessages = (...messageGroups: any[][]) => {
  const deduplicated = new Map<string, any>();

  messageGroups.flat().forEach((message, index) => {
    if (!message || !message.content) return;
    const timestamp = new Date(message.timestamp);
    const normalized = {
      ...message,
      timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
    };
    const key = messageKey(normalized, index);
    if (!deduplicated.has(key)) deduplicated.set(key, normalized);
  });

  return [...deduplicated.values()].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
};

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
      customerPhone,
      customerEmail,
      customerName,
      flowId,
      flowName,
      messages,
      formData,
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

    if (chatbotType !== "chatbot-lead-generation") {
      return res.status(400).json({
        success: false,
        error: "Unsupported chatbot type",
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

    const normalizedPhone = normalizePhone(customerPhone);
    const normalizedMessages = mergeMessages(Array.isArray(messages) ? messages : []);
    const baseFilter = { clerkId: userId, chatbotType: "chatbot-lead-generation" as const };

    // Always load the current browser session first. If the flow collected a
    // phone number, prefer the customer's existing thread and merge the new
    // session into it. This supports both same-device and returning customers.
    const sessionConversation = await WebChatConversation.findOne({
      ...baseFilter,
      sessionId,
    });
    const phoneConversation = normalizedPhone
      ? await WebChatConversation.findOne({
          ...baseFilter,
          customerPhone: normalizedPhone,
        }).sort({ lastActivity: -1 })
      : null;
    // Conversations created before customerPhone was introduced only have the
    // number inside formData. On a later booking, locate that legacy thread
    // once, then persist the normalized phone so future lookups use the index.
    const legacyPhoneConversation =
      normalizedPhone && !phoneConversation
        ? (
            await WebChatConversation.find({
              ...baseFilter,
              "formData.0": { $exists: true },
            })
              .sort({ lastActivity: -1 })
              .limit(100)
          ).find((candidate) =>
            (candidate.formData || []).some(
              (field) => normalizePhone(field.answer) === normalizedPhone,
            ),
          )
        : null;
    const conversation = phoneConversation || legacyPhoneConversation || sessionConversation || new WebChatConversation({
      ...baseFilter,
      sessionId,
      tags: [],
    });

    const mergedMessages = mergeMessages(
      (conversation.messages || []) as any[],
      sessionConversation && String(sessionConversation._id) !== String(conversation._id)
        ? (sessionConversation.messages || []) as any[]
        : [],
      normalizedMessages,
    );
    const incomingTokens = Number(totalTokensUsed) || 0;
    const messageTokens = mergedMessages.reduce(
      (sum, message) => sum + (Number(message.tokensUsed) || 0),
      0,
    );
    const incomingFormData = Array.isArray(formData) ? formData : [];

    conversation.set({
      chatbotType,
      visitorId: visitorId || conversation.visitorId,
      customerPhone: normalizedPhone || conversation.customerPhone,
      customerEmail: normalizeEmail(customerEmail) || conversation.customerEmail,
      customerName:
        (customerName && String(customerName).trim()) || conversation.customerName || "Anonymous",
      flowId: flowId ? String(flowId).slice(0, 80) : conversation.flowId,
      flowName: flowName ? String(flowName).slice(0, 30) : conversation.flowName,
      messages: mergedMessages,
      // A later appointment replaces details from an earlier booking while the
      // combined transcript remains intact.
      formData: incomingFormData.length > 0 ? incomingFormData : conversation.formData || [],
      totalTokensUsed: Math.max(
        Number(conversation.totalTokensUsed) || 0,
        incomingTokens,
        messageTokens,
      ),
      totalMessages: mergedMessages.length,
      hasAppointment: Boolean(hasAppointment) || Boolean(conversation.hasAppointment),
      status: status || conversation.status || "active",
      lastActivity: new Date(),
    });
    await conversation.save();

    // The current temporary session was merged into an older phone-based
    // thread. Remove only that duplicate, never the canonical conversation.
    if (
      sessionConversation &&
      String(sessionConversation._id) !== String(conversation._id)
    ) {
      await WebChatConversation.deleteOne({ _id: sessionConversation._id });
    }

    if (Array.isArray(formData) && formData.length > 0 && hasAppointment) {
      const chatbot = await WebChatbot.findOne({
        clerkId: userId,
        type: "chatbot-lead-generation",
      })
        .select("phone")
        .lean();
      await sendAppointmentNotifications({
        userId,
        source: "web",
        sourceRef: String(conversation._id),
        appointment: formDataToAppointmentAlert(formData),
        ownerEmail: user.email,
        ownerWhatsAppNumber: chatbot?.phone,
        dashboardPath: `/web/${chatbotType}/conversations`,
      }).catch((notificationError) => {
        console.error("Web flow notification error:", notificationError);
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

    if (chatbotType !== "chatbot-lead-generation") {
      return res.status(400).json({
        success: false,
        error: "Unsupported chatbot type",
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
