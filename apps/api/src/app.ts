// app.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { clerkMiddleware } from "@clerk/express";

// Load environment first
import { loadEnvironment, isProduction } from "./config/env.config";
loadEnvironment();

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
  "https://rocketreplai.com", // Your marketing site
  "http://localhost:3000", // Marketing
  "http://localhost:3001", // Dashboard
  "http://localhost:3002", // API
  "https://*.clerk.accounts.dev", // Clerk domains
];

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
      "Cookie", // Add Cookie header
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
    // Make sure this matches your Clerk dashboard
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
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
      proUsers: "Unlimited calls, follow verification flow",
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

// Health check - Public
app.get("/health", async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  // Check Redis
  const redisHealth = req.redis?.status === "ready";

  // Check current window
  const { getCurrentWindow, isAppLimitReached } =
    await import("@/services/rate-limit.service");
  const window = getCurrentWindow();
  const appLimit = await isAppLimitReached();

  const health = {
    status: dbHealth && redisHealth ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbHealth,
      redis: redisHealth,
      clerk: !!process.env.CLERK_SECRET_KEY,
    },
    rateLimits: {
      currentWindow: window.label,
      appCalls: appLimit.current,
      appLimit: appLimit.limit,
      percentage: appLimit.percentage.toFixed(1),
    },
  };

  res.status(dbHealth && redisHealth ? 200 : 503).json(health);
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
