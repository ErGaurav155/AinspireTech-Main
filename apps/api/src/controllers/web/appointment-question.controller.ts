// apps/api/controllers/web/appointment-question.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebAppointmentQuestions from "@/models/web/AppointmentQuestions.model";
import { getAuth } from "@clerk/express";

// ── GET /api/web/appointment-question?chatbotType= ────────────────────────────
export const getAppointmentQuestionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const chatbotType =
      (req.query.chatbotType as string | undefined)?.trim() ||
      "chatbot-lead-generation";

    if (chatbotType !== "chatbot-lead-generation") {
      return res.status(400).json({
        success: false,
        error:
          "Appointment questions are only available for chatbot-lead-generation",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const doc = await WebAppointmentQuestions.findOne({
      clerkId: userId,
      chatbotType,
    }).lean();

    return res.status(200).json({
      success: true,
      data: {
        appointmentQuestions: doc || { questions: [] },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getAppointmentQuestionsController error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// ── POST /api/web/appointment-question ───────────────────────────────────────
export const saveAppointmentQuestionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { chatbotType, questions } = req.body;

    if (!chatbotType || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: "chatbotType and questions array are required",
        timestamp: new Date().toISOString(),
      });
    }

    if (chatbotType !== "chatbot-lead-generation") {
      return res.status(400).json({
        success: false,
        error:
          "Appointment questions are only available for chatbot-lead-generation",
        timestamp: new Date().toISOString(),
      });
    }

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one question is required",
        timestamp: new Date().toISOString(),
      });
    }

    const validTypes = ["text", "email", "tel", "date", "select", "textarea"];

    for (const q of questions) {
      if (!q.question?.trim()) {
        return res.status(400).json({
          success: false,
          error: "All questions must have non-empty text",
          timestamp: new Date().toISOString(),
        });
      }
      if (!validTypes.includes(q.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid field type "${q.type}". Valid types: ${validTypes.join(", ")}`,
          timestamp: new Date().toISOString(),
        });
      }
      if (q.type === "select" && (!q.options || q.options.length === 0)) {
        return res.status(400).json({
          success: false,
          error: `Dropdown field "${q.question}" needs at least one option`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    await connectToDatabase();

    const updated = await WebAppointmentQuestions.findOneAndUpdate(
      { clerkId: userId, chatbotType },
      {
        $set: {
          clerkId: userId,
          chatbotType,
          questions: questions.map((q: any) => ({
            id: q.id,
            question: q.question.trim(),
            type: q.type,
            required: Boolean(q.required),
            options: Array.isArray(q.options) ? q.options : [],
          })),
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        message: "Appointment questions saved successfully",
        appointmentQuestions: updated,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("saveAppointmentQuestionsController error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
