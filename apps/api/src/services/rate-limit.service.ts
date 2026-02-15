import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import RateLimitQueue from "@/models/Rate/RateLimitQueue.model";
import RateLimitWindow from "@/models/Rate/RateLimitWindow.model";
import UserRateLimit from "@/models/Rate/UserRateLimit.model";
import { redisHelpers } from "@/config/redis.config";

const APP_HOURLY_GLOBAL_LIMIT = parseInt(
  process.env.APP_HOURLY_GLOBAL_LIMIT || "20000",
);
const META_API_LIMIT_PER_ACCOUNT = 200;

// Tier limits based on subscription
const TIER_LIMITS = {
  free: 100, // Free users: 100 calls/hour
  pro: 2000, // Pro users: 2000 calls/hour
} as const;

type TierType = keyof typeof TIER_LIMITS;

export function getCurrentWindow() {
  const now = new Date();
  const hour = now.getUTCHours();
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      0,
      0,
      0,
    ),
  );
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const key = `window:${start.toISOString()}`;
  const label = `${hour.toString().padStart(2, "0")}:00-${(hour + 1).toString().padStart(2, "0")}:00 GMT`;

  return { start, end, key, label };
}

// Cache user tier for 10 minutes to reduce DB calls
export async function getUserTier(clerkId: string): Promise<TierType> {
  const cacheKey = `user:tier:${clerkId}`;

  try {
    const cached = await redisHelpers.get(cacheKey);
    if (cached) {
      return cached as TierType;
    }
  } catch (redisError) {
    console.warn("Redis not available for tier cache");
  }

  try {
    await connectToDatabase();

    const subscription = await InstaSubscription.findOne({
      clerkId,
      chatbotType: "Insta-Automation-Pro",
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    const tier = subscription ? "pro" : "free";

    try {
      // Cache for 10 minutes
      await redisHelpers.set(cacheKey, tier, 600);
    } catch (cacheError) {
      // Ignore cache errors
    }

    return tier;
  } catch (error) {
    console.error("Error getting user tier:", error);
    return "free";
  }
}

/**
 * Check if a call can be made (for incoming Meta webhooks)
 * This is ONLY for checking if we should queue incoming webhooks
 */
export async function canMakeCall(
  clerkId: string,
  accountId: string,
  isIncomingWebhook: boolean = false,
): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
  tier?: TierType;
  shouldQueue?: boolean;
}> {
  try {
    const window = getCurrentWindow();
    const tier = await getUserTier(clerkId);
    const tierLimit = TIER_LIMITS[tier];

    // Check app global limit
    const globalKey = `global:calls:${window.key}`;
    const globalCallsStr = await redisHelpers.get(globalKey);
    const globalCalls = parseInt(globalCallsStr || "0");

    if (globalCalls >= APP_HOURLY_GLOBAL_LIMIT) {
      return {
        allowed: false,
        reason: "app_global_limit_reached",
        tier,
        shouldQueue: isIncomingWebhook, // Only queue if it's an incoming webhook
      };
    }

    // Check user tier limit
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const userCallsStr = await redisHelpers.get(userKey);
    const userCalls = parseInt(userCallsStr || "0");

    if (userCalls >= tierLimit) {
      return {
        allowed: false,
        reason: "user_tier_limit_reached",
        remaining: 0,
        tier,
        shouldQueue: isIncomingWebhook, // Only queue if it's an incoming webhook
      };
    }

    // Check Meta API rate limit for account
    const accountMetaKey = `account:meta_calls:${accountId}:${window.key}`;
    const metaCallsStr = await redisHelpers.get(accountMetaKey);
    const metaCalls = parseInt(metaCallsStr || "0");

    if (metaCalls >= META_API_LIMIT_PER_ACCOUNT) {
      return {
        allowed: false,
        reason: "meta_rate_limit_reached",
        remaining: tierLimit - userCalls,
        tier,
        shouldQueue: isIncomingWebhook, // Only queue if it's an incoming webhook
      };
    }

    return {
      allowed: true,
      remaining: tierLimit - userCalls,
      tier,
      shouldQueue: false,
    };
  } catch (error) {
    console.error("Error in canMakeCall:", error);
    return {
      allowed: false,
      reason: "system_error",
      tier: "free",
      shouldQueue: false,
    };
  }
}

/**
 * Record a call - for incoming Meta webhooks only
 * Automation responses are fire-and-forget (not tracked)
 */
export async function recordCall(
  clerkId: string,
  accountId: string,
  metaCalls: number = 1,
  isIncomingWebhook: boolean = false,
  metadata: any = {},
): Promise<{
  success: boolean;
  queued?: boolean;
  queueId?: string;
  reason?: string;
  callsRecorded?: number;
}> {
  // If this is NOT an incoming webhook, we don't check limits - fire and forget
  if (!isIncomingWebhook) {
    return {
      success: true,
      callsRecorded: 0, // Not counted
    };
  }

  const window = getCurrentWindow();

  const canMake = await canMakeCall(clerkId, accountId, true);

  if (!canMake.allowed && canMake.shouldQueue) {
    // Queue the webhook for later processing
    const queueId = await queueWebhook({
      clerkId,
      accountId,
      metadata,
      reason: canMake.reason || "rate_limited",
    });

    return {
      success: false,
      queued: true,
      queueId,
      reason: canMake.reason,
    };
  }

  if (!canMake.allowed) {
    // Can't process and shouldn't queue (shouldn't happen)
    return {
      success: false,
      reason: canMake.reason,
    };
  }

  try {
    // Update counters in Redis - BATCH operations to reduce calls
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const globalKey = `global:calls:${window.key}`;
    const accountMetaKey = `account:meta_calls:${accountId}:${window.key}`;

    // Use pipeline if available, otherwise individual calls
    const client = redisHelpers.getRedisClient?.();

    if (client?.isOpen) {
      // Use Redis pipeline to batch operations
      const pipeline = client.multi();
      pipeline.incrBy(userKey, 1);
      pipeline.incrBy(globalKey, 1);
      if (metaCalls > 0) {
        pipeline.incrBy(accountMetaKey, metaCalls);
      }
      // Set expiry only once per key (2 hours)
      pipeline.expire(userKey, 7200);
      pipeline.expire(globalKey, 7200);
      if (metaCalls > 0) {
        pipeline.expire(accountMetaKey, 7200);
      }
      await pipeline.exec();
    } else {
      // Fallback to individual operations
      await Promise.all([
        redisHelpers.incrBy(userKey, 1),
        redisHelpers.incrBy(globalKey, 1),
        metaCalls > 0
          ? redisHelpers.incrBy(accountMetaKey, metaCalls)
          : Promise.resolve(),
      ]);

      // Set expiry
      await Promise.all([
        redisHelpers.expire(userKey, 7200),
        redisHelpers.expire(globalKey, 7200),
        metaCalls > 0
          ? redisHelpers.expire(accountMetaKey, 7200)
          : Promise.resolve(),
      ]);
    }

    // Check if Meta limit reached
    if (metaCalls > 0) {
      const currentMetaStr = await redisHelpers.get(accountMetaKey);
      const currentMeta = parseInt(currentMetaStr || "0");
      if (currentMeta >= META_API_LIMIT_PER_ACCOUNT) {
        await redisHelpers.set(
          `account:meta_limited:${accountId}`,
          "true",
          3600,
        );
      }
    }

    // Update database records asynchronously (don't wait)
    updateDatabaseRecords(
      clerkId,
      accountId,
      metaCalls,
      window.start,
      canMake.tier || "free",
    ).catch((err) => console.error("DB update error:", err));

    return {
      success: true,
      callsRecorded: 1 + metaCalls,
    };
  } catch (error) {
    console.error("Error in recordCall:", error);

    // If Redis fails, still try to queue the webhook
    const queueId = await queueWebhook({
      clerkId,
      accountId,
      metadata,
      reason: "redis_error",
    });

    return {
      success: false,
      queued: true,
      queueId,
      reason: "system_error",
    };
  }
}

async function updateDatabaseRecords(
  clerkId: string,
  accountId: string,
  metaCalls: number,
  windowStart: Date,
  tier: TierType,
) {
  try {
    await connectToDatabase();

    const tierLimit = TIER_LIMITS[tier];

    // Update user rate limit
    await UserRateLimit.findOneAndUpdate(
      { clerkId, windowStart },
      {
        $inc: { totalCallsMade: 1 },
        $set: {
          tier,
          tierLimit,
          windowStart,
        },
        $setOnInsert: {
          isAutomationPaused: false,
        },
      },
      { upsert: true, new: true },
    );

    // Update account statistics
    if (metaCalls > 0) {
      await InstagramAccount.updateOne(
        { instagramId: accountId },
        {
          $inc: { metaCallsThisHour: metaCalls },
          $set: { lastMetaCallAt: new Date(), lastActivity: new Date() },
        },
      );
    }
  } catch (error) {
    console.error("Error updating database records:", error);
  }
}

/**
 * Queue an incoming webhook for later processing
 */
export async function queueWebhook(data: {
  clerkId: string;
  accountId: string;
  metadata: any;
  reason: string;
}): Promise<string> {
  const window = getCurrentWindow();
  const jobId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await connectToDatabase();

    const queueItem = new RateLimitQueue({
      clerkId: data.clerkId,
      instagramAccountId: data.accountId,
      actionType: "webhook_incoming", // Mark as incoming webhook
      actionPayload: data.metadata,
      priority: 5, // All webhooks same priority
      status: "pending",
      windowStart: window.start,
      retryCount: 0,
      maxRetries: 3,
      metadata: {
        reason: data.reason,
        webhookId: data.metadata.webhookId,
        commentId: data.metadata.commentId,
        recipientId: data.metadata.recipientId,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await queueItem.save();

    try {
      // Also add to Redis queue for faster processing
      await redisHelpers.lpush(
        `queue:pending:${window.key}`,
        JSON.stringify({
          jobId,
          ...data,
          windowStart: window.start,
          queuedAt: new Date(),
        }),
      );
      // Set expiry on the queue list itself (not individual items)
      await redisHelpers.expire(`queue:pending:${window.key}`, 7200);
    } catch (redisError) {
      console.warn("Could not add to Redis queue:", redisError);
    }

    return jobId;
  } catch (error) {
    console.error("Error queueing webhook:", error);
    throw error;
  }
}

/**
 * Process queued webhooks (FIFO) when capacity is available
 */
export async function processQueuedCalls(limit: number = 50): Promise<{
  processed: number;
  failed: number;
  skipped: number;
  remaining: number;
}> {
  const window = getCurrentWindow();
  const queueKey = `queue:pending:${window.key}`;

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get queue length first
    let remaining = (await redisHelpers.llen(queueKey)) || 0;

    // If Redis queue is empty, try database
    if (remaining === 0) {
      return await processQueuedCallsFromDatabase(limit);
    }

    for (let i = 0; i < limit && remaining > 0; i++) {
      // Get from end of list (FIFO - first in, first out)
      const item = await redisHelpers.rpop(queueKey);
      if (!item) break;

      try {
        const job = JSON.parse(item);

        // Check if we can process now
        const canMake = await canMakeCall(
          job.clerkId,
          job.accountId,
          true, // It's a webhook
        );

        if (canMake.allowed) {
          // Process the webhook
          const result = await processQueuedWebhook(job);

          if (result.success) {
            // Update queue status in MongoDB
            await RateLimitQueue.findOneAndUpdate(
              { jobId: job.jobId },
              {
                status: "completed",
                processingCompletedAt: new Date(),
                updatedAt: new Date(),
              },
            );
            processed++;
          } else {
            // Handle failed webhook
            await handleFailedWebhook(job, result.error);
            failed++;
          }
        } else {
          // Can't process yet - put back at the front of queue
          await redisHelpers.lpush(queueKey, item);
          skipped++;
          break; // Stop processing if we hit rate limit
        }
      } catch (error) {
        console.error("Error processing queued webhook:", error);
        failed++;
      }

      // Update remaining count
      remaining = (await redisHelpers.llen(queueKey)) || 0;
    }

    return { processed, failed, skipped, remaining };
  } catch (error) {
    console.error("Error in processQueuedCalls:", error);
    // Fallback to database processing if Redis fails
    return await processQueuedCallsFromDatabase(limit);
  }
}

// Fallback function for database-only processing
async function processQueuedCallsFromDatabase(limit: number = 50) {
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    await connectToDatabase();

    const pendingJobs = await RateLimitQueue.find({
      status: "pending",
    })
      .limit(limit)
      .sort({ createdAt: 1 }); // FIFO - oldest first

    for (const job of pendingJobs) {
      try {
        const canMake = await canMakeCall(
          job.clerkId,
          job.instagramAccountId,
          true,
        );

        if (canMake.allowed) {
          const result = await processQueuedWebhook({
            jobId: job.jobId,
            clerkId: job.clerkId,
            accountId: job.instagramAccountId,
            metadata: job.actionPayload,
            windowStart: job.windowStart,
          });

          if (result.success) {
            job.status = "completed";
            job.processingCompletedAt = new Date();
            job.updatedAt = new Date();
            await job.save();
            processed++;
          } else {
            job.retryCount += 1;
            if (job.retryCount >= job.maxRetries) {
              job.status = "failed";
              job.errorMessage = result.error;
            }
            job.updatedAt = new Date();
            await job.save();
            failed++;
          }
        } else {
          skipped++;
          break; // Stop if we hit rate limit
        }
      } catch (jobError) {
        console.error("Error processing database job:", jobError);
        job.retryCount += 1;
        if (job.retryCount >= job.maxRetries) {
          job.status = "failed";
          job.errorMessage =
            jobError instanceof Error ? jobError.message : "Unknown error";
        }
        job.updatedAt = new Date();
        await job.save();
        failed++;
      }
    }

    const remaining = await RateLimitQueue.countDocuments({
      status: "pending",
    });
    return { processed, failed, skipped, remaining };
  } catch (error) {
    console.error("Error in database fallback processing:", error);
    return { processed, failed, skipped, remaining: 0 };
  }
}

async function processQueuedWebhook(
  job: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import the webhook processor
    const { processInstagramWebhook } =
      await import("@/services/webhook/instagram-processor.service");

    // Process the webhook with the original payload
    const result = await processInstagramWebhook(job.metadata.originalPayload);

    return { success: result.success };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function handleFailedWebhook(job: any, error?: string) {
  try {
    await connectToDatabase();

    const queueItem = await RateLimitQueue.findOne({ jobId: job.jobId });
    if (queueItem) {
      queueItem.retryCount += 1;

      if (queueItem.retryCount >= queueItem.maxRetries) {
        queueItem.status = "failed";
        queueItem.errorMessage = error;
        queueItem.processingCompletedAt = new Date();
        queueItem.updatedAt = new Date();
      } else {
        queueItem.updatedAt = new Date();
      }

      await queueItem.save();
    }
  } catch (error) {
    console.error("Error handling failed webhook:", error);
  }
}

export async function resetHourlyWindow(): Promise<{
  success: boolean;
  message: string;
  processed: number;
  resetAccounts: number;
}> {
  const previousWindow = getCurrentWindow();

  try {
    await connectToDatabase();

    // Mark previous window as completed
    await RateLimitWindow.findOneAndUpdate(
      { windowStart: previousWindow.start },
      {
        windowEnd: previousWindow.end,
        status: "completed",
        updatedAt: new Date(),
      },
      { upsert: true },
    );

    // Process any remaining queued items
    const queueResult = await processQueuedCalls(100);

    // Reset Meta API limits for all accounts
    const accounts = await InstagramAccount.find({});
    let resetAccounts = 0;

    for (const account of accounts) {
      try {
        // Clear rate limit flags from Redis
        await redisHelpers.del(`account:meta_limited:${account.instagramId}`);
      } catch (redisError) {
        // Ignore Redis errors
      }

      // Reset account statistics in MongoDB
      account.metaCallsThisHour = 0;
      account.isMetaRateLimited = false;
      account.metaRateLimitResetAt = undefined;
      await account.save();

      resetAccounts++;
    }

    // Create new window
    const activeAccounts = await InstagramAccount.countDocuments({
      isActive: true,
    });

    const newWindow = new RateLimitWindow({
      windowStart: previousWindow.start,
      windowEnd: previousWindow.end,
      globalCalls: 0,
      appLimit: APP_HOURLY_GLOBAL_LIMIT,
      accountsProcessed: 0,
      isAutomationPaused: false,
      status: "active",
      metadata: {
        totalAccounts: activeAccounts,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newWindow.save();

    try {
      // Clear Redis counters for previous window - minimal cleanup
      const keys = await redisHelpers.keys(`*:${previousWindow.key}`);
      if (keys.length > 0) await redisHelpers.del(...keys);
    } catch (redisError) {
      console.warn("Could not clear Redis counters:", redisError);
    }

    console.log(`🔄 Window reset completed for ${previousWindow.label}`);

    return {
      success: true,
      message: `Window reset completed for ${previousWindow.label}`,
      processed: queueResult.processed,
      resetAccounts,
    };
  } catch (error) {
    console.error("Error resetting hourly window:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to reset window",
      processed: 0,
      resetAccounts: 0,
    };
  }
}

export async function getUserRateLimitStats(clerkId: string): Promise<{
  tier: TierType;
  tierLimit: number;
  callsMade: number;
  remainingCalls: number;
  usagePercentage: number;
  queuedItems: number;
  nextReset: Date;
}> {
  const window = getCurrentWindow();
  const tier = await getUserTier(clerkId);
  const tierLimit = TIER_LIMITS[tier];

  // Get calls from Redis
  let callsMade = 0;
  try {
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const callsMadeStr = await redisHelpers.get(userKey);
    callsMade = parseInt(callsMadeStr || "0");
  } catch (redisError) {
    console.warn("Could not get calls from Redis");
  }

  // Get queued items
  let queuedItems = 0;
  try {
    await connectToDatabase();
    queuedItems = await RateLimitQueue.countDocuments({
      clerkId,
      status: "pending",
    });
  } catch (dbError) {
    console.warn("Could not get queued items");
  }

  const nextReset = new Date(window.end);

  return {
    tier,
    tierLimit,
    callsMade,
    remainingCalls: Math.max(0, tierLimit - callsMade),
    usagePercentage: tierLimit > 0 ? (callsMade / tierLimit) * 100 : 0,
    queuedItems,
    nextReset,
  };
}

export async function isAppLimitReached(): Promise<{
  reached: boolean;
  current: number;
  limit: number;
  percentage: number;
}> {
  const window = getCurrentWindow();
  let current = 0;

  try {
    const globalKey = `global:calls:${window.key}`;
    const currentStr = await redisHelpers.get(globalKey);
    current = parseInt(currentStr || "0");
  } catch (redisError) {
    console.warn("Could not get app limit from Redis");
  }

  const percentage = (current / APP_HOURLY_GLOBAL_LIMIT) * 100;

  return {
    reached: current >= APP_HOURLY_GLOBAL_LIMIT,
    current,
    limit: APP_HOURLY_GLOBAL_LIMIT,
    percentage,
  };
}
