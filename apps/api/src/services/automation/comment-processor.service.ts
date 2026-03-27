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
      return { success: false, message: "Comment already processed" };
    }

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive) {
      return { success: false, message: "Account not found or inactive" };
    }

    // Skip if comment is from owner
    if (account.userInstaId === comment.user_id) {
      return { success: false, message: "Comment from account owner" };
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
        automationType: "comments",
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: "Not a meaningful comment",
        createdAt: new Date(),
      });
      return { success: false, message: "Not a meaningful comment" };
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
        return { success: false, message: "No matching template found" };
      }
    }

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
        if (matchingTemplate.publicReply.tagType === "user") {
          publicReplyText = `@${comment.username} ${publicReplyText}`;
        } else if (matchingTemplate.publicReply.tagType === "account") {
          publicReplyText = `@${account.username} ${publicReplyText}`;
        }
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

    // Process DM flow
    const dmResult = await processDMFlow(
      account,
      clerkId,
      userTier,
      matchingTemplate,
      comment.user_id,
      comment.username,
      comment.id,
    );

    // Update template usage
    await InstaReplyTemplate.findByIdAndUpdate(matchingTemplate._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    });

    // Update account statistics
    account.accountReply = (account.accountReply || 0) + 1;
    account.lastActivity = new Date();
    if (dmResult.dmSent)
      account.accountDMSent = (account.accountDMSent || 0) + 1;
    if (dmResult.followChecked)
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
    await account.save();

    // Create reply log
    const log = await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      templateId: matchingTemplate._id.toString(),
      templateName: matchingTemplate.name,
      automationType: "comments",
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
      followUpCount: 0,
      followUpCompleted: false,
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
    await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      commentId: comment.id,
      commentText: comment.text,
      commenterUsername: comment.username,
      commenterUserId: comment.user_id,
      mediaId: comment.media_id,
      automationType: "comments",
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

    if (template.anyPostOrReel) {
      if (!template.anyKeyword && template.triggers?.length > 0) {
        const hasMatch = template.triggers.some(
          (trigger: string) =>
            trigger &&
            lowerComment.includes(trigger.toLowerCase().replace(/\s+/g, "")),
        );
        if (hasMatch) return template;
      } else if (template.anyKeyword) {
        return template;
      }
    } else {
      if (template.mediaId !== mediaId) continue;
      if (template.triggers?.length > 0) {
        const hasMatch = template.triggers.some(
          (trigger: string) =>
            trigger &&
            lowerComment.includes(trigger.toLowerCase().replace(/\s+/g, "")),
        );
        if (hasMatch) return template;
      } else {
        return template;
      }
    }
  }
  return null;
}

/**
 * Process DM flow - sends the welcome message as a reply to the comment.
 *
 * PRIORITY (highest to lowest): askFollow → askEmail → askPhone → direct link
 * BUG FIX: The button payload must match the priority chain.
 */
async function processDMFlow(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  recipientUsername: string,
  commentId: string,
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
      hasAskFollow: template.askFollow?.enabled,
      hasAskEmail: template.askEmail?.enabled,
      hasAskPhone: template.askPhone?.enabled,
    });

    const welcomeText = template.welcomeMessage.text.replace(
      /\{\{username\}\}/g,
      recipientUsername,
    );

    const hasAskFollow = template.askFollow?.enabled;
    const hasAskEmail = template.askEmail?.enabled;
    const hasAskPhone = template.askPhone?.enabled;

    // ✅ FIXED: Priority is askFollow > askEmail > askPhone > direct link
    let buttonPayload = "";
    const buttonTitle = template.welcomeMessage.buttonTitle;

    if (hasAskFollow) {
      // First gate: check follow
      buttonPayload = `CHECK_FOLLOW_${template.mediaId}`;
    } else if (hasAskEmail) {
      // First gate: ask email
      buttonPayload = `ASK_EMAIL_${template.mediaId}`;
    } else if (hasAskPhone) {
      // First gate: ask phone
      buttonPayload = `ASK_PHONE_${template.mediaId}`;
    } else {
      // No gates: send final link directly
      buttonPayload = `GET_ACCESS_${template.mediaId}`;
    }

    console.log(
      `Sending welcome message to ${recipientUsername} as reply to comment ${commentId}`,
      {
        buttonTitle,
        buttonPayload,
      },
    );

    // Send welcome message as reply to the comment
    const welcomeSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      commentId, // reply to comment
      {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: welcomeText,
            buttons: [
              {
                type: "postback",
                title: buttonTitle,
                payload: buttonPayload,
              },
            ],
          },
        },
      },
      true, // isCommentReply = true
    );

    if (!welcomeSuccess) {
      console.error(`Failed to send welcome message to ${recipientUsername}`);
    } else {
      console.log(`Welcome message sent as reply to comment ${commentId}`);
    }

    return {
      success: welcomeSuccess,
      dmSent: welcomeSuccess,
      followChecked: false,
      userFollows: undefined,
      linkSent: !hasAskFollow && !hasAskEmail && !hasAskPhone,
      stage: "welcome",
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

function isMeaningfulComment(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  const lowerText = trimmed.toLowerCase();
  const gifKeywords = ["gif", "sent a gif", "shared a gif"];
  if (gifKeywords.some((keyword) => lowerText.includes(keyword))) return false;

  const textWithoutEmojis = trimmed.replace(
    /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu,
    "",
  );
  const cleanedText = textWithoutEmojis.replace(/[\s\p{P}]/gu, "");
  if (cleanedText.length > 0) return true;

  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  if (!hasAlphanumeric) return false;

  const emojiOnlyRegex = /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u;
  if (emojiOnlyRegex.test(trimmed)) return false;

  return true;
}

function selectRandomItem(items: string[]): string {
  if (!items || items.length === 0) return "";
  return items[Math.floor(Math.random() * items.length)];
}
