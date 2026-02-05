import { createClient, RedisClientType } from "redis";
import { loadEnvironment } from "./env.config";
loadEnvironment();

let redisClient: RedisClientType | null = null;
let isConnected = false;

export const getRedisClient = (): RedisClientType => {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.error("❌ REDIS_URL is not set in environment variables");
    console.error("Please add REDIS_URL to your .env.local file");
    throw new Error("REDIS_URL environment variable is required");
  }

  console.log(
    `🔌 Creating Redis client for: ${redisUrl.split("@")[1] || redisUrl}`,
  );

  redisClient = createClient({
    url: redisUrl,
    socket: {
      tls: redisUrl.startsWith("rediss://"), // Enable TLS for Upstash
      rejectUnauthorized: false,
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          console.error("Max Redis reconnection attempts reached");
          return false;
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on("error", (err) => {
    console.error("❌ Redis client error:", err.message);
    isConnected = false;
  });

  redisClient.on("connect", () => {
    console.log("🔌 Redis connecting...");
  });

  redisClient.on("ready", () => {
    console.log("✅ Redis connected and ready");
    isConnected = true;
  });

  redisClient.on("end", () => {
    console.log("🔌 Redis connection closed");
    isConnected = false;
  });

  redisClient.on("reconnecting", () => {
    console.log("🔄 Redis reconnecting...");
  });

  return redisClient;
};

export const connectToRedis = async (): Promise<void> => {
  try {
    const client = getRedisClient();

    if (!client.isOpen) {
      await client.connect();
      console.log("✅ Redis connection established");
    }

    // Test connection
    const pingResult = await client.ping();
    console.log(`✅ Redis ping: ${pingResult}`);
  } catch (error: any) {
    console.error("❌ Failed to connect to Redis:", error.message);
    throw error;
  }
};

// BullMQ connection configuration - returns proper connection object
export const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is required for BullMQ");
  }

  // Parse the URL for BullMQ
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null, // Important for BullMQ
    enableReadyCheck: false,
  };
};

// Helper functions for rate-limit service
export const redisHelpers = {
  get: async (key: string): Promise<string | null> => {
    const client = getRedisClient();
    return client.get(key);
  },

  set: async (
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<string | null> => {
    const client = getRedisClient();
    if (expireSeconds) {
      return client.setEx(key, expireSeconds, value);
    }
    return client.set(key, value);
  },

  incr: async (key: string): Promise<number> => {
    const client = getRedisClient();
    return client.incr(key);
  },

  incrBy: async (key: string, increment: number): Promise<number> => {
    const client = getRedisClient();
    return client.incrBy(key, increment);
  },

  rpop: async (key: string): Promise<string | null> => {
    const client = getRedisClient();
    return client.rPop(key);
  },

  lpush: async (key: string, value: string): Promise<number> => {
    const client = getRedisClient();
    return client.lPush(key, value);
  },

  llen: async (key: string): Promise<number> => {
    const client = getRedisClient();
    return client.lLen(key);
  },

  expire: async (key: string, seconds: number): Promise<boolean> => {
    const client = getRedisClient();
    return client.expire(key, seconds);
  },

  del: async (...keys: string[]): Promise<number> => {
    const client = getRedisClient();
    return client.del(keys);
  },

  keys: async (pattern: string): Promise<string[]> => {
    const client = getRedisClient();
    return client.keys(pattern);
  },

  setex: async (
    key: string,
    seconds: number,
    value: string,
  ): Promise<string> => {
    const client = getRedisClient();
    return client.setEx(key, seconds, value);
  },
};

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
};

export const disconnectFromRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log("🔌 Redis disconnected");
    isConnected = false;
  }
};
