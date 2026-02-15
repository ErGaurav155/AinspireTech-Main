import { Worker, Job } from "bullmq";
import { redisHelpers } from "@/config/redis.config";
import { processInstagramWebhook } from "@/services/webhook/instagram-processor.service";

// Create multiple workers for concurrency
export const createWebhookWorkers = (count: number = 5) => {
  const workers: Worker[] = [];
  const connection = redisHelpers.getBullMQConnection();
  if (!connection) {
    console.log(
      "⚠️ BullMQ connection not available - skipping worker creation",
    );
    return [];
  }
  try {
    for (let i = 0; i < count; i++) {
      const worker = new Worker(
        "webhook-processing",
        async (job: Job) => {
          const { type, payload, webhookId, receivedAt } = job.data;

          console.log(`🔄 [Worker ${i}] Processing ${webhookId}...`);

          try {
            let result;

            if (type === "instagram") {
              result = await processInstagramWebhook(payload);
            } else {
              throw new Error(`Unknown webhook type: ${type}`);
            }

            return result;
          } catch (error) {
            console.error(`❌ [Worker ${i}] Failed ${webhookId}:`, error);

            throw error; // Triggers retry
          }
        },
        {
          connection,
          concurrency: 20, // Each worker handles 20 jobs concurrently
          limiter: {
            max: 200, // Max 200 jobs per second per worker
            duration: 1000,
          },
        },
      );

      worker.on("completed", (job) => {
        console.log(`✅ [Worker ${i}] Completed ${job.data.webhookId}`);
      });

      worker.on("failed", (job, err) => {
        console.error(`❌ [Worker ${i}] Failed ${job?.data?.webhookId}:`, err);
      });

      worker.on("error", (err) => {
        console.error(`❌ [Worker ${i}] Error:`, err);
      });

      workers.push(worker);
    }

    return workers;
  } catch (error: any) {
    console.error("❌ Failed to create webhook workers:", error.message);
    return [];
  }
};

// Create a queue for webhook processing (non-BullMQ fallback)
export const createWebhookQueue = () => {
  const { redisHelpers } = require("@/config/redis.config");

  const queue = {
    add: async (jobId: string, data: any, options: any) => {
      // Simple implementation using Redis list
      const queueKey = `webhook:queue:${jobId}`;
      await redisHelpers.setex(queueKey, 3600, JSON.stringify(data));

      // Add to processing queue
      await redisHelpers.lpush("webhook:processing:queue", queueKey);

      return { jobId, queueKey };
    },

    processNext: async () => {
      const queueKey = await redisHelpers.rpop("webhook:processing:queue");
      if (!queueKey) return null;

      const dataStr = await redisHelpers.get(queueKey);
      if (!dataStr) return null;

      const data = JSON.parse(dataStr);
      await redisHelpers.del(queueKey);

      return data;
    },

    getJobs: async () => {
      const keys = await redisHelpers.keys("webhook:queue:*");
      const jobs = [];

      for (const key of keys) {
        const dataStr = await redisHelpers.get(key);
        if (dataStr) {
          jobs.push(JSON.parse(dataStr));
        }
      }

      return jobs;
    },
  };

  return queue;
};
