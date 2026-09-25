import { Router } from "express";
import { getAuth, requireAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { isAdminOwnerId } from "@/utils/admin-owner";
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

const requireCallAssistantAvailability = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = getAuth(req).userId;
  if (
    process.env.CALL_ASSISTANT_PUBLIC_ENABLED === "true" ||
    (userId && isAdminOwnerId(userId))
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: "AI Call Assistant is coming soon",
    code: "CALL_ASSISTANT_COMING_SOON",
    timestamp: new Date().toISOString(),
  });
};

router.use(requireCallAssistantAvailability);

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
