import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import webFaq from "@/models/web/webFaq.model";
import WebConversation from "@/models/web/Conversation.model";
import WebAppointmentQuestions from "@/models/web/AppointmentQuestions.model";

// GET /api/web/chatbot/:chatbot - Get specific chatbot
export const getChatbotByIdController = async (req: Request, res: Response) => {
  try {
    const { chatbotId } = req.params;
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId || !chatbotId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const getchatbot = await WebChatbot.findOne({
      type: chatbotId,
      clerkId: userId,
    });

    if (!getchatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { getchatbot },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// PUT /api/web/chatbot/:chatbot - Update chatbot
export const updateChatbotController = async (req: Request, res: Response) => {
  try {
    const { chatbotId } = req.params;
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId || !chatbotId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const updateData = req.body;

    await connectToDatabase();

    const result = await WebChatbot.updateOne(
      {
        type: chatbotId,
        clerkId: userId,
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Chatbot updated successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot update error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// DELETE /api/web/chatbot/:chatbot - Delete chatbot
export const deleteChatbotController = async (req: Request, res: Response) => {
  try {
    const { chatbotId } = req.params;
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId || !chatbotId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const result = await WebChatbot.deleteOne({
      type: chatbotId,
      clerkId: userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }
    const deleteChatbotFaq = await webFaq.deleteMany({
      clerkId: userId,
      chatbotType: chatbotId,
    });
    const deleteChatbotConvo = await WebConversation.deleteMany({
      clerkId: userId,
      chatbotType: chatbotId,
    });
    const deleteChatbotAppo = await WebAppointmentQuestions.deleteMany({
      clerkId: userId,
      chatbotType: chatbotId,
    });

    return res.status(200).json({
      success: true,
      data: {
        message: "Chatbot deleted successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot delete error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
