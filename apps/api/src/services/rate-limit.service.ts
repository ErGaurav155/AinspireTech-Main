// services/rate-limit.service.ts
import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import RateLimitQueue from "@/models/Rate/RateLimitQueue.model";
import RateLimitWindow from "@/models/Rate/RateLimitWindow.model";
import { redisHelpers } from "@/config/redis.config";
import RateUserRateLimit from "@/models/Rate/UserRateLimit.model";

const APP_HOURLY_GLOBAL_LIMIT = parseInt(
  process.env.APP_HOURLY_GLOBAL_LIMIT || "20000",
);
const META_API_LIMIT_PER_ACCOUNT = 200;

// Tier limits based on subscription
const TIER_LIMITS = {
  free: 200,
  pro: 5000,
} as const;

type TierType = keyof typeof TIER_LIMITS;

// Flag to track if app limit is reached and automation is paused
let isAutomationPaused = false;
let lastPauseCheck = Date.now();

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
 * Check if app limit is reached - pauses automation
 */
export async function isAppLimitReached(): Promise<{
  reached: boolean;
  current: number;
  limit: number;
  percentage: number;
  automationPaused: boolean;
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

  const reached = current >= APP_HOURLY_GLOBAL_LIMIT;
  const percentage = (current / APP_HOURLY_GLOBAL_LIMIT) * 100;

  // Update automation pause flag
  if (reached && !isAutomationPaused) {
    isAutomationPaused = true;
    lastPauseCheck = Date.now();
    console.log(
      `🚨 APP LIMIT REACHED! Automation paused. ${current}/${APP_HOURLY_GLOBAL_LIMIT} calls`,
    );
  } else if (!reached && isAutomationPaused) {
    isAutomationPaused = false;
    console.log(
      `✅ APP LIMIT CLEARED! Automation resumed. ${current}/${APP_HOURLY_GLOBAL_LIMIT} calls`,
    );
  }

  return {
    reached,
    current,
    limit: APP_HOURLY_GLOBAL_LIMIT,
    percentage,
    automationPaused: isAutomationPaused,
  };
}

/**
 * Get current automation status
 */
export async function getAutomationStatus(): Promise<{
  isPaused: boolean;
  reason: string;
  currentCalls: number;
  limit: number;
  resetTime: Date;
}> {
  const appLimit = await isAppLimitReached();
  const window = getCurrentWindow();

  return {
    isPaused: appLimit.reached,
    reason: appLimit.reached ? "App hourly limit reached" : "Normal operation",
    currentCalls: appLimit.current,
    limit: appLimit.limit,
    resetTime: window.end,
  };
}

/**
 * INTELLIGENT QUEUEING LOGIC:
 * 1. Check app limit first - if reached, queue immediately
 * 2. If app limit not reached, check user tier limit
 * 3. Only process if both limits allow
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

    // FIRST: Check app global limit
    const globalKey = `global:calls:${window.key}`;
    const globalCallsStr = await redisHelpers.get(globalKey);
    const globalCalls = parseInt(globalCallsStr || "0");

    // If app limit reached, queue all incoming webhooks
    if (globalCalls >= APP_HOURLY_GLOBAL_LIMIT) {
      console.log(
        `⏸️ App limit reached (${globalCalls}/${APP_HOURLY_GLOBAL_LIMIT}), queueing webhook`,
      );
      return {
        allowed: false,
        reason: "app_global_limit_reached",
        shouldQueue: isIncomingWebhook,
      };
    }

    // SECOND: Check user tier limit
    const tier = await getUserTier(clerkId);
    const tierLimit = TIER_LIMITS[tier];
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const userCallsStr = await redisHelpers.get(userKey);
    const userCalls = parseInt(userCallsStr || "0");

    // If user limit exceeded, queue if incoming webhook
    if (userCalls >= tierLimit) {
      console.log(
        `⏸️ User ${clerkId} limit reached (${userCalls}/${tierLimit}), queueing webhook`,
      );
      return {
        allowed: false,
        reason: "user_limit_reached",
        tier,
        shouldQueue: isIncomingWebhook,
        remaining: 0,
      };
    }

    // All limits OK - allow processing
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
 * Record a call - ONLY for incoming webhooks
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
  processImmediately?: boolean;
}> {
  // If NOT an incoming webhook, fire and forget (automation responses)
  if (!isIncomingWebhook) {
    return {
      success: true,
      callsRecorded: 0,
      processImmediately: true,
    };
  }

  const window = getCurrentWindow();
  const canMake = await canMakeCall(clerkId, accountId, true);

  // If allowed, process immediately without queueing
  if (canMake.allowed) {
    try {
      // Update counters in Redis
      const userKey = `user:calls:${clerkId}:${window.key}`;
      const globalKey = `global:calls:${window.key}`;
      const accountMetaKey = `account:meta_calls:${accountId}:${window.key}`;

      const client = redisHelpers.getRedisClient?.();

      if (client?.isOpen) {
        const pipeline = client.multi();
        pipeline.incrBy(userKey, 1);
        pipeline.incrBy(globalKey, 1);
        if (metaCalls > 0) {
          pipeline.incrBy(accountMetaKey, metaCalls);
        }
        pipeline.expire(userKey, 7200);
        pipeline.expire(globalKey, 7200);
        if (metaCalls > 0) {
          pipeline.expire(accountMetaKey, 7200);
        }
        await pipeline.exec();
      } else {
        await Promise.all([
          redisHelpers.incrBy(userKey, 1),
          redisHelpers.incrBy(globalKey, 1),
          metaCalls > 0
            ? redisHelpers.incrBy(accountMetaKey, metaCalls)
            : Promise.resolve(),
        ]);

        await Promise.all([
          redisHelpers.expire(userKey, 7200),
          redisHelpers.expire(globalKey, 7200),
          metaCalls > 0
            ? redisHelpers.expire(accountMetaKey, 7200)
            : Promise.resolve(),
        ]);
      }

      // Check Meta limit reached
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

      // Update database asynchronously
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
        processImmediately: true,
      };
    } catch (error) {
      console.error("Error recording call:", error);

      // If Redis fails, queue the webhook
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
        processImmediately: false,
      };
    }
  }

  // Not allowed and should queue
  if (canMake.shouldQueue) {
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
      processImmediately: false,
    };
  }

  // Not allowed and shouldn't queue
  return {
    success: false,
    reason: canMake.reason,
    processImmediately: false,
  };
}

interface AccountUsageEntry {
  instagramAccountId: string;
  callsMade: number;
  lastCallAt: Date;
  accountUsername?: string;
  accountProfile?: string;
}

/*
 * Update database records for rate limiting
 */

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

    // Get all Instagram accounts for this user
    const userAccounts = await InstagramAccount.find({
      userId: clerkId,
      isActive: true,
    });

    // Prepare account usage array for new window creation
    const accountUsageList: AccountUsageEntry[] = userAccounts.map((acc) => ({
      instagramAccountId: acc.instagramId,
      callsMade: acc.instagramId === accountId ? 1 : 0,
      lastCallAt: new Date(),
      accountUsername: acc.username,
      accountProfile: acc.profilePicture,
    }));

    // Use findOneAndUpdate with upsert - this handles race conditions automatically
    let retries = 3;
    let userRateLimit = null;

    while (retries > 0 && !userRateLimit) {
      try {
        userRateLimit = await RateUserRateLimit.findOneAndUpdate(
          { clerkId, windowStart },
          {
            $inc: { totalCallsMade: 1 },
            $set: {
              tier,
              tierLimit,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              isAutomationPaused: false,
              createdAt: new Date(),
              accountUsage: accountUsageList,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );
      } catch (error: any) {
        // E11000 duplicate key error - race condition
        if (error.code === 11000) {
          console.log(
            `⚠️ Race condition detected for user ${clerkId}, retrying... (${retries} left)`,
          );

          if (retries > 1) {
            retries--;
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 50));
            continue;
          } else {
            // Last retry - try to find the document that was created
            userRateLimit = await RateUserRateLimit.findOne({
              clerkId,
              windowStart,
            });
            if (!userRateLimit) {
              throw new Error(
                "Failed to create/update rate limit record after retries",
              );
            }
          }
        } else {
          throw error;
        }
      }
    }

    if (!userRateLimit) {
      throw new Error(
        "Failed to create/update rate limit record after retries",
      );
    }

    // After the main update, increment the specific account's calls
    await RateUserRateLimit.updateOne(
      {
        clerkId,
        windowStart,
        "accountUsage.instagramAccountId": accountId,
      },
      {
        $inc: { "accountUsage.$.callsMade": 1 },
        $set: { "accountUsage.$.lastCallAt": new Date() },
      },
    );

    // Update meta calls for Instagram account if needed
    if (metaCalls > 0) {
      await InstagramAccount.updateOne(
        { instagramId: accountId },
        {
          $inc: { metaCallsThisHour: metaCalls },
          $set: { lastMetaCallAt: new Date(), lastActivity: new Date() },
        },
      );
    }

    console.log(
      `✅ Updated database records for user ${clerkId}, account ${accountId}`,
    );

    return userRateLimit;
  } catch (error) {
    console.error("Error updating database records:", error);
    throw error;
  }
}
/**
 * Queue a webhook for later processing
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
      actionType: "webhook_incoming",
      actionPayload: data.metadata,
      priority: 5,
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
      await redisHelpers.lpush(
        `queue:pending:${window.key}`,
        JSON.stringify({
          jobId,
          ...data,
          windowStart: window.start,
          queuedAt: new Date(),
        }),
      );
      await redisHelpers.expire(`queue:pending:${window.key}`, 7200);
    } catch (redisError) {
      console.warn("Could not add to Redis queue:", redisError);
    }

    console.log(`📦 Webhook queued: ${jobId} (Reason: ${data.reason})`);
    return jobId;
  } catch (error) {
    console.error("Error queueing webhook:", error);
    throw error;
  }
}

/**
 * Process queued webhooks - ONLY called during hourly window reset
 */
export async function processQueuedCalls(limit: number = 100): Promise<{
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

  console.log(`🔄 Starting queue processing for window ${window.label}`);

  try {
    let remaining = (await redisHelpers.llen(queueKey)) || 0;

    if (remaining === 0) {
      console.log(`ℹ️ No queued items to process for window ${window.label}`);
      return await processQueuedCallsFromDatabase(limit);
    }

    console.log(`📋 Found ${remaining} queued items to process`);

    for (let i = 0; i < limit && remaining > 0; i++) {
      const item = await redisHelpers.rpop(queueKey);
      if (!item) break;

      try {
        const job = JSON.parse(item);

        const canMake = await canMakeCall(job.clerkId, job.accountId, true);

        if (canMake.allowed) {
          const result = await processQueuedWebhook(job);

          if (result.success) {
            await RateLimitQueue.findOneAndUpdate(
              { jobId: job.jobId },
              {
                status: "completed",
                processingCompletedAt: new Date(),
                updatedAt: new Date(),
              },
            );
            processed++;
            console.log(`✅ Processed queued webhook: ${job.jobId}`);
          } else {
            await handleFailedWebhook(job, result.error);
            failed++;
          }
        } else {
          // Put back in queue for next window
          await redisHelpers.lpush(queueKey, item);
          skipped++;
          console.log(`⏸️ Skipped webhook ${job.jobId} - limits still reached`);
          break;
        }
      } catch (error) {
        console.error("Error processing queued webhook:", error);
        failed++;
      }

      remaining = (await redisHelpers.llen(queueKey)) || 0;
    }

    console.log(
      `📊 Queue processing complete: processed=${processed}, failed=${failed}, skipped=${skipped}, remaining=${remaining}`,
    );
    return { processed, failed, skipped, remaining };
  } catch (error) {
    console.error("Error in processQueuedCalls:", error);
    return await processQueuedCallsFromDatabase(limit);
  }
}

async function processQueuedCallsFromDatabase(limit: number = 100) {
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    await connectToDatabase();

    const pendingJobs = await RateLimitQueue.find({
      status: "pending",
    })
      .limit(limit)
      .sort({ createdAt: 1 });

    if (pendingJobs.length === 0) {
      return { processed, failed, skipped, remaining: 0 };
    }

    console.log(`📋 Found ${pendingJobs.length} queued items in database`);

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
            console.log(`✅ Processed queued webhook from DB: ${job.jobId}`);
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
          break;
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

    console.log(
      `📊 DB Queue processing: processed=${processed}, failed=${failed}, skipped=${skipped}, remaining=${remaining}`,
    );
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
    const { processInstagramWebhook } =
      await import("@/services/webhook/instagram-processor.service");

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
        console.log(
          `❌ Webhook ${job.jobId} failed permanently after ${queueItem.retryCount} retries`,
        );
      } else {
        queueItem.updatedAt = new Date();
        console.log(
          `⚠️ Webhook ${job.jobId} failed (retry ${queueItem.retryCount}/${queueItem.maxRetries})`,
        );
      }

      await queueItem.save();
    }
  } catch (error) {
    console.error("Error handling failed webhook:", error);
  }
}

// Flag to track if window reset is in progress
let isWindowResetting = false;
let lastResetWindowHour = -1;

/**
 * Reset hourly window - called by Railway cron job
 */
export async function resetHourlyWindow(): Promise<{
  success: boolean;
  message: string;
  processed: number;
  resetAccounts: number;
}> {
  const currentWindow = getCurrentWindow();
  const currentHour = currentWindow.start.getUTCHours();

  // Check if we already reset this window
  if (lastResetWindowHour === currentHour) {
    console.log(
      `⏭️ Skipping window reset for ${currentWindow.label} - already reset`,
    );
    return {
      success: true,
      message: `Window already reset for ${currentWindow.label}`,
      processed: 0,
      resetAccounts: 0,
    };
  }

  // Prevent concurrent resets
  if (isWindowResetting) {
    console.log("⏭️ Skipping window reset - already in progress");
    return {
      success: false,
      message: "Window reset already in progress",
      processed: 0,
      resetAccounts: 0,
    };
  }

  isWindowResetting = true;

  try {
    await connectToDatabase();

    console.log(`🕐 Starting hourly window reset for ${currentWindow.label}`);

    // Get the previous window (the one that just ended)
    const previousWindowStart = new Date(
      currentWindow.start.getTime() - 60 * 60 * 1000,
    );

    // Mark previous window as completed if it exists
    const previousWindow = await RateLimitWindow.findOne({
      windowStart: previousWindowStart,
    });

    if (previousWindow) {
      await RateLimitWindow.updateOne(
        { _id: previousWindow._id },
        {
          status: "completed",
          updatedAt: new Date(),
        },
      );
      console.log(
        `✅ Completed window for ${previousWindowStart.toISOString()}`,
      );
    }

    // PROCESS QUEUED ITEMS - this is where queue processing happens
    console.log(`📦 Processing queued items from previous window...`);
    const queueResult = await processQueuedCalls(100);

    // Reset account meta call counters
    const accounts = await InstagramAccount.find({});
    let resetAccounts = 0;

    for (const account of accounts) {
      try {
        await redisHelpers.del(`account:meta_limited:${account.instagramId}`);
      } catch (redisError) {
        // Ignore
      }

      account.metaCallsThisHour = 0;
      account.isMetaRateLimited = false;
      account.metaRateLimitResetAt = undefined;
      await account.save();
      resetAccounts++;
    }

    const activeAccounts = await InstagramAccount.countDocuments({
      isActive: true,
    });

    // Check if new window already exists
    const existingWindow = await RateLimitWindow.findOne({
      windowStart: currentWindow.start,
    });

    if (!existingWindow) {
      // Create new window
      const newWindow = new RateLimitWindow({
        windowStart: currentWindow.start,
        windowEnd: currentWindow.end,
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
      console.log(`✅ Created new window for ${currentWindow.label}`);
    }

    // Reset automation paused flag
    isAutomationPaused = false;

    // Update the last reset window hour
    lastResetWindowHour = currentHour;

    // Clear Redis counters for the new window
    try {
      const keys = await redisHelpers.keys(`*:${currentWindow.key}`);
      if (keys.length > 0) await redisHelpers.del(...keys);
    } catch (redisError) {
      console.warn("Could not clear Redis counters:", redisError);
    }

    console.log(`✅ Window reset completed for ${currentWindow.label}`);
    console.log(
      `📊 Processed ${queueResult.processed} queued items, ${queueResult.failed} failed, ${queueResult.skipped} skipped`,
    );

    return {
      success: true,
      message: `Window reset completed for ${currentWindow.label}`,
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
  } finally {
    isWindowResetting = false;
  }
}

// ... rest of the functions (getWindowStats, getUserRateLimitStats remain the same)
export async function getWindowStats(windowStart?: Date) {
  await connectToDatabase();

  const { start: currentWindowStart, label: currentLabel } = getCurrentWindow();
  const targetWindowStart = windowStart || currentWindowStart;

  const window = await RateLimitWindow.findOne({
    windowStart: targetWindowStart,
  });

  const totalInstagramAccounts = await InstagramAccount.countDocuments({
    isActive: true,
  });
  const appLimit = totalInstagramAccounts * META_API_LIMIT_PER_ACCOUNT;

  if (!window) {
    return {
      window: currentLabel,
      isCurrentWindow: true,
      global: {
        totalCalls: 0,
        appLimit,
        accountsProcessed: 0,
        isAutomationPaused: false,
      },
      queue: {
        queuedItems: 0,
        byType: [],
        byReason: [],
        processing: 0,
        pending: 0,
        failed: 0,
      },
      users: {
        totalUsers: 0,
        totalCalls: 0,
        averageCallsPerUser: 0,
        byTier: {
          free: { count: 0, totalCalls: 0 },
          pro: { count: 0, totalCalls: 0 },
        },
      },
      accounts: {
        totalActive: totalInstagramAccounts,
        appLimitPerAccount: META_API_LIMIT_PER_ACCOUNT,
      },
    };
  }

  const userLimits = await RateUserRateLimit.find({
    windowStart: targetWindowStart,
  });

  const totalUserCalls = userLimits.reduce(
    (sum, ul) => sum + ul.totalCallsMade,
    0,
  );
  const activeUsers = userLimits.length;

  const freeUsers = userLimits.filter((ul) => ul.tier === "free");
  const proUsers = userLimits.filter((ul) => ul.tier === "pro");

  const freeUserCalls = freeUsers.reduce(
    (sum, ul) => sum + ul.totalCallsMade,
    0,
  );
  const proUserCalls = proUsers.reduce((sum, ul) => sum + ul.totalCallsMade, 0);

  const queueStatsByType = await RateLimitQueue.aggregate([
    {
      $match: {
        windowStart: targetWindowStart,
        status: { $in: ["pending", "processing"] },
      },
    },
    {
      $group: {
        _id: "$actionType",
        count: { $sum: 1 },
      },
    },
  ]);

  const queueStatsByReason = await RateLimitQueue.aggregate([
    {
      $match: {
        windowStart: targetWindowStart,
        status: { $in: ["pending", "processing"] },
        "metadata.reason": { $exists: true },
      },
    },
    {
      $group: {
        _id: "$metadata.reason",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalQueued = await RateLimitQueue.countDocuments({
    windowStart: targetWindowStart,
    status: { $in: ["pending", "processing"] },
  });

  const processingCount = await RateLimitQueue.countDocuments({
    windowStart: targetWindowStart,
    status: "processing",
  });

  const pendingCount = await RateLimitQueue.countDocuments({
    windowStart: targetWindowStart,
    status: "pending",
  });

  const failedCount = await RateLimitQueue.countDocuments({
    windowStart: targetWindowStart,
    status: "failed",
  });

  const completedCount = await RateLimitQueue.countDocuments({
    windowStart: targetWindowStart,
    status: "completed",
  });

  return {
    window: currentLabel,
    isCurrentWindow:
      targetWindowStart.getTime() === currentWindowStart.getTime(),
    global: {
      totalCalls: window.globalCalls,
      appLimit: window.appLimit,
      accountsProcessed: window.accountsProcessed,
      isAutomationPaused: window.isAutomationPaused,
      usagePercentage:
        window.appLimit > 0 ? (window.globalCalls / window.appLimit) * 100 : 0,
    },
    queue: {
      queuedItems: totalQueued,
      byType: queueStatsByType,
      byReason: queueStatsByReason,
      processing: processingCount,
      pending: pendingCount,
      failed: failedCount,
      completed: completedCount,
    },
    users: {
      totalUsers: activeUsers,
      totalCalls: totalUserCalls,
      averageCallsPerUser: activeUsers > 0 ? totalUserCalls / activeUsers : 0,
      byTier: {
        free: {
          count: freeUsers.length,
          totalCalls: freeUserCalls,
          averageCallsPerUser:
            freeUsers.length > 0 ? freeUserCalls / freeUsers.length : 0,
          limit: 100,
        },
        pro: {
          count: proUsers.length,
          totalCalls: proUserCalls,
          averageCallsPerUser:
            proUsers.length > 0 ? proUserCalls / proUsers.length : 0,
          limit: 2000,
        },
      },
    },
    accounts: {
      totalActive: totalInstagramAccounts,
      appLimitPerAccount: META_API_LIMIT_PER_ACCOUNT,
      totalAppLimit: totalInstagramAccounts * META_API_LIMIT_PER_ACCOUNT,
    },
  };
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

  let callsMade = 0;
  try {
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const callsMadeStr = await redisHelpers.get(userKey);
    callsMade = parseInt(callsMadeStr || "0");
  } catch (redisError) {
    console.warn("Could not get calls from Redis");
  }

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
