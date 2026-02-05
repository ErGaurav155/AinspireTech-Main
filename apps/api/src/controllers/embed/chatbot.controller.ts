import { generateGptResponse } from "@/services/ai.service";
import { Request, Response } from "express";

// POST /api/embed/chatbot - Handle chatbot requests
export const handleChatbotRequest = async (req: Request, res: Response) => {
  try {
    // Check API key
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    const { userInput, fileData, userId, agentId } = req.body;

    if (!userInput || !userId || !agentId || !fileData) {
      return res.status(400).json({
        error: "Message is required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await generateGptResponse({
      userInput: userInput,
      userfileName: fileData || "default",
    });

    return res.status(200).json({
      response: result.response,
      tokens: result.tokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
