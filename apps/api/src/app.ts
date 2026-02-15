// app.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { clerkMiddleware } from "@clerk/express";

// Load environment first
import { isProduction } from "./config/env.config";

import { checkDatabaseHealth } from "@/config/database.config";

import routes from "@/routes";

const app = express();

// ========== CLERK VERIFICATION ==========
console.log("🔐 Clerk initialization...");
console.log(
  "Clerk Secret Key:",
  process.env.CLERK_SECRET_KEY ? "✅ Set" : "❌ Missing",
);
console.log(
  "Clerk Publishable Key:",
  process.env.CLERK_PUBLISHABLE_KEY ? "✅ Set" : "❌ Missing",
);

/* ========== MIDDLEWARE ========== */

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction() ? 100 : 1000,
  message: {
    error: "Too many requests",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  skip: (req) => req.path === "/health" || req.path === "/",
});
app.use("/api", limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "https://app.rocketreplai.com",
  "https://www.rocketreplai.com",
  "https://*.clerk.accounts.dev",
];
console.log("🔧 Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cookie",
    ],
  }),
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ========== CLERK MIDDLEWARE ==========
app.use(
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
);

/* ========== ROUTES ========== */
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No content
});

// Root endpoint - Public
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Instagram Automation API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    features: {
      tierBasedRateLimiting: true,
      freeUsers: "100 calls/hour, direct link, no follow checks",
      proUsers: "2000 calls/hour, follow verification flow",
      dmAutomation: true,
      followVerification: true,
      queueSystem: true,
      webhookWorkers: true,
    },
    endpoints: {
      health: "/health",
      api: "/api",
      webhooks: "/api/webhooks",
      rateLimit: "/api/rate-limit",
    },
  });
});

// Health check - Public (Railway uses this)
app.get("/health", async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    // Don't fail health check if Redis is down
    let redisHealth = false;
    let rateLimitInfo: any = {
      currentWindow: "N/A",
      appCalls: 0,
      appLimit: 0,
      percentage: "0",
    };

    try {
      const { getCurrentWindow, isAppLimitReached } =
        await import("@/services/rate-limit.service");
      const window = getCurrentWindow();
      const appLimit = await isAppLimitReached();

      rateLimitInfo = {
        currentWindow: window.label,
        appCalls: appLimit.current,
        appLimit: appLimit.limit,
        percentage: appLimit.percentage.toFixed(1),
      };
      redisHealth = true;
    } catch (error) {
      console.warn("Rate limit check failed in health endpoint (non-fatal)");
    }

    const health = {
      status: dbHealth ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealth,
        redis: redisHealth,
        clerk: !!process.env.CLERK_SECRET_KEY,
      },
      rateLimits: rateLimitInfo,
    };

    // Return 200 if database is healthy (Railway needs this)
    res.status(dbHealth ? 200 : 503).json(health);
  } catch (error: any) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use("/api", routes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Error:", err.message);

    // Handle Clerk authentication errors
    if (
      err.status === 401 ||
      err.message?.toLowerCase().includes("unauthorized")
    ) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    const statusCode = err.statusCode || 500;
    const message = isProduction() ? "Internal server error" : err.message;

    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(isProduction() ? {} : { stack: err.stack }),
    });
  },
);

export default app;
