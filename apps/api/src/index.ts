import { loadEnvironment } from "./config/env.config";

import app from "@/app";
import { connectToDatabase } from "@/config/database.config";
import {
  getCurrentWindow,
  isAppLimitReached,
  processQueuedCalls,
  resetHourlyWindow,
} from "./services/rate-limit.service";
import { connectToRedis, disconnectFromRedis } from "./config/redis.config";
import { createWebhookWorkers } from "./workers/webhook.worker";

const PORT = parseInt(process.env.PORT || "3002");

// For Vercel serverless
export default app;

// For local development
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  loadEnvironment();

  // Start server
  async function startServer() {
    try {
      // Connect to database
      await connectToDatabase();
      console.log("✅ Database connected");
      // await connectToRedis();
      // Start webhook workers (only if Redis is working)
      // if (process.env.REDIS_URL) {
      //   try {
      //     const workerCount = parseInt(process.env.WEBHOOK_WORKERS || "5");
      //     const workers = createWebhookWorkers(workerCount);
      //     console.log(`👷 Started ${workers.length} webhook workers`);
      //   } catch (workerError) {
      //     console.error("⚠️ Failed to start webhook workers:", workerError);
      //     console.log("⚠️ Running without queue system");
      //   }
      // } else {
      //   console.log("⚠️ REDIS_URL not set, running without queue system");
      // }

      // Start server
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(
          `📊 App hourly limit: ${process.env.APP_HOURLY_GLOBAL_LIMIT}`,
        );
        console.log("🎯 Features enabled:");
        console.log("  • Free tier: 100 calls/hour, direct links");
        console.log("  • Pro tier: Unlimited, follow verification");
        console.log("  • DM automation with follow checks");
        console.log("  • Rate limiting with queue system");

        // Start queue processor (every 30 seconds)
        // setInterval(async () => {
        //   try {
        //     const result = await processQueuedCalls();
        //     if (result.processed > 0) {
        //       console.log(`🔄 Processed ${result.processed} queued calls`);
        //     }
        //   } catch (error) {
        //     console.error("Queue processor error:", error);
        //   }
        // }, 30000);

        // Start hourly window reset (check every minute)
        // setInterval(async () => {
        //   try {
        //     const now = new Date();
        //     if (now.getUTCMinutes() === 0 && now.getUTCSeconds() < 10) {
        //       console.log("🕐 Hourly window reset triggered");
        //       const result = await resetHourlyWindow();
        //       console.log(`✅ Window reset: ${result.message}`);
        //     }
        //   } catch (error) {
        //     console.error("Window reset error:", error);
        //   }
        // }, 10000); // Check every 10 seconds

        // Start periodic stats logging (every 15 minutes)
        // setInterval(
        //   async () => {
        //     try {
        //       const window = getCurrentWindow();
        //       const appLimit = await isAppLimitReached();

        //       console.log(
        //         `📈 Stats - Window: ${window.label}, App calls: ${appLimit.current}/${appLimit.limit} (${appLimit.percentage.toFixed(1)}%)`,
        //       );
        //     } catch (error) {
        //       console.error("Stats logging error:", error);
        //     }
        //   },
        //   15 * 60 * 1000,
        // );
      });

      // Graceful shutdown
      const shutdown = async () => {
        console.log("\n🛑 Shutting down server...");

        // Close all workers
        await disconnectFromRedis();

        server.close(() => {
          console.log("✅ Server closed");
          process.exit(0);
        });
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  startServer();
}
