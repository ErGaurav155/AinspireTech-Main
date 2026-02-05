import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import AppointmentQuestions from "@/models/web/AppointmentQuestions.model";

// POST /api/embed/webquestion - Get appointment questions
export const getWebQuestionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // 1. Check the API key from headers
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey || apiKey !== process.env.SECRET_KEY) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Parse and validate the request body
    const { chatbotType, userId } = req.body;

    if (!chatbotType || !userId) {
      return res.status(400).json({
        error: "Chatbot type and UserId are required",
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Connect to database
    await connectToDatabase();

    // 4. Find appointment questions for the user and chatbot type
    const questions = await AppointmentQuestions.findOne({
      clerkId: userId,
      chatbotType,
    });

    if (!questions) {
      return res.status(404).json({
        error: "No questions found for this user and chatbot type",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      appointmentQuestions: questions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Appointment questions fetch error:", error);
    return res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
