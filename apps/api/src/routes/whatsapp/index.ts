import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  connectWhatsAppFacebookController,
  createWhatsAppCollectionItemController,
  deleteWhatsAppWorkspaceController,
  getWhatsAppFacebookConfigController,
  getWhatsAppCollectionController,
  getWhatsAppDashboardController,
  getWhatsAppPlansController,
  sendWhatsAppTextController,
  updateWhatsAppAppointmentStatusController,
  updateWhatsAppWorkspaceController,
} from "@/controllers/whatsapp/whatsapp.controller";

const router = Router();

router.use(requireAuth());

router.get("/plans", getWhatsAppPlansController);
router.get("/dashboard", getWhatsAppDashboardController);
router.get("/facebook/config", getWhatsAppFacebookConfigController);
router.post("/facebook/connect", connectWhatsAppFacebookController);
router.put("/workspace", updateWhatsAppWorkspaceController);
router.delete("/workspace", deleteWhatsAppWorkspaceController);
router.patch(
  "/appointments/:appointmentId",
  updateWhatsAppAppointmentStatusController,
);
router.post("/messages/text", sendWhatsAppTextController);
router.get("/:collection", getWhatsAppCollectionController);
router.post("/:collection", createWhatsAppCollectionItemController);

export default router;
