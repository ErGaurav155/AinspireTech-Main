import { Router } from "express";
import { clerkWebhookController } from "@/controllers/webhooks/clerk.controller";
import {
  handleInstagramWebhookController,
  verifyInstagramWebhookController,
} from "@/controllers/webhooks/instagram.controller";
import {
  handleInstagramInfoUpdateWebhookController,
  verifyInstagramInfoUpdateWebhookController,
} from "@/controllers/webhooks/infoupdate.controller";
import {
  handleWhatsAppWebhookController,
  verifyWhatsAppWebhookController,
} from "@/controllers/webhooks/whatsapp.controller";
import {
  metaDataDeletionController,
  metaDataDeletionStatusController,
  metaDeauthorizeController,
} from "@/controllers/webhooks/meta.controller";

import { razorpaySubsCancelWebhookController } from "@/controllers/webhooks/razorpay/subscription-cancelorcharged.controller";
import { razorpaySubsCreateOrChargeWebhookController } from "@/controllers/webhooks/razorpay/subscription-create.controller";

const router = Router();

//clerk
// POST /api/webhooks/clerk - Handle Clerk webhooks
router.post("/clerk", clerkWebhookController);

//instagram
// GET /api/webhooks/instagram - Verify webhook subscription
router.get("/instagram", verifyInstagramWebhookController);
// POST /api/webhooks/instagram - Handle Instagram webhooks
router.post("/instagram", handleInstagramWebhookController);
// GET /api/webhooks/instagram/infoupdate - Verify webhook subscription
router.get("/instagram/infoupdate", verifyInstagramInfoUpdateWebhookController);
// POST /api/webhooks/instagram/infoupdate - Handle Instagram info update webhooks
router.post(
  "/instagram/infoupdate",
  handleInstagramInfoUpdateWebhookController,
);

//whatsapp
// GET /api/webhooks/whatsapp - Verify Meta WhatsApp webhook subscription
router.get("/whatsapp", verifyWhatsAppWebhookController);
// POST /api/webhooks/whatsapp - Handle WhatsApp Cloud API webhooks
router.post("/whatsapp", handleWhatsAppWebhookController);

//meta app callbacks
router.post("/meta/deauthorize", metaDeauthorizeController);
router.post("/meta/data-deletion", metaDataDeletionController);
router.get("/meta/data-deletion-status", metaDataDeletionStatusController);

//razorpay
// POST /api/webhooks/subscription/create - Create subscription
router.post(
  "/subscription/create",
  razorpaySubsCreateOrChargeWebhookController,
);
// POST /api/webhooks/subscription/cancel - Handle Razorpay subscription webhooks
router.post("/subscription/cancel", razorpaySubsCancelWebhookController);

export default router;
