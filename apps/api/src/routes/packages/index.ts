import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
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

export default router;
