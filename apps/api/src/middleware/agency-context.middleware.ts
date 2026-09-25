import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { PlatformPermission } from "@rocketreplai/shared/platform";
import { hasPermission } from "@/services/auth/permission.service";
import { resolveAgencyAccess } from "@/services/tenant/agency-resolver.service";

const fail = (res: Response, status: number, error: string) =>
  res.status(status).json({
    success: false,
    error,
    timestamp: new Date().toISOString(),
  });

export const requireAgencyContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) return fail(res, 401, "Authentication required");
    const agencyIdentifier = String(req.params.agencyId || "").trim();
    if (!agencyIdentifier) return fail(res, 400, "Agency context is required");

    const context = await resolveAgencyAccess({ userId, agencyIdentifier });
    if (!context) return fail(res, 403, "Agency access denied");
    req.agencyContext = context;
    return next();
  } catch (error) {
    console.error("Agency context resolution failed:", error);
    return fail(res, 500, "Unable to resolve agency access");
  }
};

export const requireAgencyPermission = (permission: PlatformPermission) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.agencyContext) return fail(res, 500, "Agency context is missing");
    if (!hasPermission(req.agencyContext.permissions, permission)) {
      return fail(res, 403, "Permission denied");
    }
    return next();
  };
