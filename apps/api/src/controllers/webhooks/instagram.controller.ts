// controllers/webhooks/instagram.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { processInstagramWebhook } from "@/services/webhook/instagram-processor.service";

/**
 * GET /api/webhooks/instagram - Verify webhook
 */
export const verifyInstagramWebhookController = (
  req: Request,
  res: Response,
) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({
    success: false,
    error: "Verification failed",
    timestamp: new Date().toISOString(),
  });
};

/**
 * POST /api/webhooks/instagram - Handle Instagram webhooks
 */
export const handleInstagramWebhookController = async (
  req: Request,
  res: Response,
) => {
  const startTime = Date.now();

  try {
    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = req.headers["x-hub-signature-256"] as string;
      const appSecret = process.env.INSTAGRAM_APP_SECRET;

      // Check if signature exists
      if (!signature) {
        console.error("❌ Missing x-hub-signature-256 header");
        return res.status(401).json({
          success: false,
          error: "Missing signature",
          timestamp: new Date().toISOString(),
        });
      }

      // Check if app secret is configured
      if (!appSecret) {
        console.error("❌ INSTAGRAM_APP_SECRET not configured");
        return res.status(500).json({
          success: false,
          error: "Server configuration error",
          timestamp: new Date().toISOString(),
        });
      }

      // IMPORTANT: Use the raw body that was captured BEFORE JSON parsing
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        console.error(
          "❌ Raw body not captured. Ensure express.json verify middleware is configured.",
        );
        return res.status(500).json({
          success: false,
          error: "Raw body not available",
          timestamp: new Date().toISOString(),
        });
      }

      // Generate expected signature
      const hmac = crypto.createHmac("sha256", appSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest("hex");

      // Extract received signature (Instagram sends as "sha256=xxxxx")
      const receivedSignature = signature.startsWith("sha256=")
        ? signature.substring(7)
        : signature;

      // Compare signatures using timing-safe comparison
      if (
        !crypto.timingSafeEqual(
          Buffer.from(receivedSignature, "hex"),
          Buffer.from(expectedSignature, "hex"),
        )
      ) {
        console.error("❌ Invalid signature - verification failed");
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
          timestamp: new Date().toISOString(),
        });
      }
    }

    const payload = req.body;
    const webhookId = `insta_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Basic validation
    if (
      !payload.object ||
      payload.object !== "instagram" ||
      !payload.entry?.length
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload",
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ IMMEDIATE RESPONSE (within 1 second)
    const responseTime = Date.now() - startTime;
    res.status(200).json({
      success: true,
      message: "Webhook received",
      webhookId,
      receivedAt: new Date().toISOString(),
      responseTime,
    });

    // ✅ PROCESS ASYNCHRONOUSLY
    setImmediate(async () => {
      try {
        const result = await processInstagramWebhook(payload);

        if (result.errors.length > 0) {
          console.error(`⚠️ Webhook ${webhookId} errors:`, result.errors);
        }
      } catch (error) {
        console.error(`❌ Webhook ${webhookId} processing error:`, error);
      }
    });
  } catch (error) {
    console.error("❌ Webhook handler error:", error);

    // Always respond with 200 to Instagram to prevent retries
    if (!res.headersSent) {
      return res.status(200).json({
        success: false,
        error: "Webhook received but processing error",
        timestamp: new Date().toISOString(),
      });
    }
  }
};
