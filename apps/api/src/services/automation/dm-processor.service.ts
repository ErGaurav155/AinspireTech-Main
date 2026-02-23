// services/automation/dm-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import {
  sendInstagramDM,
  checkFollowStatus,
} from "@/services/meta-api/meta-api.service";

/**
 * Handle postback automation - FIRE AND FORGET
 * NO rate limiting, NO queueing, NO retries
 * These are user responses to our buttons, not incoming webhooks
 */
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

    // Parse payload to determine action
    const payloadParts = payload.split("_");
    const action = payloadParts[0];
    const subAction = payloadParts[1];

    // Extract template media ID and recipient ID from payload
    let templateMediaId = "";
    let recipientIdFromPayload = "";

    if (payloadParts.length >= 3) {
      templateMediaId = payloadParts[2];
      recipientIdFromPayload = payloadParts[3] || recipientId;
    }

    // Find template
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

    // Handle different actions - all FIRE AND FORGET
    switch (action) {
      case "WELCOME":
        return await handleWelcomeAction(
          account,
          clerkId,
          userTier,
          template,
          recipientIdFromPayload || recipientId,
          startTime,
        );

      case "GET":
        if (subAction === "ACCESS") {
          return await handleGetAccessAction(
            account,
            clerkId,
            userTier,
            template,
            recipientIdFromPayload || recipientId,
            startTime,
          );
        }
        break;

      case "CHECK":
        if (subAction === "FOLLOW") {
          return await handleCheckFollowAction(
            account,
            clerkId,
            userTier,
            template,
            recipientIdFromPayload || recipientId,
            startTime,
          );
        }
        break;

      case "VERIFY":
        if (subAction === "FOLLOW") {
          return await handleVerifyFollowAction(
            account,
            clerkId,
            userTier,
            template,
            recipientIdFromPayload || recipientId,
            startTime,
          );
        }
        break;

      case "ASK":
        if (subAction === "EMAIL") {
          return await handleAskEmailAction(
            account,
            clerkId,
            userTier,
            template,
            recipientIdFromPayload || recipientId,
            startTime,
          );
        } else if (subAction === "PHONE") {
          return await handleAskPhoneAction(
            account,
            clerkId,
            userTier,
            template,
            recipientIdFromPayload || recipientId,
            startTime,
          );
        }
        break;

      default:
        return {
          success: false,
          message: "Unknown action",
        };
    }

    return {
      success: false,
      message: "Invalid payload format",
    };
  } catch (error) {
    console.error("Error handling postback automation:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to handle postback",
    };
  }
}

/**
 * Handle welcome action
 */
async function handleWelcomeAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
  try {
    // After welcome, move to next step in flow
    let nextButtonPayload = "";
    let nextButtonText = "";
    let nextMessage = "";

    if (template.askFollow?.enabled) {
      nextButtonPayload = `CHECK_FOLLOW_${template.mediaId}_${recipientId}`;
      nextButtonText = "Send me the link";
      nextMessage =
        "Great! Now tap below and I will check if you're following us!";
    } else if (template.askEmail?.enabled) {
      nextButtonPayload = `ASK_EMAIL_${template.mediaId}_${recipientId}`;
      nextButtonText = "Continue";
      nextMessage = template.askEmail.openingMessage;
    } else if (template.askPhone?.enabled) {
      nextButtonPayload = `ASK_PHONE_${template.mediaId}_${recipientId}`;
      nextButtonText = "Continue";
      nextMessage = template.askPhone.openingMessage;
    } else {
      nextButtonPayload = `GET_ACCESS_${template.mediaId}_${recipientId}`;
      nextButtonText = template.content[0]?.buttonTitle || "Get Access";
      nextMessage = "Tap below to get instant access!";
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
            text: nextMessage,
            buttons: [
              {
                type: "postback",
                title: nextButtonText,
                payload: nextButtonPayload,
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

    return {
      success: dmSuccess,
      message: dmSuccess ? "Welcome processed" : "Failed to send next step",
      nextStage: template.askFollow?.enabled
        ? "check_follow"
        : template.askEmail?.enabled
          ? "ask_email"
          : template.askPhone?.enabled
            ? "ask_phone"
            : "get_access",
    };
  } catch (error) {
    console.error("Error handling welcome action:", error);
    return {
      success: false,
      message: "Failed to process welcome",
    };
  }
}

/**
 * Handle get access - send final link
 */
async function handleGetAccessAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
  try {
    // Select random content for final link
    const randomIndex = Math.floor(Math.random() * template.content.length);
    const {
      text,
      link,
      buttonTitle = "Get Access",
    } = template.content[randomIndex];

    // Send final link DM - FIRE AND FORGET
    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      recipientId,
      {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: `Here you go! ${text}`,
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
      commentId: `postback_${Date.now()}`,
      commentText: "Postback action",
      commenterUsername: "unknown",
      commenterUserId: recipientId,
      mediaId: template.mediaId,
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

/**
 * Handle check follow
 */
async function handleCheckFollowAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
  try {
    // Check follow status via API - FIRE AND FORGET
    const followStatus = await checkFollowStatus(
      account.instagramId,
      account.accessToken,
      recipientId,
    );

    const userFollows = followStatus.is_user_follow_business === true;

    if (userFollows) {
      // User follows - send final link
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

      // Update statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

      return {
        success: dmSuccess,
        message: dmSuccess ? "Link sent to follower" : "Failed to send link",
      };
    } else {
      // User doesn't follow - send follow reminder
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
                template.askFollow?.message ||
                "I noticed you haven't followed us yet. Please follow to get your link!",
              buttons: [
                {
                  type: "web_url",
                  title: template.askFollow?.visitProfileBtn || "Visit Profile",
                  url: `https://www.instagram.com/${account.username}/`,
                  webview_height_ratio: "full",
                },
                {
                  type: "postback",
                  title: template.askFollow?.followingBtn || "I'm following",
                  payload: `VERIFY_FOLLOW_${template.mediaId}_${recipientId}`,
                },
              ],
            },
          },
        },
      );

      // Update statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

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

/**
 * Handle verify follow
 */
async function handleVerifyFollowAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
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
              text: `Perfect! Thanks for following! ${text}`,
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

      // Update statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

      return {
        success: dmSuccess,
        message: dmSuccess
          ? "Link sent after follow verification"
          : "Failed to send link",
      };
    } else {
      // Still not following - send another reminder
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
                  payload: `VERIFY_FOLLOW_${template.mediaId}_${recipientId}`,
                },
              ],
            },
          },
        },
      );

      // Update statistics
      account.accountDMSent = (account.accountDMSent || 0) + 1;
      account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
      account.lastActivity = new Date();
      await account.save();

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

/**
 * Handle ask email
 */
async function handleAskEmailAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
  try {
    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      recipientId,
      {
        text:
          template.askEmail?.openingMessage ||
          "Please share your email address to continue.",
      },
    );

    // Update statistics
    account.accountDMSent = (account.accountDMSent || 0) + 1;
    account.lastActivity = new Date();
    await account.save();

    return {
      success: dmSuccess,
      message: dmSuccess ? "Email request sent" : "Failed to ask for email",
      nextStage: "waiting_for_email",
    };
  } catch (error) {
    console.error("Error asking for email:", error);
    return {
      success: false,
      message: "Failed to ask for email",
    };
  }
}

/**
 * Handle ask phone
 */
async function handleAskPhoneAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
  try {
    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      recipientId,
      {
        text:
          template.askPhone?.openingMessage ||
          "Please share your phone number to continue.",
      },
    );

    // Update statistics
    account.accountDMSent = (account.accountDMSent || 0) + 1;
    account.lastActivity = new Date();
    await account.save();

    return {
      success: dmSuccess,
      message: dmSuccess ? "Phone request sent" : "Failed to ask for phone",
      nextStage: "waiting_for_phone",
    };
  } catch (error) {
    console.error("Error asking for phone:", error);
    return {
      success: false,
      message: "Failed to ask for phone",
    };
  }
}
