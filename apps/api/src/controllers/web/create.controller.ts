import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import WebSubscription from "@/models/web/Websubcription.model";
import { getAuth } from "@clerk/express";

// POST /api/web/chatbot/create - Create a new chatbot
export const createChatbotController = async (req: Request, res: Response) => {
  try {
    // Get userId from auth headers (using your pattern)
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { name, type, websiteUrl, subscriptionId } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name and type are required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Check if user already has this type of chatbot
    const existingChatbot = await WebChatbot.findOne({
      clerkId: userId,
      type,
    });

    if (existingChatbot) {
      return res.status(400).json({
        success: false,
        error: "You can only create one chatbot of this type",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if subscription is active for this chatbot type (if provided)
    if (subscriptionId) {
      const subscription = await WebSubscription.findOne({
        clerkId: userId,
        chatbotType: type,
        status: "active",
        subscriptionId,
      });

      if (!subscription) {
        return res.status(400).json({
          success: false,
          error: "Active subscription required for this chatbot type",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Generate embed code
    const chatbotId = new ObjectId();
    const apiUrl = process.env.API_URL || "http://localhost:3002";

    const embedCode = `<script>
  (function() {
    const chatbotConfig = {
      id: '${chatbotId}',
      apiUrl: '${apiUrl}/api/chatbot',
      settings: {
        welcomeMessage: "Hello! How can I help you today?",
        primaryColor: "#3B82F6",
        position: "bottom-right",
        autoExpand: true
      }
    };
    
    const script = document.createElement('script');
    script.src = '${apiUrl}/chatbot-embed.js';
    script.setAttribute('data-chatbot-config', JSON.stringify(chatbotConfig));
    document.head.appendChild(script);
  })();
</script>`;

    // Create new chatbot
    const newChatbot = new WebChatbot({
      _id: chatbotId,
      clerkId: userId,
      name,
      type,
      websiteUrl: websiteUrl || null,
      embedCode,
      settings: {
        welcomeMessage: "Hello! How can I help you today?",
        primaryColor: "#3B82F6",
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
      subscriptionId: subscriptionId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdChatbot = await newChatbot.save();

    return res.status(201).json({
      success: true,
      data: {
        message: "Chatbot created successfully",
        chatbot: {
          id: createdChatbot._id,
          ...createdChatbot.toObject(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot creation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
