// services/automation/comment-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import {
  sendInstagramCommentReply,
  sendInstagramDM,
} from "@/services/meta-api/meta-api.service";

interface InstagramComment {
  id: string;
  text: string;
  username: string;
  user_id: string;
  timestamp: string;
  media_id: string;
  media_url?: string;
}

/**
 * Process comment automation - FIRE AND FORGET
 * NO rate limiting, NO queueing, NO retries
 * Automation responses are NOT counted against rate limits
 */
export async function processCommentAutomation(
  accountId: string,
  clerkId: string,
  comment: InstagramComment,
  template?: any,
): Promise<{
  success: boolean;
  message: string;
  logId?: string;
}> {
  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Check if comment already processed
    const existingLog = await InstaReplyLog.findOne({ commentId: comment.id });
    if (existingLog) {
      return {
        success: false,
        message: "Comment already processed",
      };
    }

    // Get account
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive) {
      return {
        success: false,
        message: "Account not found or inactive",
      };
    }

    // Skip if comment is from owner
    if (account.userInstaId === comment.user_id) {
      return {
        success: false,
        message: "Comment from account owner",
      };
    }

    // Check if comment is meaningful
    if (!isMeaningfulComment(comment.text)) {
      await InstaReplyLog.create({
        userId: clerkId,
        accountId: accountId,
        commentId: comment.id,
        commentText: comment.text,
        commenterUsername: comment.username,
        commenterUserId: comment.user_id,
        mediaId: comment.media_id,
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: "Not a meaningful comment",
        createdAt: new Date(),
      });

      return {
        success: false,
        message: "Not a meaningful comment",
      };
    }

    // Find matching template if not provided
    let matchingTemplate = template;
    if (!matchingTemplate) {
      const templates = await InstaReplyTemplate.find({
        userId: clerkId,
        accountId: accountId,
        isActive: true,
        automationType: "comments",
      }).sort({ priority: 1 });

      matchingTemplate = await findMatchingTemplate(
        comment.text,
        comment.media_id,
        templates,
      );

      if (!matchingTemplate) {
        return {
          success: false,
          message: "No matching template found",
        };
      }
    }

    // Get user tier
    const { getUserTier } = await import("@/services/rate-limit.service");
    const userTier = await getUserTier(clerkId);

    // Process public reply if enabled
    let publicReplySuccess = false;
    let publicReplyText = "";

    if (matchingTemplate.publicReply?.enabled) {
      try {
        publicReplyText = selectRandomItem(
          matchingTemplate.publicReply.replies,
        );

        // Add tag if specified
        if (matchingTemplate.publicReply.tagType === "user") {
          publicReplyText = `@${comment.username} ${publicReplyText}`;
        } else if (matchingTemplate.publicReply.tagType === "account") {
          publicReplyText = `@${account.username} ${publicReplyText}`;
        }

        // Send public comment reply - FIRE AND FORGET (no rate limit)
        publicReplySuccess = await sendInstagramCommentReply(
          account.instagramId,
          account.accessToken,
          comment.id,
          comment.media_id,
          publicReplyText,
        );
      } catch (error) {
        console.error("Failed to send public reply:", error);
        publicReplySuccess = false;
      }
    }

    // Process DM flow - FIRE AND FORGET (no rate limit)
    const dmResult = await processDMFlow(
      account,
      clerkId,
      userTier,
      matchingTemplate,
      comment.user_id,
      comment.username,
    );

    // Update template usage
    await InstaReplyTemplate.findByIdAndUpdate(matchingTemplate._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    });

    // Update account statistics
    account.accountReply = (account.accountReply || 0) + 1;
    account.lastActivity = new Date();
    if (dmResult.dmSent) {
      account.accountDMSent = (account.accountDMSent || 0) + 1;
    }
    if (dmResult.followChecked) {
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
    }
    await account.save();

    // Create reply log
    const log = await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      templateId: matchingTemplate._id.toString(),
      templateName: matchingTemplate.name,
      commentId: comment.id,
      commentText: comment.text,
      commenterUsername: comment.username,
      commenterUserId: comment.user_id,
      mediaId: comment.media_id,
      replyText: publicReplyText,
      replyType:
        publicReplySuccess && dmResult.dmSent
          ? "both"
          : publicReplySuccess
            ? "comment"
            : dmResult.dmSent
              ? "dm"
              : "none",
      dmFlowStage: dmResult.stage,
      dmMessageId: dmResult.messageId,
      followChecked: dmResult.followChecked,
      userFollows: dmResult.userFollows,
      linkSent: dmResult.linkSent,
      success: publicReplySuccess || dmResult.success,
      responseTime: Date.now() - startTime,
      errorMessage:
        !publicReplySuccess && !dmResult.success
          ? "Failed to process comment"
          : undefined,
      wasQueued: false,
      createdAt: new Date(),
    });

    return {
      success: publicReplySuccess || dmResult.success,
      message:
        publicReplySuccess && dmResult.success
          ? "Comment and DM processed successfully"
          : publicReplySuccess
            ? "Comment replied, DM failed"
            : dmResult.success
              ? "DM sent, comment failed"
              : "Failed to process comment",
      logId: log._id.toString(),
    };
  } catch (error) {
    console.error("Error processing comment automation:", error);

    // Create error log
    await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      commentId: comment.id,
      commentText: comment.text,
      commenterUsername: comment.username,
      commenterUserId: comment.user_id,
      mediaId: comment.media_id,
      success: false,
      responseTime: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      createdAt: new Date(),
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to process comment",
    };
  }
}

/**
 * Find matching template based on media ID and triggers
 */
async function findMatchingTemplate(
  commentText: string,
  mediaId: string,
  templates: any[],
) {
  const lowerComment = commentText.toLowerCase();

  for (const template of templates) {
    if (!template.isActive) continue;

    // Check if template is for "any post or reel"
    if (template.anyPostOrReel) {
      // Check triggers if "any keyword" is NOT enabled
      if (!template.anyKeyword && template.triggers?.length > 0) {
        const hasMatch = template.triggers.some((trigger: string) => {
          if (!trigger) return false;
          return lowerComment.includes(
            trigger.toLowerCase().replace(/\s+/g, ""),
          );
        });

        if (hasMatch) {
          return template;
        }
      } else if (template.anyKeyword) {
        // Any keyword enabled - match any comment
        return template;
      }
    } else {
      // Template is for specific media
      if (template.mediaId !== mediaId) continue;

      // Check triggers
      if (template.triggers && template.triggers.length > 0) {
        const hasMatch = template.triggers.some((trigger: string) => {
          if (!trigger) return false;
          return lowerComment.includes(
            trigger.toLowerCase().replace(/\s+/g, ""),
          );
        });

        if (hasMatch) {
          return template;
        }
      } else {
        // If no triggers, match all comments on this media
        return template;
      }
    }
  }

  return null;
}

/**
 * Process DM flow - FIRE AND FORGET (no rate limiting)
 * UPDATED to match the working pattern
 */
async function processDMFlow(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  recipientUsername: string,
): Promise<{
  success: boolean;
  dmSent: boolean;
  followChecked: boolean;
  userFollows?: boolean;
  messageId?: string;
  linkSent: boolean;
  stage: string;
}> {
  try {
    console.log(`Processing DM flow for user ${recipientUsername}`, {
      templateName: template.name,
      hasWelcomeMessage: template.welcomeMessage?.enabled,
      hasAskFollow: template.askFollow?.enabled,
      hasAskEmail: template.askEmail?.enabled,
      hasAskPhone: template.askPhone?.enabled,
    });

    // Send welcome message if enabled
    if (template.welcomeMessage?.enabled) {
      const welcomeText = template.welcomeMessage.text.replace(
        /\{\{username\}\}/g,
        recipientUsername,
      );

      console.log(`Sending welcome message to ${recipientUsername}`);

      const welcomeSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: welcomeText,
              buttons: [
                {
                  type: "postback",
                  title: template.welcomeMessage.buttonTitle || "Get Started",
                  payload: `WELCOME_${template.mediaId}`,
                },
              ],
            },
          },
        },
        false, // isCommentReply = false for DMs
      );

      if (!welcomeSuccess) {
        console.error(`Failed to send welcome message to ${recipientUsername}`);
      } else {
        console.log(`Welcome message sent to ${recipientUsername}`);
      }

      return {
        success: welcomeSuccess,
        dmSent: welcomeSuccess,
        followChecked: false,
        linkSent: false,
        stage: "welcome",
      };
    }

    // Send initial DM with appropriate flow based on template settings
    let initialButtonPayload = "";
    let initialButtonText = "Get Access";
    let initialMessage = "Thanks for your comment!";
    let hasButtons = true;

    const hasAskFollow = template.askFollow?.enabled;
    const hasAskEmail = template.askEmail?.enabled;
    const hasAskPhone = template.askPhone?.enabled;

    if (hasAskFollow) {
      initialButtonPayload = `CHECK_FOLLOW_${template.mediaId}`;
      initialButtonText =
        template.askFollow?.visitProfileBtn || "Send me the link";
      initialMessage =
        template.askFollow?.message?.replace(
          /\{\{username\}\}/g,
          recipientUsername,
        ) ||
        "Hey thanks a ton for the comment! 😊 Simply tap below and I will send you the access!";
    } else if (hasAskEmail) {
      initialButtonPayload = `ASK_EMAIL_${template.mediaId}`;
      initialButtonText = "Continue";
      initialMessage =
        template.askEmail?.openingMessage?.replace(
          /\{\{username\}\}/g,
          recipientUsername,
        ) || "Please share your email address to get access.";
    } else if (hasAskPhone) {
      initialButtonPayload = `ASK_PHONE_${template.mediaId}`;
      initialButtonText = "Continue";
      initialMessage =
        template.askPhone?.openingMessage?.replace(
          /\{\{username\}\}/g,
          recipientUsername,
        ) || "Please share your phone number to get access.";
    } else {
      // Direct link flow
      initialButtonPayload = `GET_ACCESS_${template.mediaId}`;
      initialButtonText = selectRandomItem(
        template.content?.map((c: any) => c.buttonTitle || "Get Access") || [
          "Get Access",
        ],
      );
      initialMessage = "Tap below to get instant access! 🎉";
    }

    console.log(`Sending initial DM to ${recipientUsername}`, {
      messageType: hasAskFollow
        ? "follow_gate"
        : hasAskEmail
          ? "email_collection"
          : hasAskPhone
            ? "phone_collection"
            : "direct_link",
    });

    const dmPayload: any = {};

    if (hasButtons && initialButtonPayload) {
      dmPayload.attachment = {
        type: "template",
        payload: {
          template_type: "button",
          text: initialMessage,
          buttons: [
            {
              type: "postback",
              title: initialButtonText,
              payload: initialButtonPayload,
            },
          ],
        },
      };
    } else {
      dmPayload.text = initialMessage;
    }

    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      recipientId,
      dmPayload,
      false, // isCommentReply = false for DMs
    );

    console.log(`Initial DM sent to ${recipientUsername}: ${dmSuccess}`);

    return {
      success: dmSuccess,
      dmSent: dmSuccess,
      followChecked: hasAskFollow,
      userFollows: false,
      linkSent: !hasAskFollow && !hasAskEmail && !hasAskPhone,
      stage: "initial",
    };
  } catch (error) {
    console.error("Failed to process DM flow:", error);
    return {
      success: false,
      dmSent: false,
      followChecked: false,
      linkSent: false,
      stage: "error",
    };
  }
}

/**
 * Check if comment is meaningful (not just emojis/GIFs)
 */
function isMeaningfulComment(text: string): boolean {
  // 1. Check if text exists and is not empty
  if (!text || typeof text !== "string") return false;

  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // 2. Check for GIF comments (Instagram specific)
  const lowerText = trimmed.toLowerCase();
  const gifKeywords = ["gif", "sent a gif", "shared a gif"];
  if (gifKeywords.some((keyword) => lowerText.includes(keyword))) {
    return false;
  }

  // 3. Remove emojis and special characters to check if meaningful text remains
  const textWithoutEmojis = trimmed.replace(
    /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu,
    "",
  );
  const cleanedText = textWithoutEmojis.replace(/[\s\p{P}]/gu, ""); // Remove spaces and punctuation

  // 4. If after removing emojis and punctuation we have meaningful characters
  if (cleanedText.length > 0) {
    return true;
  }

  // 5. Check if the original text contains any alphanumeric characters
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  if (!hasAlphanumeric) {
    return false;
  }

  // 6. Check if it's purely emoji (allow only if there are other characters)
  const emojiOnlyRegex = /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u;
  if (emojiOnlyRegex.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Select random item from array
 */
function selectRandomItem(items: string[]): string {
  if (!items || items.length === 0) return "";
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}
