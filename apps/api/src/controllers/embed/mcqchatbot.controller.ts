import { generateMcqResponse } from "@/services/ai.service";
import { Request, Response } from "express";

// POST /api/embed/mcqchatbot - Handle MCQ chatbot requests
export const handleMcqChatbotRequest = async (req: Request, res: Response) => {
  try {
    // Check API key
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    const { userInput, userId, chatbotType, isMCQRequest } = req.body;

    if (!userInput || !userId || !chatbotType) {
      return res.status(400).json({
        error: "Message is required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await generateMcqResponse({
      userInput: userInput,
      isMCQRequest: isMCQRequest || false,
    });

    return res.status(200).json({
      response: result.content,
      tokens: result.tokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MCQ Chatbot API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
