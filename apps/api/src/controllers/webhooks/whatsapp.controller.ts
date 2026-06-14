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

  console.info("[whatsapp:webhook:verify] Received verification request", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
  });

  if (mode !== "subscribe" || !token || !challenge) {
    console.warn("[whatsapp:webhook:verify] Verification failed: invalid query");
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
    console.info("[whatsapp:webhook:verify] Verification accepted", {
      matchedWorkspace: Boolean(workspace),
      matchedEnvToken: token === envToken,
    });
    return res.status(200).send(challenge);
  }

  console.warn("[whatsapp:webhook:verify] Verification token not recognized");
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
    const entryIds = (payload?.entry || []).map((entry: any) => entry.id);
    const messageCount =
      payload?.entry?.reduce(
        (total: number, entry: any) =>
          total +
          (entry.changes || []).reduce(
            (changeTotal: number, change: any) =>
              changeTotal + (change.value?.messages || []).length,
            0,
          ),
        0,
      ) || 0;
    const statusCount =
      payload?.entry?.reduce(
        (total: number, entry: any) =>
          total +
          (entry.changes || []).reduce(
            (changeTotal: number, change: any) =>
              changeTotal + (change.value?.statuses || []).length,
            0,
          ),
        0,
      ) || 0;

    console.info("[whatsapp:webhook] Received POST", {
      object: payload?.object,
      entryIds,
      phoneNumberId,
      messageCount,
      statusCount,
      hasSignature: Boolean(req.headers["x-hub-signature-256"]),
    });

    if (!payload?.object || payload.object !== "whatsapp_business_account") {
      console.warn("[whatsapp:webhook] Invalid payload object", {
        object: payload?.object,
      });
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
      console.info("[whatsapp:webhook] Signature verification lookup", {
        phoneNumberId,
        workspaceFound: Boolean(workspace),
        hasWorkspaceAppSecret: Boolean(workspace?.meta?.appSecret),
        hasEnvAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
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
        console.warn("[whatsapp:webhook] Invalid signature", {
          phoneNumberId,
          workspaceFound: Boolean(workspace),
        });
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
        const result = await processWhatsAppWebhook(payload);
        console.info("[whatsapp:webhook] Async processing completed", result);
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
