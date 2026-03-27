// services/automation/followup-processor.service.ts
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import { sendInstagramDM } from "@/services/meta-api/meta-api.service";

/**
 * Process all pending follow-up DMs.
 * Should be called by a cron job (e.g., every 5 minutes).
 *
 * Logic:
 * - Find all templates with followUpDMs.enabled = true
 * - Find matching logs where: not final_link/completed, followUpCount < messages.length
 * - Check if enough time has elapsed since last activity
 * - Send the next follow-up message
 */
export async function processFollowUpDMs(): Promise<{
  processed: number;
  sent: number;
  errors: string[];
}> {
  const results = { processed: 0, sent: 0, errors: [] as string[] };

  try {
    await connectToDatabase();

    // Find all active templates that have follow-up DMs enabled
    const templates = await InstaReplyTemplate.find({
      isActive: true,
      "followUpDMs.enabled": true,
    }).lean();

    for (const template of templates) {
      const followUpMessages = template.followUpDMs?.messages;
      if (!followUpMessages || followUpMessages.length === 0) continue;

      try {
        // Find logs for this template that are:
        // 1. Not yet at final_link or completed
        // 2. Haven't exhausted all follow-ups
        // 3. Successfully initiated (success = true)
        const logs = await InstaReplyLog.find({
          templateId: template._id.toString(),
          success: true,
          followUpCompleted: { $ne: true },
          dmFlowStage: { $nin: ["final_link", "completed"] },
          followUpCount: { $lt: followUpMessages.length },
        }).lean();

        for (const log of logs) {
          results.processed++;

          const followUpIndex = log.followUpCount || 0;
          const followUpMsg = followUpMessages[followUpIndex];
          if (!followUpMsg || !followUpMsg.message) continue;

          // Calculate wait time in milliseconds
          const waitMs =
            followUpMsg.waitUnit === "hours"
              ? followUpMsg.waitTime * 60 * 60 * 1000
              : followUpMsg.waitTime * 60 * 1000;

          // Use lastFollowUpAt if available, otherwise use log createdAt
          const referenceTime = log.lastFollowUpAt
            ? new Date(log.lastFollowUpAt)
            : new Date(log.createdAt);
          const elapsed = Date.now() - referenceTime.getTime();

          if (elapsed < waitMs) {
            console.log(
              `Follow-up ${followUpIndex + 1} for log ${log._id} not yet due. ` +
                `Elapsed: ${Math.round(elapsed / 60000)}m, Wait: ${followUpMsg.waitTime}${followUpMsg.waitUnit}`,
            );
            continue;
          }

          // Get the account
          const account = await InstagramAccount.findOne({
            instagramId: log.accountId,
            isActive: true,
          });
          if (!account) {
            console.log(`Account ${log.accountId} not found or inactive`);
            continue;
          }

          // Send the follow-up DM
          let dmSuccess = false;

          try {
            const hasLinks = followUpMsg.links && followUpMsg.links.length > 0;

            if (hasLinks) {
              // Send with link buttons (Instagram allows max 3 buttons)
              const buttons = followUpMsg.links
                .slice(0, 3)
                .filter((l: any) => l.url)
                .map((l: any) => ({
                  type: "web_url",
                  url: l.url,
                  title: l.buttonTitle || "Get Access",
                  webview_height_ratio: "full",
                }));

              if (buttons.length > 0) {
                dmSuccess = await sendInstagramDM(
                  account.instagramId,
                  account.accessToken,
                  log.commenterUserId,
                  {
                    attachment: {
                      type: "template",
                      payload: {
                        template_type: "button",
                        text: followUpMsg.message,
                        buttons,
                      },
                    },
                  },
                  false,
                );
              } else {
                // Fallback to text-only if buttons have no URLs
                dmSuccess = await sendInstagramDM(
                  account.instagramId,
                  account.accessToken,
                  log.commenterUserId,
                  { text: followUpMsg.message },
                  false,
                );
              }
            } else {
              dmSuccess = await sendInstagramDM(
                account.instagramId,
                account.accessToken,
                log.commenterUserId,
                { text: followUpMsg.message },
                false,
              );
            }

            const newFollowUpCount = followUpIndex + 1;
            const isLastFollowUp = newFollowUpCount >= followUpMessages.length;

            // Update the log
            await InstaReplyLog.findByIdAndUpdate(log._id, {
              $inc: { followUpCount: 1 },
              $set: {
                lastFollowUpAt: new Date(),
                followUpCompleted: isLastFollowUp,
              },
            });

            if (dmSuccess) {
              results.sent++;
              console.log(
                `✅ Follow-up ${newFollowUpCount}/${followUpMessages.length} sent to ${log.commenterUsername || log.commenterUserId}`,
              );
            } else {
              console.warn(
                `⚠️ Failed to send follow-up to ${log.commenterUserId}`,
              );
            }
          } catch (sendError) {
            const errMsg =
              sendError instanceof Error ? sendError.message : "Send error";
            console.error(
              `Error sending follow-up to ${log.commenterUserId}:`,
              sendError,
            );
            results.errors.push(`Log ${log._id}: ${errMsg}`);
          }
        }
      } catch (templateError) {
        const errMsg =
          templateError instanceof Error
            ? templateError.message
            : "Template processing error";
        console.error(
          `Error processing template ${template._id}:`,
          templateError,
        );
        results.errors.push(`Template ${template._id}: ${errMsg}`);
      }
    }
  } catch (error) {
    console.error("Fatal error in processFollowUpDMs:", error);
    results.errors.push(error instanceof Error ? error.message : "Fatal error");
  }

  console.log(
    `Follow-up processing complete: processed=${results.processed}, sent=${results.sent}, errors=${results.errors.length}`,
  );
  return results;
}
