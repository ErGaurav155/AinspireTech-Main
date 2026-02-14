// apps/api/src/index.ts
import { loadEnvironment } from "./config/env.config";
loadEnvironment();

import app from "@/app";
import { connectToDatabase } from "@/config/database.config";
import {
  connectToRedis,
  disconnectFromRedis,
  redisHelpers,
} from "./config/redis.config";

const PORT = parseInt(process.env.PORT || "3002");

// For Vercel serverless
export default app;

// For local development
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  async function startServer() {
    try {
      // Connect to database (critical - should crash if fails)
      await connectToDatabase();
      console.log("✅ Database connected");

      // Try Redis but DON'T CRASH if it fails
      const redisConnected = await connectToRedis();

      if (!redisConnected) {
        console.log(
          "⚠️ Running without Redis - rate limiting will use database fallback",
        );
      }

      // Only start webhook workers if Redis is working
      if (redisConnected) {
        try {
          const { createWebhookWorkers } =
            await import("./workers/webhook.worker");
          const workerCount = parseInt(process.env.WEBHOOK_WORKERS || "5");

          // Check if BullMQ connection is available
          const bullMQConnection = redisHelpers.getBullMQConnection();
          if (bullMQConnection) {
            const workers = createWebhookWorkers(workerCount);
            console.log(`👷 Started ${workers.length} webhook workers`);
          } else {
            console.log(
              "⚠️ BullMQ connection not available - using simple queue fallback",
            );
          }
        } catch (workerError: any) {
          console.error(
            "⚠️ Failed to start webhook workers:",
            workerError.message,
          );
          console.log("⚠️ Continuing without queue system");
        }
      } else {
        console.log("⚠️ Redis not available - running without queue system");
      }

      // Start server
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(
          `📊 Redis: ${redisConnected ? "✅ Connected" : "❌ Disabled"}`,
        );
        console.log(
          `📊 App hourly limit: ${process.env.APP_HOURLY_GLOBAL_LIMIT || "1000"}`,
        );
      });

      // Start background tasks ONLY if Redis is available
      if (redisConnected) {
        // Queue processor (every 30 seconds)
        setInterval(async () => {
          try {
            const { processQueuedCalls } =
              await import("./services/rate-limit.service");
            const result = await processQueuedCalls();
            if (result.processed > 0) {
              console.log(`🔄 Processed ${result.processed} queued calls`);
            }
          } catch (error: any) {
            console.error("Queue processor error (non-fatal):", error.message);
          }
        }, 30000);

        // Hourly window reset
        setInterval(async () => {
          try {
            const now = new Date();
            if (now.getUTCMinutes() === 0 && now.getUTCSeconds() < 10) {
              const { resetHourlyWindow } =
                await import("./services/rate-limit.service");
              console.log("🕐 Hourly window reset triggered");
              const result = await resetHourlyWindow();
              console.log(`✅ Window reset: ${result.message}`);
            }
          } catch (error: any) {
            console.error("Window reset error (non-fatal):", error.message);
          }
        }, 10000);

        // Periodic stats logging
        setInterval(
          async () => {
            try {
              const { getCurrentWindow, isAppLimitReached } =
                await import("./services/rate-limit.service");
              const window = getCurrentWindow();
              const appLimit = await isAppLimitReached();

              console.log(
                `📈 Stats - Window: ${window.label}, App calls: ${appLimit.current}/${appLimit.limit} (${appLimit.percentage.toFixed(1)}%)`,
              );
            } catch (error: any) {
              console.error("Stats logging error:", error.message);
            }
          },
          15 * 60 * 1000,
        );
      } else {
        console.log("⚠️ Redis disabled - background tasks skipped");
      }

      // Graceful shutdown
      const shutdown = async () => {
        console.log("\n🛑 Shutting down server...");

        await disconnectFromRedis();

        server.close(() => {
          console.log("✅ Server closed");
          process.exit(0);
        });
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    } catch (error: any) {
      console.error("❌ Failed to start server:", error);
      // Don't crash on Redis errors, but do crash on DB errors
      if (
        error.message?.includes("database") ||
        error.message?.includes("Mongo")
      ) {
        process.exit(1);
      }
      console.log("⚠️ Continuing despite non-critical error");
    }
  }

  startServer();
}
