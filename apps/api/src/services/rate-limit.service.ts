import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import RateLimitQueue from "@/models/Rate/RateLimitQueue.model";
import RateLimitWindow from "@/models/Rate/RateLimitWindow.model";
import UserRateLimit from "@/models/Rate/UserRateLimit.model";
import { redisHelpers, connectToRedis } from "@/config/redis.config"; // Updated import

const APP_HOURLY_GLOBAL_LIMIT = parseInt(
  process.env.APP_HOURLY_GLOBAL_LIMIT || "20000",
);
const META_API_LIMIT_PER_ACCOUNT = 200;

// Tier limits based on subscription
const TIER_LIMITS = {
  free: 100, // Free users: 100 calls/hour
  pro: 999999, // Pro users: basically unlimited
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

export async function getUserTier(clerkId: string): Promise<TierType> {
  const cacheKey = `user:tier:${clerkId}`;

  try {
    const cached = await redisHelpers.get(cacheKey);
    if (cached) {
      return cached as TierType;
    }
  } catch (redisError) {
    console.warn(
      "Redis not available for cache, checking database:",
      redisError,
    );
  }

  try {
    await connectToDatabase();

    // Check if user has active Insta-Automation-Pro subscription
    const subscription = await InstaSubscription.findOne({
      clerkId,
      chatbotType: "Insta-Automation-Pro",
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    const tier = subscription ? "pro" : "free";

    try {
      // Cache for 5 minutes
      await redisHelpers.set(cacheKey, tier, 300);
    } catch (cacheError) {
      console.warn("Could not cache user tier:", cacheError);
    }

    return tier;
  } catch (error) {
    console.error("Error getting user tier:", error);
    return "free";
  }
}

export async function canMakeCall(
  clerkId: string,
  accountId: string,
  actionType: string,
  isFollowCheck: boolean = false,
): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
  tier?: TierType;
  metaLimitReached?: boolean;
}> {
  try {
    const window = getCurrentWindow();
    const tier = await getUserTier(clerkId);
    const tierLimit = TIER_LIMITS[tier];

    // 1. Check app global limit
    const globalKey = `global:calls:${window.key}`;
    const globalCallsStr = await redisHelpers.get(globalKey);
    const globalCalls = parseInt(globalCallsStr || "0");

    if (globalCalls >= APP_HOURLY_GLOBAL_LIMIT) {
      return {
        allowed: false,
        reason: "app_global_limit_reached",
        tier,
      };
    }

    // 2. Check user tier limit
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const userCallsStr = await redisHelpers.get(userKey);
    const userCalls = parseInt(userCallsStr || "0");

    if (userCalls >= tierLimit) {
      return {
        allowed: false,
        reason: "user_tier_limit_reached",
        remaining: 0,
        tier,
      };
    }

    // 3. Check Meta API rate limit for account
    const accountMetaKey = `account:meta_calls:${accountId}:${window.key}`;
    const metaCallsStr = await redisHelpers.get(accountMetaKey);
    const metaCalls = parseInt(metaCallsStr || "0");

    if (metaCalls >= META_API_LIMIT_PER_ACCOUNT) {
      const isLimited = await redisHelpers.get(
        `account:meta_limited:${accountId}`,
      );
      if (isLimited === "true") {
        return {
          allowed: false,
          reason: "meta_rate_limit_reached",
          remaining: tierLimit - userCalls,
          tier,
          metaLimitReached: true,
        };
      }
    }

    // 4. For free users on follow checks, check if skip
    if (tier === "free" && isFollowCheck) {
      await connectToDatabase();
      const account = await InstagramAccount.findOne({
        instagramId: accountId,
      });
      if (account?.requireFollowForFreeUsers === false) {
        return {
          allowed: false,
          reason: "free_user_skip_follow_check",
          remaining: tierLimit - userCalls,
          tier,
        };
      }
    }

    return {
      allowed: true,
      remaining: tierLimit - userCalls,
      tier,
    };
  } catch (error) {
    console.error("Error in canMakeCall:", error);
    // If Redis fails, assume rate limited to be safe
    return {
      allowed: false,
      reason: "system_error",
      tier: "free",
    };
  }
}

export async function recordCall(
  clerkId: string,
  accountId: string,
  actionType: string,
  metaCalls: number = 1,
  metadata: any = {},
): Promise<{
  success: boolean;
  queued?: boolean;
  queueId?: string;
  reason?: string;
  callsRecorded?: number;
}> {
  const window = getCurrentWindow();

  const canMake = await canMakeCall(
    clerkId,
    accountId,
    actionType,
    metadata.isFollowCheck || false,
  );

  if (!canMake.allowed) {
    // Queue the call
    const queueId = await queueCall({
      clerkId,
      accountId,
      actionType,
      actionData: metadata,
      reason: canMake.reason || "rate_limited",
      priority: getPriority(actionType, canMake.tier || "free"),
    });

    return {
      success: false,
      queued: true,
      queueId,
      reason: canMake.reason,
    };
  }

  try {
    // Update counters in Redis using helpers
    const userKey = `user:calls:${clerkId}:${window.key}`;
    const globalKey = `global:calls:${window.key}`;
    const accountMetaKey = `account:meta_calls:${accountId}:${window.key}`;

    // Update counters
    await Promise.all([
      redisHelpers.incrBy(userKey, 1),
      redisHelpers.expire(userKey, 7200),
      redisHelpers.incrBy(globalKey, 1),
      redisHelpers.expire(globalKey, 7200),
    ]);

    if (metaCalls > 0) {
      await redisHelpers.incrBy(accountMetaKey, metaCalls);
      await redisHelpers.expire(accountMetaKey, 7200);

      // Check if reached Meta limit
      const currentMetaStr = await redisHelpers.get(accountMetaKey);
      const currentMeta = parseInt(currentMetaStr || "0");
      if (currentMeta >= META_API_LIMIT_PER_ACCOUNT) {
        const resetTime = new Date(Date.now() + 60 * 60 * 1000);
        await redisHelpers.set(
          `account:meta_limited:${accountId}`,
          "true",
          3600,
        );
        await redisHelpers.set(
          `account:meta_reset:${accountId}`,
          resetTime.toISOString(),
          3600,
        );
      }
    }

    // Update database records
    await updateDatabaseRecords(
      clerkId,
      accountId,
      actionType,
      metaCalls,
      window.start,
      canMake.tier || "free",
    );

    return {
      success: true,
      callsRecorded: 1 + metaCalls,
    };
  } catch (error) {
    console.error("Error in recordCall:", error);

    // If Redis fails, still try to queue the call
    const queueId = await queueCall({
      clerkId,
      accountId,
      actionType,
      actionData: metadata,
      reason: "redis_error",
      priority: getPriority(actionType, canMake.tier || "free"),
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
  actionType: string,
  metaCalls: number,
  windowStart: Date,
  tier: TierType,
) {
  try {
    await connectToDatabase();

    // Update user rate limit
    const tierLimit = TIER_LIMITS[tier];

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

    // Update account usage
    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (account) {
      await UserRateLimit.updateOne(
        { clerkId, windowStart },
        {
          $push: {
            accountUsage: {
              instagramAccountId: accountId,
              accountUsername: account.username,
              accountProfile: account.profilePicture,
              callsMade: 1,
              lastCallAt: new Date(),
            },
          },
        },
      );

      // Update Instagram account statistics
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

function getPriority(actionType: string, tier: TierType): number {
  const basePriority: Record<string, number> = {
    dm_final_link: 1,
    dm_follow_check: 2,
    follow_verification: 2,
    dm_initial: 3,
    comment_reply: 4,
  };

  let priority = basePriority[actionType] || 5;

  // Adjust by tier
  if (tier === "pro") priority = 1;

  return Math.max(1, Math.min(10, priority));
}

export async function queueCall(data: {
  clerkId: string;
  accountId: string;
  actionType: string;
  actionData: any;
  reason: string;
  priority: number;
}): Promise<string> {
  const window = getCurrentWindow();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await connectToDatabase();

    const queueItem = new RateLimitQueue({
      jobId,
      clerkId: data.clerkId,
      instagramAccountId: data.accountId,
      actionType: data.actionType,
      actionPayload: data.actionData,
      priority: data.priority,
      status: "pending",
      windowStart: window.start,
      retryCount: 0,
      maxRetries: 3,
      metadata: {
        commentId: data.actionData.commentId,
        recipientId: data.actionData.recipientId,
        templateId: data.actionData.templateId,
        stage: data.actionData.stage,
        reason: data.reason,
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
    } catch (redisError) {
      console.warn(
        "Could not add to Redis queue, using database only:",
        redisError,
      );
    }

    return jobId;
  } catch (error) {
    console.error("Error queueing call:", error);
    throw error;
  }
}

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
  let remaining = 0;

  try {
    // Get queue length first
    remaining = (await redisHelpers.llen(queueKey)) || 0;

    for (let i = 0; i < limit; i++) {
      const item = await redisHelpers.rpop(queueKey);
      if (!item) break;

      try {
        const job = JSON.parse(item);

        // Check if we can process now
        const canMake = await canMakeCall(
          job.clerkId,
          job.accountId,
          job.actionType,
          job.actionData?.isFollowCheck || false,
        );

        if (canMake.allowed) {
          // Process the job
          const result = await processQueuedJob(job);

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
            // Handle failed job
            await handleFailedJob(job, result.error);
            failed++;
          }
        } else {
          // Put back in queue with delay
          await redisHelpers.lpush(queueKey, item);
          await redisHelpers.expire(queueKey, 7200);
          skipped++;
        }
      } catch (error) {
        console.error("Error processing queued job:", error);
        failed++;
      }
    }

    // Update remaining count
    remaining = (await redisHelpers.llen(queueKey)) || 0;
  } catch (error) {
    console.error("Error in processQueuedCalls:", error);
    // Fallback to database processing if Redis fails
    await processQueuedCallsFromDatabase(limit);
  }

  return { processed, failed, skipped, remaining };
}

// Fallback function for database-only processing
async function processQueuedCallsFromDatabase(limit: number = 50) {
  try {
    await connectToDatabase();

    const pendingJobs = await RateLimitQueue.find({
      status: "pending",
    })
      .limit(limit)
      .sort({ priority: 1, createdAt: 1 });

    for (const job of pendingJobs) {
      try {
        const canMake = await canMakeCall(
          job.clerkId,
          job.instagramAccountId,
          job.actionType,
          job.metadata?.isFollowCheck || false,
        );

        if (canMake.allowed) {
          const result = await processQueuedJob({
            jobId: job.jobId,
            clerkId: job.clerkId,
            accountId: job.instagramAccountId,
            actionType: job.actionType,
            actionData: job.actionPayload,
            windowStart: job.windowStart,
          });

          if (result.success) {
            job.status = "completed";
            job.processingCompletedAt = new Date();
            job.updatedAt = new Date();
            await job.save();
          } else {
            job.retryCount += 1;
            if (job.retryCount >= job.maxRetries) {
              job.status = "failed";
              job.errorMessage = result.error;
            }
            job.updatedAt = new Date();
            await job.save();
          }
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
      }
    }
  } catch (error) {
    console.error("Error in database fallback processing:", error);
  }
}

async function processQueuedJob(
  job: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import the appropriate service based on action type
    switch (job.actionType) {
      case "comment_reply":
        const { processCommentAutomation } =
          await import("@/services/automation/comment-processor.service");
        await processCommentAutomation(
          job.accountId,
          job.clerkId,
          job.actionData.comment,
          job.actionData.template,
        );
        break;

      case "dm_initial":
      case "dm_follow_check":
      case "dm_final_link":
        const { handlePostbackAutomation } =
          await import("@/services/automation/dm-processor.service");
        await handlePostbackAutomation(
          job.accountId,
          job.clerkId,
          job.actionData.recipientId,
          job.actionData.payload,
          job.actionData.stage,
        );
        break;

      case "follow_verification":
        const { checkMainFollowStatus } =
          await import("@/services/automation/follow-verification.service");
        await checkMainFollowStatus(
          job.accountId,
          job.actionData.recipientId,
          job.actionData.templateId,
        );
        break;

      default:
        return { success: false, error: "Unknown action type" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function handleFailedJob(job: any, error?: string) {
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
        // Schedule retry with exponential backoff
        const delay = Math.pow(2, queueItem.retryCount) * 60000; // 1, 2, 4 minutes
        const retryAt = new Date(Date.now() + delay);

        queueItem.updatedAt = new Date();
        queueItem.scheduledAt = retryAt;

        try {
          // Put back in Redis queue if available
          await redisHelpers.lpush(
            `queue:pending:${job.windowStart?.toISOString() || getCurrentWindow().key}`,
            JSON.stringify({
              ...job,
              retryCount: queueItem.retryCount,
              scheduledAt: retryAt,
            }),
          );
        } catch (redisError) {
          console.warn("Could not add back to Redis queue:", redisError);
        }
      }

      await queueItem.save();
    }
  } catch (error) {
    console.error("Error handling failed job:", error);
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
        await redisHelpers.del(`account:meta_reset:${account.instagramId}`);
      } catch (redisError) {
        console.warn(
          `Could not clear Redis flags for account ${account.instagramId}:`,
          redisError,
        );
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
      // Clear Redis counters for previous window
      const userKeys = await redisHelpers.keys(
        `user:calls:*:${previousWindow.key}`,
      );
      const accountKeys = await redisHelpers.keys(
        `account:meta_calls:*:${previousWindow.key}`,
      );

      if (userKeys.length > 0) await redisHelpers.del(...userKeys);
      if (accountKeys.length > 0) await redisHelpers.del(...accountKeys);

      console.log(`🔄 Window reset completed for ${previousWindow.label}`);
    } catch (redisError) {
      console.warn("Could not clear Redis counters:", redisError);
    }

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
  accountUsage: Array<{
    instagramAccountId: string;
    accountUsername?: string;
    callsMade: number;
    lastCallAt: Date;
  }>;
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
    console.warn("Could not get calls from Redis:", redisError);
  }

  // Get queued items
  let queuedItems = 0;
  try {
    await connectToDatabase();
    queuedItems = await RateLimitQueue.countDocuments({
      clerkId,
      status: "pending",
      windowStart: window.start,
    });
  } catch (dbError) {
    console.warn("Could not get queued items:", dbError);
  }

  // Get account usage from UserRateLimit
  let accountUsage = [];
  try {
    const userLimit = await UserRateLimit.findOne({
      clerkId,
      windowStart: window.start,
    });
    accountUsage = userLimit?.accountUsage || [];
  } catch (dbError) {
    console.warn("Could not get account usage:", dbError);
  }

  // Calculate next reset
  const nextReset = new Date(window.end);

  return {
    tier,
    tierLimit,
    callsMade,
    remainingCalls: Math.max(0, tierLimit - callsMade),
    usagePercentage: tierLimit > 0 ? (callsMade / tierLimit) * 100 : 0,
    accountUsage,
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
    console.warn("Could not get app limit from Redis:", redisError);
  }

  const percentage = (current / APP_HOURLY_GLOBAL_LIMIT) * 100;

  return {
    reached: current >= APP_HOURLY_GLOBAL_LIMIT,
    current,
    limit: APP_HOURLY_GLOBAL_LIMIT,
    percentage,
  };
}
