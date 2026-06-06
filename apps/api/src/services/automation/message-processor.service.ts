// services/automation/message-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import { sendInstagramDM } from "@/services/meta-api/meta-api.service";
import {
  getDMFlowQuestions,
  sendFinalLinkDM,
  sendDMFlowQuestion,
  sendNextStepInChain,
} from "@/services/automation/dm-processor.service";
import {
  canSendInstaDM,
  dmLimitMessage,
  recordInstaDMSent,
  stopInstaAutomationForDMLimit,
} from "@/services/insta-quota.service";

const MAX_INSTAGRAM_QUICK_REPLIES = 13;

/**
 * Handle incoming text message for email, phone, or custom form responses.
 */
export async function handleIncomingMessage(
  accountId: string,
  clerkId: string,
  senderId: string,
  messageText: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await connectToDatabase();

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive) {
      return { success: false, message: "Account not found or inactive" };
    }

    // Find the most recent active log for this user that is waiting for input
    const recentLog = await InstaReplyLog.findOne({
      userId: clerkId,
      accountId: accountId,
      commenterUserId: senderId,
      $or: [
        { dmFlowStage: { $in: ["waiting_for_email", "waiting_for_phone"] } },
        { dmFlowStage: /^waiting_for_form_\d+$/ },
      ],
    }).sort({ createdAt: -1 });

    if (!recentLog) {
      return { success: false, message: "No context found" };
    }

    const template = await InstaReplyTemplate.findById(recentLog.templateId);
    if (!template) {
      return { success: false, message: "Template not found" };
    }

    if (recentLog.dmFlowStage === "waiting_for_email") {
      return await handleEmailResponse(
        account,
        clerkId,
        template,
        senderId,
        messageText,
        recentLog,
      );
    } else if (recentLog.dmFlowStage === "waiting_for_phone") {
      return await handlePhoneResponse(
        account,
        clerkId,
        template,
        senderId,
        messageText,
        recentLog,
      );
    } else if (/^waiting_for_form_\d+$/.test(recentLog.dmFlowStage || "")) {
      return await handleFormQuestionResponse(
        account,
        clerkId,
        template,
        senderId,
        messageText,
        recentLog,
      );
    }

    return { success: false, message: "Unknown stage" };
  } catch (error) {
    console.error("Error handling incoming message:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to handle message",
    };
  }
}

/**
 * Handle email text response from user.
 */
async function handleEmailResponse(
  account: any,
  clerkId: string,
  template: any,
  senderId: string,
  email: string,
  log: any,
): Promise<{ success: boolean; message: string }> {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (!(await canSendInstaDM(clerkId, account))) {
        await stopInstaAutomationForDMLimit(account);
        return { success: false, message: dmLimitMessage() };
      }

      // Invalid — send retry
      const retrySuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text:
            template.askEmail?.retryMessage ||
            "Please enter a valid email address, e.g. info@gmail.com",
        },
        false,
        clerkId,
        false, // isWelcomeDM = false (validation retry)
      );
      if (retrySuccess) await recordInstaDMSent(account);
      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
      };
    }

    // Valid email — save to log and LeadCollection
    log.emailCollected = email;
    log.dmFlowStage = "email_collected";
    await log.save();

    // Save to LeadCollection
    await InstaLeadCollection.create({
      userId: clerkId,
      accountId: account.instagramId,
      accountUsername: account.username,
      templateId: log.templateId,
      templateName: log.templateName || "Unknown",
      commenterUserId: senderId,
      commenterUsername: log.commenterUsername || "unknown",
      mediaId: log.mediaId || "",
      automationType: log.automationType || "comments",
      email,
      source: "email_collection",
    });

    // Chain to next step
    const startTime = Date.now();
    const result = await sendNextStepInChain(
      account,
      clerkId,
      template,
      senderId,
      "email",
      startTime,
    );

    // Update the log with the next stage
    if (result.nextStage) {
      await InstaReplyLog.findByIdAndUpdate(log._id, {
        dmFlowStage: result.nextStage,
      });
    }

    return result;
  } catch (error) {
    console.error("Error handling email response:", error);
    return { success: false, message: "Failed to handle email" };
  }
}

/**
 * Handle phone text response from user.
 */
async function handlePhoneResponse(
  account: any,
  clerkId: string,
  template: any,
  senderId: string,
  phone: string,
  log: any,
): Promise<{ success: boolean; message: string }> {
  try {
    const phoneRegex = /^[+]?[\d\s()-]{8,20}$/;
    if (!phoneRegex.test(phone)) {
      if (!(await canSendInstaDM(clerkId, account))) {
        await stopInstaAutomationForDMLimit(account);
        return { success: false, message: dmLimitMessage() };
      }

      const retrySuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text:
            template.askPhone?.retryMessage ||
            "Please enter a valid phone number, e.g. +1234567890 or 9876543210",
        },
        false,
        clerkId,
        false, // isWelcomeDM = false (validation retry)
      );
      if (retrySuccess) await recordInstaDMSent(account);
      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
      };
    }

    // Valid phone — save to log and LeadCollection
    log.phoneCollected = phone;
    log.dmFlowStage = "phone_collected";
    await log.save();

    await InstaLeadCollection.create({
      userId: clerkId,
      accountId: account.instagramId,
      accountUsername: account.username,
      templateId: log.templateId,
      templateName: log.templateName || "Unknown",
      commenterUserId: senderId,
      commenterUsername: log.commenterUsername || "unknown",
      mediaId: log.mediaId || "",
      automationType: log.automationType || "comments",
      phone,
      source: "phone_collection",
    });

    // Chain to next step (always final link after phone)
    const startTime = Date.now();
    const result = await sendNextStepInChain(
      account,
      clerkId,
      template,
      senderId,
      "phone",
      startTime,
    );

    // Update the log with the next stage
    if (result.nextStage) {
      await InstaReplyLog.findByIdAndUpdate(log._id, {
        dmFlowStage: result.nextStage,
      });
    }

    return result;
  } catch (error) {
    console.error("Error handling phone response:", error);
    return { success: false, message: "Failed to handle phone" };
  }
}

function validateFormAnswer(question: any, answer: string) {
  const value = answer.trim();
  if (question.required && !value) return false;
  if (!value) return true;
  if (question.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (question.type === "phone") return /^[+]?[\d\s()-]{8,20}$/.test(value);
  if (question.type === "number" || question.type === "budget") {
    return !Number.isNaN(Number(value.replace(/[,\s₹$]/g, "")));
  }
  return true;
}

async function handleFormQuestionResponse(
  account: any,
  clerkId: string,
  template: any,
  senderId: string,
  answer: string,
  log: any,
): Promise<{ success: boolean; message: string }> {
  try {
    const questions = getDMFlowQuestions(template);
    const questionIndex = Number(log.currentQuestionIndex || 0);
    const question = questions[questionIndex];

    if (!question) {
      return await sendFinalLinkDM(account, clerkId, template, senderId, Date.now());
    }

    if (!validateFormAnswer(question, answer)) {
      if (!(await canSendInstaDM(clerkId, account))) {
        await stopInstaAutomationForDMLimit(account);
        return { success: false, message: dmLimitMessage() };
      }

      const retrySuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text:
            question.retryMessage ||
            `Please enter a valid ${question.label || "answer"}.`,
        },
        false,
        clerkId,
        false,
      );
      if (retrySuccess) await recordInstaDMSent(account);
      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
      };
    }

    const nextResponses = {
      ...(log.formResponses || {}),
      [question.id]: {
        label: question.label,
        type: question.type,
        answer: answer.trim(),
      },
    };

    log.formResponses = nextResponses;
    log.currentQuestionIndex = questionIndex + 1;
    if (question.type === "email") log.emailCollected = answer.trim();
    if (question.type === "phone") log.phoneCollected = answer.trim();
    await log.save();

    if (questionIndex + 1 < questions.length) {
      const result = await sendDMFlowQuestion(
        account,
        clerkId,
        template,
        senderId,
        questionIndex + 1,
      );
      return { success: result.success, message: result.message };
    }

    await InstaLeadCollection.create({
      userId: clerkId,
      accountId: account.instagramId,
      accountUsername: account.username,
      templateId: log.templateId,
      templateName: log.templateName || "Unknown",
      commenterUserId: senderId,
      commenterUsername: log.commenterUsername || "unknown",
      mediaId: log.mediaId || "",
      automationType: log.automationType || "comments",
      email: log.emailCollected,
      phone: log.phoneCollected,
      formData: nextResponses,
      source: "form_collection",
    });

    const result = await sendFinalLinkDM(
      account,
      clerkId,
      template,
      senderId,
      Date.now(),
    );
    if (result.nextStage) {
      await InstaReplyLog.findByIdAndUpdate(log._id, {
        dmFlowStage: result.nextStage,
      });
    }
    return result;
  } catch (error) {
    console.error("Error handling form response:", error);
    return { success: false, message: "Failed to handle form response" };
  }
}

/**
 * FIXED: Handle incoming DM — properly delegates to handleIncomingMessage
 * when conversation is waiting for email/phone
 */
export async function handleIncomingDM(
  accountId: string,
  clerkId: string,
  senderId: string,
  messageText: string,
  options: { autoStartForm?: boolean } = {},
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  try {
    await connectToDatabase();

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled) {
      return {
        success: false,
        message: "Account not active or DM disabled",
        processed: false,
      };
    }

    // CRITICAL FIX: Check for existing active conversation FIRST
    // This must happen before any other checks
    const existingLog = await InstaReplyLog.findOne({
      userId: clerkId,
      accountId: accountId,
      commenterUserId: senderId,
      $or: [
        {
          dmFlowStage: {
            $in: [
              "waiting_for_email",
              "waiting_for_phone",
              "email_collected",
              "phone_collected",
              "waiting_for_follow",
              "still_waiting_for_follow",
            ],
          },
        },
        { dmFlowStage: /^waiting_for_form_\d+$/ },
      ],
    }).sort({ createdAt: -1 });

    // If we have an active conversation waiting for input, delegate to handleIncomingMessage
    if (
      existingLog &&
      (existingLog.dmFlowStage === "waiting_for_email" ||
        existingLog.dmFlowStage === "waiting_for_phone" ||
        /^waiting_for_form_\d+$/.test(existingLog.dmFlowStage || ""))
    ) {
      const result = await handleIncomingMessage(
        accountId,
        clerkId,
        senderId,
        messageText,
      );
      return { ...result, processed: result.success };
    }

    // If there's another non-final stage active (like waiting_for_follow), don't start new conversation
    if (existingLog) {
      return {
        success: false,
        message: `Active conversation in progress (${existingLog.dmFlowStage})`,
        processed: false,
      };
    }

    return await startNewDMConversation(
      account,
      clerkId,
      senderId,
      messageText,
      options,
    );
  } catch (error) {
    console.error("Error handling incoming DM:", error);
    return { success: false, message: "Failed to handle DM", processed: false };
  }
}

export async function sendDMStarterQuickReplies(
  accountId: string,
  clerkId: string,
  senderId: string,
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  try {
    await connectToDatabase();

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled || !senderId) {
      return {
        success: false,
        message: "Account not active or DM disabled",
        processed: false,
      };
    }

    const existingLog = await InstaReplyLog.findOne({
      userId: clerkId,
      accountId,
      commenterUserId: senderId,
      $or: [
        {
          dmFlowStage: {
            $in: [
              "waiting_for_email",
              "waiting_for_phone",
              "email_collected",
              "phone_collected",
              "waiting_for_follow",
              "still_waiting_for_follow",
            ],
          },
        },
        { dmFlowStage: /^waiting_for_form_\d+$/ },
      ],
    }).sort({ createdAt: -1 });

    if (existingLog) {
      return {
        success: false,
        message: "Active conversation already exists",
        processed: false,
      };
    }

    const templates = await InstaReplyTemplate.find({
      userId: clerkId,
      accountId: account.instagramId,
      isActive: true,
      automationType: "dms",
      quickReplyTriggers: { $exists: true, $ne: [] },
    }).sort({ priority: 1 });

    const replies = Array.from(
      new Set(
        templates.flatMap((template: any) =>
          (template.quickReplyTriggers || [])
            .map((trigger: string) => trigger?.trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
    ).slice(0, MAX_INSTAGRAM_QUICK_REPLIES);

    if (replies.length === 0) {
      return {
        success: false,
        message: "No starter quick replies configured",
        processed: false,
      };
    }

    if (!(await canSendInstaDM(clerkId, account))) {
      await stopInstaAutomationForDMLimit(account);
      return {
        success: false,
        message: dmLimitMessage(),
        processed: false,
      };
    }

    const sent = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      senderId,
      {
        text: "Choose an option to get started:",
        quick_replies: replies.map((keyword) => ({
          content_type: "text",
          title: keyword,
          payload: `DM_KEYWORD_${keyword}`,
        })),
      },
      false,
      clerkId,
      true,
    );

    if (sent) await recordInstaDMSent(account);

    return {
      success: sent,
      message: sent ? "Starter quick replies sent" : "Failed to send quick replies",
      processed: sent,
    };
  } catch (error) {
    console.error("Error sending DM starter quick replies:", error);
    return {
      success: false,
      message: "Failed to send starter quick replies",
      processed: false,
    };
  }
}

/**
 * Start a brand-new DM conversation triggered by a keyword.
 */
async function startNewDMConversation(
  account: any,
  clerkId: string,
  senderId: string,
  messageText: string,
  options: { autoStartForm?: boolean } = {},
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  try {
    const templates = await InstaReplyTemplate.find({
      userId: clerkId,
      accountId: account.instagramId,
      isActive: true,
      automationType: "dms",
    }).sort({ priority: 1 });

    const matchingTemplate = findMatchingDMTemplate(messageText, templates);

    if (!matchingTemplate) {
      return {
        success: false,
        message: "No matching template",
        processed: false,
      };
    }

    const hasAskFollow = matchingTemplate.askFollow?.enabled;
    const hasAskEmail = matchingTemplate.askEmail?.enabled;
    const hasAskPhone = matchingTemplate.askPhone?.enabled;
    const hasFormQuestions = getDMFlowQuestions(matchingTemplate).length > 0;

    // Determine button payload using same priority as comment/story processors
    let buttonPayload = "";
    let initialStage = "welcome";

    const shouldAutoStartForm =
      options.autoStartForm && hasFormQuestions && !hasAskFollow;

    if (hasAskFollow) {
      buttonPayload = `CHECK_FOLLOW_${matchingTemplate.mediaId}`;
      initialStage = "waiting_for_follow";
    } else if (hasFormQuestions) {
      buttonPayload = `START_FORM_${matchingTemplate.mediaId}`;
      initialStage = "welcome";
    } else if (hasAskEmail) {
      buttonPayload = `ASK_EMAIL_${matchingTemplate.mediaId}`;
      initialStage = "waiting_for_email";
    } else if (hasAskPhone) {
      buttonPayload = `ASK_PHONE_${matchingTemplate.mediaId}`;
      initialStage = "waiting_for_phone";
    } else {
      buttonPayload = `GET_ACCESS_${matchingTemplate.mediaId}`;
      initialStage = "initial";
    }

    const welcomeText = matchingTemplate.welcomeMessage.text.replace(
      /\{\{username\}\}/g,
      "there", // DMs don't have username context
    );

    if (!(await canSendInstaDM(clerkId, account))) {
      await stopInstaAutomationForDMLimit(account);
      return {
        success: false,
        message: dmLimitMessage(),
        processed: false,
      };
    }

    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      senderId,
      shouldAutoStartForm
        ? { text: welcomeText }
        : {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: welcomeText,
                buttons: [
                  {
                    type: "postback",
                    title: matchingTemplate.welcomeMessage.buttonTitle,
                    payload: buttonPayload,
                  },
                ],
              },
            },
          },
      false,
      clerkId,
      true, // isWelcomeDM = true
    );

    if (!dmSuccess) {
      return {
        success: false,
        message: "Failed to send welcome message",
        processed: false,
      };
    }

    await recordInstaDMSent(account);

    const uniqueId = `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await InstaReplyLog.create({
      userId: clerkId,
      accountId: account.instagramId,
      templateId: matchingTemplate._id.toString(),
      templateName: matchingTemplate.name,
      automationType: "dms",
      commentId: uniqueId,
      commentText: messageText,
      commenterUsername: "unknown",
      commenterUserId: senderId,
      mediaId: matchingTemplate.mediaId || "",
      dmFlowStage: initialStage,
      followUpCount: 0,
      followUpCompleted: false,
      success: true,
      createdAt: new Date(),
    });

    await InstaReplyTemplate.findByIdAndUpdate(matchingTemplate._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    });

    if (shouldAutoStartForm) {
      const questionResult = await sendDMFlowQuestion(
        account,
        clerkId,
        matchingTemplate,
        senderId,
        0,
      );
      return {
        success: questionResult.success,
        message: questionResult.success
          ? "Welcome and first question sent"
          : questionResult.message,
        processed: true,
      };
    }

    return {
      success: true,
      message: "Welcome message sent",
      processed: true,
    };
  } catch (error) {
    console.error("Error starting new DM conversation:", error);
    return {
      success: false,
      message: "Failed to start conversation",
      processed: false,
    };
  }
}

/**
 * Find matching template by trigger keywords.
 */
function findMatchingDMTemplate(messageText: string, templates: any[]) {
  const normalizedMessage = messageText.toLowerCase().replace(/\s+/g, "");

  for (const template of templates) {
    if (!template.isActive) continue;

    if (template.anyKeyword) {
      return template;
    }

    const keywordTriggers = [
      ...(template.triggers || []),
      ...(template.quickReplyTriggers || []),
    ];

    if (keywordTriggers.length > 0) {
      const hasMatch = keywordTriggers.some((trigger: string) => {
        if (!trigger) return false;
        return normalizedMessage.includes(
          trigger.toLowerCase().replace(/\s+/g, ""),
        );
      });
      if (hasMatch) return template;
    }
  }

  return null;
}
