// apps/api/middleware/embed-cors.middleware.ts
import { Request, Response, NextFunction } from "express";

export const embedCors = (req: Request, res: Response, next: NextFunction) => {
  // Allow all origins for embed routes
  const origin = req.headers.origin || "*";

  // For embed routes, allow all origins with proper headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-cron-secret, x-cron-key, Origin, Accept",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};
