import { Types } from "mongoose";
import type {
  PlatformPermission,
  PlatformRole,
} from "@rocketreplai/shared/platform";
import { connectToDatabase } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import { getEffectivePermissions } from "@/services/auth/permission.service";

export interface ResolvedAgencyAccess {
  agencyId: string;
  userId: string;
  role: Extract<
    PlatformRole,
    "AGENCY_OWNER"
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

  const isOwner = agency.ownerUserId === userId;
  if (!isOwner) return null;

  const role = "AGENCY_OWNER" as const;
  return {
    agencyId: String(agency._id),
    userId,
    role,
    permissions: getEffectivePermissions({ role }),
  };
}
