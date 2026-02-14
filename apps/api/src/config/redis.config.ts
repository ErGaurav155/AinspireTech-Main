import { createClient, RedisClientType } from "redis";
import { loadEnvironment } from "./env.config";
loadEnvironment();

let redisClient: RedisClientType | null = null;
let isRedisEnabled = true; // Flag to track if Redis should be used

// Parse Redis URL safely
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log("⚠️ REDIS_URL not set - running without Redis");
    isRedisEnabled = false;
    return null;
  }

  try {
    const url = new URL(redisUrl);
    return {
      url: redisUrl,
      host: url.hostname,
      port: parseInt(url.port || "6379"),
      username: url.username || undefined,
      password: url.password || undefined,
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    };
  } catch (error: any) {
    console.error("❌ Invalid REDIS_URL format:", error.message);
    isRedisEnabled = false;
    return null;
  }
};

// Create Redis client safely - NEVER THROWS
export const getRedisClient = (): RedisClientType | null => {
  if (!isRedisEnabled) return null;

  if (redisClient?.isOpen) {
    return redisClient;
  }

  const config = getRedisConfig();
  if (!config) {
    isRedisEnabled = false;
    return null;
  }

  try {
    console.log(`🔌 Creating Redis client for: ${config.host}`);

    redisClient = createClient({
      url: config.url,
      socket: {
        tls: !!config.tls,
        rejectUnauthorized: false,
        reconnectStrategy: (retries) => {
          // Don't retry forever - after 3 retries, disable Redis
          if (retries > 3) {
            console.error(
              "❌ Max Redis reconnection attempts reached - disabling Redis",
            );
            isRedisEnabled = false;
            return false; // Stop reconnecting
          }
          return Math.min(retries * 100, 1000);
        },
        connectTimeout: 5000, // 5 second timeout
      },
    });

    // Handle errors without crashing
    redisClient.on("error", (err) => {
      console.error("⚠️ Redis client error (non-fatal):", err.message);
      isRedisEnabled = false; // Disable Redis on error
    });

    redisClient.on("end", () => {
      console.log("🔌 Redis connection closed");
      isRedisEnabled = false;
    });

    return redisClient;
  } catch (error: any) {
    console.error("❌ Failed to create Redis client:", error.message);
    isRedisEnabled = false;
    redisClient = null;
    return null;
  }
};

// Safe connection - NEVER THROWS
export const connectToRedis = async (): Promise<boolean> => {
  if (!isRedisEnabled) {
    console.log("⚠️ Redis is disabled - skipping connection");
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    isRedisEnabled = false;
    return false;
  }

  try {
    if (!client.isOpen) {
      await client.connect();
    }

    // Test connection with timeout
    const pingPromise = client.ping();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis ping timeout")), 3000),
    );

    const pingResult = await Promise.race([pingPromise, timeoutPromise]);

    if (pingResult === "PONG") {
      console.log("✅ Redis connected successfully");
      isRedisEnabled = true;
      return true;
    } else {
      throw new Error("Invalid ping response");
    }
  } catch (error: any) {
    console.error(
      "⚠️ Redis connection failed (continuing without Redis):",
      error.message,
    );
    isRedisEnabled = false;
    redisClient = null;
    return false;
  }
};

// Safe Redis helpers - NEVER THROW, always return null/default on failure
export const redisHelpers = {
  get: async (key: string): Promise<string | null> => {
    if (!isRedisEnabled) return null;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return null;
      return await client.get(key);
    } catch (error: any) {
      console.debug("Redis get error (non-fatal):", error.message);
      return null;
    }
  },

  set: async (
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<boolean> => {
    if (!isRedisEnabled) return false;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return false;

      if (expireSeconds) {
        await client.setEx(key, expireSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error: any) {
      console.debug("Redis set error (non-fatal):", error.message);
      return false;
    }
  },

  incr: async (key: string): Promise<number> => {
    if (!isRedisEnabled) return 0;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return 0;
      return await client.incr(key);
    } catch (error: any) {
      console.debug("Redis incr error (non-fatal):", error.message);
      return 0;
    }
  },

  incrBy: async (key: string, increment: number): Promise<number> => {
    if (!isRedisEnabled) return 0;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return 0;
      return await client.incrBy(key, increment);
    } catch (error: any) {
      console.debug("Redis incrBy error (non-fatal):", error.message);
      return 0;
    }
  },

  rpop: async (key: string): Promise<string | null> => {
    if (!isRedisEnabled) return null;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return null;
      return await client.rPop(key);
    } catch (error: any) {
      console.debug("Redis rpop error (non-fatal):", error.message);
      return null;
    }
  },

  lpush: async (key: string, value: string): Promise<number> => {
    if (!isRedisEnabled) return 0;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return 0;
      return await client.lPush(key, value);
    } catch (error: any) {
      console.debug("Redis lpush error (non-fatal):", error.message);
      return 0;
    }
  },

  del: async (...keys: string[]): Promise<number> => {
    if (!isRedisEnabled) return 0;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return 0;
      return await client.del(keys);
    } catch (error: any) {
      console.debug("Redis del error (non-fatal):", error.message);
      return 0;
    }
  },
  llen: async (key: string): Promise<number> => {
    if (!isRedisEnabled) return 0;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return 0;
      return await client.lLen(key);
    } catch (error: any) {
      console.debug("Redis del error (non-fatal):", error.message);
      return 0;
    }
  },

  expire: async (key: string, seconds: number): Promise<boolean> => {
    if (!isRedisEnabled) return false;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return false;

      return await client.expire(key, seconds);
    } catch (error: any) {
      console.debug("Redis set error (non-fatal):", error.message);
      return false;
    }
  },

  keys: async (pattern: string): Promise<string[]> => {
    if (!isRedisEnabled) return [];

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return [];
      return await client.keys(pattern);
    } catch (error: any) {
      console.debug("Redis rpop error (non-fatal):", error.message);
      return [];
    }
  },

  setex: async (
    key: string,
    seconds: number,
    value: string,
  ): Promise<string | null> => {
    if (!isRedisEnabled) return null;

    try {
      const client = getRedisClient();
      if (!client?.isOpen) return null;
      return await client.setEx(key, seconds, value);
    } catch (error: any) {
      console.debug("Redis rpop error (non-fatal):", error.message);
      return null;
    }
  },
  // BullMQ connection config - returns null if Redis disabled
  getBullMQConnection: () => {
    if (!isRedisEnabled) return null;

    const config = getRedisConfig();
    if (!config) return null;

    return {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      tls: config.tls,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  },
};

export const disconnectFromRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log("🔌 Redis disconnected");
    isRedisEnabled = false;
  }
};
