// services/automation/message-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import { sendInstagramDM } from "@/services/meta-api/meta-api.service";

/**
 * Handle incoming message - FIRE AND FORGET
 * NO rate limiting
 * These are user responses (email, phone, etc)
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
      return {
        success: false,
        message: "Account not found or inactive",
      };
    }

    // Find recent log for this user to determine context
    const recentLog = await InstaReplyLog.findOne({
      userId: clerkId,
      accountId: accountId,
      commenterUserId: senderId,
      dmFlowStage: { $in: ["waiting_for_email", "waiting_for_phone"] },
    }).sort({ createdAt: -1 });

    if (!recentLog) {
      console.log("No context found for incoming message from:", senderId);
      return {
        success: false,
        message: "No context found",
      };
    }

    // Get template
    const template = await InstaReplyTemplate.findById(recentLog.templateId);
    if (!template) {
      return {
        success: false,
        message: "Template not found",
      };
    }

    // Handle based on stage
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

    return {
      success: false,
      message: "Unknown stage",
    };
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
 * Handle email response
 * UPDATED to match the working pattern from comment processor
 */
async function handleEmailResponse(
  account: any,
  clerkId: string,
  template: any,
  senderId: string,
  email: string,
  log: any,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log(`Processing email response for user ${senderId}: ${email}`);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Invalid email - send retry message
      const retrySuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text:
            template.askEmail?.retryMessage ||
            "Please enter a valid email address, e.g. info@gmail.com",
        },
        false, // isCommentReply = false for DMs
      );

      console.log(
        `Email validation failed for ${email}, retry sent: ${retrySuccess}`,
      );

      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
      };
    }

    // Valid email - save and send next step or final link
    log.emailCollected = email;
    log.dmFlowStage = "email_collected";
    await log.save();

    console.log(`Valid email collected for user ${senderId}: ${email}`);

    // Save email to user record (optional)
    const User = (await import("@/models/user.model")).default;
    await User.findOneAndUpdate(
      { clerkId },
      { $set: { email: email } },
      { upsert: false },
    );

    // Send next step or final link
    if (template.askPhone?.enabled) {
      // Ask for phone next
      const phoneMessage =
        template.askPhone?.openingMessage?.replace(
          /\{\{username\}\}/g,
          log.commenterUsername || "there",
        ) ||
        "Great! Now please share your phone number to complete your access.";

      const dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text: phoneMessage,
        },
        false, // isCommentReply = false for DMs
      );

      log.dmFlowStage = "waiting_for_phone";
      await log.save();

      console.log(`Phone request sent to ${senderId}: ${dmSuccess}`);

      return {
        success: dmSuccess,
        message: dmSuccess ? "Phone request sent" : "Failed to ask for phone",
      };
    } else {
      // Send final link
      const randomIndex = Math.floor(Math.random() * template.content.length);
      const content = template.content[randomIndex];
      const buttonTitle = content.buttonTitle || "Get Access";
      const finalText = content.text || "Here's your access!";

      const dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `Perfect! ${finalText}`,
              buttons: [
                {
                  type: "web_url",
                  url: content.link,
                  title: buttonTitle,
                  webview_height_ratio: "full",
                },
              ],
            },
          },
        },
        false, // isCommentReply = false for DMs
      );

      log.linkSent = dmSuccess;
      log.dmFlowStage = "final_link";
      await log.save();

      console.log(`Final link sent to ${senderId}: ${dmSuccess}`);

      return {
        success: dmSuccess,
        message: dmSuccess ? "Final link sent" : "Failed to send link",
      };
    }
  } catch (error) {
    console.error("Error handling email response:", error);
    return {
      success: false,
      message: "Failed to handle email",
    };
  }
}

/**
 * Handle phone response
 * UPDATED to match the working pattern from comment processor
 */
async function handlePhoneResponse(
  account: any,
  clerkId: string,
  template: any,
  senderId: string,
  phone: string,
  log: any,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log(`Processing phone response for user ${senderId}: ${phone}`);

    // Validate phone (basic validation)
    const phoneRegex = /^[+]?[\d\s()-]{8,20}$/;
    if (!phoneRegex.test(phone)) {
      // Invalid phone - send retry message
      const retrySuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text:
            template.askPhone?.retryMessage ||
            "Please enter a valid phone number, e.g. +1234567890 or 9876543210",
        },
        false, // isCommentReply = false for DMs
      );

      console.log(
        `Phone validation failed for ${phone}, retry sent: ${retrySuccess}`,
      );

      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
      };
    }

    // Valid phone - save and send final link
    log.phoneCollected = phone;
    log.dmFlowStage = "phone_collected";
    await log.save();

    console.log(`Valid phone collected for user ${senderId}: ${phone}`);

    // Send final link
    const randomIndex = Math.floor(Math.random() * template.content.length);
    const content = template.content[randomIndex];
    const buttonTitle = content.buttonTitle || "Get Access";
    const finalText = content.text || "Here's your access!";

    const dmSuccess = await sendInstagramDM(
      account.instagramId,
      account.accessToken,
      senderId,
      {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: `Perfect! ${finalText}`,
            buttons: [
              {
                type: "web_url",
                url: content.link,
                title: buttonTitle,
                webview_height_ratio: "full",
              },
            ],
          },
        },
      },
      false, // isCommentReply = false for DMs
    );

    log.linkSent = dmSuccess;
    log.dmFlowStage = "final_link";
    await log.save();

    console.log(`Final link sent to ${senderId}: ${dmSuccess}`);

    return {
      success: dmSuccess,
      message: dmSuccess ? "Final link sent" : "Failed to send link",
    };
  } catch (error) {
    console.error("Error handling phone response:", error);
    return {
      success: false,
      message: "Failed to handle phone",
    };
  }
}

/**
 * Handle incoming DM - Process direct messages from users
 * This handles both new conversations (trigger words) and ongoing conversations
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

    // Find if there's an existing conversation log for this user
    const existingLog = await InstaReplyLog.findOne({
      userId: clerkId,
      accountId: accountId,
      commenterUserId: senderId,
      dmFlowStage: { $nin: ["final_link", "completed"] },
    }).sort({ createdAt: -1 });

    // If there's an existing log, continue the conversation
    if (existingLog) {
      return await handleExistingConversation(
        account,
        clerkId,
        senderId,
        messageText,
        existingLog,
      );
    }

    // No existing log - start a new conversation
    return await handleNewConversation(account, clerkId, senderId, messageText);
  } catch (error) {
    console.error("Error handling incoming DM:", error);
    return { success: false, message: "Failed to handle DM", processed: false };
  }
}

/**
 * Handle new conversation - triggered by trigger words
 */
async function handleNewConversation(
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
    // Find templates for DM automation
    const templates = await InstaReplyTemplate.find({
      userId: clerkId,
      accountId: account.instagramId,
      isActive: true,
      automationType: "dms",
    }).sort({ priority: 1 });

    // Find matching template based on trigger words
    const matchingTemplate = await findMatchingDMTemplate(
      messageText,
      templates,
    );

    if (!matchingTemplate) {
      console.log(`No matching template found for DM: "${messageText}"`);
      return {
        success: false,
        message: "No matching template",
        processed: false,
      };
    }

    // Send welcome message with appropriate button based on template features
    const welcomeText = matchingTemplate.welcomeMessage.text.replace(
      /\{\{username\}\}/g,
      account.username,
    );

    // Determine button payload based on template features
    let buttonPayload = "";
    let buttonTitle = "";
    const hasAskFollow = matchingTemplate.askFollow?.enabled;
    const hasAskEmail = matchingTemplate.askEmail?.enabled;
    const hasAskPhone = matchingTemplate.askPhone?.enabled;

    if (hasAskFollow) {
      buttonPayload = `CHECK_FOLLOW_${matchingTemplate.mediaId}`;
      buttonTitle =
        matchingTemplate.askFollow?.visitProfileBtn || "Send me the link";
    } else if (hasAskEmail) {
      buttonPayload = `ASK_EMAIL_${matchingTemplate.mediaId}`;
      buttonTitle = "Continue";
    } else if (hasAskPhone) {
      buttonPayload = `ASK_PHONE_${matchingTemplate.mediaId}`;
      buttonTitle = "Continue";
    } else {
      buttonPayload = `GET_ACCESS_${matchingTemplate.mediaId}`;
      buttonTitle = selectRandomItem(
        matchingTemplate.content?.map(
          (c: any) => c.buttonTitle || "Get Access",
        ) || ["Get Access"],
      );
    }

    // Send welcome message as DM
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
                title: buttonTitle,
                payload: buttonPayload,
              },
            ],
          },
        },
      },
      false, // isCommentReply = false for DMs
    );

    if (!dmSuccess) {
      console.error(`Failed to send welcome DM to ${senderId}`);
      return {
        success: false,
        message: "Failed to send welcome message",
        processed: false,
      };
    }

    // Create log for this conversation
    const log = await InstaReplyLog.create({
      userId: clerkId,
      accountId: account.instagramId,
      templateId: matchingTemplate._id.toString(),
      templateName: matchingTemplate.name,
      commentId: `dm_${Date.now()}`,
      commentText: messageText,
      commenterUsername: "unknown",
      commenterUserId: senderId,
      mediaId: matchingTemplate.mediaId,
      dmFlowStage: hasAskFollow
        ? "welcome_sent"
        : hasAskEmail
          ? "welcome_sent"
          : hasAskPhone
            ? "welcome_sent"
            : "initial",
      success: true,
      createdAt: new Date(),
    });

    console.log(
      `✅ New DM conversation started for ${senderId} with template ${matchingTemplate.name}`,
    );

    return {
      success: true,
      message: "Welcome message sent",
      processed: true,
    };
  } catch (error) {
    console.error("Error handling new conversation:", error);
    return {
      success: false,
      message: "Failed to start conversation",
      processed: false,
    };
  }
}

/**
 * Handle existing conversation - continue the flow
 */
async function handleExistingConversation(
  account: any,
  clerkId: string,
  senderId: string,
  messageText: string,
  log: any,
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  try {
    const template = await InstaReplyTemplate.findById(log.templateId);
    if (!template) {
      return {
        success: false,
        message: "Template not found",
        processed: false,
      };
    }

    // Handle based on current stage
    if (log.dmFlowStage === "waiting_for_email") {
      return await handleEmailResponseForDM(
        account,
        template,
        senderId,
        messageText,
        log,
      );
    } else if (log.dmFlowStage === "waiting_for_phone") {
      return await handlePhoneResponseForDM(
        account,
        template,
        senderId,
        messageText,
        log,
      );
    }

    return { success: false, message: "Unknown stage", processed: false };
  } catch (error) {
    console.error("Error handling existing conversation:", error);
    return {
      success: false,
      message: "Failed to continue conversation",
      processed: false,
    };
  }
}

/**
 * Handle email response for DM
 */
async function handleEmailResponseForDM(
  account: any,
  template: any,
  senderId: string,
  email: string,
  log: any,
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const retrySuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        {
          text:
            template.askEmail?.retryMessage ||
            "Please enter a valid email address.",
        },
        false,
      );
      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
        processed: retrySuccess,
      };
    }

    log.emailCollected = email;
    log.dmFlowStage = "email_collected";
    await log.save();

    if (template.askPhone?.enabled) {
      const phoneMessage =
        template.askPhone?.openingMessage?.replace(
          /\{\{username\}\}/g,
          account.username,
        ) || "Great! Now please share your phone number.";
      const dmSuccess = await sendInstagramDM(
        account.instagramId,
        account.accessToken,
        senderId,
        { text: phoneMessage },
        false,
      );
      log.dmFlowStage = "waiting_for_phone";
      await log.save();
      return {
        success: dmSuccess,
        message: dmSuccess ? "Phone request sent" : "Failed to ask for phone",
        processed: dmSuccess,
      };
    } else {
      return await sendFinalLinkDM(account, template, senderId, log);
    }
  } catch (error) {
    console.error("Error handling email response:", error);
    return {
      success: false,
      message: "Failed to handle email",
      processed: false,
    };
  }
}

/**
 * Handle phone response for DM
 */
async function handlePhoneResponseForDM(
  account: any,
  template: any,
  senderId: string,
  phone: string,
  log: any,
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
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
            "Please enter a valid phone number.",
        },
        false,
      );
      return {
        success: retrySuccess,
        message: retrySuccess ? "Retry message sent" : "Failed to send retry",
        processed: retrySuccess,
      };
    }

    log.phoneCollected = phone;
    log.dmFlowStage = "phone_collected";
    await log.save();

    return await sendFinalLinkDM(account, template, senderId, log);
  } catch (error) {
    console.error("Error handling phone response:", error);
    return {
      success: false,
      message: "Failed to handle phone",
      processed: false,
    };
  }
}

/**
 * Send final link DM
 */
async function sendFinalLinkDM(
  account: any,
  template: any,
  senderId: string,
  log: any,
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  const randomIndex = Math.floor(Math.random() * template.content.length);
  const content = template.content[randomIndex];
  const buttonTitle = content.buttonTitle || "Get Access";

  const dmSuccess = await sendInstagramDM(
    account.instagramId,
    account.accessToken,
    senderId,
    {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: `Perfect! ${content.text || "Here's your access!"}`,
          buttons: [
            {
              type: "web_url",
              url: content.link,
              title: buttonTitle,
              webview_height_ratio: "full",
            },
          ],
        },
      },
    },
    false,
  );

  log.linkSent = dmSuccess;
  log.dmFlowStage = "final_link";
  await log.save();

  return {
    success: dmSuccess,
    message: dmSuccess ? "Final link sent" : "Failed to send link",
    processed: dmSuccess,
  };
}

/**
 * Find matching template for DM based on trigger words
 */
async function findMatchingDMTemplate(messageText: string, templates: any[]) {
  const lowerMessage = messageText.toLowerCase();

  for (const template of templates) {
    if (!template.isActive) continue;

    // Check triggers if "any keyword" is NOT enabled
    if (!template.anyKeyword && template.triggers?.length > 0) {
      const hasMatch = template.triggers.some((trigger: string) => {
        if (!trigger) return false;
        return lowerMessage.includes(trigger.toLowerCase().replace(/\s+/g, ""));
      });
      if (hasMatch) return template;
    } else if (template.anyKeyword) {
      // Any keyword enabled - match any message
      return template;
    }
  }

  return null;
}

function selectRandomItem(items: string[]): string {
  if (!items || items.length === 0) return "";
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}
