import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  connectWhatsAppFacebookController,
  createWhatsAppCollectionItemController,
  getWhatsAppFacebookConfigController,
  getWhatsAppCollectionController,
  getWhatsAppDashboardController,
  getWhatsAppPlansController,
  sendWhatsAppTextController,
  updateWhatsAppWorkspaceController,
} from "@/controllers/whatsapp/whatsapp.controller";

const router = Router();

router.use(requireAuth());

router.get("/plans", getWhatsAppPlansController);
router.get("/dashboard", getWhatsAppDashboardController);
router.get("/facebook/config", getWhatsAppFacebookConfigController);
router.post("/facebook/connect", connectWhatsAppFacebookController);
router.put("/workspace", updateWhatsAppWorkspaceController);
router.post("/messages/text", sendWhatsAppTextController);
router.get("/:collection", getWhatsAppCollectionController);
router.post("/:collection", createWhatsAppCollectionItemController);

export default router;
