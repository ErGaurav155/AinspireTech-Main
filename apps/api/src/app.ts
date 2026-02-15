import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { clerkMiddleware } from "@clerk/express";

import { isProduction } from "./config/env.config";
import routes from "@/routes";

const app = express();

/* ============================================================
   ENV VALIDATION
============================================================ */

console.log("🔐 Clerk initialization...");
console.log(
  "Clerk Secret Key:",
  process.env.CLERK_SECRET_KEY ? "✅ Set" : "❌ Missing",
);
console.log(
  "Clerk Publishable Key:",
  process.env.CLERK_PUBLISHABLE_KEY ? "✅ Set" : "❌ Missing",
);

/* ============================================================
   SECURITY MIDDLEWARE
============================================================ */

// Secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ============================================================
   RATE LIMITING
============================================================ */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction() ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/",
  message: {
    success: false,
    error: "Too many requests",
    timestamp: new Date().toISOString(),
  },
});

app.use("/api", limiter);

/* ============================================================
   CORS CONFIGURATION (Railway Production Ready)
============================================================ */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

console.log("🔧 Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("⛔ Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
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

/* ============================================================
   CLERK AUTHENTICATION
============================================================ */

app.use(
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
);

/* ============================================================
   ROUTES
============================================================ */

// Favicon
app.get("/favicon.ico", (_, res) => {
  res.status(204).end();
});

// Root
app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "Instagram Automation API",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Railway Health Check (FAST — DO NOT TOUCH)
app.get("/health", (_, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
app.get("/health/detailed", async (_, res) => {
  try {
    const { checkDatabaseHealth } = await import("@/config/database.config");

    const dbHealth = await checkDatabaseHealth();

    let redisHealth = false;
    let rateLimitInfo: any = {
      currentWindow: "N/A",
      appCalls: 0,
      appLimit: 0,
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
    } catch {
      console.debug("Rate limit check skipped");
    }

    const health = {
      status: dbHealth ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
        clerk: !!process.env.CLERK_SECRET_KEY,
      },
      rateLimits: rateLimitInfo,
    };

    res.status(dbHealth ? 200 : 503).json(health);
  } catch (error: any) {
    console.error("Detailed health check error:", error.message);
    res.status(503).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use("/api", routes);

/* ============================================================
   404 HANDLER
============================================================ */

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("❌ Error:", err.message);

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
