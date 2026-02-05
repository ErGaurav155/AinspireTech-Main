import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { processCommentAutomation } from "@/services/automation/comment-processor.service";
import { handlePostbackAutomation } from "@/services/automation/dm-processor.service";

export async function processInstagramWebhook(payload: any): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> {
  const results = {
    success: true,
    processed: 0,
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
                await processCommentWebhook(change.value, entry.id);
                results.processed++;
              }
            }
          }

          // Process messaging (DMs)
          if (entry.messaging?.length > 0) {
            for (const message of entry.messaging) {
              await processMessagingWebhook(message, entry.id);
              results.processed++;
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
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function processCommentWebhook(comment: any, accountId: string) {
  const account = await InstagramAccount.findOne({ instagramId: accountId });
  if (!account || !account.isActive || !account.autoReplyEnabled) {
    return;
  }

  await processCommentAutomation(accountId, account.userId, {
    id: comment.id,
    text: comment.text,
    username: comment.from?.username,
    user_id: comment.from?.id,
    timestamp: comment.timestamp,
    media_id: comment.media?.id,
    media_url: comment.media?.media_url,
  });
}

async function processMessagingWebhook(message: any, accountId: string) {
  const account = await InstagramAccount.findOne({ instagramId: accountId });
  if (!account || !account.isActive || !account.autoDMEnabled) {
    return;
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
  }

  // Handle regular messages (optional)
  if (message.message && message.message.text) {
    console.log(`Message from ${message.sender.id}: ${message.message.text}`);
    // You could add AI response logic here
  }
}
