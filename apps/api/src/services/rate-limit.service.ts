// services/rate-limit.service.ts
import { connectToDatabase } from "@/config/database.config";
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

const TIER_LIMITS = {
  free: 200,
  pro: 5000,
} as const;

type TierType = keyof typeof TIER_LIMITS;

let isAutomationPaused = false;
let lastPauseCheck = Date.now();

// ─── getCurrentWindow ─────────────────────────────────────────────────────────

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

// ─── getUserTier ──────────────────────────────────────────────────────────────

export async function getUserTier(clerkId: string): Promise<TierType> {
  const cacheKey = `user:tier:${clerkId}`;
  try {
    const cached = await redisHelpers.get(cacheKey);
    if (cached) return cached as TierType;
  } catch {
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
    } catch {
      /* ignore */
    }
    return tier;
  } catch (error) {
    console.error("Error getting user tier:", error);
    return "free";
  }
}

// ─── isAppLimitReached ────────────────────────────────────────────────────────

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
    const currentStr = await redisHelpers.get(`global:calls:${window.key}`);
    current = parseInt(currentStr || "0");
  } catch {
    console.warn("Could not get app limit from Redis");
  }

  const reached = current >= APP_HOURLY_GLOBAL_LIMIT;
  const percentage = (current / APP_HOURLY_GLOBAL_LIMIT) * 100;

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

// ─── getAutomationStatus ──────────────────────────────────────────────────────

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

// ─── canMakeCall ──────────────────────────────────────────────────────────────

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

    const globalCallsStr = await redisHelpers.get(`global:calls:${window.key}`);
    const globalCalls = parseInt(globalCallsStr || "0");
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

    const tier = await getUserTier(clerkId);
    const tierLimit = TIER_LIMITS[tier];
    const userCallsStr = await redisHelpers.get(
      `user:calls:${clerkId}:${window.key}`,
    );
    const userCalls = parseInt(userCallsStr || "0");
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

// ─── safeUpsertRateLimit ──────────────────────────────────────────────────────
//
// THE REAL ROOT CAUSE of the E11000:
//
//   MongoDB Atlas has a STALE single-field unique index { clerkId: 1 }
//   left over from an older version of the schema. Your current schema correctly
//   defines { clerkId: 1, windowStart: 1 } as the unique compound index, but the
//   old clerkId_1 index was never dropped from the collection.
//
//   When two concurrent webhooks fire in the same second:
//     Request A: findOne → not found → create() → ✅ inserts
//     Request B: findOne → not found (hasn't seen A yet) → create() → ❌ E11000 on clerkId_1
//
//   The stale clerkId_1 index treats clerkId as globally unique across ALL windows,
//   so even a legitimate "new window, same user" insert gets rejected.
//
// PERMANENT FIX (do this FIRST):
//   Run scripts/fix-ratelimit-index.ts ONCE to drop the stale index.
//   After that, this function uses findOneAndUpdate+upsert (atomic) as the
//   belt-and-suspenders for any remaining race conditions.

async function safeUpsertRateLimit(
  clerkId: string,
  windowStart: Date,
  tier: TierType,
  tierLimit: number,
): Promise<void> {
  const filter = { clerkId, windowStart };
  const now = new Date();

  // $setOnInsert runs ONLY when a new document is actually inserted.
  // On concurrent upserts for the same compound key, MongoDB's atomic write
  // guarantees exactly one insert — the other becomes an update. No TOCTOU race.
  const updateOp = {
    $set: { tier, tierLimit, updatedAt: now },
    $setOnInsert: {
      totalCallsMade: 0,
      isAutomationPaused: false,
      accountUsage: [],
      createdAt: now,
    },
  };

  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      await RateUserRateLimit.findOneAndUpdate(filter, updateOp, {
        upsert: true,
        new: true,
        runValidators: false,
      });
      return; // success on first try (99.9% of the time)
    } catch (err: any) {
      const isDuplicate = err?.code === 11000;
      if (!isDuplicate) throw err;

      // Still getting E11000 even with findOneAndUpdate+upsert means the STALE
      // clerkId_1 index is still present. Fall back to plain update.
      console.warn(
        `⚡ E11000 attempt ${attempts}/${MAX_ATTEMPTS} for clerkId=${clerkId}` +
          ` — stale index may still exist. Run scripts/fix-ratelimit-index.ts`,
      );

      if (attempts >= MAX_ATTEMPTS) {
        // Document guaranteed to exist (inserted by concurrent req). Plain update.
        await RateUserRateLimit.findOneAndUpdate(
          filter,
          { $set: { tier, tierLimit, updatedAt: now } },
          { new: true, runValidators: false },
        );
        return;
      }

      await new Promise((r) => setTimeout(r, 20 * attempts));
    }
  }
}

// ─── updateDatabaseRecords ────────────────────────────────────────────────────

async function updateDatabaseRecords(
  clerkId: string,
  accountId: string,
  metaCalls: number,
  windowStart: Date,
  tier: TierType,
): Promise<void> {
  try {
    await connectToDatabase();

    const tierLimit = TIER_LIMITS[tier];
    const now = new Date();

    // ── Step 1: Atomic upsert of top-level document ────────────────────────
    await safeUpsertRateLimit(clerkId, windowStart, tier, tierLimit);

    // ── Step 2: Increment totalCallsMade (separate atomic op) ─────────────
    await RateUserRateLimit.findOneAndUpdate(
      { clerkId, windowStart },
      { $inc: { totalCallsMade: 1 }, $set: { updatedAt: now } },
      { new: true, runValidators: false },
    );

    // ── Step 3: Update or insert accountUsage entry ────────────────────────
    if (accountId) {
      // Try to increment existing entry using positional $ operator
      const updated = await RateUserRateLimit.findOneAndUpdate(
        { clerkId, windowStart, "accountUsage.instagramAccountId": accountId },
        {
          $inc: { "accountUsage.$.callsMade": 1 },
          $set: { "accountUsage.$.lastCallAt": now },
        },
        { new: true, runValidators: false },
      );

      // Not in array yet — fetch account info and push new entry
      if (!updated) {
        const account = await InstagramAccount.findOne(
          { instagramId: accountId },
          { username: 1, profilePicture: 1 },
        ).lean();

        await RateUserRateLimit.findOneAndUpdate(
          { clerkId, windowStart },
          {
            $push: {
              accountUsage: {
                instagramAccountId: accountId,
                callsMade: 1,
                lastCallAt: now,
                accountUsername: account?.username ?? "",
                accountProfile: account?.profilePicture ?? "",
              },
            },
          },
          { new: true, runValidators: false },
        );
      }
    }

    // ── Step 4: Update Meta call counter on InstagramAccount ───────────────
    if (metaCalls > 0) {
      await InstagramAccount.updateOne(
        { instagramId: accountId },
        {
          $inc: { metaCallsThisHour: metaCalls },
          $set: { lastMetaCallAt: now, lastActivity: now },
        },
      );
    }
  } catch (error) {
    // Never crash the automation flow because of a rate-limit DB write
    console.error("Error updating database records:", error);
  }
}

// ─── recordCall ───────────────────────────────────────────────────────────────

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
  // Automation responses (outgoing DMs) are NOT counted against limits
  if (!isIncomingWebhook) {
    return { success: true, callsRecorded: 0, processImmediately: true };
  }

  const window = getCurrentWindow();
  const canMake = await canMakeCall(clerkId, accountId, true);

  if (canMake.allowed) {
    try {
      const userKey = `user:calls:${clerkId}:${window.key}`;
      const globalKey = `global:calls:${window.key}`;
      const accountMetaKey = `account:meta_calls:${accountId}:${window.key}`;

      const client = redisHelpers.getRedisClient?.();

      if (client?.isOpen) {
        const pipeline = client.multi();
        pipeline.incrBy(userKey, 1);
        pipeline.incrBy(globalKey, 1);
        if (metaCalls > 0) pipeline.incrBy(accountMetaKey, metaCalls);
        pipeline.expire(userKey, 7200);
        pipeline.expire(globalKey, 7200);
        if (metaCalls > 0) pipeline.expire(accountMetaKey, 7200);
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

      if (metaCalls > 0) {
        const currentMeta = parseInt(
          (await redisHelpers.get(accountMetaKey)) || "0",
        );
        if (currentMeta >= META_API_LIMIT_PER_ACCOUNT) {
          await redisHelpers.set(
            `account:meta_limited:${accountId}`,
            "true",
            3600,
          );
        }
      }

      // Fire-and-forget — never block the webhook response
      updateDatabaseRecords(
        clerkId,
        accountId,
        metaCalls,
        window.start,
        canMake.tier || "free",
      ).catch((err) => console.error("Async DB update failed:", err));

      return {
        success: true,
        callsRecorded: 1 + metaCalls,
        processImmediately: true,
      };
    } catch (error) {
      console.error("Error recording call:", error);
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

  return { success: false, reason: canMake.reason, processImmediately: false };
}

// ─── queueWebhook ─────────────────────────────────────────────────────────────

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
        webhookId: data.metadata?.webhookId,
        commentId: data.metadata?.commentId,
        recipientId: data.metadata?.recipientId,
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

// ─── processQueuedCalls ───────────────────────────────────────────────────────

export async function processQueuedCalls(limit: number = 100): Promise<{
  processed: number;
  failed: number;
  skipped: number;
  remaining: number;
}> {
  const window = getCurrentWindow();
  const queueKey = `queue:pending:${window.key}`;
  let processed = 0,
    failed = 0,
    skipped = 0;

  console.log(`🔄 Starting queue processing for window ${window.label}`);

  try {
    let remaining = (await redisHelpers.llen(queueKey)) || 0;

    if (remaining === 0) {
      console.log(`ℹ️ No queued items in Redis for ${window.label}`);
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
      `📊 Queue: processed=${processed}, failed=${failed}, skipped=${skipped}, remaining=${remaining}`,
    );
    return { processed, failed, skipped, remaining };
  } catch (error) {
    console.error("Error in processQueuedCalls:", error);
    return await processQueuedCallsFromDatabase(limit);
  }
}

// ─── processQueuedCallsFromDatabase ──────────────────────────────────────────

async function processQueuedCallsFromDatabase(limit: number = 100) {
  let processed = 0,
    failed = 0,
    skipped = 0;

  try {
    await connectToDatabase();
    const pendingJobs = await RateLimitQueue.find({ status: "pending" })
      .limit(limit)
      .sort({ createdAt: 1 });

    if (pendingJobs.length === 0)
      return { processed, failed, skipped, remaining: 0 };
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
            processed++;
          } else {
            job.retryCount += 1;
            if (job.retryCount >= job.maxRetries) {
              job.status = "failed";
              job.errorMessage = result.error;
            }
            failed++;
          }
        } else {
          skipped++;
          break;
        }
      } catch (jobError) {
        job.retryCount += 1;
        if (job.retryCount >= job.maxRetries) {
          job.status = "failed";
          job.errorMessage =
            jobError instanceof Error ? jobError.message : "Unknown error";
        }
        failed++;
      }
      job.updatedAt = new Date();
      await job.save();
    }

    const remaining = await RateLimitQueue.countDocuments({
      status: "pending",
    });
    console.log(
      `📊 DB Queue: processed=${processed}, failed=${failed}, skipped=${skipped}, remaining=${remaining}`,
    );
    return { processed, failed, skipped, remaining };
  } catch (error) {
    console.error("Error in database fallback processing:", error);
    return { processed, failed, skipped, remaining: 0 };
  }
}

// ─── processQueuedWebhook ─────────────────────────────────────────────────────

async function processQueuedWebhook(
  job: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { processInstagramWebhook } =
      await import("@/services/webhook/instagram-processor.service.js");
    const result = await processInstagramWebhook(job.metadata?.originalPayload);
    return { success: result.success };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── handleFailedWebhook ──────────────────────────────────────────────────────

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
        console.log(
          `❌ Webhook ${job.jobId} permanently failed after ${queueItem.retryCount} retries`,
        );
      } else {
        console.log(
          `⚠️ Webhook ${job.jobId} failed (retry ${queueItem.retryCount}/${queueItem.maxRetries})`,
        );
      }
      queueItem.updatedAt = new Date();
      await queueItem.save();
    }
  } catch (error) {
    console.error("Error handling failed webhook:", error);
  }
}

// ─── resetHourlyWindow ───────────────────────────────────────────────────────

let isWindowResetting = false;
let lastResetWindowHour = -1;

export async function resetHourlyWindow(): Promise<{
  success: boolean;
  message: string;
  processed: number;
  resetAccounts: number;
}> {
  const currentWindow = getCurrentWindow();
  const currentHour = currentWindow.start.getUTCHours();

  if (lastResetWindowHour === currentHour) {
    return {
      success: true,
      message: `Window already reset for ${currentWindow.label}`,
      processed: 0,
      resetAccounts: 0,
    };
  }
  if (isWindowResetting) {
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

    const previousWindowStart = new Date(
      currentWindow.start.getTime() - 60 * 60 * 1000,
    );
    const previousWindow = await RateLimitWindow.findOne({
      windowStart: previousWindowStart,
    });
    if (previousWindow) {
      await RateLimitWindow.updateOne(
        { _id: previousWindow._id },
        { status: "completed", updatedAt: new Date() },
      );
    }

    const queueResult = await processQueuedCalls(100);

    const accounts = await InstagramAccount.find({});
    let resetAccounts = 0;
    for (const account of accounts) {
      try {
        await redisHelpers.del(`account:meta_limited:${account.instagramId}`);
      } catch {
        /* ignore */
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
    const existingWindow = await RateLimitWindow.findOne({
      windowStart: currentWindow.start,
    });
    if (!existingWindow) {
      await new RateLimitWindow({
        windowStart: currentWindow.start,
        windowEnd: currentWindow.end,
        globalCalls: 0,
        appLimit: APP_HOURLY_GLOBAL_LIMIT,
        accountsProcessed: 0,
        isAutomationPaused: false,
        status: "active",
        metadata: { totalAccounts: activeAccounts },
        createdAt: new Date(),
        updatedAt: new Date(),
      }).save();
    }

    isAutomationPaused = false;
    lastResetWindowHour = currentHour;

    try {
      const keys = await redisHelpers.keys(`*:${currentWindow.key}`);
      if (keys.length > 0) await redisHelpers.del(...keys);
    } catch {
      console.warn("Could not clear Redis counters");
    }

    console.log(`✅ Window reset completed for ${currentWindow.label}`);
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

// ─── getWindowStats ───────────────────────────────────────────────────────────

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
  const freeUsers = userLimits.filter((ul) => ul.tier === "free");
  const proUsers = userLimits.filter((ul) => ul.tier === "pro");
  const freeUserCalls = freeUsers.reduce(
    (sum, ul) => sum + ul.totalCallsMade,
    0,
  );
  const proUserCalls = proUsers.reduce((sum, ul) => sum + ul.totalCallsMade, 0);

  const [
    queueStatsByType,
    queueStatsByReason,
    totalQueued,
    processingCount,
    pendingCount,
    failedCount,
    completedCount,
  ] = await Promise.all([
    RateLimitQueue.aggregate([
      {
        $match: {
          windowStart: targetWindowStart,
          status: { $in: ["pending", "processing"] },
        },
      },
      { $group: { _id: "$actionType", count: { $sum: 1 } } },
    ]),
    RateLimitQueue.aggregate([
      {
        $match: {
          windowStart: targetWindowStart,
          status: { $in: ["pending", "processing"] },
          "metadata.reason": { $exists: true },
        },
      },
      { $group: { _id: "$metadata.reason", count: { $sum: 1 } } },
    ]),
    RateLimitQueue.countDocuments({
      windowStart: targetWindowStart,
      status: { $in: ["pending", "processing"] },
    }),
    RateLimitQueue.countDocuments({
      windowStart: targetWindowStart,
      status: "processing",
    }),
    RateLimitQueue.countDocuments({
      windowStart: targetWindowStart,
      status: "pending",
    }),
    RateLimitQueue.countDocuments({
      windowStart: targetWindowStart,
      status: "failed",
    }),
    RateLimitQueue.countDocuments({
      windowStart: targetWindowStart,
      status: "completed",
    }),
  ]);

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
      totalUsers: userLimits.length,
      totalCalls: totalUserCalls,
      averageCallsPerUser:
        userLimits.length > 0 ? totalUserCalls / userLimits.length : 0,
      byTier: {
        free: {
          count: freeUsers.length,
          totalCalls: freeUserCalls,
          averageCallsPerUser:
            freeUsers.length > 0 ? freeUserCalls / freeUsers.length : 0,
          limit: TIER_LIMITS.free,
        },
        pro: {
          count: proUsers.length,
          totalCalls: proUserCalls,
          averageCallsPerUser:
            proUsers.length > 0 ? proUserCalls / proUsers.length : 0,
          limit: TIER_LIMITS.pro,
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

// ─── getUserRateLimitStats ────────────────────────────────────────────────────

export async function getUserRateLimitStats(clerkId: string): Promise<{
  tier: TierType;
  tierLimit: number;
  callsMade: number;
  remainingCalls: number;
  usagePercentage: number;
  accountUsage: {
    instagramAccountId: string;
    callsMade: number;
    lastCallAt: Date;
    accountUsername?: string;
  }[];
  queuedItems: number;
  nextReset: Date;
}> {
  const window = getCurrentWindow();
  const tier = await getUserTier(clerkId);
  const tierLimit = TIER_LIMITS[tier];

  let callsMade = 0;
  try {
    callsMade = parseInt(
      (await redisHelpers.get(`user:calls:${clerkId}:${window.key}`)) || "0",
    );
  } catch {
    console.warn("Could not get calls from Redis");
  }

  let accountUsage: any[] = [];
  try {
    await connectToDatabase();
    const userLimit = await RateUserRateLimit.findOne(
      { clerkId, windowStart: window.start },
      { accountUsage: 1 },
    ).lean();
    if (userLimit?.accountUsage) {
      accountUsage = (userLimit.accountUsage as any[]).map((a) => ({
        instagramAccountId: a.instagramAccountId,
        callsMade: a.callsMade,
        lastCallAt: a.lastCallAt,
        accountUsername: a.accountUsername,
      }));
    }
  } catch {
    /* ignore */
  }

  let queuedItems = 0;
  try {
    await connectToDatabase();
    queuedItems = await RateLimitQueue.countDocuments({
      clerkId,
      status: "pending",
    });
  } catch {
    console.warn("Could not get queued items");
  }

  return {
    tier,
    tierLimit,
    callsMade,
    remainingCalls: Math.max(0, tierLimit - callsMade),
    usagePercentage: tierLimit > 0 ? (callsMade / tierLimit) * 100 : 0,
    accountUsage,
    queuedItems,
    nextReset: new Date(window.end),
  };
}
