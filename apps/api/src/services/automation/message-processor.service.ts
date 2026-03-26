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
