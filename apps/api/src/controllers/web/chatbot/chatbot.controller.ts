// apps/api/controllers/web/chatbot/chatbot.controller.ts
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import webFaq from "@/models/web/webFaq.model";
import WebConversation from "@/models/web/Conversation.model";
import WebAppointmentQuestions from "@/models/web/AppointmentQuestions.model";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CHATBOT_TYPES = [
  "chatbot-lead-generation",
  "chatbot-education",
] as const;

type ChatbotTypeId = (typeof VALID_CHATBOT_TYPES)[number];

const CDN_URL = process.env.CDN_URL || "https://cdn.rocketreplai.com";

const TYPE_DEFAULTS: Record<
  ChatbotTypeId,
  {
    welcomeMessage: string;
    primaryColor: string;
  }
> = {
  "chatbot-lead-generation": {
    welcomeMessage: "Hi! How can I help you today?",
    primaryColor: "#8B5CF6",
  },
  "chatbot-education": {
    welcomeMessage: "Hello! How can I help you today?",
    primaryColor: "#10B981",
  },
};

// Default appointment questions seeded when a lead-gen chatbot is first created.
// These are sensible defaults the user can edit later from the Appointments page.
const DEFAULT_APPOINTMENT_QUESTIONS = [
  {
    id: "daq_1",
    question: "What is your full name?",
    type: "text" as const,
    required: true,
    options: [],
  },
  {
    id: "daq_2",
    question: "What is your email address?",
    type: "email" as const,
    required: true,
    options: [],
  },
  {
    id: "daq_3",
    question: "What is your phone number?",
    type: "tel" as const,
    required: true,
    options: [],
  },
  {
    id: "daq_4",
    question: "What service are you interested in?",
    type: "select" as const,
    required: true,
    options: ["Consultation", "Service A", "Service B", "Other"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidType = (type: string): type is ChatbotTypeId =>
  VALID_CHATBOT_TYPES.includes(type as ChatbotTypeId);

/**
 * Build the new CDN-based embed snippet.
 *
 * New format (matches website-bot.js):
 *   <script src="https://cdn.rocketreplai.com/website-bot.js" defer>
 *     userId,chatbotType
 *   </script>
 *
 * The script reads userId and chatbotType from the tag's text content,
 * injects a resizing iframe, and bridges postMessages.
 */
const buildEmbedCode = (userId: string, type: ChatbotTypeId): string => {
  return `<!-- RocketReplAI Website Chatbot -->
<!-- Paste this just before the closing </body> tag -->
<script
  src="${CDN_URL}/website-bot.js"
  defer
>${userId},${type}</script>`;
};

// ─── POST /api/web/chatbot/create ─────────────────────────────────────────────

export const createChatbotController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { name, type, websiteUrl } = req.body;

    if (!name?.trim() || !type) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name and type are required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!isValidType(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid chatbot type. Must be one of: ${VALID_CHATBOT_TYPES.join(", ")}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "chatbot-lead-generation") {
      if (!websiteUrl?.trim()) {
        return res.status(400).json({
          success: false,
          error: "websiteUrl is required for lead generation chatbot",
          timestamp: new Date().toISOString(),
        });
      }
      try {
        new URL(websiteUrl.trim());
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid websiteUrl format",
          timestamp: new Date().toISOString(),
        });
      }
    }

    await connectToDatabase();

    // One chatbot per type per user
    const existingChatbot = await WebChatbot.findOne({ clerkId: userId, type });
    if (existingChatbot) {
      return res.status(409).json({
        success: false,
        error: `You already have a ${type} chatbot. Each type can only be created once per account.`,
        existingChatbotId: existingChatbot._id,
        timestamp: new Date().toISOString(),
      });
    }

    const chatbotId = new ObjectId();
    const defaults = TYPE_DEFAULTS[type];

    // Build new CDN embed code (userId + type, no secrets)
    const embedCode = buildEmbedCode(userId, type);

    const newChatbot = new WebChatbot({
      _id: chatbotId,
      clerkId: userId,
      name: name.trim(),
      type,
      websiteUrl: type === "chatbot-lead-generation" ? websiteUrl.trim() : null,
      embedCode,
      isScrapped: false,
      scrappedFile: null,
      settings: {
        welcomeMessage: defaults.welcomeMessage,
        primaryColor: defaults.primaryColor,
        position: "bottom-right",
        autoExpand: true,
      },
      analytics: {
        totalConversations: 0,
        totalMessages: 0,
        averageResponseTime: 0,
        satisfactionScore: 0,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await newChatbot.save();

    // ── Seed default appointment questions for lead-gen chatbots ──────────
    // This means the widget's "Book Appointment" tab works immediately
    // without the user having to configure questions manually first.
    if (type === "chatbot-lead-generation") {
      try {
        await WebAppointmentQuestions.findOneAndUpdate(
          { clerkId: userId, chatbotType: type },
          {
            $setOnInsert: {
              clerkId: userId,
              chatbotType: type,
              questions: DEFAULT_APPOINTMENT_QUESTIONS,
            },
          },
          { upsert: true, new: true },
        );
        console.log(
          `✅ Default appointment questions seeded for user ${userId}`,
        );
      } catch (apptErr) {
        // Non-fatal — chatbot was created successfully, questions can be
        // added manually from the dashboard.
        console.error("Failed to seed default appointment questions:", apptErr);
      }
    }

    console.log(`✅ Chatbot created: ${type} for user ${userId}`);

    return res.status(201).json({
      success: true,
      data: {
        message: "Chatbot created successfully",
        chatbot: {
          id: created._id,
          ...created.toObject(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "You already have a chatbot of this type",
        timestamp: new Date().toISOString(),
      });
    }
    console.error("Chatbot creation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── GET /api/web/chatbot/list ────────────────────────────────────────────────

export const getChatbotsController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const chatbots = await WebChatbot.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        chatbots: chatbots.map((bot) => ({
          id: bot._id,
          ...bot,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get chatbots error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── GET /api/web/chatbot (legacy alias) ──────────────────────────────────────

export const getUserChatbotsController = async (
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

    await connectToDatabase();

    const userChatbots = await WebChatbot.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { chatbots: userChatbots },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbots fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── GET /api/web/chatbot/:chatbotId ─────────────────────────────────────────

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

// ─── PUT /api/web/chatbot/:chatbotId ─────────────────────────────────────────

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
      { type: chatbotId, clerkId: userId },
      { $set: { ...updateData, updatedAt: new Date() } },
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
      data: { message: "Chatbot updated successfully" },
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

// ─── DELETE /api/web/chatbot/:chatbotId ──────────────────────────────────────

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

    // Cascade delete all associated data
    await Promise.all([
      webFaq.deleteMany({ clerkId: userId, chatbotType: chatbotId }),
      WebConversation.deleteMany({ clerkId: userId, chatbotType: chatbotId }),
      WebAppointmentQuestions.deleteMany({
        clerkId: userId,
        chatbotType: chatbotId,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { message: "Chatbot deleted successfully" },
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
