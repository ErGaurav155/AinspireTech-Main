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

    return res.status(200).json({
      success: true,
      data: {
        templates,
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
      mediaId,
      mediaUrl,
      name,
      content,
      reply,
      triggers,
      priority,
      delaySeconds,
      isFollow,
      triggerType = "keywords",
      caseSensitive = false,
      excludeOwnComments = true,
      excludeRepliedUsers = true,
      excludeKeywords = [],
      replyProbability = 100,
      maxRetries = 3,
      retryDelay = 60,
    } = req.body;

    // Validation
    if (!userId || !accountId || !name || !content || !reply || !mediaId) {
      return res.status(400).json({
        success: false,
        error:
          "Required fields: userId, accountId, name, content, reply, mediaId",
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

    // Ensure content is array with required fields
    if (
      !Array.isArray(content) ||
      content.length === 0 ||
      content.some(
        (item: any) =>
          !item.text ||
          typeof item.text !== "string" ||
          !item.link ||
          typeof item.link !== "string",
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Content must be a non-empty array of { text, link, buttonTitle? } objects",
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure reply is array
    if (!Array.isArray(reply) || reply.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Reply must be a non-empty array of strings",
        timestamp: new Date().toISOString(),
      });
    }

    // Check for duplicate mediaId for this account
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

    // Normalize triggers if provided
    let formattedTriggers: string[] = [];
    if (triggers && Array.isArray(triggers)) {
      formattedTriggers = triggers.map((t: string) => t.trim().toLowerCase());
    } else if (triggers && typeof triggers === "string") {
      formattedTriggers = triggers
        .split(",")
        .map((t: string) => t.trim().toLowerCase());
    }

    // Normalize reply
    const formattedReply = Array.isArray(reply)
      ? reply.map((r: string) => r.trim())
      : [String(reply).trim()];

    // Normalize content
    const formattedContent = content.map((item: any) => ({
      text: item.text.trim(),
      link: item.link.trim(),
      buttonTitle: item.buttonTitle?.trim() || "Get Access",
    }));

    // Normalize excludeKeywords
    const formattedExcludeKeywords = Array.isArray(excludeKeywords)
      ? excludeKeywords.map((k: string) => k.trim().toLowerCase())
      : [];

    // Get user tier for settingsByTier
    const userTier = await getUserTier(userId);

    // Default settings by tier
    const settingsByTier = {
      free: {
        enabled: true,
        requireFollow: false,
        skipFollowCheck: true,
        directLink: true,
        maxUsesPerDay: 50,
      },
      pro: {
        enabled: true,
        requireFollow: true,
        useAdvancedFlow: true,
        maxRetries: 3,
        maxUsesPerDay: 500,
      },
    };

    // Create new template
    const template = await ReplyTemplate.create({
      userId,
      accountId,
      name: name.trim(),
      description: req.body.description?.trim() || "",
      mediaId,
      mediaUrl: mediaUrl?.trim() || "",
      replyTexts: formattedReply,
      replyProbability: Math.min(100, Math.max(0, replyProbability)),
      dmFlowEnabled: true,
      dmContents: [
        {
          stage: "initial",
          message: isFollow
            ? "Hey thanks a ton for the comment! 😊 Now simply tap below and I will send you the access right now!"
            : "Thanks for your comment! Tap below to get instant access!",
          buttonText: isFollow ? "Send me the access" : "Get Access",
          buttonPayload: isFollow
            ? `CHECK_FOLLOW_${mediaId}`
            : `GET_ACCESS_${mediaId}`,
          requiresFollow: !!isFollow,
          delaySeconds: delaySeconds || 0,
        },
        {
          stage: "follow_reminder",
          message:
            'I noticed you have not followed us yet. It would mean a lot if you visit our profile and hit follow, then tap "I am following" to unlock your link!',
          buttonText: "I am following",
          buttonPayload: `VERIFY_FOLLOW_${mediaId}`,
          requiresFollow: true,
          delaySeconds: 0,
        },
        {
          stage: "final_link",
          message: "Awesome! Thanks for following! {{content_text}}",
          requiresFollow: false,
          delaySeconds: 0,
        },
      ],
      triggerType: triggerType || "all_comments",
      triggers: formattedTriggers,
      caseSensitive: !!caseSensitive,
      excludeOwnComments: !!excludeOwnComments,
      excludeRepliedUsers: !!excludeRepliedUsers,
      excludeKeywords: formattedExcludeKeywords,
      replyDelay: delaySeconds || 5,
      maxRetries: maxRetries || 3,
      retryDelay: retryDelay || 60,
      usageCount: 0,
      successfulUses: 0,
      lastUsed: null,
      settingsByTier,
      isActive: true,
      priority: priority || 5,
      isFollow: !!isFollow,
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
