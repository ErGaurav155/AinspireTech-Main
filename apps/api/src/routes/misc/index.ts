import { Router } from "express";
import {
  sendSubscriptionEmailToOwnerController,
  sendSubscriptionEmailToUserController,
  sendAppointmentEmailToUserController,
  sendWhatsAppInfoController,
} from "@/controllers/misc/misc-actions.controller";
import { requireAuth } from "@clerk/express";

const router = Router();
router.use(
  requireAuth({
    signInUrl: "https://ainspire-tech-main-dashboard.vercel.app/sign-in",
  }),
);

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

export default router;
