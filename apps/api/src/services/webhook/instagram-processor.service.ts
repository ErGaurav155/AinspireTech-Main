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

    // Process each entry in the webhook payload
    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        const instagramBusinessId = entry.id;

        console.log(`Processing entry for account: ${instagramBusinessId}`);

        // Process changes (comments, story mentions, etc.)
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            console.log(`Processing change: ${change.field}`);

            // Process comment webhook
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

            // Process story mentions/replies
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

        // Process messaging (DMs) - Facebook Messenger style
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

        // Process direct message events (Instagram standard)
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

/**
 * Process comment webhook - FIXED payload structure
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
    console.log("Raw comment data:", JSON.stringify(comment, null, 2));

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.autoReplyEnabled) {
      console.log(`Account ${accountId} not active or auto-reply disabled`);
      return { processed: false, queued: false };
    }

    // Extract comment data based on Instagram's webhook structure
    // Instagram comment webhook can have different structures:
    // 1. Direct comment object
    // 2. Nested in data object
    // 3. In value object

    let commentId: string;
    let commentText: string;
    let commenterUsername: string;
    let commenterId: string;
    let mediaId: string;
    let mediaUrl: string;

    // Handle different payload structures
    if (comment.id) {
      // Direct comment object
      commentId = comment.id;
      commentText = comment.text || comment.message || "";
      commenterUsername =
        comment.from?.username || comment.username || "unknown";
      commenterId = comment.from?.id || comment.user_id || "";
      mediaId = comment.media?.id || comment.media_id || "";
      mediaUrl = comment.media?.media_url || comment.media_url || "";
    } else if (comment.data) {
      // Nested in data
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

    console.log(`Processing comment:`, {
      commentId,
      commentText,
      commenterUsername,
      mediaId,
      accountId,
    });

    // Skip empty comments
    if (!commentText || commentText.trim() === "") {
      console.log("Skipping empty comment");
      return { processed: false, queued: false };
    }

    // Check rate limit for incoming webhook
    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1, // Meta call count
      true, // This IS an incoming webhook
      {
        webhookId: `webhook_${Date.now()}`,
        commentId: commentId,
        originalPayload: originalPayload,
        type: "comment",
      },
    );

    // If should process immediately
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

    // If queued
    if (rateLimitResult.queued) {
      console.log(`📥 Comment webhook queued: ${commentId}`);
      return { processed: false, queued: true };
    }

    // If not allowed and not queued, skip
    console.log(
      `⏭️ Comment webhook skipped: ${commentId}, reason: ${rateLimitResult.reason}`,
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

/**
 * Process direct message webhook
 */
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

    // Extract DM data
    const senderId = dm.sender?.id || dm.from?.id || "";
    const recipientId = dm.recipient?.id || dm.to?.id || "";
    const messageText = dm.message?.text || dm.text || "";
    const messageId = dm.id || dm.message?.id || "";

    if (!messageText || messageText.trim() === "") {
      console.log("Skipping empty DM");
      return { processed: false, queued: false };
    }

    // Handle incoming message
    await handleIncomingMessage(
      accountId,
      account.userId,
      senderId,
      messageText,
    );

    return { processed: true, queued: false };
  } catch (error) {
    console.error("Error processing direct message webhook:", error);
    return {
      processed: false,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process story webhook
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
    console.log("Raw story data:", JSON.stringify(story, null, 2));

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account || !account.isActive || !account.storyAutomationsEnabled) {
      return { processed: false, queued: false };
    }

    // Extract story data
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

    // Check rate limit
    const rateLimitResult = await recordCall(
      account.userId,
      accountId,
      1,
      true,
      {
        webhookId: `webhook_${Date.now()}`,
        storyId: storyId,
        originalPayload: originalPayload,
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

/**
 * Process messaging webhook (postbacks, messages)
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

    // Handle postbacks (button clicks)
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

    // Handle regular messages
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
