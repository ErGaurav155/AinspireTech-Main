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

// For local development and Railway
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

      // Start server - MUST happen before background tasks
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(
          `📊 Redis: ${redisConnected ? "✅ Connected" : "❌ Disabled"}`,
        );
        console.log(
          `📊 App hourly limit: ${process.env.APP_HOURLY_GLOBAL_LIMIT || "20000"}`,
        );
        console.log("✅ Server is ready to accept connections");
      });

      // Handle server errors
      server.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          console.error(`❌ Port ${PORT} is already in use`);
          process.exit(1);
        } else {
          console.error("❌ Server error:", error);
          process.exit(1);
        }
      });

      // Background tasks ONLY if Redis is available
      if (redisConnected) {
        // Track if there's been any activity
        let hasRecentActivity = false;
        let lastActivityCheck = Date.now();

        // Queue processor - ONLY runs if there's activity
        const queueProcessor = setInterval(async () => {
          try {
            const { processQueuedCalls, getCurrentWindow } =
              await import("./services/rate-limit.service");

            // Check if there are items in queue
            const window = getCurrentWindow();
            const queueKey = `queue:pending:${window.key}`;
            const queueLength = await redisHelpers.llen(queueKey);

            if (queueLength && queueLength > 0) {
              hasRecentActivity = true;
              lastActivityCheck = Date.now();

              console.log(`🔄 Processing ${queueLength} queued webhooks...`);
              const result = await processQueuedCalls();

              if (result.processed > 0) {
                console.log(
                  `✅ Processed ${result.processed} webhooks, ${result.remaining} remaining`,
                );
              }
            }
          } catch (error: any) {
            console.error("Queue processor error (non-fatal):", error.message);
          }
        }, 30000); // Every 30 seconds

        // Hourly window reset - PRECISE timing
        const windowResetter = setInterval(async () => {
          try {
            const now = new Date();
            // Only trigger at the top of the hour (00:00-00:10 seconds)
            if (now.getUTCMinutes() === 0 && now.getUTCSeconds() < 10) {
              const { resetHourlyWindow } =
                await import("./services/rate-limit.service");
              console.log("🕐 Hourly window reset triggered");
              const result = await resetHourlyWindow();
              console.log(`✅ Window reset: ${result.message}`);

              // Reset activity tracking
              hasRecentActivity = false;
              lastActivityCheck = Date.now();
            }
          } catch (error: any) {
            console.error("Window reset error (non-fatal):", error.message);
          }
        }, 10000); // Check every 10 seconds

        // Periodic stats logging - ONLY if there's been recent activity
        const statsLogger = setInterval(
          async () => {
            try {
              // Only log stats if there's been activity in the last 15 minutes
              const timeSinceLastActivity = Date.now() - lastActivityCheck;
              if (timeSinceLastActivity > 15 * 60 * 1000) {
                // No activity for 15 minutes, skip logging
                return;
              }

              const { getCurrentWindow, isAppLimitReached } =
                await import("./services/rate-limit.service");
              const window = getCurrentWindow();
              const appLimit = await isAppLimitReached();

              console.log(
                `📈 Stats - Window: ${window.label}, App calls: ${appLimit.current}/${appLimit.limit} (${appLimit.percentage.toFixed(1)}%)`,
              );
            } catch (error: any) {
              console.error("Stats logging error (non-fatal):", error.message);
            }
          },
          15 * 60 * 1000, // Every 15 minutes
        );

        console.log("✅ Background tasks started");

        // Store interval IDs for cleanup
        server.on("close", () => {
          clearInterval(queueProcessor);
          clearInterval(windowResetter);
          clearInterval(statsLogger);
          console.log("✅ Background tasks stopped");
        });
      } else {
        console.log("⚠️ Redis disabled - background tasks skipped");
      }

      // Graceful shutdown
      const shutdown = async (signal: string) => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

        // Stop accepting new connections
        server.close(async () => {
          console.log("✅ Server closed");

          // Disconnect from Redis
          await disconnectFromRedis();

          console.log("✅ Shutdown complete");
          process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error("⚠️ Forced shutdown after timeout");
          process.exit(1);
        }, 10000);
      };

      // Handle shutdown signals
      process.on("SIGINT", () => shutdown("SIGINT"));
      process.on("SIGTERM", () => shutdown("SIGTERM"));

      // Handle uncaught errors (but don't crash)
      process.on("uncaughtException", (error) => {
        console.error("❌ Uncaught Exception:", error);
        // Don't exit - Railway needs the server to stay up
      });

      process.on("unhandledRejection", (reason, promise) => {
        console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
        // Don't exit - Railway needs the server to stay up
      });

      console.log("✅ Server initialization complete");
    } catch (error: any) {
      console.error("❌ Failed to start server:", error);

      // Only crash on critical errors
      if (
        error.message?.includes("database") ||
        error.message?.includes("Mongo") ||
        error.message?.includes("EADDRINUSE")
      ) {
        console.error("💥 Critical error - exiting");
        process.exit(1);
      }

      // For non-critical errors, log but continue
      console.log("⚠️ Continuing despite non-critical error");
    }
  }

  startServer();
}
