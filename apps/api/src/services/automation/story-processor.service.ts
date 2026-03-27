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
 * Consistent with comment-processor pattern:
 * PRIORITY: askFollow → askEmail → askPhone → direct link
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
      return { success: false, message: "Story already processed" };
    }

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.storyAutomationsEnabled) {
      return {
        success: false,
        message: "Account not found or story automations disabled",
      };
    }

    // Skip if from owner
    if (account.userInstaId === story.user_id) {
      return { success: false, message: "Story from account owner" };
    }

    let matchingTemplate = template;
    if (!matchingTemplate) {
      const templates = await InstaReplyTemplate.find({
        userId: clerkId,
        accountId: accountId,
        isActive: true,
        automationType: "stories",
      }).sort({ priority: 1 });

      matchingTemplate = findMatchingStoryTemplate(story.media_id, templates);

      if (!matchingTemplate) {
        return { success: false, message: "No matching template found" };
      }
    }

    const { getUserTier } = await import("@/services/rate-limit.service");
    const userTier = await getUserTier(clerkId);

    const dmResult = await processStoryDMFlow(
      account,
      clerkId,
      userTier,
      matchingTemplate,
      story.user_id,
      story.username,
    );

    await InstaReplyTemplate.findByIdAndUpdate(matchingTemplate._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    });

    account.accountReply = (account.accountReply || 0) + 1;
    account.lastActivity = new Date();
    if (dmResult.dmSent)
      account.accountDMSent = (account.accountDMSent || 0) + 1;
    if (dmResult.followChecked)
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
    await account.save();

    const log = await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      templateId: matchingTemplate._id.toString(),
      templateName: matchingTemplate.name,
      automationType: "stories",
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
      wasQueued: false,
      followUpCount: 0,
      followUpCompleted: false,
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

    await InstaReplyLog.create({
      userId: clerkId,
      accountId: accountId,
      commentId: story.id,
      commentText: `Story ${story.mention_type}`,
      commenterUsername: story.username,
      commenterUserId: story.user_id,
      mediaId: story.media_id,
      automationType: "stories",
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

function findMatchingStoryTemplate(mediaId: string, templates: any[]) {
  for (const template of templates) {
    if (!template.isActive) continue;
    if (template.anyPostOrReel) return template;
    if (template.mediaId === mediaId) return template;
  }
  return null;
}

/**
 * Process story DM flow — consistent pattern with comment-processor.
 * PRIORITY: askFollow → askEmail → askPhone → direct link
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
    const hasAskFollow = template.askFollow?.enabled;
    const hasAskEmail = template.askEmail?.enabled;
    const hasAskPhone = template.askPhone?.enabled;

    const welcomeText = template.welcomeMessage.text.replace(
      /\{\{username\}\}/g,
      recipientUsername,
    );

    // ✅ Same priority chain as comment-processor
    let buttonPayload = "";
    if (hasAskFollow) {
      buttonPayload = `CHECK_FOLLOW_${template.mediaId}`;
    } else if (hasAskEmail) {
      buttonPayload = `ASK_EMAIL_${template.mediaId}`;
    } else if (hasAskPhone) {
      buttonPayload = `ASK_PHONE_${template.mediaId}`;
    } else {
      buttonPayload = `GET_ACCESS_${template.mediaId}`;
    }

    console.log(`Sending story welcome DM to ${recipientUsername}`, {
      buttonPayload,
    });

    const dmSuccess = await sendInstagramDM(
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
                title:
                  template.welcomeMessage.buttonTitle || "Send me the link",
                payload: buttonPayload,
              },
            ],
          },
        },
      },
      false, // stories are not comment replies
    );

    return {
      success: dmSuccess,
      dmSent: dmSuccess,
      followChecked: false,
      userFollows: undefined,
      linkSent: !hasAskFollow && !hasAskEmail && !hasAskPhone,
      stage: "welcome",
    };
  } catch (error) {
    console.error("Failed to process story DM flow:", error);
    return {
      success: false,
      dmSent: false,
      followChecked: false,
      linkSent: false,
      stage: "error",
    };
  }
}
