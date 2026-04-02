// services/automation/message-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import { sendInstagramDM } from "@/services/meta-api/meta-api.service";
import {
  sendFinalLinkDM,
  sendNextStepInChain,
} from "@/services/automation/dm-processor.service";

/**
 * Handle incoming text message (email or phone response from user).
 * Called when a user's dmFlowStage is "waiting_for_email" or "waiting_for_phone".
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
      dmFlowStage: { $in: ["waiting_for_email", "waiting_for_phone"] },
    }).sort({ createdAt: -1 });

    if (!recentLog) {
      console.log("No context found for incoming message from:", senderId);
      return { success: false, message: "No context found" };
    }

    console.log(
      `Found active conversation with stage: ${recentLog.dmFlowStage}`,
    );

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
      );
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

    console.log(`✅ Email collected for ${senderId}: ${email}`);

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
      );
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

    console.log(`✅ Phone collected for ${senderId}: ${phone}`);

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

/**
 * FIXED: Handle incoming DM — properly delegates to handleIncomingMessage
 * when conversation is waiting for email/phone
 */
export async function handleIncomingDM(
  accountId: string,
  clerkId: string,
  senderId: string,
  messageText: string,
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
    }).sort({ createdAt: -1 });

    // If we have an active conversation waiting for input, delegate to handleIncomingMessage
    if (
      existingLog &&
      (existingLog.dmFlowStage === "waiting_for_email" ||
        existingLog.dmFlowStage === "waiting_for_phone")
    ) {
      console.log(
        `Found active conversation in stage "${existingLog.dmFlowStage}" for user ${senderId}`,
      );
      console.log(
        `Processing message as response: "${messageText.substring(0, 50)}..."`,
      );

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
      console.log(
        `Existing conversation in stage "${existingLog.dmFlowStage}", skipping new conversation start`,
      );
      return {
        success: false,
        message: `Active conversation in progress (${existingLog.dmFlowStage})`,
        processed: false,
      };
    }

    // No existing conversation — start new one
    console.log(
      `No active conversation found for user ${senderId}, starting new DM conversation`,
    );
    return await startNewDMConversation(
      account,
      clerkId,
      senderId,
      messageText,
    );
  } catch (error) {
    console.error("Error handling incoming DM:", error);
    return { success: false, message: "Failed to handle DM", processed: false };
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
      console.log(`No matching DM template found for: "${messageText}"`);
      return {
        success: false,
        message: "No matching template",
        processed: false,
      };
    }

    const hasAskFollow = matchingTemplate.askFollow?.enabled;
    const hasAskEmail = matchingTemplate.askEmail?.enabled;
    const hasAskPhone = matchingTemplate.askPhone?.enabled;

    // Determine button payload using same priority as comment/story processors
    let buttonPayload = "";
    let initialStage = "welcome";

    if (hasAskFollow) {
      buttonPayload = `CHECK_FOLLOW_${matchingTemplate.mediaId}`;
      initialStage = "waiting_for_follow";
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

    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      senderId,
      {
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
    );

    if (!dmSuccess) {
      return {
        success: false,
        message: "Failed to send welcome message",
        processed: false,
      };
    }

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

    console.log(
      `✅ New DM conversation started for ${senderId} with template "${matchingTemplate.name}" in stage "${initialStage}"`,
    );
    await InstaReplyTemplate.findByIdAndUpdate(matchingTemplate._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    });
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
  const lowerMessage = messageText.toLowerCase();

  for (const template of templates) {
    if (!template.isActive) continue;

    if (template.anyKeyword) {
      return template;
    }

    if (template.triggers?.length > 0) {
      const hasMatch = template.triggers.some((trigger: string) => {
        if (!trigger) return false;
        return lowerMessage.includes(trigger.toLowerCase().replace(/\s+/g, ""));
      });
      if (hasMatch) return template;
    }
  }

  return null;
}
