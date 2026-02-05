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

    if (mode && token) {
      const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;

      if (mode === "subscribe" && token === verifyToken) {
        return res.status(200).send(challenge);
      }
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
  try {
    await connectToDatabase();

    // Get raw body for signature verification
    const body = (req as any).rawBody || req.body;
    const signature = req.headers["x-hub-signature"] as string;

    if (typeof body !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid request body format",
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Verify signature
    const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;
    if (!verifyToken) {
      console.error("INSTAGRAM_VERIFY_TOKEN not configured");
      return res.status(500).json({
        success: false,
        error: "Webhook configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    const expectedSignature =
      "sha1=" +
      crypto.createHmac("sha1", verifyToken).update(body).digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return res.status(403).json({
        success: false,
        error: "Invalid signature",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Process valid webhook
    try {
      const data = JSON.parse(body);
      const { object, entry } = data;

      console.log("Instagram info update webhook received:", {
        object,
        entryCount: entry?.length || 0,
        timestamp: new Date().toISOString(),
      });

      if (object === "instagram" && entry?.length) {
        const updateResults = [];

        for (const change of entry) {
          const updateResult = await InstagramAccount.findOneAndUpdate(
            { instagramId: change.id },
            {
              username: change.username,
              profilePicUrl: change.profile_pic_url,
              lastUpdated: new Date(),
              updatedAt: new Date(),
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            },
          );
          updateResults.push({
            instagramId: change.id,
            username: change.username,
            updated: !!updateResult,
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            message: "Instagram account info updated successfully",
            updates: updateResults,
            count: updateResults.length,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          message: "Webhook received but no updates processed",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (parseError: any) {
      console.error("Error parsing webhook data:", parseError);
      return res.status(400).json({
        success: false,
        error: "Invalid webhook data format",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({
      success: false,
      error: "Processing failed",
      timestamp: new Date().toISOString(),
    });
  }
};
