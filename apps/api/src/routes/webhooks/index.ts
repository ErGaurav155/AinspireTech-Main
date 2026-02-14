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

//razorpay
// POST /api/webhooks/subscription/create - Create subscription
router.post(
  "/subscription/create",
  razorpaySubsCreateOrChargeWebhookController,
);
// POST /api/webhooks/subscription-cancel - Handle Razorpay subscription webhooks
router.post("/subscription/cancel", razorpaySubsCancelWebhookController);

export default router;
