import { connectToDatabase } from "@/config/database.config";
import { FREE_AGENCY_PLAN } from "@/config/platform-catalog.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import { entitlementService } from "@/services/billing/entitlement.service";

export const shouldShowInstagramBrandingForAccess = ({
  agencyManaged,
  sourcePlanCodes,
  hasPaidInstagramSubscription,
  hasPaidInstagramPackage,
}: {
  agencyManaged: boolean;
  sourcePlanCodes: string[];
  hasPaidInstagramSubscription: boolean;
  hasPaidInstagramPackage: boolean;
}) => {
  if (agencyManaged) {
    return !sourcePlanCodes.some((code) => code !== FREE_AGENCY_PLAN.code);
  }

  return !(
    sourcePlanCodes.length > 0 ||
    hasPaidInstagramSubscription ||
    hasPaidInstagramPackage
  );
};

/**
 * Branding follows the account that pays for the automation:
 * - agency client -> agency subscription
 * - direct business -> workspace/legacy Instagram/package subscription
 *
 * The lookup intentionally does not use the legacy user-tier cache. Billing
 * changes therefore affect the next welcome message without waiting for that
 * cache to expire.
 */
export async function shouldShowInstagramBranding({
  instagramAccountId,
  clerkId,
}: {
  instagramAccountId: string;
  clerkId: string;
}): Promise<boolean> {
  try {
    await connectToDatabase();
    const account = await InstagramAccount.findOne({
      instagramId: instagramAccountId,
    })
      .select("workspaceId userId")
      .lean();
    const accountOwnerId = account?.userId || clerkId;

    let workspace = account?.workspaceId
      ? await Workspace.findById(account.workspaceId)
          .select("agencyId billingOwnerType billingOwnerId")
          .lean()
      : null;

    // Older connected accounts may predate workspaceId backfilling. Account
    // type rules guarantee one active client/direct workspace per Clerk user.
    if (!workspace && accountOwnerId) {
      const membership = await WorkspaceMember.findOne({
        userId: accountOwnerId,
        status: "active",
      })
        .sort({ createdAt: 1 })
        .select("workspaceId")
        .lean();
      workspace = membership
        ? await Workspace.findById(membership.workspaceId)
            .select("agencyId billingOwnerType billingOwnerId")
            .lean()
        : await Workspace.findOne({
            $or: [
              { ownerUserId: accountOwnerId },
              { legacyOwnerClerkId: accountOwnerId },
            ],
            agencyId: null,
            status: { $ne: "archived" },
          })
            .sort({ createdAt: 1 })
            .select("agencyId billingOwnerType billingOwnerId")
            .lean();
    }

    let sourcePlanCodes: string[] = [];
    if (workspace?.billingOwnerId) {
      const entitlements = await entitlementService.getEffectiveEntitlements({
        ownerType: workspace.billingOwnerType,
        ownerId: String(workspace.billingOwnerId),
      });
      sourcePlanCodes = entitlements.sourcePlanCodes;

      if (workspace.billingOwnerType === "AGENCY" || workspace.agencyId) {
        return shouldShowInstagramBrandingForAccess({
          agencyManaged: true,
          sourcePlanCodes,
          hasPaidInstagramSubscription: false,
          hasPaidInstagramPackage: false,
        });
      }
    }

    const now = new Date();
    const [instagramSubscription, packageSubscription] = await Promise.all([
      InstaSubscription.exists({
        clerkId: accountOwnerId,
        chatbotType: "Insta-Automation-Pro",
        status: "active",
        expiresAt: { $gt: now },
      }),
      PackageSubscription.exists({
        clerkId: accountOwnerId,
        status: "active",
        expiresAt: { $gt: now },
        includedServices: "insta",
      }),
    ]);

    return shouldShowInstagramBrandingForAccess({
      agencyManaged: false,
      sourcePlanCodes,
      hasPaidInstagramSubscription: Boolean(instagramSubscription),
      hasPaidInstagramPackage: Boolean(packageSubscription),
    });
  } catch (error) {
    // A lookup failure must not fail the customer's automation message. The
    // conservative fallback retains branding until billing can be verified.
    console.error("Unable to resolve Instagram branding entitlement:", error);
    return true;
  }
}
