import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import User from "@/models/user.model";

const deny = (res: Response) =>
  res.status(403).json({
    success: false,
    error:
      "Agency accounts manage client workspaces and cannot use individual automation services.",
    details: { code: "AGENCY_AUTOMATION_ACCESS_DENIED" },
    timestamp: new Date().toISOString(),
  });

const denyIndividualBilling = (res: Response) =>
  res.status(403).json({
    success: false,
    error:
      "Individual pricing is available only to Business accounts. Agency client members receive services from their agency plan.",
    details: { code: "INDIVIDUAL_BILLING_ACCESS_DENIED" },
    timestamp: new Date().toISOString(),
  });

const requireAccountType = (res: Response) =>
  res.status(403).json({
    success: false,
    error: "Choose an Individual Business or Agency account before continuing.",
    details: { code: "PLATFORM_ACCOUNT_TYPE_REQUIRED" },
    timestamp: new Date().toISOString(),
  });

/**
 * Agency ownership is a permanent account mode. Product engines remain
 * available to direct businesses and client-workspace members, but not to an
 * agency owner (or an agency-only staff identity) as a personal free account.
 */
export const requireAutomationAccountAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId })
      .select("platformAccountType")
      .lean();

    // An owner who selected Agency must never receive a parallel individual
    // product account, even if they are later invited to a workspace.
    if (user?.platformAccountType === "AGENCY") return deny(res);
    if (user?.platformAccountType === "BUSINESS") return next();

    if (user?.platformAccountType === "MEMBER") {
      const workspaceMembership = await WorkspaceMember.exists({
        userId,
        status: "active",
      });
      if (workspaceMembership) return next();
      return deny(res);
    }

    const [ownsAgency, agencyMembership, ownsWorkspace, workspaceMembership] =
      await Promise.all([
        Agency.exists({ ownerUserId: userId, status: { $ne: "archived" } }),
        AgencyMember.exists({ userId, status: "active" }),
        Workspace.exists({
          $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
          agencyId: null,
          status: { $in: ["pending", "active"] },
        }),
        WorkspaceMember.exists({ userId, status: "active" }),
      ]);

    const agencyOnly =
      Boolean(ownsAgency || agencyMembership) &&
      !Boolean(ownsWorkspace || workspaceMembership);
    if (agencyOnly) return deny(res);
    if (ownsWorkspace || workspaceMembership) return next();
    return requireAccountType(res);
  } catch (error) {
    console.error("Automation account-mode authorization failed:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to verify automation account access",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Product plans and checkout belong to direct Business accounts. MEMBER
 * entitlements come from the agency owner and AGENCY accounts use agency
 * billing routes, so neither account type may call individual billing APIs.
 */
export const requireIndividualBillingAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId })
      .select("platformAccountType")
      .lean();
    if (user?.platformAccountType === "BUSINESS") return next();
    if (user?.platformAccountType) {
      return denyIndividualBilling(res);
    }
    const ownsDirectWorkspace = await Workspace.exists({
      $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
      agencyId: null,
      status: { $in: ["pending", "active"] },
    });
    return ownsDirectWorkspace ? next() : requireAccountType(res);
  } catch (error) {
    console.error("Individual billing account-mode authorization failed:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to verify billing access",
      timestamp: new Date().toISOString(),
    });
  }
};
