// apps/api/controllers/embed/config.controller.ts
// GET /api/embed/config/:chatbotId
// Returns PUBLIC-SAFE chatbot config for the widget iframe.
// No Clerk auth — this is called from the customer's website.
// NEVER include accessToken, scrappedFile URL, or clerkId.

import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";

export const getEmbedConfigController = async (req: Request, res: Response) => {
  try {
    // CORS: widget iframe loads from our own domain so this is fine,
    // but the /api/embed/chatbot POST needs * for the visitor's browser
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Cache-Control",
      "public, max-age=120, stale-while-revalidate=60",
    );

    await connectToDatabase();

    const { chatbotId } = req.params;

    if (!chatbotId || chatbotId.length < 10) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid chatbotId" });
    }

    // Only project what the widget NEEDS — nothing private
    const chatbot = await WebChatbot.findOne(
      { _id: chatbotId, isActive: true },
      {
        name: 1,
        welcomeMessage: 1,
        primaryColor: 1,
        logoUrl: 1,
        placeholder: 1,
        clerkId: 1, // needed so widget can call /api/embed/chatbot with userId
        type: 1, // chatbot type (chatbot-lead-generation etc.)
        scrappedFile: 1, // Cloudinary URL — widget needs this for context
      },
    ).lean();

    if (!chatbot) {
      return res
        .status(404)
        .json({ success: false, error: "Chatbot not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: chatbot.name || "Chat Support",
        welcomeMessage:
          (chatbot as any).welcomeMessage || "Hi! How can I help you today?",
        primaryColor: (chatbot as any).primaryColor || "#ec4899",
        logoUrl: (chatbot as any).logoUrl || null,
        placeholder: (chatbot as any).placeholder || "Type a message...",
        // These are needed by the widget to call /api/embed/chatbot
        userId: (chatbot as any).clerkId,
        chatbotType: (chatbot as any).type,
        filename: (chatbot as any).scrappedFile || "",
      },
    });
  } catch (error) {
    console.error("Error in getEmbedConfigController:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
