// services/webhook/instagram-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { processCommentAutomation } from "@/services/automation/comment-processor.service";
import { processStoryAutomation } from "@/services/automation/story-processor.service";
import { handlePostbackAutomation } from "@/services/automation/dm-processor.service";
import { recordCall } from "@/services/rate-limit.service";
import {
  handleIncomingDM,
  sendDMStarterQuickReplies,
} from "@/services/automation/message-processor.service";

function getQuickReplyKeyword(payload?: string) {
  if (!payload || !payload.startsWith("DM_KEYWORD_")) return "";
  return payload.replace("DM_KEYWORD_", "").trim();
}

/**
 * Process Instagram webhook — main entry point for all Meta API events.
 */
export async function processInstagramWebhook(payload: any): Promise<{
  success: boolean;
  processed: number;
  queued: number;
  errors: string[];
}> {
  const results = {
    success: true,
    processed: 0,
    queued: 0,
    errors: [] as string[],
  };

  try {
    await connectToDatabase();

    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        const instagramBusinessId = entry.id;

        // ── Changes (comments, story mentions) ─────────────────────────────
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === "comments" || change.field === "comment") {
              const result = await processCommentWebhook(
                change.value,
                instagramBusinessId,
                payload,
              );
              if (result.queued) results.queued++;
              if (result.processed) results.processed++;
              if (result.error) results.errors.push(result.error);
            }

            if (
              change.field === "story_insights" ||
              change.field === "story_mentions"
            ) {
              const result = await processStoryWebhook(
                change.value,
                instagramBusinessId,
                payload,
              );
              if (result.queued) results.queued++;
              if (result.processed) results.processed++;
              if (result.error) results.errors.push(result.error);
            }
          }
        }

        // ── Messaging (Facebook/Instagram Messenger style) ─────────────────
        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const message of entry.messaging) {
            const result = await processMessagingWebhook(
              message,
              instagramBusinessId,
            );
            if (result.queued) results.queued++;
            if (result.processed) results.processed++;
            if (result.error) results.errors.push(result.error);
          }
        }

        // ── Direct messages (Instagram standard) ───────────────────────────
        if (entry.direct_messages && Array.isArray(entry.direct_messages)) {
          for (const dm of entry.direct_messages) {
            const result = await processDirectMessageWebhook(
              dm,
              instagramBusinessId,
            );
            if (result.queued) results.queued++;
            if (result.processed) results.processed++;
            if (result.error) results.errors.push(result.error);
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error processing Instagram webhook:", error);
    return {
      success: false,
      processed: results.processed,
      queued: results.queued,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// ── Comment webhook ───────────────────────────────────────────────────────────

async function processCommentWebhook(
  comment: any,
  accountId: string,
  originalPayload: any,
): Promise<{ processed: boolean; queued: boolean; error?: string }> {
  try {
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoReplyEnabled) {
      return { processed: false, queued: false };
    }

    let commentId: string;
    let commentText: string;
    let commenterUsername: string;
    let commenterId: string;
    let mediaId: string;
    let mediaUrl: string;

    if (comment.id) {
      commentId = comment.id;
      commentText = comment.text || comment.message || "";
      commenterUsername =
        comment.from?.username || comment.username || "unknown";
      commenterId = comment.from?.id || comment.user_id || "";
      mediaId = comment.media?.id || comment.media_id || "";
      mediaUrl = comment.media?.media_url || comment.media_url || "";
    } else if (comment.data) {
      commentId = comment.data.id;
      commentText = comment.data.text || comment.data.message || "";
      commenterUsername =
        comment.data.from?.username || comment.data.username || "unknown";
      commenterId = comment.data.from?.id || comment.data.user_id || "";
      mediaId = comment.data.media?.id || comment.data.media_id || "";
      mediaUrl = comment.data.media?.media_url || comment.data.media_url || "";
    } else {
      console.error("Unknown comment structure:", comment);
      return {
        processed: false,
        queued: false,
        error: "Unknown comment structure",
      };
    }

    if (!commentText || commentText.trim() === "") {
      return { processed: false, queued: false };
    }

    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1,
      true,
      {
        webhookId: `webhook_${Date.now()}`,
        commentId,
        originalPayload,
        type: "comment",
      },
    );

    if (rateLimitResult.processImmediately) {
      await processCommentAutomation(accountId, account.userId, {
        id: commentId,
        text: commentText,
        username: commenterUsername,
        user_id: commenterId,
        timestamp: new Date().toISOString(),
        media_id: mediaId,
        media_url: mediaUrl,
      });
      return { processed: true, queued: false };
    }

    if (rateLimitResult.queued) {
      return { processed: false, queued: true };
    }

    return { processed: false, queued: false, error: rateLimitResult.reason };
  } catch (error) {
    console.error("Error processing comment webhook:", error);
    return {
      processed: false,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Story webhook ─────────────────────────────────────────────────────────────

async function processStoryWebhook(
  story: any,
  accountId: string,
  originalPayload: any,
): Promise<{ processed: boolean; queued: boolean; error?: string }> {
  try {
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.storyAutomationsEnabled) {
      return { processed: false, queued: false };
    }

    let storyId: string;
    let storyMentionId: string;
    let userId: string;
    let username: string;

    if (story.id) {
      storyId = story.id;
      storyMentionId = story.mention?.id || story.mention_id || "";
      userId = story.from?.id || story.user_id || "";
      username = story.from?.username || story.username || "";
    } else if (story.data) {
      storyId = story.data.id;
      storyMentionId = story.data.mention?.id || story.data.mention_id || "";
      userId = story.data.from?.id || story.data.user_id || "";
      username = story.data.from?.username || story.data.username || "";
    } else {
      storyId = story.story_id || story.id || "";
      storyMentionId = story.mention_id || "";
      userId = story.user_id || "";
      username = story.username || "";
    }

    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1,
      true,
      {
        webhookId: `webhook_${Date.now()}`,
        storyId,
        originalPayload,
        type: "story",
      },
    );

    if (rateLimitResult.processImmediately) {
      await processStoryAutomation(accountId, account.userId, {
        id: storyMentionId || storyId,
        media_id: storyId,
        user_id: userId,
        username: username,
        mention_type: story.mention_type || "mention",
        timestamp: new Date().toISOString(),
      });
      return { processed: true, queued: false };
    }

    if (rateLimitResult.queued) {
      return { processed: false, queued: true };
    }

    return { processed: false, queued: false, error: rateLimitResult.reason };
  } catch (error) {
    console.error("Error processing story webhook:", error);
    return {
      processed: false,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Messaging webhook (postbacks + text messages) ─────────────────────────────
//
// ROOT CAUSE OF "No matching DM template found for: <bot message text>":
//
//   When your bot sends a message to a user (e.g. "I'll need your email address
//   first..."), Meta sends back an ECHO of that message as a webhook event.
//   The echo has:
//     message.message.is_echo = true
//     message.sender.id       = YOUR Instagram business account ID (not the user)
//
//   Your processor was treating that echo as a new incoming user message and
//   trying to find a DM template for the bot's own text — which obviously
//   doesn't match any keyword trigger → "No matching DM template found".
//
// FIX: Check is_echo === true FIRST and skip immediately.
//      Also skip if sender.id === business account ID (belt-and-suspenders).

async function processMessagingWebhook(
  message: any,
  accountId: string,
): Promise<{ processed: boolean; queued: boolean; error?: string }> {
  try {
    // ✅ PRIMARY FIX: Skip echo messages.
    //    Echoes are copies of messages YOUR bot sent, reflected back as webhooks.
    //    They are NOT messages from users. Treating them as user input is wrong.
    if (message.message?.is_echo === true) {
      return { processed: false, queued: false };
    }

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled) {
      return { processed: false, queued: false };
    }

    const senderId: string = message.sender?.id || "";

    // ✅ SECONDARY FIX: Skip if sender IS the business account.
    //    Real user messages always have sender.id = the user's Instagram-scoped ID,
    //    which is different from the business account ID.
    if (senderId && senderId === accountId) {
      return { processed: false, queued: false };
    }

    // ── Postbacks (button clicks) — no rate limiting ──────────────────────
    // These are user responses to your bot's buttons. Never rate-limit them
    // because they are direct user actions, not bulk incoming webhooks.
    if (message.postback) {
      await handlePostbackAutomation(
        accountId,
        account.userId,
        senderId,
        message.postback.payload,
        "postback",
      );
      return { processed: true, queued: false };
    }

    // ── Text messages from real users ─────────────────────────────────────
    // At this point we know:
    //   - is_echo is false or absent (it's a real user message)
    //   - sender is NOT the business account
    // This handles both:
    //   (a) New conversations triggered by keyword (e.g. "link", "start")
    //   (b) Ongoing conversations waiting for email/phone input
    const quickReplyKeyword = getQuickReplyKeyword(
      message.message?.quick_reply?.payload,
    );
    const incomingText = quickReplyKeyword || message.message?.text || "";

    if (incomingText) {
      const messageText: string = incomingText;

      // Apply rate limiting for incoming webhooks
      const rateLimitResult = await recordCall(
        account.userId,
        accountId,
        1,
        true,
        {
          webhookId: `dm_webhook_${Date.now()}`,
          senderId,
          type: "dm_message",
        },
      );

      if (rateLimitResult.processImmediately) {
        // handleIncomingDM handles both:
        //   1. Existing conversations waiting for email/phone → handleIncomingMessage
        //   2. New conversations triggered by keyword → startNewDMConversation
        const result = await handleIncomingDM(
          accountId,
          account.userId,
          senderId,
          messageText,
        );
        if (!result.processed && result.message === "No matching template") {
          const quickReplyResult = await sendDMStarterQuickReplies(
            accountId,
            account.userId,
            senderId,
          );
          return {
            processed: quickReplyResult.processed,
            queued: false,
            error: quickReplyResult.success
              ? undefined
              : quickReplyResult.message,
          };
        }
        return {
          processed: result.processed,
          queued: false,
          error: result.success ? undefined : result.message,
        };
      }

      if (rateLimitResult.queued) {
        return { processed: false, queued: true };
      }

      return { processed: false, queued: false, error: rateLimitResult.reason };
    }

    // Other message types (reactions, stickers, etc.) — silently ignore
    return { processed: true, queued: false };
  } catch (error) {
    console.error("Error processing messaging webhook:", error);
    return {
      processed: false,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Direct message webhook ────────────────────────────────────────────────────

async function processDirectMessageWebhook(
  dm: any,
  accountId: string,
): Promise<{ processed: boolean; queued: boolean; error?: string }> {
  try {
    // ✅ FIX: Skip echo messages in direct_messages too
    if (dm.message?.is_echo === true) {
      return { processed: false, queued: false };
    }

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled) {
      return { processed: false, queued: false };
    }

    const senderId: string = dm.sender?.id || dm.from?.id || "";

    // ✅ FIX: Skip if sender is the business account itself
    if (senderId && senderId === accountId) {
      return { processed: false, queued: false };
    }

    const quickReplyKeyword = getQuickReplyKeyword(
      dm.message?.quick_reply?.payload || dm.quick_reply?.payload,
    );
    const messageText: string =
      quickReplyKeyword || dm.message?.text || dm.text || "";

    if (!messageText || messageText.trim() === "") {
      const result = await sendDMStarterQuickReplies(
        accountId,
        account.userId,
        senderId,
      );
      return {
        processed: result.processed,
        queued: false,
        error: result.success ? undefined : result.message,
      };
    }

    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1,
      true,
      {
        webhookId: `direct_dm_webhook_${Date.now()}`,
        senderId,
        type: "direct_message",
      },
    );

    if (rateLimitResult.processImmediately) {
      const result = await handleIncomingDM(
        accountId,
        account.userId,
        senderId,
        messageText,
      );
      if (!result.processed && result.message === "No matching template") {
        const quickReplyResult = await sendDMStarterQuickReplies(
          accountId,
          account.userId,
          senderId,
        );
        return {
          processed: quickReplyResult.processed,
          queued: false,
          error: quickReplyResult.success
            ? undefined
            : quickReplyResult.message,
        };
      }
      return {
        processed: result.processed,
        queued: false,
        error: result.success ? undefined : result.message,
      };
    }

    if (rateLimitResult.queued) {
      return { processed: false, queued: true };
    }

    return { processed: false, queued: false, error: rateLimitResult.reason };
  } catch (error) {
    console.error("Error processing direct message webhook:", error);
    return {
      processed: false,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
