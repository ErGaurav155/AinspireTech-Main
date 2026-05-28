import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  connectCallController,
  createCallAssistantController,
  createCallItemController,
  exotelWebhookController,
  getAvailableCallNumbersController,
  getCallExotelConfigController,
  getCallCollectionController,
  getCallDashboardController,
  getCallPlansController,
  listCallSubscriptionsController,
  selectDedicatedCallNumberController,
  sendCallSmsController,
  updateCallWorkspaceController,
} from "@/controllers/call/call-assistant.controller";

const router = Router();

router.post("/webhooks/exotel", exotelWebhookController);

router.use(requireAuth());

router.get("/plans", getCallPlansController);
router.get("/dashboard", getCallDashboardController);
router.get("/subscription/list", listCallSubscriptionsController);
router.post("/assistant", createCallAssistantController);
router.get("/exotel/config", getCallExotelConfigController);
router.post("/exotel/sms", sendCallSmsController);
router.post("/exotel/connect-call", connectCallController);
router.get("/numbers/available", getAvailableCallNumbersController);
router.post("/numbers/select", selectDedicatedCallNumberController);
router.put("/workspace", updateCallWorkspaceController);
router.get("/:collection", getCallCollectionController);
router.post("/:collection", createCallItemController);

export default router;
