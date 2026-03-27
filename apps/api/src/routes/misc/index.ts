import { Router } from "express";
import {
  sendSubscriptionEmailToOwnerController,
  sendSubscriptionEmailToUserController,
  sendAppointmentEmailToUserController,
  sendWhatsAppInfoController,
  uploadMiddleware,
  uploadFileController,
} from "@/controllers/misc/misc-actions.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

router.use(requireAuth());

// POST endpoints
router.post(
  "/send-subscription-email-owner",
  sendSubscriptionEmailToOwnerController,
);
router.post(
  "/send-subscription-email-user",
  sendSubscriptionEmailToUserController,
);
router.post("/send-appointment-email", sendAppointmentEmailToUserController);
router.post("/send-whatsapp-info", sendWhatsAppInfoController);

router.post("/upload", uploadMiddleware, uploadFileController);

export default router;
