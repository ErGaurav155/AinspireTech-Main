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

  console.log("Webhook verification attempt:", { mode, token });

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.status(403).json({
    success: false,
    error: "Verification failed",
    timestamp: new Date().toISOString(),
  });
};

/**
 * POST /api/webhooks/instagram - Handle Instagram webhooks
 * INTELLIGENT QUEUEING:
 * - Respond to Instagram immediately (< 1 second)
 * - Process webhook asynchronously
 * - Queue if rate limited
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
      if (!signature || !process.env.INSTAGRAM_APP_SECRET) {
        console.log("Missing signature or INSTAGRAM_APP_SECRET");
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
          timestamp: new Date().toISOString(),
        });
      }

      const hmac = crypto.createHmac(
        "sha256",
        process.env.INSTAGRAM_APP_SECRET,
      );
      const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest("hex")}`;

      if (
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
      ) {
        console.log("Invalid signature");
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
          timestamp: new Date().toISOString(),
        });
      }
    }

    const payload = req.body;
    const webhookId = `insta_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    console.log(`📥 Webhook received: ${webhookId}`, {
      object: payload.object,
      entries: payload.entry?.length,
    });

    // Basic validation
    if (
      !payload.object ||
      payload.object !== "instagram" ||
      !payload.entry?.length
    ) {
      console.log("❌ Invalid webhook payload structure");
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
    // The processor will handle intelligent queueing internally
    setImmediate(async () => {
      try {
        const result = await processInstagramWebhook(payload);

        console.log(`✅ Webhook ${webhookId} processed:`, {
          processed: result.processed,
          queued: result.queued,
          errors: result.errors.length,
        });

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
      res.status(200).json({
        success: false,
        error: "Webhook received but processing error",
        timestamp: new Date().toISOString(),
      });
    }
  }
};
