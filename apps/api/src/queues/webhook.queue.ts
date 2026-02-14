import { Queue } from "bullmq";
import { redisHelpers } from "@/config/redis.config";

let webhookQueue: Queue | null = null;

// Initialize queue only if Redis is available
const getQueue = () => {
  if (webhookQueue) return webhookQueue;

  const connection = redisHelpers.getBullMQConnection();
  if (!connection) {
    console.log("⚠️ BullMQ queue not available - using simple queue");
    return null;
  }

  try {
    webhookQueue = new Queue("webhook-processing", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    return webhookQueue;
  } catch (error: any) {
    console.error("❌ Failed to create queue:", error.message);
    return null;
  }
};

// Add a webhook to the queue
export async function addWebhookToQueue(data: any): Promise<string | null> {
  try {
    const queue = getQueue();
    if (!queue) {
      console.log("⚠️ Queue not available - webhook not queued");
      return null;
    }

    const jobId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await queue.add(jobId, data, { jobId });
    return jobId;
  } catch (error: any) {
    console.error("❌ Failed to add webhook to queue:", error.message);
    return null;
  }
}

// Simple non-BullMQ queue for fallback
export const createSimpleQueue = () => {
  return {
    add: async (jobId: string, data: any) => {
      const queueKey = `webhook:simple:${Date.now()}`;
      await redisHelpers.lpush(
        "webhook:simple:queue",
        JSON.stringify({
          jobId,
          ...data,
          queueKey,
        }),
      );
      await redisHelpers.expire("webhook:simple:queue", 3600);
    },
  };
};
