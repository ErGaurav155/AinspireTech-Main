import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  createWhatsAppCollectionItemController,
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
router.put("/workspace", updateWhatsAppWorkspaceController);
router.post("/messages/text", sendWhatsAppTextController);
router.get("/:collection", getWhatsAppCollectionController);
router.post("/:collection", createWhatsAppCollectionItemController);

export default router;
