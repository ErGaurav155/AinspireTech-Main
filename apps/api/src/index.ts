import { loadEnvironment } from "./config/env.config";
loadEnvironment();

import app from "@/app";

const PORT = parseInt(process.env.PORT || "3002", 10);

async function startServer() {
  console.log("🚀 Starting server initialization...");

  // IMPORTANT: Start HTTP server immediately for Railway
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("✅ HTTP Server is listening");
    console.log(`🌍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("✅ Ready to accept connections");
  });

  // Handle server errors
  server.on("error", (error: any) => {
    console.error("❌ Server error:", error.message);
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
  });

  // Connect services AFTER server is up (non-blocking)
  connectServices();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down...`);

    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("⚠️ Forced shutdown");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error.message);
  });

  process.on("unhandledRejection", (reason: any) => {
    console.error("❌ Unhandled Rejection:", reason?.message || reason);
  });
}

async function connectServices() {
  console.log("🔌 Connecting to services...");

  // DATABASE
  try {
    const { connectToDatabase } = await import("@/config/database.config.js");
    await connectToDatabase();
    console.log("✅ Database connected");
  } catch (dbError: any) {
    console.error("❌ Database connection failed:", dbError.message);
    console.error("⚠️ Continuing without database");
  }

  // REDIS (Optional)
  try {
    const { connectToRedis, redisHelpers } =
      await import("./config/redis.config.js");

    const redisConnected = await connectToRedis();

    if (redisConnected) {
      console.log("✅ Redis connected");

      // Start webhook workers
      try {
        const { createWebhookWorkers } =
          await import("./workers/webhook.worker.js");

        const workerCount = parseInt(process.env.WEBHOOK_WORKERS || "5", 10);

        const bullMQConnection = redisHelpers.getBullMQConnection();

        if (bullMQConnection) {
          const workers = createWebhookWorkers(workerCount);
          console.log(`👷 Started ${workers.length} webhook workers`);
        }
      } catch (workerError: any) {
        console.error("⚠️ Failed to start workers:", workerError.message);
      }

      // Start ONLY stats logging - hourly reset handled by Railway cron
      startStatsLogging();
    } else {
      console.log("⚠️ Redis not available - continuing without it");
    }
  } catch (redisError: any) {
    console.error("⚠️ Redis connection failed:", redisError.message);
    console.log("⚠️ Continuing without Redis");
  }

  console.log("✅ Service initialization complete");
}

// Only stats logging - no hourly reset or queue processing
function startStatsLogging() {
  console.log("📊 Starting stats logging...");

  // Stats logging - runs every 15 minutes
  setInterval(
    async () => {
      try {
        const { getCurrentWindow, isAppLimitReached } =
          await import("./services/rate-limit.service.js");

        const window = getCurrentWindow();
        const appLimit = await isAppLimitReached();

        console.log(
          `📈 Stats - Window: ${window.label}, Calls: ${appLimit.current}/${appLimit.limit} (${appLimit.percentage.toFixed(
            1,
          )}%)`,
        );
      } catch (error: any) {
        console.debug("Stats logging error (non-fatal):", error.message);
      }
    },
    15 * 60 * 1000,
  );

  console.log("✅ Stats logging started");
}

// Start server
startServer().catch((error) => {
  console.error("❌ Fatal startup error:", error);
  process.exit(1);
});
