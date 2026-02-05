import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import AppointmentQuestions from "@/models/web/AppointmentQuestions.model";
import { getAuth } from "@clerk/express";

// GET /api/web/appointment-question - Get appointment questions
export const getAppointmentQuestionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get userId from auth headers
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const chatbotType = req.query.chatbotType as string;

    if (!chatbotType) {
      return res.status(400).json({
        success: false,
        error: "Chatbot type is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const questions = await AppointmentQuestions.findOne({
      clerkId: userId,
      chatbotType: chatbotType,
    });

    if (!questions) {
      // Return default questions if none exist
      const defaultQuestions = {
        clerkId: userId,
        chatbotType: chatbotType,
        questions: [
          {
            id: 1,
            question: "What is your full name?",
            type: "text",
            required: true,
            placeholder: "Enter your full name",
          },
          {
            id: 2,
            question: "What is your email address?",
            type: "email",
            required: true,
            placeholder: "Enter your email address",
            validation: {
              pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
            },
          },
          {
            id: 3,
            question: "What is your phone number?",
            type: "tel",
            required: true,
            placeholder: "Enter your phone number",
          },
          {
            id: 4,
            question: "What service are you interested in?",
            type: "select",
            options: ["Consultation", "Service A", "Service B", "Other"],
            required: true,
          },
          {
            id: 5,
            question: "Preferred appointment date and time?",
            type: "date",
            required: true,
          },
          {
            id: 6,
            question: "Additional comments or questions?",
            type: "textarea",
            required: false,
            placeholder: "Any additional information you'd like to share...",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create default questions if they don't exist
      const createdQuestions =
        await AppointmentQuestions.create(defaultQuestions);

      return res.status(200).json({
        success: true,
        data: { appointmentQuestions: createdQuestions, isDefault: true },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { appointmentQuestions: questions, isDefault: false },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Appointment questions fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/web/appointment-question - Save appointment questions
export const saveAppointmentQuestionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get userId from auth headers
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { chatbotType, questions } = req.body;

    if (!chatbotType || !questions) {
      return res.status(400).json({
        success: false,
        error: "Chatbot type and questions are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Questions must be a non-empty array",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate each question object
    for (const [index, question] of questions.entries()) {
      if (!question.question || !question.type) {
        return res.status(400).json({
          success: false,
          error: `Question at index ${index} is missing required fields (question, type)`,
          timestamp: new Date().toISOString(),
        });
      }

      // Validate question type
      const validTypes = [
        "text",
        "email",
        "tel",
        "select",
        "textarea",
        "date",
        "datetime-local",
        "checkbox",
        "radio",
      ];
      if (!validTypes.includes(question.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid question type "${question.type}" at index ${index}. Valid types: ${validTypes.join(", ")}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Validate options for select type
      if (
        question.type === "select" &&
        (!question.options || !Array.isArray(question.options))
      ) {
        return res.status(400).json({
          success: false,
          error: `Select type question at index ${index} must have an options array`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    await connectToDatabase();

    const result = await AppointmentQuestions.updateOne(
      {
        clerkId: userId,
        chatbotType,
      },
      {
        $set: {
          questions,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          clerkId: userId,
          chatbotType,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        message: "Appointment questions saved successfully",
        upserted: result.upsertedCount > 0,
        modified: result.modifiedCount > 0,
        chatbotType,
        questionsCount: questions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Appointment questions save error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
