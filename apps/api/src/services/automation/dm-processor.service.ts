// services/automation/dm-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import {
  sendInstagramDM,
  checkFollowStatus,
} from "@/services/meta-api/meta-api.service";
import {
  canSendInstaDM,
  dmLimitMessage,
  followCheckLimitMessage,
  getInstaQuotaStatus,
  recordInstaDMSent,
  recordInstaFollowCheck,
  stopInstaAutomationForDMLimit,
} from "@/services/insta-quota.service";

/**
 * Handle postback automation - FIRE AND FORGET
 * These are user button-click responses — NOT incoming webhooks.
 * PRIORITY CHAIN: askFollow → askEmail → askPhone → direct link
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

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled) {
      return {
        success: false,
        message: "Account not found, inactive, or DM automation stopped",
      };
    }

    // Parse payload: ACTION_SUBACTION_mediaId
    // e.g. CHECK_FOLLOW_dm_12345 or GET_ACCESS_postId123
    // We split into max 3 parts: [action, subAction, ...rest joined as mediaId]
    const parts = payload.split("_");
    const action = parts[0];
    const subAction = parts[1];
    // mediaId can contain underscores (e.g. dm_12345_abc), so join the rest
    const templateMediaId = parts.slice(2).join("_");

    const template = await InstaReplyTemplate.findOne({
      userId: clerkId,
      accountId: accountId,
      mediaId: templateMediaId,
      isActive: true,
    });

    if (!template) {
      return { success: false, message: "Template not found" };
    }

    const { getUserTier } = await import("@/services/rate-limit.service.js");
    const userTier = await getUserTier(clerkId);

    switch (action) {
      case "CHECK":
        if (subAction === "FOLLOW")
          return await handleCheckFollowAction(
            account,
            clerkId,
            userTier,
            template,
            recipientId,
            startTime,
          );
        break;
      case "VERIFY":
        if (subAction === "FOLLOW")
          return await handleVerifyFollowAction(
            account,
            clerkId,
            userTier,
            template,
            recipientId,
            startTime,
          );
        break;
      case "ASK":
        if (subAction === "EMAIL")
          return await handleAskEmailAction(
            account,
            clerkId,
            userTier,
            template,
            recipientId,
            startTime,
          );
        if (subAction === "PHONE")
          return await handleAskPhoneAction(
            account,
            clerkId,
            userTier,
            template,
            recipientId,
            startTime,
          );
        break;
      case "START":
        if (subAction === "FORM")
          return await sendDMFlowQuestion(
            account,
            clerkId,
            template,
            recipientId,
            0,
          );
        break;
      case "GET":
        if (subAction === "ACCESS")
          return await sendFinalLinkDM(
            account,
            clerkId,
            template,
            recipientId,
            startTime,
          );
        break;
      // Legacy WELCOME handler — kept for backwards compat
      case "WELCOME":
        return await handleLegacyWelcomeAction(
          account,
          clerkId,
          userTier,
          template,
          recipientId,
          startTime,
        );
      default:
        return { success: false, message: "Unknown action" };
    }

    return { success: false, message: "Invalid payload format" };
  } catch (error) {
    console.error("Error handling postback automation:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to handle postback",
    };
  }
}

// ─── Shared helper: determine and send the next step in the chain ─────────────

export function getDMFlowQuestions(template: any) {
  if (template.dmFlow?.mode !== "collect_form") return [];
  return Array.isArray(template.dmFlow?.questions)
    ? template.dmFlow.questions.filter(
        (question: any) => question?.question && question?.id,
      )
    : [];
}

export function hasDMFlowQuestions(template: any) {
  return getDMFlowQuestions(template).length > 0;
}

export async function sendDMFlowQuestion(
  account: any,
  clerkId: string,
  template: any,
  recipientId: string,
  questionIndex: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  const questions = getDMFlowQuestions(template);
  const question = questions[questionIndex];

  if (!question) {
    return sendFinalLinkDM(account, clerkId, template, recipientId, Date.now());
  }

  if (!(await canSendInstaDM(clerkId, account))) {
    await stopInstaAutomationForDMLimit(account);
    return { success: false, message: dmLimitMessage() };
  }

  const dmSuccess = await sendInstagramDM(
    account.instagramId,
    account.accessToken,
    recipientId,
    { text: question.question },
    false,
    clerkId,
    false,
  );

  const nextStage = `waiting_for_form_${questionIndex}`;
  await InstaReplyLog.findOneAndUpdate(
    {
      userId: clerkId,
      accountId: account.instagramId,
      commenterUserId: recipientId,
      dmFlowStage: { $nin: ["final_link", "completed"] },
    },
    {
      $set: {
        dmFlowStage: nextStage,
        currentQuestionIndex: questionIndex,
        updatedAt: new Date(),
      },
    },
    { sort: { createdAt: -1 }, new: true },
  );

  if (dmSuccess) await recordInstaDMSent(account);

  return {
    success: dmSuccess,
    message: dmSuccess ? "Form question sent" : "Failed to send form question",
    nextStage,
  };
}

/**
 * After a gate (follow/email/phone) is passed, decide what comes next.
 * completedStep: what was just completed
 */
async function sendNextStepInChain(
  account: any,
  clerkId: string,
  template: any,
  recipientId: string,
  completedStep: "follow" | "email" | "phone",
  startTime: number,
): Promise<{
  success: boolean;
  message: string;
  nextStage?: string;
}> {
  const hasAskEmail = template.askEmail?.enabled;
  const hasAskPhone = template.askPhone?.enabled;
  const hasFormQuestions = hasDMFlowQuestions(template);

  if (completedStep === "follow") {
    if (hasFormQuestions) {
      return sendDMFlowQuestion(account, clerkId, template, recipientId, 0);
    } else if (hasAskEmail) {
      return sendAskEmailMessage(
        account,
        clerkId,
        template,
        recipientId,
        startTime,
      );
    } else if (hasAskPhone) {
      return sendAskPhoneMessage(
        account,
        clerkId,
        template,
        recipientId,
        startTime,
      );
    } else {
      return sendFinalLinkDM(
        account,
        clerkId,
        template,
        recipientId,
        startTime,
      );
    }
  }

  if (completedStep === "email") {
    if (hasAskPhone) {
      return sendAskPhoneMessage(
        account,
        clerkId,
        template,
        recipientId,
        startTime,
      );
    } else {
      return sendFinalLinkDM(
        account,
        clerkId,
        template,
        recipientId,
        startTime,
      );
    }
  }

  // completed phone → always final link
  return sendFinalLinkDM(account, clerkId, template, recipientId, startTime);
}

// ─── Send helper: ask email message ─────────────────────────────────────────

async function sendAskEmailMessage(
  account: any,
  clerkId: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  if (!(await canSendInstaDM(clerkId, account))) {
    await stopInstaAutomationForDMLimit(account);
    return { success: false, message: dmLimitMessage() };
  }

  const emailMessage =
    template.askEmail?.openingMessage ||
    "Please share your email address to continue. 📧";

  const dmSuccess = await sendInstagramDM(
    account.instagramId,
    account.accessToken,
    recipientId,
    { text: emailMessage },
    false,
    clerkId,
    false, // isWelcomeDM = false (follow-up message)
  );

  // FIXED: Update log stage correctly
  const updatedLog = await InstaReplyLog.findOneAndUpdate(
    {
      userId: clerkId,
      accountId: account.instagramId,
      commenterUserId: recipientId,
      dmFlowStage: { $nin: ["final_link", "completed"] },
    },
    {
      $set: {
        dmFlowStage: "waiting_for_email",
        updatedAt: new Date(),
      },
    },
    { sort: { createdAt: -1 }, new: true },
  );

  if (!updatedLog) {
    console.warn(
      `No log found for user ${recipientId} when sending email request`,
    );
  }

  if (dmSuccess) await recordInstaDMSent(account);

  return {
    success: dmSuccess,
    message: dmSuccess ? "Email request sent" : "Failed to ask for email",
    nextStage: "waiting_for_email",
  };
}

async function sendAskPhoneMessage(
  account: any,
  clerkId: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  if (!(await canSendInstaDM(clerkId, account))) {
    await stopInstaAutomationForDMLimit(account);
    return { success: false, message: dmLimitMessage() };
  }

  const phoneMessage =
    template.askPhone?.openingMessage ||
    "Please share your phone number to continue. 📱";

  const dmSuccess = await sendInstagramDM(
    account.instagramId,
    account.accessToken,
    recipientId,
    { text: phoneMessage },
    false,
    clerkId,
    false, // isWelcomeDM = false (follow-up message)
  );

  // FIXED: Update log stage correctly
  const updatedLog = await InstaReplyLog.findOneAndUpdate(
    {
      userId: clerkId,
      accountId: account.instagramId,
      commenterUserId: recipientId,
      dmFlowStage: { $nin: ["final_link", "completed"] },
    },
    {
      $set: {
        dmFlowStage: "waiting_for_phone",
        updatedAt: new Date(),
      },
    },
    { sort: { createdAt: -1 }, new: true },
  );

  if (!updatedLog) {
    console.warn(
      `No log found for user ${recipientId} when sending phone request`,
    );
  }

  if (dmSuccess) await recordInstaDMSent(account);

  return {
    success: dmSuccess,
    message: dmSuccess ? "Phone request sent" : "Failed to ask for phone",
    nextStage: "waiting_for_phone",
  };
}
// ─── Send helper: final link ─────────────────────────────────────────────────

export async function sendFinalLinkDM(
  account: any,
  clerkId: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  try {
    if (!(await canSendInstaDM(clerkId, account))) {
      await stopInstaAutomationForDMLimit(account);
      return { success: false, message: dmLimitMessage() };
    }

    const randomIndex = Math.floor(Math.random() * template.content.length);
    const content = template.content[randomIndex];
    const buttonTitle = content?.buttonTitle || "Get Access";
    const finalText = content?.text || "Here's your link!";
    const link = content?.link || "";

    // If content has a media attachment (Cloudinary URL), send it first
    // Note: Instagram only supports image/video/audio attachments in DMs, not PDFs
    if (
      content?.mediaUrl &&
      (content.mediaType === "image" || content.mediaType === "video")
    ) {
      await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        {
          attachment: {
            type: content.mediaType,
            payload: {
              url: content.mediaUrl,
              is_reusable: true,
            },
          },
        },
        false,
        clerkId,
        false, // isWelcomeDM = false (final link message)
      );
    } else if (content?.mediaUrl && content.mediaType === "document") {
      // PDFs are not supported in Instagram DMs - log and skip
      console.log(
        `Skipping PDF attachment for user ${recipientId} - Instagram doesn't support PDF attachments in DMs`,
      );
    }

    let dmSuccess = false;

    if (link) {
      dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: finalText,
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
        false,
        clerkId,
        false, // isWelcomeDM = false (final link message)
      );
    } else if (finalText) {
      dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        recipientId,
        { text: finalText },
        false,
        clerkId,
        false, // isWelcomeDM = false (final link message)
      );
    }

    // Update log
    await InstaReplyLog.findOneAndUpdate(
      {
        userId: clerkId,
        accountId: account.instagramId,
        commenterUserId: recipientId,
        dmFlowStage: { $nin: ["final_link", "completed"] },
      },
      {
        dmFlowStage: "final_link",
        linkSent: dmSuccess,
        followUpCompleted: false,
      },
      { sort: { createdAt: -1 } },
    );

    if (dmSuccess) await recordInstaDMSent(account);

    return {
      success: dmSuccess,
      message: dmSuccess ? "Final link sent" : "Failed to send final link",
      nextStage: "final_link",
    };
  } catch (error) {
    console.error("Error sending final link:", error);
    return { success: false, message: "Failed to send final link" };
  }
}

// ─── Handle: CHECK_FOLLOW button clicked ─────────────────────────────────────

async function handleCheckFollowAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  try {
    const quota = await getInstaQuotaStatus(clerkId, account);
    if (quota.followCheckLimitReached) {
      await InstaReplyLog.findOneAndUpdate(
        {
          userId: clerkId,
          accountId: account.instagramId,
          commenterUserId: recipientId,
          dmFlowStage: { $nin: ["final_link", "completed"] },
        },
        { followChecked: false, userFollows: undefined },
        { sort: { createdAt: -1 } },
      );
      return sendNextStepInChain(
        account,
        clerkId,
        template,
        recipientId,
        "follow",
        startTime,
      );
    }

    const followStatus = await checkFollowStatus(
      account.instagramId,
      account.accessToken,
      recipientId,
    );
    const userFollows = followStatus.is_user_follow_business === true;

    await recordInstaFollowCheck(account);

    if (userFollows) {
      // User follows — move to next step in chain
      await InstaReplyLog.findOneAndUpdate(
        {
          userId: clerkId,
          accountId: account.instagramId,
          commenterUserId: recipientId,
          dmFlowStage: { $nin: ["final_link", "completed"] },
        },
        { followChecked: true, userFollows: true },
        { sort: { createdAt: -1 } },
      );

      return sendNextStepInChain(
        account,
        clerkId,
        template,
        recipientId,
        "follow",
        startTime,
      );
    } else {
      // Not following — send reminder
      if (!(await canSendInstaDM(clerkId, account))) {
        await stopInstaAutomationForDMLimit(account);
        return { success: false, message: dmLimitMessage() };
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
              text:
                template.askFollow?.message ||
                "Looks like you haven't followed yet! Follow us and tap below 🧲",
              buttons: [
                {
                  type: "web_url",
                  title: template.askFollow?.visitProfileBtn || "Visit Profile",
                  url: `https://www.instagram.com/${account.username}/`,
                  webview_height_ratio: "full",
                },
                {
                  type: "postback",
                  title: template.askFollow?.followingBtn || "I'm following ✅",
                  payload: `VERIFY_FOLLOW_${template.mediaId}`,
                },
              ],
            },
          },
        },
        false,
        clerkId,
        false, // isWelcomeDM = false (reminder message)
      );

      if (dmSuccess) await recordInstaDMSent(account);

      return {
        success: dmSuccess,
        message: dmSuccess ? "Follow reminder sent" : "Failed to send reminder",
        nextStage: "waiting_for_follow",
      };
    }
  } catch (error) {
    console.error("Error checking follow:", error);
    return { success: false, message: "Failed to check follow status" };
  }
}

// ─── Handle: VERIFY_FOLLOW button clicked ────────────────────────────────────

async function handleVerifyFollowAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  try {
    const quota = await getInstaQuotaStatus(clerkId, account);
    if (quota.followCheckLimitReached) {
      await InstaReplyLog.findOneAndUpdate(
        {
          userId: clerkId,
          accountId: account.instagramId,
          commenterUserId: recipientId,
          dmFlowStage: { $nin: ["final_link", "completed"] },
        },
        { followChecked: false, userFollows: undefined },
        { sort: { createdAt: -1 } },
      );
      return sendNextStepInChain(
        account,
        clerkId,
        template,
        recipientId,
        "follow",
        startTime,
      );
    }

    const followStatus = await checkFollowStatus(
      account.instagramId,
      account.accessToken,
      recipientId,
    );
    const userFollows = followStatus.is_user_follow_business === true;

    await recordInstaFollowCheck(account);

    if (userFollows) {
      await InstaReplyLog.findOneAndUpdate(
        {
          userId: clerkId,
          accountId: account.instagramId,
          commenterUserId: recipientId,
          dmFlowStage: { $nin: ["final_link", "completed"] },
        },
        { followChecked: true, userFollows: true },
        { sort: { createdAt: -1 } },
      );

      return sendNextStepInChain(
        account,
        clerkId,
        template,
        recipientId,
        "follow",
        startTime,
      );
    } else {
      // Still not following
      if (!(await canSendInstaDM(clerkId, account))) {
        await stopInstaAutomationForDMLimit(account);
        return { success: false, message: dmLimitMessage() };
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
              text: "It looks like you're still not following us. Please follow to get access! 🧲",
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
        false,
        clerkId,
        false, // isWelcomeDM = false (reminder message)
      );

      if (dmSuccess) await recordInstaDMSent(account);

      return {
        success: dmSuccess,
        message: dmSuccess
          ? "Follow reminder sent again"
          : "Failed to send reminder",
        nextStage: "still_waiting_for_follow",
      };
    }
  } catch (error) {
    console.error("Error verifying follow:", error);
    return { success: false, message: "Failed to verify follow status" };
  }
}

// ─── Handle: ASK_EMAIL button clicked ────────────────────────────────────────

async function handleAskEmailAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  return sendAskEmailMessage(
    account,
    clerkId,
    template,
    recipientId,
    startTime,
  );
}

// ─── Handle: ASK_PHONE button clicked ────────────────────────────────────────

async function handleAskPhoneAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  return sendAskPhoneMessage(
    account,
    clerkId,
    template,
    recipientId,
    startTime,
  );
}

// ─── Legacy WELCOME handler (backwards compat) ────────────────────────────────

async function handleLegacyWelcomeAction(
  account: any,
  clerkId: string,
  userTier: string,
  template: any,
  recipientId: string,
  startTime: number,
): Promise<{ success: boolean; message: string; nextStage?: string }> {
  const hasAskFollow = template.askFollow?.enabled;
  const hasAskEmail = template.askEmail?.enabled;
  const hasAskPhone = template.askPhone?.enabled;
  const hasFormQuestions = hasDMFlowQuestions(template);

  if (hasAskFollow) {
    if (!(await canSendInstaDM(clerkId, account))) {
      await stopInstaAutomationForDMLimit(account);
      return { success: false, message: dmLimitMessage() };
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
            text: template.askFollow?.message || "Please follow us first 🧲",
            buttons: [
              {
                type: "web_url",
                title: template.askFollow?.visitProfileBtn || "Visit Profile",
                url: `https://www.instagram.com/${account.username}/`,
                webview_height_ratio: "full",
              },
              {
                type: "postback",
                title: template.askFollow?.followingBtn || "I'm following ✅",
                payload: `VERIFY_FOLLOW_${template.mediaId}`,
              },
            ],
          },
        },
      },
      false,
      clerkId,
      true, // isWelcomeDM = true
    );
    if (dmSuccess) await recordInstaDMSent(account);
    return {
      success: dmSuccess,
      message: dmSuccess ? "Follow gate sent" : "Failed",
      nextStage: "waiting_for_follow",
    };
  } else if (hasFormQuestions) {
    return sendDMFlowQuestion(account, clerkId, template, recipientId, 0);
  } else if (hasAskEmail) {
    return sendAskEmailMessage(
      account,
      clerkId,
      template,
      recipientId,
      startTime,
    );
  } else if (hasAskPhone) {
    return sendAskPhoneMessage(
      account,
      clerkId,
      template,
      recipientId,
      startTime,
    );
  } else {
    return sendFinalLinkDM(account, clerkId, template, recipientId, startTime);
  }
}

// Export sendNextStepInChain for use in message-processor
export { sendNextStepInChain, sendFinalLinkDM as sendFinalLink };
