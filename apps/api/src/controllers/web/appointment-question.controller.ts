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
        appointmentQuestions: doc || {
          quickReplies: ["Book an appointment"],
          questions: [],
        },
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

    const { chatbotType, questions, quickReplies, flows } = req.body;

    if (
      !chatbotType ||
      (!Array.isArray(questions) && !Array.isArray(flows))
    ) {
      return res.status(400).json({
        success: false,
        error: "chatbotType and customer flow questions are required",
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

    const validTypes = ["text", "email", "tel", "date", "select", "textarea"];
    const normalizedQuickReplies = Array.from(
      new Set(
        (Array.isArray(quickReplies) ? quickReplies : ["Book an appointment"])
          .map((item: unknown) => String(item || "").trim().slice(0, 30))
          .filter(Boolean),
      ),
    ).slice(0, 5);

    if (normalizedQuickReplies.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Add at least one quick reply button to start the flow",
        timestamp: new Date().toISOString(),
      });
    }

    const normalizeQuestions = (items: any[]) =>
      items.map((q: any) => ({
        id: String(
          q.id ||
            `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        ),
        question: String(q.question || "").trim(),
        type: q.type,
        required: Boolean(q.required),
        options: Array.isArray(q.options)
          ? q.options.map((option: unknown) => String(option).trim()).filter(Boolean)
          : [],
      }));
    const normalizedLegacyQuestions = normalizeQuestions(
      Array.isArray(questions) ? questions : [],
    );
    const normalizedFlows = (
      Array.isArray(flows) && flows.length > 0
        ? flows
        : normalizedQuickReplies.map((label: string, index: number) => ({
            id: `legacy-flow-${index + 1}`,
            label,
            introMessage:
              label === "Book an appointment"
                ? "I'd love to help you book an appointment. Let me gather some details."
                : `Let's get started with ${label}.`,
            completionAction:
              label === "Book an appointment"
                ? "book_appointment"
                : "submit_details",
            questions: normalizedLegacyQuestions,
          }))
    )
      .slice(0, 5)
      .map((flow: any, index: number) => ({
        id: String(flow.id || `flow-${index + 1}`).slice(0, 80),
        label: String(flow.label || "").trim().slice(0, 30),
        introMessage: String(flow.introMessage || "").trim().slice(0, 300),
        completionAction:
          flow.completionAction === "book_appointment"
            ? "book_appointment"
            : "submit_details",
        questions: normalizeQuestions(Array.isArray(flow.questions) ? flow.questions : []),
      }));

    if (normalizedFlows.length === 0 || normalizedFlows.some((flow) => !flow.label)) {
      return res.status(400).json({
        success: false,
        error: "Add at least one named customer flow",
        timestamp: new Date().toISOString(),
      });
    }
    if (new Set(normalizedFlows.map((flow) => flow.label.toLowerCase())).size !== normalizedFlows.length) {
      return res.status(400).json({
        success: false,
        error: "Customer flow button names must be unique",
        timestamp: new Date().toISOString(),
      });
    }

    const allQuestions = normalizedFlows.flatMap((flow) => flow.questions);
    if (normalizedFlows.some((flow) => flow.questions.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "Each customer flow requires at least one question",
        timestamp: new Date().toISOString(),
      });
    }

    for (const q of allQuestions) {
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
          quickReplies: normalizedFlows.map((flow) => flow.label),
          questions: normalizedFlows[0].questions,
          flows: normalizedFlows,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        message: "Customer flow saved successfully",
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
