// apps/api/controllers/embed/config-by-type.controller.ts
// GET /api/embed/config-by-type?userId=&chatbotType=
// Returns public-safe bot config for the CDN widget.
// Called by cdn.rocketreplai.com — no Clerk auth, no secrets in response.
// API key validation is handled by embedAuth middleware

import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import WebSubscription from "@/models/web/Websubcription.model";

export const getEmbedConfigByTypeController = async (
  req: Request,
  res: Response,
) => {
  try {
    // API key validation is handled by embedAuth middleware
    // No need to check x-api-key header here anymore

    // CORS is handled by embedCors middleware, but we still set cache headers
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=30",
    );

    const userId = (req.query.userId as string | undefined)?.trim();
    const chatbotType = (req.query.chatbotType as string | undefined)?.trim();

    if (!userId || !chatbotType) {
      return res.status(400).json({
        success: false,
        error: "userId and chatbotType query params are required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const chatbot = await WebChatbot.findOne(
      { clerkId: userId, type: chatbotType, isActive: true },
      {
        name: 1,
        settings: 1,
        scrappedFile: 1,
        type: 1,
        clerkId: 1,
      },
    ).lean();

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found or inactive",
        timestamp: new Date().toISOString(),
      });
    }

    const settings = (chatbot as any).settings || {};
    const hasActiveSubscription = await WebSubscription.exists({
      clerkId: userId,
      chatbotType: chatbotType as "chatbot-lead-generation" | "chatbot-education",
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: {
        name: (chatbot as any).name || "Chat Support",
        welcomeMessage:
          settings.welcomeMessage || "Hi! How can I help you today?",
        primaryColor: settings.primaryColor || "#1a56db",
        logoUrl: settings.logoUrl || null,
        // These are required by the widget to call /api/embed/chatbot
        userId: (chatbot as any).clerkId,
        chatbotType: (chatbot as any).type,
        filename: (chatbot as any).scrappedFile || "",
        // Additional safe settings
        position: settings.position || "bottom-right",
        bubbleIcon: settings.bubbleIcon || null,
        showBranding: !hasActiveSubscription,
        customCSS: settings.customCSS || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getEmbedConfigByTypeController error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
