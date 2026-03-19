import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { getAuth } from "@clerk/express";
import { getUserTier } from "@/services/rate-limit.service";

// GET /api/insta/templates - Get Instagram templates
export const getInstaTemplatesController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const { userId } = getAuth(req);
    const accountId = req.query.accountId as string;
    const loadCount = req.query.loadMoreCount as string;
    const loadMoreCount = parseInt(loadCount || "0");
    const searchKey = req.query.search as string;
    const search = searchKey || "";
    const filterAccount = (req.query.filterAccount as string) || "all";
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Build query based on parameters
    let query: any = { userId };

    // If accountId is provided, get templates only for that specific account
    if (accountId) {
      query.accountId = accountId;
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "content.text": { $regex: search, $options: "i" } },
        { triggers: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const templates = await ReplyTemplate.find(query)
      .sort({ priority: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await ReplyTemplate.countDocuments(query);
    const hasMore = skip + limit < totalCount;

    // Format templates to match frontend expectations
    const formattedTemplates = templates.map((template) => ({
      _id: template._id,
      name: template.name,
      userId: template.userId,
      accountId: template.accountId,
      accountUsername: template.accountUsername,
      content: template.content,
      reply: template.reply,
      triggers: template.triggers,
      isFollow: template.isFollow,
      priority: template.priority,
      mediaId: template.mediaId,
      mediaUrl: template.mediaUrl,
      mediaType: template.mediaType,
      isActive: template.isActive,
      usageCount: template.usageCount || 0,
      lastUsed: template.lastUsed,
      successRate: template.successRate || 0,
      delaySeconds: template.delaySeconds || 0,
      delayOption: template.delayOption || "immediate",
      automationType: template.automationType || "comments",
      anyPostOrReel: template.anyPostOrReel || false,
      anyKeyword: template.anyKeyword || false,
      welcomeMessage: template.welcomeMessage,
      publicReply: template.publicReply,
      askFollow: template.askFollow,
      askEmail: template.askEmail,
      askPhone: template.askPhone,
      followUpDMs: template.followUpDMs,
    }));

    return res.status(200).json({
      success: true,
      data: {
        templates: formattedTemplates,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          hasMore,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
      timestamp: new Date().toISOString(),
    });
  }
};
// POST /api/insta/templates - Create Instagram template
export const createInstaTemplateController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    const {
      accountId,
      accountUsername,
      mediaId,
      mediaUrl,
      mediaType,
      name,
      content,
      reply,
      triggers,
      priority,
      delaySeconds,
      delayOption,
      isFollow,
      automationType,
      anyPostOrReel,
      anyKeyword,
      welcomeMessage,
      publicReply,
      askFollow,
      askEmail,
      askPhone,
      followUpDMs,
      isActive,
    } = req.body;
    console.log("req.body:", req.body);
    // Validation
    if (!userId || !accountId || !name) {
      return res.status(400).json({
        success: false,
        error: "Required fields: userId, accountId, name",
        timestamp: new Date().toISOString(),
      });
    }

    // Verify account exists and user owns it
    const account = await InstagramAccount.findOne({
      instagramId: accountId,
      userId: userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Instagram account not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check for duplicate mediaId for this account (only if mediaId exists and not "any")
    if (mediaId && mediaId !== "any") {
      const existingTemplate = await ReplyTemplate.findOne({
        accountId,
        mediaId,
        userId,
      });

      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          error: "A template already exists for this post",
          existingTemplate: {
            _id: existingTemplate._id,
            name: existingTemplate.name,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Get user tier for settingsByTier
    const userTier = await getUserTier(userId);

    // Default settings by tier
    const settingsByTier = {
      free: {
        requireFollow: false,
        skipFollowCheck: true,
        directLink: true,
        maxUsesPerDay: 50,
      },
      pro: {
        requireFollow: true,
        useAdvancedFlow: true,
        maxRetries: 3,
        maxUsesPerDay: 500,
      },
    };

    // Create new template with all fields
    const template = await ReplyTemplate.create({
      userId,
      accountId,
      accountUsername: accountUsername || account.username,
      name: name.trim(),
      mediaId: anyPostOrReel ? "any" : mediaId || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",

      // Core DM content
      content: content || [{ text: "", link: "", buttonTitle: "Get Access" }],

      // Comment replies
      reply: reply || [],

      // Triggers
      triggers: triggers || [],

      // Legacy follow flag
      isFollow: isFollow || false,

      // Timing
      delaySeconds: delaySeconds || 0,
      delayOption: delayOption || "immediate",

      // Status
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 5,

      // Statistics
      usageCount: 0,
      successfulUses: 0,
      lastUsed: null,
      successRate: 0,

      // Legacy tier settings
      settingsByTier,

      // New automation fields
      automationType: automationType || "comments",
      anyPostOrReel: anyPostOrReel || false,
      anyKeyword: anyKeyword || false,

      // Welcome message
      welcomeMessage: welcomeMessage || {
        enabled: false,
        text: "Hi {{username}}! So glad you're interested 🎉\nClick below and I'll share the link with you in a moment 🧲",
        buttonTitle: "Send me the link",
      },

      // Public reply
      publicReply: publicReply || {
        enabled: false,
        replies: [
          "Replied in DMs 📨",
          "Coming your way 🧲",
          "Check your DM 📩",
        ],
        tagType: "none",
      },

      // Ask follow
      askFollow: askFollow || {
        enabled: false,
        message:
          "Hey! It seems you haven't followed me yet 🙂\n\nHit the follow button on my profile, then tap 'I'm following' below to get your link 🧲",
        visitProfileBtn: "Visit Profile",
        followingBtn: "I'm following ✅",
      },

      // Ask email
      askEmail: askEmail || {
        enabled: false,
        openingMessage:
          "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your email address first. Please share it in the chat.",
        retryMessage:
          "Please enter a correct email address, e.g. info@gmail.com",
        sendDmIfNoEmail: true,
      },

      // Ask phone
      askPhone: askPhone || {
        enabled: false,
        openingMessage:
          "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your phone number first. Please share it in the chat.",
        retryMessage: "Please enter a correct phone number, e.g. +1234567890",
        sendDmIfNoPhone: true,
      },

      // Follow-up DMs
      followUpDMs: followUpDMs || {
        enabled: false,
        messages: [],
      },

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: {
        template,
        message: "Template created successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating template:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A template with similar configuration already exists",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create template",
      timestamp: new Date().toISOString(),
    });
  }
};
