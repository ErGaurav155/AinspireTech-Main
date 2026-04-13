// apps/api/controllers/embed/chatbot.controller.ts
// POST /api/embed/chatbot
//
// Updated to accept an optional `conversationHistory` array so DeepSeek
// can remember previous turns in the same browser session.
// See ai.service.ts for the full explanation of how memory works.

import { generateGptResponse } from "@/services/ai.service";
import type { ConvMessage } from "@/services/ai.service";
import { Request, Response } from "express";

// POST /api/embed/chatbot - Handle chatbot requests
export const handleChatbotRequest = async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    const { userInput, userId, agentId, fileData, conversationHistory } =
      req.body;

    if (!userInput || !userId || !agentId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await generateGptResponse({
      userInput,
      userfileName: fileData || "default",
      conversationHistory: conversationHistory || [],
      clerkId: userId, // Pass clerkId for FAQ context
      chatbotType: agentId, // Pass chatbot type for FAQ context
    });

    return res.status(200).json({
      success: true,
      data: {
        response: result.response,
        tokens: result.tokens,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
