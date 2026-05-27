import { Request, Response } from "express";
import crypto from "crypto";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { connectToDatabase } from "@/config/database.config";

// GET /api/webhooks/instagram/infoupdate - Verify webhook subscription
export const verifyInstagramInfoUpdateWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
      return res.status(200).send(challenge);
    }

    return res.status(403).json({
      success: false,
      error: "Verification failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Webhook verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/webhooks/instagram/infoupdate - Handle Instagram info update webhooks
export const handleInstagramInfoUpdateWebhookController = async (
  req: Request,
  res: Response,
) => {
  const startTime = Date.now();
  const webhookId = `insta_info_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  try {
    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = req.headers["x-hub-signature-256"] as string;
      const appSecret = process.env.INSTAGRAM_APP_SECRET;

      if (!signature) {
        console.error("❌ Missing x-hub-signature-256 header");
        return res.status(401).json({
          success: false,
          error: "Missing signature",
          timestamp: new Date().toISOString(),
        });
      }

      if (!appSecret) {
        console.error("❌ INSTAGRAM_APP_SECRET not configured");
        return res.status(500).json({
          success: false,
          error: "Server configuration error",
          timestamp: new Date().toISOString(),
        });
      }

      // IMPORTANT: Use raw body captured by express.json verify middleware
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
        console.error("❌ Invalid signature for webhook:", webhookId);
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
          timestamp: new Date().toISOString(),
        });
      }
    }

    const payload = req.body;

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
        await connectToDatabase();

        const updateResults = [];

        // Process each entry in the webhook
        for (const entry of payload.entry) {
          const instagramId = entry.id;

          // The changes are in entry.changes array
          const changes = entry.changes || [];

          // Extract user info from changes
          let username: string | undefined;
          let profilePictureUrl: string | undefined;

          for (const change of changes) {
            if (change.field === "username") {
              username = change.value;
            } else if (change.field === "profile_picture_url") {
              profilePictureUrl = change.value;
            }
          }

          // If we have any updates, save to database
          if (username || profilePictureUrl) {
            const updateData: any = {
              updatedAt: new Date(),
            };

            if (username) {
              updateData.username = username;
            }

            if (profilePictureUrl) {
              updateData.profilePicture = profilePictureUrl;
            }

            try {
              const updatedAccount = await InstagramAccount.findOneAndUpdate(
                { instagramId: instagramId },
                { $set: updateData },
                { new: true },
              );

              if (updatedAccount) {
                updateResults.push({
                  instagramId,
                  username: updatedAccount.username,
                  updated: true,
                });
              } else {
                updateResults.push({
                  instagramId,
                  updated: false,
                  reason: "Account not found in database",
                });
              }
            } catch (dbError) {
              console.error(
                `❌ Error updating account ${instagramId}:`,
                dbError,
              );
              updateResults.push({
                instagramId,
                updated: false,
                reason: "Database error",
              });
            }
          } else {
            updateResults.push({
              instagramId,
              updated: false,
              reason: "No relevant fields to update",
            });
          }
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
