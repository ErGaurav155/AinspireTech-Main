import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import { recordCall } from "@/services/rate-limit.service";
import {
  sendInstagramDM,
  checkFollowStatus,
} from "@/services/meta-api/meta-api.service";

export async function handlePostbackAutomation(
  accountId: string,
  clerkId: string,
  recipientId: string,
  payload: string,
  stage?: string,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
  queued?: boolean;
  queueId?: string;
}> {
  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Get account
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive) {
      return {
        success: false,
        message: "Account not found or inactive",
      };
    }

    // Parse payload
    let templateMediaId = "";
    let action = "";

    if (payload.startsWith("GET_ACCESS_")) {
      action = "get_access";
      templateMediaId = payload.replace("GET_ACCESS_", "");
    } else if (payload.startsWith("CHECK_FOLLOW_")) {
      action = "check_follow";
      templateMediaId = payload.replace("CHECK_FOLLOW_", "");
    } else if (payload.startsWith("VERIFY_FOLLOW_")) {
      action = "verify_follow";
      templateMediaId = payload.replace("VERIFY_FOLLOW_", "");
    } else {
      return {
        success: false,
        message: "Invalid payload",
      };
    }

    // Get template
    const template = await InstaReplyTemplate.findOne({
      userId: clerkId,
      accountId: accountId,
      mediaId: templateMediaId,
      isActive: true,
    });

    if (!template) {
      return {
        success: false,
        message: "Template not found",
      };
    }

    // Get user tier
    const { getUserTier } = await import("@/services/rate-limit.service");
    const userTier = await getUserTier(clerkId);
    const templateSettings =
      template.settingsByTier[userTier] || template.settingsByTier.free;

    // Handle different actions
    switch (action) {
      case "get_access":
        return await handleGetAccess(
          account,
          clerkId,
          userTier,
          template,
          recipientId,
          templateSettings,
          startTime,
        );

      case "check_follow":
        return await handleCheckFollow(
          account,
          clerkId,
          userTier,
          template,
          recipientId,
          templateSettings,
          startTime,
        );

      case "verify_follow":
        return await handleVerifyFollow(
          account,
          clerkId,
          userTier,
          template,
          recipientId,
          templateSettings,
          startTime,
        );

      default:
        return {
          success: false,
          message: "Unknown action",
        };
    }
  } catch (error) {
    console.error("Error handling postback automation:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to handle postback",
    };
  }
}

async function handleGetAccess(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  templateSettings: any,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
  queued?: boolean;
  queueId?: string;
}> {
  // Free users get direct access
  const rateLimitResult = await recordCall(
    clerkId,
    account.instagramId,
    "dm_final_link",
    1,
    {
      recipientId,
      templateId: template._id,
      stage: "final_link",
      followRequired: false,
      isFollowCheck: false,
    },
  );

  if (!rateLimitResult.success) {
    if (rateLimitResult.queued) {
      return {
        success: false,
        queued: true,
        queueId: rateLimitResult.queueId,
        message: "Rate limited, queued for processing",
      };
    }
    return {
      success: false,
      message: rateLimitResult.reason || "Rate limit check failed",
    };
  }

  try {
    // Select random content for final link
    const randomIndex = Math.floor(Math.random() * template.content.length);
    const {
      text,
      link,
      buttonTitle = "Get Access",
    } = template.content[randomIndex];

    // Send final link DM
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

    // Update account statistics
    account.accountDMSent = (account.accountDMSent || 0) + 1;
    account.lastActivity = new Date();
    await account.save();

    // Create log
    await InstaReplyLog.create({
      userId: clerkId,
      accountId: account.instagramId,
      templateId: template._id.toString(),
      templateName: template.name,
      commenterUserId: recipientId,
      dmFlowStage: "final_link",
      linkSent: dmSuccess,
      success: dmSuccess,
      responseTime: Date.now() - startTime,
      createdAt: new Date(),
    });

    return {
      success: dmSuccess,
      message: dmSuccess
        ? "Direct link sent successfully"
        : "Failed to send link",
    };
  } catch (error) {
    console.error("Error sending direct link:", error);
    return {
      success: false,
      message: "Failed to send direct link",
    };
  }
}

async function handleCheckFollow(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  templateSettings: any,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
  queued?: boolean;
  queueId?: string;
}> {
  // Check follow status
  const rateLimitResult = await recordCall(
    clerkId,
    account.instagramId,
    "dm_follow_check",
    1,
    {
      recipientId,
      templateId: template._id,
      stage: "follow_check",
      followRequired: template.isFollow,
      isFollowCheck: true,
    },
  );

  if (!rateLimitResult.success) {
    if (rateLimitResult.queued) {
      return {
        success: false,
        queued: true,
        queueId: rateLimitResult.queueId,
        message: "Rate limited, queued for processing",
      };
    }
    return {
      success: false,
      message: rateLimitResult.reason || "Rate limit check failed",
    };
  }

  try {
    // Check follow status via API
    const followStatus = await checkFollowStatus(
      account.instagramId,
      account.accessToken,
      recipientId,
    );

    const userFollows = followStatus.is_user_follow_business === true;

    if (userFollows) {
      // User follows - send final link
      const finalResult = await recordCall(
        clerkId,
        account.instagramId,
        "dm_final_link",
        1,
        {
          recipientId,
          templateId: template._id,
          stage: "final_link",
          followRequired: false,
          isFollowCheck: false,
        },
      );

      if (!finalResult.success) {
        if (finalResult.queued) {
          return {
            success: false,
            queued: true,
            queueId: finalResult.queueId,
            message: "Rate limited for final link",
          };
        }
        return {
          success: false,
          message:
            finalResult.reason || "Rate limit check failed for final link",
        };
      }

      // Select random content for final link
      const randomIndex = Math.floor(Math.random() * template.content.length);
      const {
        text,
        link,
        buttonTitle = "Get Access",
      } = template.content[randomIndex];

      const dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `Awesome! Thanks for following! ${text}`,
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

      // Update account statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

      // Create log
      await InstaReplyLog.create({
        userId: clerkId,
        accountId: account.instagramId,
        templateId: template._id.toString(),
        templateName: template.name,
        commenterUserId: recipientId,
        dmFlowStage: "final_link",
        followChecked: true,
        userFollows: true,
        linkSent: dmSuccess,
        success: dmSuccess,
        responseTime: Date.now() - startTime,
        createdAt: new Date(),
      });

      return {
        success: dmSuccess,
        message: dmSuccess ? "Link sent to follower" : "Failed to send link",
      };
    } else {
      // User doesn't follow - send follow reminder
      const reminderResult = await recordCall(
        clerkId,
        account.instagramId,
        "dm_follow_check",
        1,
        {
          recipientId,
          templateId: template._id,
          stage: "follow_reminder",
          followRequired: true,
          isFollowCheck: true,
        },
      );

      if (!reminderResult.success) {
        if (reminderResult.queued) {
          return {
            success: false,
            queued: true,
            queueId: reminderResult.queueId,
            message: "Rate limited for reminder",
          };
        }
        return {
          success: false,
          message:
            reminderResult.reason || "Rate limit check failed for reminder",
        };
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
              text: `I noticed you have not followed us yet. It would mean a lot if you visit our profile and hit follow, then tap "I am following" to unlock your link!`,
              buttons: [
                {
                  type: "web_url",
                  title: "Visit Profile",
                  url: `https://www.instagram.com/${account.username}/`,
                  webview_height_ratio: "full",
                },
                {
                  type: "postback",
                  title: "I am following",
                  payload: `VERIFY_FOLLOW_${template.mediaId}`,
                },
              ],
            },
          },
        },
      );

      // Update account statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

      // Create log
      await InstaReplyLog.create({
        userId: clerkId,
        accountId: account.instagramId,
        templateId: template._id.toString(),
        templateName: template.name,
        commenterUserId: recipientId,
        dmFlowStage: "follow_reminder",
        followChecked: true,
        userFollows: false,
        success: dmSuccess,
        responseTime: Date.now() - startTime,
        createdAt: new Date(),
      });

      return {
        success: dmSuccess,
        message: dmSuccess ? "Follow reminder sent" : "Failed to send reminder",
        nextStage: "waiting_for_follow",
      };
    }
  } catch (error) {
    console.error("Error checking follow status:", error);
    return {
      success: false,
      message: "Failed to check follow status",
    };
  }
}

async function handleVerifyFollow(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  templateSettings: any,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
  queued?: boolean;
  queueId?: string;
}> {
  // Verify follow status again
  const rateLimitResult = await recordCall(
    clerkId,
    account.instagramId,
    "follow_verification",
    1,
    {
      recipientId,
      templateId: template._id,
      stage: "follow_verification",
      followRequired: true,
      isFollowCheck: true,
    },
  );

  if (!rateLimitResult.success) {
    if (rateLimitResult.queued) {
      return {
        success: false,
        queued: true,
        queueId: rateLimitResult.queueId,
        message: "Rate limited, queued for processing",
      };
    }
    return {
      success: false,
      message: rateLimitResult.reason || "Rate limit check failed",
    };
  }

  try {
    // Check follow status again
    const followStatus = await checkFollowStatus(
      account.instagramId,
      account.accessToken,
      recipientId,
    );

    const userFollows = followStatus.is_user_follow_business === true;

    if (userFollows) {
      // User now follows - send final link
      const finalResult = await recordCall(
        clerkId,
        account.instagramId,
        "dm_final_link",
        1,
        {
          recipientId,
          templateId: template._id,
          stage: "final_link",
          followRequired: false,
          isFollowCheck: false,
        },
      );

      if (!finalResult.success) {
        if (finalResult.queued) {
          return {
            success: false,
            queued: true,
            queueId: finalResult.queueId,
            message: "Rate limited for final link",
          };
        }
        return {
          success: false,
          message:
            finalResult.reason || "Rate limit check failed for final link",
        };
      }

      // Select random content for final link
      const randomIndex = Math.floor(Math.random() * template.content.length);
      const {
        text,
        link,
        buttonTitle = "Get Access",
      } = template.content[randomIndex];

      const dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `Awesome! Thanks for following! ${text}`,
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

      // Update account statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

      // Create log
      await InstaReplyLog.create({
        userId: clerkId,
        accountId: account.instagramId,
        templateId: template._id.toString(),
        templateName: template.name,
        commenterUserId: recipientId,
        dmFlowStage: "final_link",
        followChecked: true,
        userFollows: true,
        linkSent: dmSuccess,
        success: dmSuccess,
        responseTime: Date.now() - startTime,
        createdAt: new Date(),
      });

      return {
        success: dmSuccess,
        message: dmSuccess
          ? "Link sent after follow verification"
          : "Failed to send link",
      };
    } else {
      // Still not following - send another reminder
      const reminderResult = await recordCall(
        clerkId,
        account.instagramId,
        "dm_follow_check",
        1,
        {
          recipientId,
          templateId: template._id,
          stage: "follow_reminder_retry",
          followRequired: true,
          isFollowCheck: true,
        },
      );

      if (!reminderResult.success) {
        if (reminderResult.queued) {
          return {
            success: false,
            queued: true,
            queueId: reminderResult.queueId,
            message: "Rate limited for retry",
          };
        }
        return {
          success: false,
          message: reminderResult.reason || "Rate limit check failed for retry",
        };
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
              text: "It looks like you're still not following us. Please follow to get access!",
              buttons: [
                {
                  type: "web_url",
                  title: "Visit Profile",
                  url: `https://www.instagram.com/${account.username}/`,
                  webview_height_ratio: "full",
                },
                {
                  type: "postback",
                  title: "I am following now",
                  payload: `VERIFY_FOLLOW_${template.mediaId}`,
                },
              ],
            },
          },
        },
      );

      // Update account statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

      // Create log
      await InstaReplyLog.create({
        userId: clerkId,
        accountId: account.instagramId,
        templateId: template._id.toString(),
        templateName: template.name,
        commenterUserId: recipientId,
        dmFlowStage: "follow_reminder",
        followChecked: true,
        userFollows: false,
        success: dmSuccess,
        responseTime: Date.now() - startTime,
        createdAt: new Date(),
      });

      return {
        success: dmSuccess,
        message: dmSuccess
          ? "Follow reminder sent again"
          : "Failed to send reminder",
        nextStage: "still_waiting_for_follow",
      };
    }
  } catch (error) {
    console.error("Error verifying follow status:", error);
    return {
      success: false,
      message: "Failed to verify follow status",
    };
  }
}
