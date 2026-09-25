import { Types } from "mongoose";
import type {
  PlatformPermission,
  PlatformRole,
} from "@rocketreplai/shared/platform";
import { connectToDatabase } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import { getEffectivePermissions } from "@/services/auth/permission.service";

export interface ResolvedAgencyAccess {
  agencyId: string;
  userId: string;
  role: Extract<
    PlatformRole,
    "AGENCY_OWNER" | "AGENCY_ADMIN" | "AGENCY_STAFF"
  >;
  permissions: PlatformPermission[];
}

const agencyQuery = (identifier: string) =>
  Types.ObjectId.isValid(identifier)
    ? { _id: new Types.ObjectId(identifier) }
    : { slug: identifier.toLowerCase() };

export async function resolveAgencyAccess({
  userId,
  agencyIdentifier,
}: {
  userId: string;
  agencyIdentifier: string;
}): Promise<ResolvedAgencyAccess | null> {
  await connectToDatabase();
  const agency = await Agency.findOne({
    ...agencyQuery(agencyIdentifier),
    status: { $in: ["pending", "active"] },
  }).lean();
  if (!agency) return null;

  const member = await AgencyMember.findOne({
    agencyId: agency._id,
    userId,
    status: "active",
  }).lean();
  const isOwner = agency.ownerUserId === userId;
  if (!isOwner && !member) return null;

  const role = isOwner ? "AGENCY_OWNER" : member!.role;
  return {
    agencyId: String(agency._id),
    userId,
    role,
    permissions: getEffectivePermissions({
      role,
      granted: member?.permissions,
      denied: member?.deniedPermissions,
    }),
  };
}
