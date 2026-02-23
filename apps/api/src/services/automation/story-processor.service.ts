// services/automation/story-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import { sendInstagramDM } from "@/services/meta-api/meta-api.service";

interface InstagramStory {
  id: string;
  media_id: string;
  user_id: string;
  username: string;
  mention_type: "mention" | "reply";
  timestamp: string;
}

/**
 * Process story automation - FIRE AND FORGET
 * NO rate limiting, NO queueing
 * Automation responses are NOT counted against rate limits
 */
export async function processStoryAutomation(
  accountId: string,
  clerkId: string,
  story: InstagramStory,
  template?: any,
): Promise<{
  success: boolean;
  message: string;
  logId?: string;
}> {
  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Check if story already processed
    const existingLog = await InstaReplyLog.findOne({ commentId: story.id });
    if (existingLog) {
      return {
        success: false,
        message: "Story already processed",
      };
    }

    // Get account
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.storyAutomationsEnabled) {
      return {
        success: false,
        message: "Account not found or story automations disabled",
      };
    }

    // Skip if story is from owner
    if (account.userInstaId === story.user_id) {
      return {
        success: false,
        message: "Story from account owner",
      };
    }

    // Find matching template if not provided
    let matchingTemplate = template;
    if (!matchingTemplate) {
      const templates = await InstaReplyTemplate.find({
        userId: clerkId,
        accountId: accountId,
        isActive: true,
        automationType: "stories",
      }).sort({ priority: 1 });

      matchingTemplate = await findMatchingStoryTemplate(
        story.media_id,
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

    // Process DM flow for story - FIRE AND FORGET
    const dmResult = await processStoryDMFlow(
      account,
      clerkId,
      userTier,
      matchingTemplate,
      story.user_id,
      story.username,
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
      commentId: story.id,
      commentText: `Story ${story.mention_type}`,
      commenterUsername: story.username,
      commenterUserId: story.user_id,
      mediaId: story.media_id,
      replyType: dmResult.dmSent ? "dm" : "none",
      dmFlowStage: dmResult.stage,
      dmMessageId: dmResult.messageId,
      followChecked: dmResult.followChecked,
      userFollows: dmResult.userFollows,
      linkSent: dmResult.linkSent,
      success: dmResult.success,
      responseTime: Date.now() - startTime,
      errorMessage: !dmResult.success ? "Failed to process story" : undefined,
      wasQueued: false, // Never queued
      createdAt: new Date(),
    });

    return {
      success: dmResult.success,
      message: dmResult.success
        ? "Story processed successfully"
        : "Failed to process story",
      logId: log._id.toString(),
    };
  } catch (error) {
    console.error("Error processing story automation:", error);

    // Create error log
    await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      commentId: story.id,
      commentText: `Story ${story.mention_type}`,
      commenterUsername: story.username,
      commenterUserId: story.user_id,
      mediaId: story.media_id,
      success: false,
      responseTime: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      createdAt: new Date(),
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to process story",
    };
  }
}

/**
 * Find matching story template
 */
async function findMatchingStoryTemplate(mediaId: string, templates: any[]) {
  for (const template of templates) {
    if (!template.isActive) continue;

    // Check if template is for "any story"
    if (template.anyPostOrReel) {
      return template;
    }

    // Template is for specific story
    if (template.mediaId === mediaId) {
      return template;
    }
  }

  return null;
}

/**
 * Process DM flow for story - FIRE AND FORGET
 */
async function processStoryDMFlow(
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
    // Send welcome message if enabled
    if (template.welcomeMessage?.enabled) {
      const welcomeText = template.welcomeMessage.text.replace(
        /\{\{username\}\}/g,
        recipientUsername,
      );

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
                  title: template.welcomeMessage.buttonTitle,
                  payload: `WELCOME_STORY_${template.mediaId}_${recipientId}`,
                },
              ],
            },
          },
        },
      );

      return {
        success: welcomeSuccess,
        dmSent: welcomeSuccess,
        followChecked: false,
        linkSent: false,
        stage: "welcome",
      };
    }

    // Send initial DM
    let initialButtonPayload = "";
    let initialButtonText = "Get Access";
    let initialMessage = "Thanks for the story mention!";

    if (template.askFollow?.enabled) {
      initialButtonPayload = `CHECK_FOLLOW_STORY_${template.mediaId}_${recipientId}`;
      initialButtonText = "Send me the link";
      initialMessage =
        "Hey thanks for mentioning us! 😊 Tap below and I will send you the access!";
    } else if (template.askEmail?.enabled) {
      initialButtonPayload = `ASK_EMAIL_STORY_${template.mediaId}_${recipientId}`;
      initialButtonText = "Continue";
      initialMessage = template.askEmail.openingMessage.replace(
        /\{\{username\}\}/g,
        recipientUsername,
      );
    } else if (template.askPhone?.enabled) {
      initialButtonPayload = `ASK_PHONE_STORY_${template.mediaId}_${recipientId}`;
      initialButtonText = "Continue";
      initialMessage = template.askPhone.openingMessage.replace(
        /\{\{username\}\}/g,
        recipientUsername,
      );
    } else {
      initialButtonPayload = `GET_ACCESS_STORY_${template.mediaId}_${recipientId}`;
      initialButtonText = template.content[0]?.buttonTitle || "Get Access";
      initialMessage = "Tap below to get instant access!";
    }

    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      recipientId,
      {
        attachment: {
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
    console.error("Failed to process story DM flow:", error);
    return {
      success: false,
      dmSent: false,
      followChecked: false,
      linkSent: false,
      stage: "initial",
    };
  }
}
