import crypto from "crypto";
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";

const metaAppSecret =
  process.env.WHATSAPP_META_APP_SECRET ||
  process.env.WHATSAPP_APP_SECRET ||
  process.env.META_APP_SECRET ||
  process.env.FACEBOOK_APP_SECRET ||
  "";

const publicApiUrl =
  process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "";

const base64UrlDecode = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4;
  return Buffer.from(
    padding ? `${padded}${"=".repeat(4 - padding)}` : padded,
    "base64",
  );
};

const parseSignedRequest = (signedRequest: string) => {
  if (!metaAppSecret) throw new Error("Meta app secret is not configured");

  const [encodedSignature, encodedPayload] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload) {
    throw new Error("Invalid signed_request");
  }

  const signature = base64UrlDecode(encodedSignature);
  const payloadBuffer = base64UrlDecode(encodedPayload);
  const expected = crypto
    .createHmac("sha256", metaAppSecret)
    .update(encodedPayload)
    .digest();

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(signature, expected)
  ) {
    throw new Error("Invalid signed_request signature");
  }

  return JSON.parse(payloadBuffer.toString("utf8"));
};

const getSignedRequest = (req: Request) =>
  String(req.body?.signed_request || req.query?.signed_request || "");

const clearMetaConnectionForFacebookUser = async (facebookUserId: string) => {
  if (!facebookUserId) return null;

  return WhatsAppWorkspace.findOneAndUpdate(
    { "onboarding.facebookUserId": facebookUserId },
    {
      $set: {
        isConfigured: false,
        "meta.status": "needs_setup",
        "meta.accessToken": "",
        "onboarding.status": "not_started",
        "onboarding.lastError": "Facebook app access was removed by the user.",
      },
      $unset: {
        "onboarding.facebookUserId": "",
        "onboarding.facebookName": "",
        "onboarding.businessId": "",
      },
    },
    { new: true },
  );
};

export const metaDeauthorizeController = async (req: Request, res: Response) => {
  try {
    const signedRequest = getSignedRequest(req);
    if (!signedRequest) {
      return res.status(400).json({ success: false, error: "signed_request is required" });
    }

    const payload = parseSignedRequest(signedRequest);
    await connectToDatabase();
    const workspace = await clearMetaConnectionForFacebookUser(
      String(payload.user_id || ""),
    );

    return res.status(200).json({
      success: true,
      deauthorized: Boolean(workspace),
    });
  } catch (error: any) {
    console.error("Meta deauthorize callback error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to process Meta deauthorize callback",
    });
  }
};

export const metaDataDeletionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const signedRequest = getSignedRequest(req);
    if (!signedRequest) {
      return res.status(400).json({ success: false, error: "signed_request is required" });
    }

    const payload = parseSignedRequest(signedRequest);
    const facebookUserId = String(payload.user_id || "");
    const confirmationCode = crypto
      .createHash("sha256")
      .update(`${facebookUserId}:${Date.now()}`)
      .digest("hex")
      .slice(0, 24);

    await connectToDatabase();
    await clearMetaConnectionForFacebookUser(facebookUserId);

    return res.status(200).json({
      url: `${publicApiUrl}/api/webhooks/meta/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error: any) {
    console.error("Meta data deletion callback error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to process Meta data deletion request",
    });
  }
};

export const metaDataDeletionStatusController = (
  req: Request,
  res: Response,
) =>
  res.status(200).json({
    status: "completed",
    confirmation_code: req.query.code || "",
    message: "Meta Platform Data associated with this request has been removed.",
  });
