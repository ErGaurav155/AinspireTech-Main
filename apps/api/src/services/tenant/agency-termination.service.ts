import { clerkClient } from "@clerk/express";
import { Types } from "mongoose";
import { connectToDatabase, mongoose } from "@/config/database.config";
import { redisHelpers } from "@/config/redis.config";
import PlatformAuditLog from "@/models/PlatformAuditLog.model";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";
import Agency from "@/models/tenant/Agency.model";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import ProvisioningOperation from "@/models/tenant/ProvisioningOperation.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import UsageCounter from "@/models/usage/UsageCounter.model";
import UsageLedger from "@/models/usage/UsageLedger.model";
import User from "@/models/user.model";
import { permanentlyDeleteAgencyClientWorkspace } from "@/services/tenant/client-workspace-deletion.service";
import { deleteUserData } from "@/services/user.service";
import { getRazorpay } from "@/utils/util";

export type AgencyTerminationReason =
  | "owner_deleted"
  | "plan_cancelled"
  | "plan_expired";

const clerkNotFound = (error: any) =>
  Number(error?.status || error?.statusCode || error?.clerkError?.status) === 404;

const providerSubscriptionAlreadyEnded = (error: any) => {
  const message = String(
    error?.error?.description || error?.description || error?.message || "",
  ).toLowerCase();
  return ["already cancelled", "already canceled", "completed", "expired"].some(
    (value) => message.includes(value),
  );
};

async function cancelProviderSubscription(reference?: string) {
  if (!reference) return;
  try {
    await getRazorpay().subscriptions.cancel(reference, false);
  } catch (error) {
    if (!providerSubscriptionAlreadyEnded(error)) throw error;
  }
}

async function cancelAgencyBilling({
  agencyId,
  skipProviderSubscriptionId,
}: {
  agencyId: Types.ObjectId;
  skipProviderSubscriptionId?: string;
}) {
  const [subscriptions, addons] = await Promise.all([
    PlatformSubscription.find({
      ownerType: "AGENCY",
      ownerId: agencyId,
      status: { $in: ["pending", "trialing", "active", "past_due", "paused"] },
    }),
    PurchasedAddon.find({
      ownerType: "AGENCY",
      ownerId: agencyId,
      status: { $in: ["pending", "active", "past_due"] },
    }),
  ]);

  for (const subscription of subscriptions) {
    if (
      subscription.provider === "razorpay" &&
      subscription.providerSubscriptionId !== skipProviderSubscriptionId
    ) {
      await cancelProviderSubscription(subscription.providerSubscriptionId);
    }
    subscription.status = "cancelled";
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = new Date();
    await subscription.save();
  }

  for (const addon of addons) {
    if (addon.provider === "razorpay") {
      await cancelProviderSubscription(addon.providerReference);
    }
    addon.status = "cancelled";
    addon.cancelAtPeriodEnd = false;
    if (addon.pendingChange?.status === "pending") {
      addon.pendingChange.status = "cancelled";
    }
    await addon.save();
  }
}

/**
 * Permanently removes every client provisioned by an agency. This is used
 * only for final paid-plan cancellation/expiry and owner deletion, never for
 * a temporary payment failure or a scheduled cancellation before cycle end.
 */
export async function purgeAgencyClients({
  agencyId,
  reason,
  skipProviderSubscriptionId,
}: {
  agencyId: string;
  reason: AgencyTerminationReason;
  skipProviderSubscriptionId?: string;
}) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(agencyId)) {
    throw new Error("Invalid agency id");
  }

  const agencyObjectId = new Types.ObjectId(agencyId);
  const agency = await Agency.findById(agencyObjectId).lean();
  if (!agency) {
    return {
      agencyId,
      deletedWorkspaceCount: 0,
      deletedClerkUserCount: 0,
      alreadyDeleted: true,
    };
  }

  // Revoke workspace resolution immediately, before external deletion calls.
  await Promise.all([
    Workspace.updateMany(
      { agencyId: agencyObjectId, status: { $ne: "archived" } },
      { $set: { status: "suspended" } },
    ),
    AgencyClient.updateMany(
      { agencyId: agencyObjectId, status: { $ne: "archived" } },
      { $set: { status: "suspended" } },
    ),
  ]);

  await cancelAgencyBilling({ agencyId: agencyObjectId, skipProviderSubscriptionId });

  const [relationships, workspaces] = await Promise.all([
    AgencyClient.find({ agencyId: agencyObjectId }).select("workspaceId").lean(),
    Workspace.find({ agencyId: agencyObjectId }).select("_id").lean(),
  ]);
  const workspaceIds = [
    ...new Set(
      [...relationships.map((item) => item.workspaceId), ...workspaces.map((item) => item._id)].map(
        (id) => String(id),
      ),
    ),
  ];

  let deletedWorkspaceCount = 0;
  let deletedClerkUserCount = 0;
  for (const workspaceId of workspaceIds) {
    const result = await permanentlyDeleteAgencyClientWorkspace({
      agencyId,
      workspaceId,
      deleteExclusiveClerkUsers: true,
      allowOrphanedWorkspace: true,
    });
    if (result) {
      deletedWorkspaceCount += 1;
      deletedClerkUserCount += result.deletedClerkUserCount;
    }
  }

  await Promise.all([
    ProvisioningOperation.deleteMany({
      agencyId: agencyObjectId,
      operation: { $in: ["CREATE_CLIENT_WORKSPACE", "INVITE_WORKSPACE_MEMBER"] },
    }),
    UsageCounter.updateMany(
      {
        ownerType: "AGENCY",
        ownerId: agencyObjectId,
        metric: "clientWorkspaces",
      },
      { $set: { used: 0, reserved: 0 } },
    ),
    PlatformAuditLog.create({
      actorUserId: agency.ownerUserId,
      agencyId: agencyObjectId,
      action: "agency.clients_terminated",
      targetType: "agency",
      targetId: agencyId,
      metadata: {
        reason,
        deletedWorkspaceCount,
        deletedClerkUserCount,
      },
    }),
  ]);

  return {
    agencyId,
    deletedWorkspaceCount,
    deletedClerkUserCount,
    alreadyDeleted: false,
  };
}

async function exclusiveAgencyStaffUsers(
  agencyId: Types.ObjectId,
  candidateUserIds: string[],
) {
  const exclusive: string[] = [];
  for (const userId of [...new Set(candidateUserIds)]) {
    const [ownsOtherAgency, otherAgencyMembership, ownsWorkspace, workspaceMembership] =
      await Promise.all([
        Agency.exists({
          _id: { $ne: agencyId },
          ownerUserId: userId,
          status: { $ne: "archived" },
        }),
        AgencyMember.exists({
          agencyId: { $ne: agencyId },
          userId,
          status: "active",
        }),
        Workspace.exists({
          $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
          status: { $ne: "archived" },
        }),
        WorkspaceMember.exists({ userId, status: "active" }),
      ]);
    if (
      !ownsOtherAgency &&
      !otherAgencyMembership &&
      !ownsWorkspace &&
      !workspaceMembership
    ) {
      exclusive.push(userId);
    }
  }
  return exclusive;
}

/** Permanently closes the agency itself after its Clerk owner is deleted. */
export async function permanentlyDeleteAgencyForOwner({
  agencyId,
  ownerUserId,
}: {
  agencyId: string;
  ownerUserId: string;
}) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(agencyId)) throw new Error("Invalid agency id");
  const agencyObjectId = new Types.ObjectId(agencyId);
  const agency = await Agency.findOne({
    _id: agencyObjectId,
    ownerUserId,
  });
  if (!agency) return { agencyId, alreadyDeleted: true };

  agency.status = "suspended";
  await agency.save();

  const clientResult = await purgeAgencyClients({
    agencyId,
    reason: "owner_deleted",
  });

  const agencyMembers = await AgencyMember.find({ agencyId: agencyObjectId }).lean();
  const staffUserIds = await exclusiveAgencyStaffUsers(
    agencyObjectId,
    agencyMembers
      .map((member) => member.userId)
      .filter((userId) => userId && userId !== ownerUserId),
  );

  if (agency.clerkOrganizationId) {
    try {
      await clerkClient.organizations.deleteOrganization(
        agency.clerkOrganizationId,
      );
    } catch (error) {
      if (!clerkNotFound(error)) throw error;
    }
  }

  for (const userId of staffUserIds) {
    try {
      await clerkClient.users.deleteUser(userId);
    } catch (error) {
      if (!clerkNotFound(error)) throw error;
    }
    await deleteUserData(userId);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await AgencyMember.deleteMany({ agencyId: agencyObjectId }, { session });
      await AgencyClient.deleteMany({ agencyId: agencyObjectId }, { session });
      await ProvisioningOperation.deleteMany({ agencyId: agencyObjectId }, { session });
      await UsageLedger.deleteMany(
        { ownerType: "AGENCY", ownerId: agencyObjectId },
        { session },
      );
      await UsageCounter.deleteMany(
        { ownerType: "AGENCY", ownerId: agencyObjectId },
        { session },
      );
      await PlatformSubscription.deleteMany(
        { ownerType: "AGENCY", ownerId: agencyObjectId },
        { session },
      );
      await PurchasedAddon.deleteMany(
        { ownerType: "AGENCY", ownerId: agencyObjectId },
        { session },
      );
      await PlatformAuditLog.deleteMany({ agencyId: agencyObjectId }, { session });
      await Agency.deleteOne({ _id: agencyObjectId }, { session });
      await User.updateOne(
        { clerkId: ownerUserId, platformOwnerId: agencyObjectId },
        { $unset: { platformOwnerId: 1 } },
        { session },
      );
      if (staffUserIds.length) {
        await User.deleteMany({ clerkId: { $in: staffUserIds } }, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  await Promise.allSettled([
    redisHelpers.del(`user:tier:${ownerUserId}`),
    redisHelpers.del(`user:accounts:${ownerUserId}`),
    redisHelpers.del(`user:limits:${ownerUserId}`),
    ...staffUserIds.flatMap((userId) => [
      redisHelpers.del(`user:tier:${userId}`),
      redisHelpers.del(`user:accounts:${userId}`),
      redisHelpers.del(`user:limits:${userId}`),
    ]),
  ]);

  return {
    agencyId,
    alreadyDeleted: false,
    deletedWorkspaceCount: clientResult.deletedWorkspaceCount,
    deletedClientUserCount: clientResult.deletedClerkUserCount,
    deletedAgencyStaffUserCount: staffUserIds.length,
  };
}
