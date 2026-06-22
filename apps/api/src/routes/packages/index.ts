import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  cancelContentCreationSubscriptionController,
  cancelDashboardPackageSubscriptionController,
  cancelMetaAdsSubscriptionController,
  cancelWebsiteMaintenanceSubscriptionController,
  getDashboardPackageStatusController,
} from "@/controllers/packages/package.controller";

const router = Router();

router.use(requireAuth());

router.get("/status", getDashboardPackageStatusController);
router.post("/subscription/cancel", cancelDashboardPackageSubscriptionController);
router.post(
  "/meta-ads/subscription/cancel",
  cancelMetaAdsSubscriptionController,
);
router.post(
  "/website-maintenance/subscription/cancel",
  cancelWebsiteMaintenanceSubscriptionController,
);
router.post(
  "/content-creation/subscription/cancel",
  cancelContentCreationSubscriptionController,
);

export default router;
