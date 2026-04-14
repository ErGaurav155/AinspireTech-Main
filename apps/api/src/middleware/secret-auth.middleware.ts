// apps/api/middleware/secret-auth.middleware.ts
import { Request, Response, NextFunction } from "express";

export enum SecretType {
  API_KEY = "api-key",
  CRON_SECRET = "cron-secret",
  INTERNAL = "internal",
}

interface SecretAuthOptions {
  type: SecretType;
  allowOriginCheck?: boolean;
  allowedOrigins?: string[];
}

/**
 * Middleware to validate secret headers for protected routes
 * Use this for embed routes and cron jobs that need to be called from anywhere
 */
export const secretAuth = (options: SecretAuthOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { type, allowOriginCheck = false, allowedOrigins = [] } = options;

    // Skip if it's an OPTIONS request (CORS preflight)
    if (req.method === "OPTIONS") {
      return next();
    }

    let secretHeader: string | undefined;
    let expectedSecret: string | undefined;
    let headerName: string;

    // Determine which header and secret to check based on type
    switch (type) {
      case SecretType.API_KEY:
        headerName = "x-api-key";
        secretHeader = req.headers[headerName] as string;
        expectedSecret = process.env.API_KEY;
        break;
      case SecretType.CRON_SECRET:
        headerName = "x-cron-secret";
        secretHeader =
          (req.headers["x-cron-secret"] as string) ||
          (req.headers["x-cron-key"] as string); // Support both headers
        expectedSecret = process.env.CRON_SECRET;
        break;
      case SecretType.INTERNAL:
        headerName = "x-internal-secret";
        secretHeader = req.headers[headerName] as string;
        expectedSecret = process.env.INTERNAL_SECRET || process.env.API_KEY;
        break;
      default:
        headerName = "x-api-key";
        secretHeader = req.headers[headerName] as string;
        expectedSecret = process.env.API_KEY;
    }

    // Check if expected secret is configured
    if (!expectedSecret) {
      console.error(`❌ ${type.toUpperCase()} not configured in environment`);
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate the secret
    if (!secretHeader || secretHeader !== expectedSecret) {
      console.warn(`⛔ Unauthorized ${type} access attempt from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid secret",
        timestamp: new Date().toISOString(),
      });
    }

    // Optional: Check origin if specified (for additional security)
    if (allowOriginCheck) {
      const origin = req.headers.origin;

      // If origin is present and we have allowed origins, check it
      if (origin && allowedOrigins.length > 0) {
        if (!allowedOrigins.includes(origin)) {
          console.warn(
            `⛔ Blocked ${type} request from unauthorized origin: ${origin}`,
          );
          return res.status(403).json({
            success: false,
            error: "Forbidden: Origin not allowed",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Secret is valid, proceed
    next();
  };
};

/**
 * Middleware specifically for embed routes
 * Allows calls from anywhere but requires valid API key
 */
export const embedAuth = () => {
  return secretAuth({
    type: SecretType.API_KEY,
    allowOriginCheck: false, // Embed routes should be callable from anywhere
  });
};

/**
 * Middleware specifically for cron routes
 * Allows calls only with valid cron secret
 * Can optionally restrict to specific origins (like Railway cron service)
 */
export const cronAuth = (allowedOrigins?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if it's an OPTIONS request
    if (req.method === "OPTIONS") {
      return next();
    }

    const cronSecret =
      (req.headers["x-cron-secret"] as string) ||
      (req.headers["x-cron-key"] as string);
    const expectedSecret = process.env.CRON_SECRET;

    // Check if expected secret is configured
    if (!expectedSecret) {
      console.error("❌ CRON_SECRET not configured in environment");
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate the secret
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.warn(`⛔ Unauthorized cron access attempt from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid cron secret",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if origin is allowed (if specified)
    if (allowedOrigins && allowedOrigins.length > 0) {
      const origin = req.headers.origin;
      const referer = req.headers.referer;

      // For server-to-server calls, there might be no origin
      // Check if the request comes from an allowed origin or has no origin (direct call)
      if (origin && !allowedOrigins.includes(origin)) {
        console.warn(
          `⛔ Blocked cron request from unauthorized origin: ${origin}`,
        );
        return res.status(403).json({
          success: false,
          error: "Forbidden: Origin not allowed",
          timestamp: new Date().toISOString(),
        });
      }

      // Additional check: Ensure the request is coming from Railway cron service
      // This is optional but adds extra security
      if (process.env.NODE_ENV === "production") {
        const userAgent = req.headers["user-agent"] || "";
        const isRailwayCron =
          userAgent.includes("Railway") ||
          userAgent.includes("node-fetch") ||
          referer?.includes("railway.app") ||
          !origin; // Direct server-to-server calls often have no origin

        if (!isRailwayCron) {
          console.warn(
            `⛔ Blocked cron request with suspicious user-agent: ${userAgent}`,
          );
          return res.status(403).json({
            success: false,
            error: "Forbidden: Invalid request source",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Secret is valid, proceed
    next();
  };
};
