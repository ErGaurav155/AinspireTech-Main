import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  createCallItemController,
  exotelWebhookController,
  getCallCollectionController,
  getCallDashboardController,
  getCallPlansController,
  listCallSubscriptionsController,
  updateCallWorkspaceController,
} from "@/controllers/call/call-assistant.controller";

const router = Router();

router.post("/webhooks/exotel", exotelWebhookController);

router.use(requireAuth());

router.get("/plans", getCallPlansController);
router.get("/dashboard", getCallDashboardController);
router.get("/subscription/list", listCallSubscriptionsController);
router.put("/workspace", updateCallWorkspaceController);
router.get("/:collection", getCallCollectionController);
router.post("/:collection", createCallItemController);

export default router;
