// middleware/embed-cors.middleware.ts
import { Request, Response, NextFunction } from "express";

export const embedCors = (req: Request, res: Response, next: NextFunction) => {
  // Allow all origins for embed routes
  const origin = req.headers.origin || "";

  // SKIP CORS entirely for cron routes (they use secret header, not browser)
  if (req.path.startsWith("/api/cron/")) {
    return next();
  }

  // For embed routes, allow all origins with proper headers
  res.setHeader("Access-Control-Allow-Origin", "*");

  // CRITICAL: Always include x-api-key in allowed headers
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, Origin, Accept",
  );

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle OPTIONS (preflight) - This is CRITICAL
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};
