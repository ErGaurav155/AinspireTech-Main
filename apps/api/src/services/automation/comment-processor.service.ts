import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import {
  sendInstagramCommentReply,
  sendInstagramDM,
  checkFollowStatus,
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
 * Process comment automation - Fire and forget approach
 * NO rate limiting, NO queueing, NO retries
 * Just attempt to send and log the result
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
    if (account.instagramId === comment.user_id) {
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
        mediaId: comment.media_id,
        isActive: true,
      }).sort({ priority: 1 });

      matchingTemplate = await findMatchingTemplate(comment.text, templates);
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

    // Process comment reply - fire and forget
    let commentReplySuccess = false;
    let commentReplyText = "";

    try {
      // Select random reply from template
      const randomIndex = Math.floor(
        Math.random() * matchingTemplate.reply.length,
      );
      commentReplyText = matchingTemplate.reply[randomIndex];

      // Send comment reply via Meta API - NO rate limit check, just send
      commentReplySuccess = await sendInstagramCommentReply(
        account.instagramId,
        account.accessToken,
        comment.id,
        comment.media_id,
        commentReplyText,
      );
    } catch (error) {
      console.error("Failed to send comment reply:", error);
      commentReplySuccess = false;
    }

    // Process DM flow - fire and forget
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
      replyText: commentReplyText,
      replyType:
        commentReplySuccess && dmResult.dmSent
          ? "both"
          : commentReplySuccess
            ? "comment"
            : dmResult.dmSent
              ? "dm"
              : "none",
      dmFlowStage: dmResult.stage,
      dmMessageId: dmResult.messageId,
      followChecked: dmResult.followChecked,
      userFollows: dmResult.userFollows,
      linkSent: dmResult.linkSent,
      success: commentReplySuccess || dmResult.success,
      responseTime: Date.now() - startTime,
      errorMessage:
        !commentReplySuccess && !dmResult.success
          ? "Failed to process comment"
          : undefined,
      wasQueued: false, // Never queued
      createdAt: new Date(),
    });

    return {
      success: commentReplySuccess || dmResult.success,
      message:
        commentReplySuccess && dmResult.success
          ? "Comment and DM processed successfully"
          : commentReplySuccess
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

async function findMatchingTemplate(commentText: string, templates: any[]) {
  const lowerComment = commentText.toLowerCase();

  for (const template of templates) {
    if (!template.isActive) continue;

    // Check triggers
    if (template.triggers && template.triggers.length > 0) {
      const hasMatch = template.triggers.some((trigger: string) => {
        if (!trigger) return false;
        return lowerComment.includes(trigger.toLowerCase().replace(/\s+/g, ""));
      });

      if (hasMatch) {
        return template;
      }
    } else {
      // If no triggers, match all comments
      return template;
    }
  }

  return null;
}

/**
 * Process DM flow - fire and forget, no rate limiting
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
  const templateSettings =
    template.settingsByTier[userTier] || template.settingsByTier.free;

  // For free users with direct link - just send it
  if (userTier === "free" && templateSettings.directLink) {
    try {
      const randomIndex = Math.floor(Math.random() * template.content.length);
      const {
        text,
        link,
        buttonTitle = "Get Access",
      } = template.content[randomIndex];

      // Send DM with direct link - fire and forget
      const dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `Thanks for your comment! ${text}`,
              buttons: [
                {
                  type: "web_url",
                  url: link,
                  title: buttonTitle,
                  webview_height_ratio: "full",
                },
              ],
            },
          },
        },
      );

      return {
        success: dmSuccess,
        dmSent: dmSuccess,
        followChecked: false,
        linkSent: dmSuccess,
        stage: "final_link",
      };
    } catch (error) {
      console.error("Failed to send direct link DM:", error);
      return {
        success: false,
        dmSent: false,
        followChecked: false,
        linkSent: false,
        stage: "initial",
      };
    }
  }

  // For free users without direct link or pro users - send initial DM
  let initialButtonPayload = "";
  let initialButtonText = "";

  if (userTier === "free") {
    initialButtonPayload = `GET_ACCESS_${template.mediaId}`;
    initialButtonText = "Get Access";
  } else {
    initialButtonPayload = `CHECK_FOLLOW_${template.mediaId}`;
    initialButtonText = "Send me the access";
  }

  try {
    // Send initial DM with button - fire and forget
    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      recipientId,
      {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text:
              userTier === "free"
                ? "Thanks for your comment! Tap below to get instant access!"
                : "Hey thanks a ton for the comment! 😊 Now simply tap below and I will send you the access right now!",
            buttons: [
              {
                type: "postback",
                title: initialButtonText,
                payload: initialButtonPayload,
              },
            ],
          },
        },
      },
    );

    return {
      success: dmSuccess,
      dmSent: dmSuccess,
      followChecked: false,
      linkSent: false,
      stage: "initial",
    };
  } catch (error) {
    console.error("Failed to send initial DM:", error);
    return {
      success: false,
      dmSent: false,
      followChecked: false,
      linkSent: false,
      stage: "initial",
    };
  }
}

function isMeaningfulComment(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const cleaned = text.replace(/\s+/g, "").replace(/[^\w]/g, "");
  if (cleaned.length === 0) return false;

  // Emoji regex
  const emojiRegex = /^[\u203C-\u3299\u1F000-\u1FAFF\uFE0F]+$/i;
  if (emojiRegex.test(cleaned)) return false;

  // Check for GIF comments
  if (text.toLowerCase().includes("gif") || text.includes("sent a GIF")) {
    return false;
  }

  return true;
}
