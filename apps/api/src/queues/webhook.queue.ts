import { Queue } from "bullmq";
import { getRedisConnection, redisHelpers } from "@/config/redis.config";

const connection = getRedisConnection();

export const webhookQueue = new Queue("webhook-processing", {
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

// Add a webhook to the queue
export async function addWebhookToQueue(data: any) {
  const jobId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await webhookQueue.add(jobId, data, {
    jobId,
    priority: 1,
  });

  return jobId;
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
