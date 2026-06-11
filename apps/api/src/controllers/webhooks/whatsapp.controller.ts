import { Request, Response } from "express";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import { connectToDatabase } from "@/config/database.config";
import {
  processWhatsAppWebhook,
  verifyWhatsAppSignature,
} from "@/services/whatsapp/whatsapp.service";

export const verifyWhatsAppWebhookController = async (
  req: Request,
  res: Response,
) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode !== "subscribe" || !token || !challenge) {
    return res.status(403).json({
      success: false,
      error: "Verification failed",
      timestamp: new Date().toISOString(),
    });
  }

  await connectToDatabase();
  const workspace = await WhatsAppWorkspace.findOne({
    "meta.verifyToken": token,
  });

  const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (workspace || token === envToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({
    success: false,
    error: "Verification token not recognized",
    timestamp: new Date().toISOString(),
  });
};

export const handleWhatsAppWebhookController = async (
  req: Request,
  res: Response,
) => {
  const startTime = Date.now();

  try {
    const payload = req.body;
    const phoneNumberId =
      payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!payload?.object || payload.object !== "whatsapp_business_account") {
      return res.status(400).json({
        success: false,
        error: "Invalid WhatsApp payload",
        timestamp: new Date().toISOString(),
      });
    }

    if (process.env.NODE_ENV === "production" && phoneNumberId) {
      await connectToDatabase();
      const workspace = await WhatsAppWorkspace.findOne({
        "meta.phoneNumberId": phoneNumberId,
      });
      const signature = req.headers["x-hub-signature-256"] as
        | string
        | undefined;
      const isValid = verifyWhatsAppSignature(
        (req as any).rawBody,
        signature,
        workspace?.meta?.appSecret || process.env.WHATSAPP_APP_SECRET,
      );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid WhatsApp signature",
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "WhatsApp webhook received",
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    setImmediate(async () => {
      try {
        await connectToDatabase();
        await processWhatsAppWebhook(payload);
      } catch (error) {
        console.error("WhatsApp webhook async processing failed:", error);
      }
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    if (!res.headersSent) {
      return res.status(200).json({
        success: false,
        error: "Webhook received but processing failed",
        timestamp: new Date().toISOString(),
      });
    }
  }
};
