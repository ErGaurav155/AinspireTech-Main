import { Types } from "mongoose";
import type {
  PlatformPermission,
  PlatformRole,
} from "@rocketreplai/shared/platform";
import { connectToDatabase } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import { getEffectivePermissions } from "@/services/auth/permission.service";

const WORKSPACE_DELEGATABLE_PERMISSIONS = new Set<PlatformPermission>([
  "workspace.view",
  "workspace.manage",
  "workspace.team.manage",
  "automation.view",
  "automation.manage",
  "leads.view",
  "conversations.view",
  "conversations.manage",
  "appointments.view",
  "appointments.manage",
  "integrations.view",
  "integrations.manage",
  "analytics.view",
]);

export interface ResolvedWorkspaceAccess {
  workspaceId: string;
  agencyId?: string;
  userId: string;
  role: PlatformRole;
  permissions: PlatformPermission[];
  accessKind: "workspace_membership" | "agency_management" | "legacy_owner";
  billingOwnerType: "WORKSPACE" | "AGENCY";
  billingOwnerId: string;
}

const workspaceQuery = (identifier: string) =>
  Types.ObjectId.isValid(identifier)
    ? { _id: new Types.ObjectId(identifier) }
    : { slug: identifier.toLowerCase() };

export async function resolveWorkspaceAccess({
  userId,
  workspaceIdentifier,
}: {
  userId: string;
  workspaceIdentifier: string;
}): Promise<ResolvedWorkspaceAccess | null> {
  await connectToDatabase();

  const workspace = await Workspace.findOne({
    ...workspaceQuery(workspaceIdentifier),
    status: { $in: ["pending", "active"] },
  }).lean();
  if (!workspace) return null;

  const workspaceId = String(workspace._id);
  const membership = await WorkspaceMember.findOne({
    workspaceId: workspace._id,
    userId,
    status: "active",
  }).lean();

  if (membership) {
    return {
      workspaceId,
      agencyId: workspace.agencyId ? String(workspace.agencyId) : undefined,
      userId,
      role: membership.role,
      permissions: getEffectivePermissions({
        role: membership.role,
        granted: membership.permissions,
        denied: membership.deniedPermissions,
      }),
      accessKind: "workspace_membership",
      billingOwnerType: workspace.billingOwnerType,
      billingOwnerId: String(workspace.billingOwnerId),
    };
  }

  if (
    workspace.ownerUserId === userId ||
    workspace.legacyOwnerClerkId === userId
  ) {
    return {
      workspaceId,
      agencyId: workspace.agencyId ? String(workspace.agencyId) : undefined,
      userId,
      role: "CLIENT_OWNER",
      permissions: getEffectivePermissions({ role: "CLIENT_OWNER" }),
      accessKind: "legacy_owner",
      billingOwnerType: workspace.billingOwnerType,
      billingOwnerId: String(workspace.billingOwnerId),
    };
  }

  if (!workspace.agencyId) return null;

  const [relationship, agencyMember, agency] = await Promise.all([
    AgencyClient.findOne({
      agencyId: workspace.agencyId,
      workspaceId: workspace._id,
      status: "active",
    }).lean(),
    AgencyMember.findOne({
      agencyId: workspace.agencyId,
      userId,
      status: "active",
    }).lean(),
    Agency.findById(workspace.agencyId).select("ownerUserId status").lean(),
  ]);

  if (!relationship || !agency || agency.status !== "active") return null;

  const isAgencyOwner = agency.ownerUserId === userId;
  if (!agencyMember && !isAgencyOwner) return null;

  const role = isAgencyOwner ? "AGENCY_OWNER" : agencyMember!.role;
  const granted = [
    ...(agencyMember?.permissions || []),
    ...(relationship.defaultPermissions || []).filter((permission) =>
      WORKSPACE_DELEGATABLE_PERMISSIONS.has(permission),
    ),
  ];

  return {
    workspaceId,
    agencyId: String(workspace.agencyId),
    userId,
    role,
    permissions: getEffectivePermissions({
      role,
      granted,
      denied: agencyMember?.deniedPermissions || [],
    }),
    accessKind: "agency_management",
    billingOwnerType: workspace.billingOwnerType,
    billingOwnerId: String(workspace.billingOwnerId),
  };
}
