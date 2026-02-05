import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebFaq from "@/models/web/webFaq.model";

// POST /api/embed/faq - Get FAQ for user and chatbot type
export const handleFaqRequest = async (req: Request, res: Response) => {
  try {
    // Check API key
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    const { userId, chatbotType } = req.body;

    if (!userId || !chatbotType) {
      return res.status(400).json({
        error: "userId and chatbotType are required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Find FAQ for the user and chatbot type
    const faq = await WebFaq.findOne({ clerkId: userId, chatbotType });

    if (!faq) {
      return res.status(200).json({
        success: true,
        faq: {
          questions: [],
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      faq,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("FAQ fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch FAQ: " + error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
