// apps/api/app.ts
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

// ✅ CRITICAL FIX: Enable trust proxy for Railway/Cloudflare
// This allows express-rate-limit to correctly read X-Forwarded-For headers
app.set("trust proxy", 1); // Trust first proxy (Railway/Cloudflare)

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
   ALLOWED ORIGINS CONFIGURATION
============================================================ */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

console.log("🔧 Allowed origins:", allowedOrigins);

/* ============================================================
   GLOBAL ORIGIN CHECK MIDDLEWARE (for ALL routes)
   EXCEPT embed and cron routes which handle their own auth
============================================================ */

// This middleware runs BEFORE any route handlers
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // ✅ IMPORTANT: Skip origin check for server-to-server routes.
  // These routes handle their own authentication via API keys, cron secrets,
  // or provider webhook signatures.
  if (
    req.path.startsWith("/api/embed/") ||
    req.path.startsWith("/api/cron/") ||
    req.path.startsWith("/api/webhooks/") ||
    req.path.startsWith("/api/razorpay/checkout-callback")
  ) {
    return next();
  }

  // Skip origin check for health check endpoints (these are internal)
  if (req.path === "/health" || req.path === "/health/detailed") {
    return next();
  }

  // Skip origin check if no origin (server-to-server requests)
  if (!origin) {
    return next();
  }

  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    return next();
  }

  // Block the request with 403 Forbidden
  console.warn(
    `⛔ Blocked request from unauthorized origin: ${origin} to ${req.method} ${req.path}`,
  );

  return res.status(403).json({
    success: false,
    message: "Forbidden: Origin not allowed",
    timestamp: new Date().toISOString(),
  });
});

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

app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      // Store raw body for signature verification
      (req as any).rawBody = buf.toString();
    },
  }),
);

app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ============================================================
   RATE LIMITING
============================================================ */

const RATE_LIMIT_WINDOW_MS = Number(
  process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const RATE_LIMIT_MAX = Number(
  process.env.RATE_LIMIT_MAX || (isProduction() ? 1000 : 1000),
);

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  skip: (req) => {
    // Skip rate limiting for health checks, embed, and cron routes
    return (
      req.path === "/health" ||
      req.path === "/" ||
      req.path.startsWith("/api/embed/") ||
      req.path.startsWith("/api/cron/")
    );
  },
  // ✅ Fix: Add key generator that works with trust proxy
  keyGenerator: (req) => {
    // Use the IP from the request (trust proxy ensures correct IP)
    const ip =
      req.ip ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    return ip;
  },
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

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (server-to-server)
      if (!origin) return callback(null, true);

      // ✅ Allow embed and cron routes from any origin
      // They have their own authentication via API keys
      const url = (origin as string) || "";
      const isEmbedOrCron =
        url.includes("/api/embed/") || url.includes("/api/cron/");

      // Always allow embed and cron routes through CORS
      // Their security is handled by API key validation
      if (isEmbedOrCron) {
        return callback(null, true);
      }

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
      "x-cron-key",
      "x-api-key",
      "x-cron-secret",
    ],
    optionsSuccessStatus: 200,
    preflightContinue: false,
  }),
);

/* ============================================================
   CLERK AUTHENTICATION
   Skip for embed and cron routes
============================================================ */

// Custom middleware to skip Clerk for embed and cron routes
app.use((req, res, next) => {
  // Skip Clerk authentication for server-to-server routes.
  if (
    req.path.startsWith("/api/embed/") ||
    req.path.startsWith("/api/cron/") ||
    req.path.startsWith("/api/webhooks/") ||
    req.path.startsWith("/api/razorpay/checkout-callback")
  ) {
    return next();
  }

  // Skip for health checks
  if (req.path === "/health" || req.path === "/health/detailed") {
    return next();
  }

  // Apply Clerk for all other routes
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  })(req, res, next);
});

/* ============================================================
   ROUTES
============================================================ */

// Favicon
app.get("/favicon.ico", (_, res) => {
  res.status(204).end();
});

// Root route
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API Server Running",
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
    const { checkDatabaseHealth } = await import("@/config/database.config.js");

    const dbHealth = await checkDatabaseHealth();

    let redisHealth = false;
    let rateLimitInfo: any = {
      currentWindow: "N/A",
      appCalls: 0,
      appLimit: 0,
    };

    try {
      const { getCurrentWindow, isAppLimitReached } =
        await import("@/services/rate-limit.service.js");

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
  const origin = req.headers.origin;

  // Skip origin check for embed and cron routes
  if (req.path.startsWith("/api/embed/") || req.path.startsWith("/api/cron/")) {
    return res.status(404).json({
      success: false,
      error: "Not found",
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  // Check origin for 404 responses as well
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Origin not allowed",
      timestamp: new Date().toISOString(),
    });
  }

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
