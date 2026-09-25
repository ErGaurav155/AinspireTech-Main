import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type {
  PlatformPermission,
  PlatformService,
} from "@rocketreplai/shared/platform";
import { hasPermission } from "@/services/auth/permission.service";
import { entitlementService } from "@/services/billing/entitlement.service";
import { resolveWorkspaceAccess } from "@/services/tenant/workspace-resolver.service";

const fail = (res: Response, status: number, error: string) =>
  res.status(status).json({
    success: false,
    error,
    timestamp: new Date().toISOString(),
  });

export const requireWorkspaceContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) return fail(res, 401, "Authentication required");

    const workspaceIdentifier = String(
      req.headers["x-workspace-id"] || req.params.workspaceId || "",
    ).trim();
    if (!workspaceIdentifier) {
      return fail(res, 400, "A workspace context is required");
    }

    const context = await resolveWorkspaceAccess({
      userId,
      workspaceIdentifier,
    });
    if (!context) return fail(res, 403, "Workspace access denied");

    req.platformContext = context;
    return next();
  } catch (error) {
    console.error("Workspace context resolution failed:", error);
    return fail(res, 500, "Unable to resolve workspace access");
  }
};

export const requirePermission = (permission: PlatformPermission) =>
  (req: Request, res: Response, next: NextFunction) => {
    const context = req.platformContext;
    if (!context) return fail(res, 500, "Workspace context is missing");
    if (!hasPermission(context.permissions, permission)) {
      return fail(res, 403, "Permission denied");
    }
    return next();
  };

export const requireWorkspaceService = (service: PlatformService) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.platformContext;
      if (!context) return fail(res, 500, "Workspace context is missing");

      const allowed = await entitlementService.canUseWorkspaceService({
        workspaceId: context.workspaceId,
        service,
        ownerType: context.billingOwnerType,
        ownerId: context.billingOwnerId,
      });
      if (!allowed) return fail(res, 403, `${service} is not enabled`);
      return next();
    } catch (error) {
      console.error("Workspace entitlement check failed:", error);
      return fail(res, 500, "Unable to verify service entitlement");
    }
  };
