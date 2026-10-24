import { connectToDatabase } from "@/config/database.config";
import { FREE_AGENCY_PLAN } from "@/config/platform-catalog.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import WorkspaceService from "@/models/tenant/WorkspaceService.model";
import User from "@/models/user.model";
import { entitlementService } from "@/services/billing/entitlement.service";
import { redisHelpers } from "@/config/redis.config";

export const INSTAGRAM_FREE_HOURLY_API_LIMIT = 200;
export const INSTAGRAM_PAID_HOURLY_API_LIMIT = 5_000;
export const INSTAGRAM_FREE_ACCOUNT_LIMIT = 1;
export const INSTAGRAM_PAID_ACCOUNT_LIMIT = 3;

export type InstagramAccess = {
  paid: boolean;
  tier: "free" | "pro";
  accountLimit: number;
  hourlyApiLimit: number;
  displayHourlyApiLimit: "200" | "Unlimited";
  source: "individual" | "package" | "agency" | "free";
};

export const buildInstagramAccess = (
  paid: boolean,
  source: InstagramAccess["source"],
): InstagramAccess => ({
  paid,
  tier: paid ? "pro" : "free",
  accountLimit: paid ? INSTAGRAM_PAID_ACCOUNT_LIMIT : INSTAGRAM_FREE_ACCOUNT_LIMIT,
  hourlyApiLimit: paid
    ? INSTAGRAM_PAID_HOURLY_API_LIMIT
    : INSTAGRAM_FREE_HOURLY_API_LIMIT,
  // Marketing/UI displays paid access as unlimited. The backend retains a
  // 5,000-call hourly safety ceiling to protect the Meta app and all tenants.
  displayHourlyApiLimit: paid ? "Unlimited" : "200",
  source,
});

export async function getEffectiveInstagramAccess(
  clerkId: string,
): Promise<InstagramAccess> {
  await connectToDatabase();
  const now = new Date();
  const user = await User.findOne({ clerkId })
    .select("platformAccountType")
    .lean();

  if (user?.platformAccountType === "MEMBER") {
    const memberships = await WorkspaceMember.find({
      userId: clerkId,
      status: "active",
    })
      .sort({ createdAt: 1 })
      .lean();
    const workspaceIds = memberships.map((item) => item.workspaceId);
    const workspace = workspaceIds.length
      ? await Workspace.findOne({
          _id: { $in: workspaceIds },
          agencyId: { $ne: null },
          status: { $in: ["pending", "active"] },
        }).lean()
      : null;

    if (workspace?.agencyId) {
      const service = await WorkspaceService.exists({
        workspaceId: workspace._id,
        service: "INSTAGRAM",
        enabled: true,
      });
      if (service) {
        const entitlements = await entitlementService.getEffectiveEntitlements({
          ownerType: "AGENCY",
          ownerId: String(workspace.agencyId),
        });
        const hasPaidAgencyPlan = entitlements.sourcePlanCodes.some(
          (code) => code !== FREE_AGENCY_PLAN.code,
        );
        if (hasPaidAgencyPlan && entitlements.features.instagram) {
          return buildInstagramAccess(true, "agency");
        }
      }
    }
    return buildInstagramAccess(false, "free");
  }

  const [individualSubscription, packageSubscription] = await Promise.all([
    InstaSubscription.exists({
      clerkId,
      chatbotType: "Insta-Automation-Pro",
      status: "active",
      expiresAt: { $gt: now },
    }),
    PackageSubscription.exists({
      clerkId,
      status: "active",
      expiresAt: { $gt: now },
      includedServices: "insta",
    }),
  ]);

  if (individualSubscription) return buildInstagramAccess(true, "individual");
  if (packageSubscription) return buildInstagramAccess(true, "package");
  return buildInstagramAccess(false, "free");
}

export async function invalidateAgencyInstagramAccessCache(agencyId: string) {
  const workspaces = await Workspace.find({ agencyId }).select("_id").lean();
  if (!workspaces.length) return;
  const members = await WorkspaceMember.find({
    workspaceId: { $in: workspaces.map((workspace) => workspace._id) },
    status: "active",
  })
    .select("userId")
    .lean();
  await invalidateInstagramAccessCache(
    members.map((member) => member.userId).filter(Boolean),
  );
}

export async function invalidateInstagramAccessCache(userIds: string | string[]) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  await Promise.allSettled(
    [...new Set(ids.filter(Boolean))].map((userId) =>
      redisHelpers.del(`user:tier:${userId}`),
    ),
  );
}
