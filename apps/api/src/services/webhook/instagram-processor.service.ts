// services/webhook/instagram-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { processCommentAutomation } from "@/services/automation/comment-processor.service";
import { processStoryAutomation } from "@/services/automation/story-processor.service";
import { handlePostbackAutomation } from "@/services/automation/dm-processor.service";
import { recordCall } from "@/services/rate-limit.service";
import {
  handleIncomingDM,
  handleIncomingMessage,
} from "@/services/automation/message-processor.service";

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

  console.log(
    "Processing Instagram webhook payload:",
    JSON.stringify(payload, null, 2),
  );

  try {
    await connectToDatabase();

    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        const instagramBusinessId = entry.id;

        console.log(`Processing entry for account: ${instagramBusinessId}`);

        // ── Changes (comments, story mentions) ─────────────────────────────
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            console.log(`Processing change: ${change.field}`);

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
): Promise<{
  processed: boolean;
  queued: boolean;
  error?: string;
}> {
  try {
    console.log("Raw comment data:", JSON.stringify(comment, null, 2));

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoReplyEnabled) {
      console.log(`Account ${accountId} not active or auto-reply disabled`);
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
      console.log("Skipping empty comment");
      return { processed: false, queued: false };
    }

    // Apply rate limiting
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
      console.log(`✅ Comment processed immediately: ${commentId}`);
      return { processed: true, queued: false };
    }

    if (rateLimitResult.queued) {
      console.log(`📥 Comment webhook queued: ${commentId}`);
      return { processed: false, queued: true };
    }

    console.log(
      `⏭️ Comment skipped: ${commentId}, reason: ${rateLimitResult.reason}`,
    );
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
): Promise<{
  processed: boolean;
  queued: boolean;
  error?: string;
}> {
  try {
    console.log("Raw story data:", JSON.stringify(story, null, 2));

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
      console.log(`📥 Story webhook queued: ${storyId}`);
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

async function processMessagingWebhook(
  message: any,
  accountId: string,
): Promise<{
  processed: boolean;
  queued: boolean;
  error?: string;
}> {
  try {
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled) {
      return { processed: false, queued: false };
    }

    // Postbacks (button clicks) — no rate limiting, these are user responses
    if (message.postback) {
      await handlePostbackAutomation(
        accountId,
        account.userId,
        message.sender.id,
        message.postback.payload,
        "postback",
      );
      return { processed: true, queued: false };
    }

    // Text messages — apply rate limiting for new conversations only
    if (message.message && message.message.text) {
      const senderId = message.sender.id;
      const messageText = message.message.text;

      // Apply rate limiting for incoming DM webhooks
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
        const result = await handleIncomingDM(
          accountId,
          account.userId,
          senderId,
          messageText,
        );
        return {
          processed: result.processed,
          queued: false,
          error: result.success ? undefined : result.message,
        };
      }

      if (rateLimitResult.queued) {
        console.log(`📥 DM message queued for sender: ${senderId}`);
        return { processed: false, queued: true };
      }

      return {
        processed: false,
        queued: false,
        error: rateLimitResult.reason,
      };
    }

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
): Promise<{
  processed: boolean;
  queued: boolean;
  error?: string;
}> {
  try {
    console.log("Raw DM data:", JSON.stringify(dm, null, 2));

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoDMEnabled) {
      return { processed: false, queued: false };
    }

    const senderId = dm.sender?.id || dm.from?.id || "";
    const messageText = dm.message?.text || dm.text || "";

    if (!messageText || messageText.trim() === "") {
      console.log("Skipping empty DM");
      return { processed: false, queued: false };
    }

    // Apply rate limiting for direct message webhooks
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
      // handleIncomingDM properly delegates to handleIncomingMessage
      // when the conversation is in waiting_for_email/phone stage
      const result = await handleIncomingDM(
        accountId,
        account.userId,
        senderId,
        messageText,
      );
      return {
        processed: result.processed,
        queued: false,
        error: result.success ? undefined : result.message,
      };
    }

    if (rateLimitResult.queued) {
      console.log(`📥 Direct DM queued for sender: ${senderId}`);
      return { processed: false, queued: true };
    }

    return {
      processed: false,
      queued: false,
      error: rateLimitResult.reason,
    };
  } catch (error) {
    console.error("Error processing direct message webhook:", error);
    return {
      processed: false,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
