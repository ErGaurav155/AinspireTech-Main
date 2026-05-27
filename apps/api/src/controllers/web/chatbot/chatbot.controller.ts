// apps/api/controllers/web/chatbot/chatbot.controller.ts
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import webFaq from "@/models/web/webFaq.model";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import WebAppointmentQuestions from "@/models/web/AppointmentQuestions.model";
import { uploadTextToCloudinary } from "@/services/transaction.service";
import puppeteer from "puppeteer";
import multer from "multer";

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

// ─── Multer configuration for file uploads ────────────────────────────────────

const storage = multer.memoryStorage();
export const uploadKnowledgeMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "text/markdown",
      "application/json",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: .txt, .pdf, .md, .json, .csv"));
    }
  },
}).single("file");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidType = (type: string): type is ChatbotTypeId =>
  VALID_CHATBOT_TYPES.includes(type as ChatbotTypeId);

const buildEmbedCode = (userId: string, type: ChatbotTypeId): string => {
  return `<!-- RocketReplAI Website Chatbot -->
<!-- Paste this just before the closing </body> tag -->
<script
  src="${CDN_URL}/website-bot.js"
  defer
>${userId},${type}</script>`;
};

// Helper: Scrape single page
async function scrapeSinglePage(url: string): Promise<any> {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "load", timeout: 30000 });

    const scrapedData = await page.evaluate(() => {
      const getDescription = (): string => {
        const el =
          document.querySelector('meta[name="description"]') ||
          document.querySelector('meta[property="og:description"]') ||
          document.querySelector('meta[name="twitter:description"]');
        return el ? (el.getAttribute("content") ?? "") : "";
      };

      const getHeadings = (tag: string): string[] => {
        return Array.from(document.querySelectorAll(tag))
          .map((el) => (el.textContent ?? "").trim())
          .filter((text) => text.length > 0);
      };

      const getContent = (): string => {
        const el =
          document.querySelector("main") ||
          document.querySelector("article") ||
          document.querySelector(".content") ||
          document.querySelector("#content") ||
          document.querySelector('[role="main"]') ||
          document.body;
        if (!el) return "";
        let text = (el.textContent || "").replace(/\s+/g, " ").trim();
        return text.length > 800 ? text.substring(0, 800) + "..." : text;
      };

      return {
        url: window.location.href,
        title: document.title ?? "",
        description: getDescription(),
        headings: {
          h1: getHeadings("h1"),
          h2: getHeadings("h2"),
          h3: getHeadings("h3"),
        },
        content: getContent(),
      };
    });

    await page.close();
    return scrapedData;
  } finally {
    if (browser) await browser.close();
  }
}

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
      } catch (apptErr) {
        console.error("Failed to seed default appointment questions:", apptErr);
      }
    }

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

    await Promise.all([
      webFaq.deleteMany({ clerkId: userId, chatbotType: chatbotId }),
      WebChatConversation.deleteMany({
        clerkId: userId,
        chatbotType: chatbotId,
      }),
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

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/web/chatbot/update-knowledge ───────────────────────────────────
// Updates website URL and rescrapes the website for knowledge base

export const updateWebsiteKnowledgeController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { url, chatbotId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    if (!url || !chatbotId) {
      return res.status(400).json({
        success: false,
        error: "URL and chatbotId are required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const chatbot = await WebChatbot.findOne({
      _id: chatbotId,
      clerkId: userId,
    });

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if URL is the same and already scraped
    const isSameUrl = chatbot.websiteUrl === url;
    const isAlreadyScraped = chatbot.isScrapped && chatbot.scrappedFile;

    if (isSameUrl && isAlreadyScraped) {
      return res.status(200).json({
        success: true,
        data: {
          alreadyScrapped: true,
          message:
            "Website already scraped with current URL. No changes needed.",
          cloudinaryUrl: chatbot.scrappedFile,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update the website URL first
    await WebChatbot.updateOne(
      { _id: chatbotId, clerkId: userId },
      {
        $set: {
          websiteUrl: url,
          updatedAt: new Date(),
        },
      },
    );

    // Scrape the website
    const scrapedData = await scrapeSinglePage(url);

    // Format data for storage
    const formattedData = {
      [url]: `Title: ${scrapedData.title}. Description: ${scrapedData.description}. Content: ${scrapedData.content.substring(0, 500)}`,
    };

    // Upload to Cloudinary
    const fileName = `${chatbotId}_${Date.now()}_knowledge`;
    const cloudinaryUrl = await uploadTextToCloudinary(
      JSON.stringify(formattedData, null, 2),
      fileName,
    );

    // Update chatbot with scraped data
    await WebChatbot.updateOne(
      { _id: chatbotId, clerkId: userId },
      {
        $set: {
          scrappedFile: cloudinaryUrl,
          isScrapped: true,
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        alreadyScrapped: false,
        message: "Website scraped and knowledge base updated successfully",
        cloudinaryUrl,
        scrapedData: {
          title: scrapedData.title,
          description: scrapedData.description,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Update knowledge error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update knowledge base",
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── POST /api/web/chatbot/upload-knowledge ───────────────────────────────────
// Uploads a file to the knowledge base

export const uploadKnowledgeFileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { chatbotId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    if (!chatbotId) {
      return res.status(400).json({
        success: false,
        error: "Chatbot ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const chatbot = await WebChatbot.findOne({
      _id: chatbotId,
      clerkId: userId,
    });

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Read file content
    const fileContent = req.file.buffer.toString("utf-8");
    const fileName = `${chatbotId}_file_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Get existing knowledge base if any
    let existingData: any = {};
    if (chatbot.scrappedFile) {
      try {
        const response = await fetch(chatbot.scrappedFile);
        const text = await response.text();
        existingData = JSON.parse(text);
      } catch (error) {
        console.error("Failed to fetch existing data:", error);
      }
    }

    // Add new file data
    existingData[fileName] = {
      type: "file_upload",
      name: req.file.originalname,
      contentType: req.file.mimetype,
      content: fileContent.substring(0, 3000),
      uploadedAt: new Date().toISOString(),
    };

    // Upload merged data to Cloudinary
    const mergedCloudinaryUrl = await uploadTextToCloudinary(
      JSON.stringify(existingData, null, 2),
      `${chatbotId}_knowledge_base`,
    );

    // Update chatbot
    await WebChatbot.updateOne(
      { _id: chatbotId, clerkId: userId },
      {
        $set: {
          scrappedFile: mergedCloudinaryUrl,
          isScrapped: true,
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        message: "File uploaded and knowledge base updated",
        fileName: req.file.originalname,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to upload file",
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── GET /api/web/chatbot/knowledge-status/:chatbotId ─────────────────────────
// Gets the current knowledge base status

export const getKnowledgeStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    const { chatbotId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const chatbot = await WebChatbot.findOne({
      _id: chatbotId,
      clerkId: userId,
    });

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        isScrapped: chatbot.isScrapped,
        hasKnowledgeBase: !!chatbot.scrappedFile,
        websiteUrl: chatbot.websiteUrl,
        lastUpdated: chatbot.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Get knowledge status error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get knowledge status",
      timestamp: new Date().toISOString(),
    });
  }
};
