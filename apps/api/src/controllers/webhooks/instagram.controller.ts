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

      // Use JSON.stringify of the request body
      const rawBody = JSON.stringify(req.body);

      // Generate expected signature
      const hmac = crypto.createHmac("sha256", appSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest("hex");

      // Extract received signature (Instagram sends as "sha256=xxxxx")
      const receivedSignature = signature.split("=")[1] || signature;

      console.log("Signature verification:", {
        received: receivedSignature.substring(0, 20) + "...",
        expected: expectedSignature.substring(0, 20) + "...",
        match: receivedSignature === expectedSignature,
      });

      // Compare signatures
      if (receivedSignature !== expectedSignature) {
        console.error("❌ Invalid signature - verification failed");
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
          timestamp: new Date().toISOString(),
        });
      }

      console.log("✅ Signature verified successfully");
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
      return res.status(200).json({
        success: false,
        error: "Webhook received but processing error",
        timestamp: new Date().toISOString(),
      });
    }
  }
};
