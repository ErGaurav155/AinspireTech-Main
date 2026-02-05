import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import webFaq from "@/models/web/webFaq.model";
import { getAuth } from "@clerk/express";

// POST /api/web/faq - Create or update FAQ
export const createOrUpdateFaqController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const { chatbotType, questions } = req.body;
    const { userId } = getAuth(req);

    if (!userId || !chatbotType) {
      return res.status(400).json({
        success: false,
        error: "clerkId and chatbotType are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Find existing FAQ or create new one
    let faq = await webFaq.findOne({ clerkId: userId, chatbotType });

    if (faq) {
      // Update existing FAQ
      faq.questions = questions;
      faq.updatedAt = new Date();
      await faq.save();
    } else {
      // Create new FAQ
      faq = await webFaq.create({
        clerkId: userId,
        chatbotType,
        questions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { faq },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("FAQ save error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to save FAQ: " + error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/web/faq - Get FAQ
export const getFaqController = async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { userId: clerkId } = getAuth(req);
    const chatbotType = req.query.chatbotType as string;

    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: "userId  are required",
        timestamp: new Date().toISOString(),
      });
    }

    const faq = await webFaq.findOne({
      clerkId,
      chatbotType,
    });

    if (!faq) {
      return res.status(200).json({
        success: true,
        data: {
          faq: {
            clerkId,
            chatbotType,
            questions: [],
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { faq },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("FAQ fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch FAQ: " + error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
