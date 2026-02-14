// middleware/embed-cors.middleware.ts
import { Request, Response, NextFunction } from "express";

export const embedCors = (req: Request, res: Response, next: NextFunction) => {
  // Allow all origins for embed routes during development
  // In production, restrict to specific domains
  const origin = req.headers.origin || "";

  if (req.path === "/appointments") {
    // For appointment endpoint, allow localhost:3000 and your production domain
    const allowedOrigins = [
      "http://localhost:3000",
      "https://app.rocketreplai.com",
    ];

    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  } else {
    // For all other embed endpoints - allow all during development
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-user-id",
  );
  res.setHeader("Access-Control-Allow-Credentials", "false"); // Set to false for public endpoints
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle OPTIONS (preflight) - This is CRITICAL
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};
