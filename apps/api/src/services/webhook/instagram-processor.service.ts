// services/webhook/instagram-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { processCommentAutomation } from "@/services/automation/comment-processor.service";
import { processStoryAutomation } from "@/services/automation/story-processor.service";
import { handlePostbackAutomation } from "@/services/automation/dm-processor.service";
import { handleIncomingMessage } from "@/services/automation/message-processor.service";
import { recordCall } from "@/services/rate-limit.service";

/**
 * Process Instagram webhook - incoming Meta API calls
 * INTELLIGENT QUEUEING:
 * - Check user + app limits FIRST
 * - If allowed → process immediately (no queue)
 * - If not allowed → queue for later
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

    // Process each entry in the webhook payload
    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        try {
          // Process comments
          if (entry.changes?.length > 0) {
            for (const change of entry.changes) {
              if (change.field === "comments") {
                const result = await processCommentWebhook(
                  change.value,
                  entry.id,
                  payload,
                );
                if (result.queued) {
                  results.queued++;
                } else if (result.processed) {
                  results.processed++;
                }
                if (result.error) {
                  results.errors.push(result.error);
                }
              }

              // Process story mentions/replies
              if (change.field === "story_insights") {
                const result = await processStoryWebhook(
                  change.value,
                  entry.id,
                  payload,
                );
                if (result.queued) {
                  results.queued++;
                } else if (result.processed) {
                  results.processed++;
                }
                if (result.error) {
                  results.errors.push(result.error);
                }
              }
            }
          }

          // Process messaging (DMs) - postbacks and messages
          if (entry.messaging?.length > 0) {
            for (const message of entry.messaging) {
              const result = await processMessagingWebhook(message, entry.id);
              if (result.queued) {
                results.queued++;
              } else if (result.processed) {
                results.processed++;
              }
              if (result.error) {
                results.errors.push(result.error);
              }
            }
          }
        } catch (error) {
          results.errors.push(
            error instanceof Error ? error.message : "Unknown error",
          );
          results.success = false;
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

/**
 * Process comment webhook - THIS IS AN INCOMING META WEBHOOK
 * INTELLIGENT QUEUEING:
 * - Check limits first
 * - If allowed → process immediately
 * - If not allowed → queue it
 */
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
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoReplyEnabled) {
      return { processed: false, queued: false };
    }

    // ✅ NEW: Check rate limit for incoming webhook
    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1, // Meta call count
      true, // This IS an incoming webhook
      {
        webhookId: `webhook_${Date.now()}`,
        commentId: comment.id,
        originalPayload: originalPayload, // Store for reprocessing
        type: "comment",
      },
    );

    // ✅ If should process immediately
    if (rateLimitResult.processImmediately) {
      await processCommentAutomation(accountId, account.userId, {
        id: comment.id,
        text: comment.text,
        username: comment.from?.username,
        user_id: comment.from?.id,
        timestamp: comment.timestamp,
        media_id: comment.media?.id,
        media_url: comment.media?.media_url,
      });

      return { processed: true, queued: false };
    }

    // ✅ If queued
    if (rateLimitResult.queued) {
      console.log(`📥 Comment webhook queued: ${comment.id}`);
      return { processed: false, queued: true };
    }

    // ❌ If not allowed and not queued, skip
    console.log(`⏭️ Comment webhook skipped: ${comment.id}`);
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

/**
 * Process story webhook - THIS IS AN INCOMING META WEBHOOK
 * INTELLIGENT QUEUEING:
 * - Check limits first
 * - If allowed → process immediately
 * - If not allowed → queue it
 */
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
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.storyAutomationsEnabled) {
      return { processed: false, queued: false };
    }

    // ✅ NEW: Check rate limit for incoming webhook
    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1, // Meta call count
      true, // This IS an incoming webhook
      {
        webhookId: `webhook_${Date.now()}`,
        storyId: story.id,
        originalPayload: originalPayload,
        type: "story",
      },
    );

    // ✅ If should process immediately
    if (rateLimitResult.processImmediately) {
      await processStoryAutomation(accountId, account.userId, {
        id: story.id,
        media_id: story.media_id,
        user_id: story.from?.id,
        username: story.from?.username,
        mention_type: story.mention_type || "mention",
        timestamp: story.timestamp,
      });

      return { processed: true, queued: false };
    }

    // ✅ If queued
    if (rateLimitResult.queued) {
      console.log(`📥 Story webhook queued: ${story.id}`);
      return { processed: false, queued: true };
    }

    // ❌ If not allowed and not queued, skip
    console.log(`⏭️ Story webhook skipped: ${story.id}`);
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

/**
 * Process messaging webhook - MIXED TYPE
 * - Postbacks = user responses → fire and forget (NO rate limit)
 * - Incoming messages = could be rate limited if processing required
 */
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

    // Handle postbacks (button clicks) - FIRE AND FORGET (no rate limit)
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

    // Handle regular messages - FIRE AND FORGET (no rate limit)
    // These are user responses to our automations
    if (message.message && message.message.text) {
      await handleIncomingMessage(
        accountId,
        account.userId,
        message.sender.id,
        message.message.text,
      );

      return { processed: true, queued: false };
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
