import { requireAuth } from "@clerk/express";
import { Router } from "express";
import {
  createAgencyController,
  createBusinessWorkspaceController,
  createClientWorkspaceController,
  getAgencyController,
  getPlatformContextController,
  getWorkspaceController,
  listAgencyClientsController,
  updateClientServiceController,
  archiveClientWorkspaceController,
} from "@/controllers/platform/platform.controller";
import {
  requireAgencyContext,
  requireAgencyPermission,
} from "@/middleware/agency-context.middleware";
import {
  requirePermission,
  requireWorkspaceContext,
} from "@/middleware/workspace-context.middleware";
import {
  createAgencyAddonCheckoutController,
  createAgencyPlanCheckoutController,
  listAgencyPlansController,
  createWorkspacePlanCheckoutController,
  updateAgencyAddonController,
} from "@/controllers/platform/billing.controller";

const router = Router();
router.use(requireAuth());

router.get("/context", getPlatformContextController);
router.post("/agencies", createAgencyController);
router.post("/workspaces", createBusinessWorkspaceController);

router.get(
  "/agencies/:agencyId",
  requireAgencyContext,
  requireAgencyPermission("agency.view"),
  getAgencyController,
);
router.post(
  "/workspaces/:workspaceId/billing/checkout",
  requireWorkspaceContext,
  requirePermission("workspace.billing.manage"),
  createWorkspacePlanCheckoutController,
);
router.get(
  "/agencies/:agencyId/clients",
  requireAgencyContext,
  requireAgencyPermission("clients.view"),
  listAgencyClientsController,
);
router.post(
  "/agencies/:agencyId/clients",
  requireAgencyContext,
  requireAgencyPermission("clients.create"),
  createClientWorkspaceController,
);
router.patch(
  "/agencies/:agencyId/clients/:workspaceId/services/:service",
  requireAgencyContext,
  requireAgencyPermission("clients.services.manage"),
  updateClientServiceController,
);
router.delete(
  "/agencies/:agencyId/clients/:workspaceId",
  requireAgencyContext,
  requireAgencyPermission("clients.archive"),
  archiveClientWorkspaceController,
);
router.get(
  "/agencies/:agencyId/billing/plans",
  requireAgencyContext,
  requireAgencyPermission("agency.billing.manage"),
  listAgencyPlansController,
);
router.post(
  "/agencies/:agencyId/billing/checkout",
  requireAgencyContext,
  requireAgencyPermission("agency.billing.manage"),
  createAgencyPlanCheckoutController,
);
router.post(
  "/agencies/:agencyId/billing/addons/checkout",
  requireAgencyContext,
  requireAgencyPermission("agency.billing.manage"),
  createAgencyAddonCheckoutController,
);
router.patch(
  "/agencies/:agencyId/billing/addons/:purchaseId",
  requireAgencyContext,
  requireAgencyPermission("agency.billing.manage"),
  updateAgencyAddonController,
);

router.get(
  "/workspaces/:workspaceId",
  requireWorkspaceContext,
  requirePermission("workspace.view"),
  getWorkspaceController,
);

export default router;
