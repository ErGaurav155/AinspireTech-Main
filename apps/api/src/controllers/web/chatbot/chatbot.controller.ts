import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import webFaq from "@/models/web/webFaq.model";
import WebConversation from "@/models/web/Conversation.model";
import WebAppointmentQuestions from "@/models/web/AppointmentQuestions.model";

// Only these two types are valid — mirrors VALID_IDS on the frontend
const VALID_CHATBOT_TYPES = [
  "chatbot-lead-generation",
  "chatbot-education",
] as const;

type ChatbotTypeId = (typeof VALID_CHATBOT_TYPES)[number];

// Per-type defaults — mirrors TYPE_CONFIG on the frontend
const TYPE_DEFAULTS: Record<
  ChatbotTypeId,
  {
    welcomeMessage: string;
    primaryColor: string;
    scriptSrc: string;
    dataAttr: string;
  }
> = {
  "chatbot-lead-generation": {
    welcomeMessage: "Hi! How can I help you today?",
    primaryColor: "#8B5CF6",
    scriptSrc: "https://app.rocketreplai.com/chatbotembed.js",
    dataAttr: "data-chatbot-config",
  },
  "chatbot-education": {
    welcomeMessage: "Hello! How can I help you today?",
    primaryColor: "#10B981",
    scriptSrc: "https://app.rocketreplai.com/mcqchatbotembed.js",
    dataAttr: "data-mcq-chatbot",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidType = (type: string): type is ChatbotTypeId =>
  VALID_CHATBOT_TYPES.includes(type as ChatbotTypeId);

const buildEmbedCode = (
  chatbotId: string,
  type: ChatbotTypeId,
  userId: string,
  websiteUrl?: string,
): string => {
  const defaults = TYPE_DEFAULTS[type];
  const apiUrl = process.env.API_URL || "https://api.rocketreplai.com";

  const isLead = type === "chatbot-lead-generation";

  const config = isLead
    ? {
        userId,
        isAuthorized: false, // becomes true after scraping completes
        filename: "",
        chatbotType: type,
        apiUrl: "https://app.rocketreplai.com",
        primaryColor: defaults.primaryColor,
        position: "bottom-right",
        welcomeMessage: defaults.welcomeMessage,
        chatbotName: "Lead Bot",
      }
    : {
        userId,
        isAuthorized: true,
        chatbotType: type,
        apiUrl: "https://app.rocketreplai.com",
        primaryColor: defaults.primaryColor,
        position: "bottom-right",
        welcomeMessage: defaults.welcomeMessage,
        chatbotName: "Education Bot",
      };

  return `<script \n  src="${defaults.scriptSrc}" \n  ${defaults.dataAttr}='${JSON.stringify(config, null, 2)}'>\n</script>`;
};

// ─── POST /api/web/chatbot/create ────────────────────────────────────────────
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

    // ── Validate required fields ────────────────────────────────────────
    if (!name?.trim() || !type) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name and type are required",
        timestamp: new Date().toISOString(),
      });
    }

    // ── Validate type — only two types exist now ────────────────────────
    if (!isValidType(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid chatbot type. Must be one of: ${VALID_CHATBOT_TYPES.join(", ")}`,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Lead generation requires a websiteUrl ──────────────────────────
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

    // ── One chatbot per type per user ───────────────────────────────────
    // Also enforced by the unique MongoDB index: { clerkId: 1, type: 1 }
    const existingChatbot = await WebChatbot.findOne({ clerkId: userId, type });
    if (existingChatbot) {
      return res.status(409).json({
        success: false,
        error: `You already have a ${type} chatbot. Each type can only be created once per account.`,
        existingChatbotId: existingChatbot._id,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Create chatbot ─────────────────────────────────────────────────
    const chatbotId = new ObjectId();
    const defaults = TYPE_DEFAULTS[type];
    const embedCode = buildEmbedCode(
      chatbotId.toString(),
      type,
      userId,
      websiteUrl?.trim(),
    );

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
    // Catch duplicate key from MongoDB unique index (race condition fallback)
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

// ─── GET /api/web/chatbot/list ───────────────────────────────────────────────
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

// GET /api/web/chatbot - Get all chatbots for authenticated user
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

    // Connect to database
    await connectToDatabase();

    // Fetch user chatbots
    const userChatbots = await WebChatbot.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        chatbots: userChatbots,
      },
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
