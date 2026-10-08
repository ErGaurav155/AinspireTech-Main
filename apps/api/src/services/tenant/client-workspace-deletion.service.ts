import { clerkClient } from "@clerk/express";
import { Types } from "mongoose";
import { connectToDatabase, mongoose } from "@/config/database.config";
import { redisHelpers } from "@/config/redis.config";
import AppointmentNotificationLog from "@/models/AppointmentNotificationLog.model";
import EmailNotificationLog from "@/models/EmailNotificationLog.model";
import MyAppointment from "@/models/MyAppointment.model";
import RateLimitQueue from "@/models/Rate/RateLimitQueue.model";
import UserRateLimit from "@/models/Rate/UserRateLimit.model";
import SharedBusinessKnowledge from "@/models/SharedBusinessKnowledge.model";
import PlatformAuditLog from "@/models/PlatformAuditLog.model";
import CallAssistantWorkspace from "@/models/call/CallAssistantWorkspace.model";
import InstagramAiConversation from "@/models/insta/AiConversation.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import Agency from "@/models/tenant/Agency.model";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import ProvisioningOperation from "@/models/tenant/ProvisioningOperation.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import WorkspaceOnboarding from "@/models/tenant/WorkspaceOnboarding.model";
import WorkspaceService from "@/models/tenant/WorkspaceService.model";
import UsageCounter from "@/models/usage/UsageCounter.model";
import UsageLedger from "@/models/usage/UsageLedger.model";
import User from "@/models/user.model";
import WebAppointmentQuestions from "@/models/web/AppointmentQuestions.model";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import webFaq from "@/models/web/webFaq.model";
import TokenBalance from "@/models/web/token/TokenBalance.model";
import TokenUsage from "@/models/web/token/TokenUsage.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import { deleteUserData } from "@/services/user.service";

const clerkNotFound = (error: any) =>
  Number(error?.status || error?.statusCode || error?.clerkError?.status) === 404;

const workspaceOrLegacyIdentity = (
  workspaceId: Types.ObjectId,
  identityField: string,
  exclusiveUserIds: string[],
) => ({
  $or: [
    { workspaceId },
    ...(exclusiveUserIds.length
      ? [{ workspaceId: null, [identityField]: { $in: exclusiveUserIds } }]
      : []),
  ],
});

async function exclusiveWorkspaceUsers(
  workspaceId: Types.ObjectId,
  candidateUserIds: string[],
) {
  const exclusive: string[] = [];
  for (const userId of candidateUserIds) {
    const [ownsAgency, agencyMembership, ownsOtherWorkspace, otherWorkspaceMembership] =
      await Promise.all([
        Agency.exists({ ownerUserId: userId, status: { $ne: "archived" } }),
        AgencyMember.exists({ userId, status: "active" }),
        Workspace.exists({
          _id: { $ne: workspaceId },
          $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
          status: { $ne: "archived" },
        }),
        WorkspaceMember.exists({
          workspaceId: { $ne: workspaceId },
          userId,
          status: "active",
        }),
      ]);
    if (!ownsAgency && !agencyMembership && !ownsOtherWorkspace && !otherWorkspaceMembership) {
      exclusive.push(userId);
    }
  }
  return exclusive;
}

export async function permanentlyDeleteAgencyClientWorkspace({
  agencyId,
  workspaceId,
  deleteExclusiveClerkUsers = false,
  allowOrphanedWorkspace = false,
}: {
  agencyId: string;
  workspaceId: string;
  deleteExclusiveClerkUsers?: boolean;
  allowOrphanedWorkspace?: boolean;
}) {
  await connectToDatabase();
  const agencyObjectId = new Types.ObjectId(agencyId);
  const workspaceObjectId = new Types.ObjectId(workspaceId);
  const [relationship, workspace, members] = await Promise.all([
    AgencyClient.findOne({
      agencyId: agencyObjectId,
      workspaceId: workspaceObjectId,
      status: { $ne: "archived" },
    }).lean(),
    Workspace.findOne({ _id: workspaceObjectId, agencyId: agencyObjectId }).lean(),
    WorkspaceMember.find({ workspaceId: workspaceObjectId }).lean(),
  ]);

  if (!workspace || (!relationship && !allowOrphanedWorkspace)) return null;

  const candidateUserIds = [
    workspace.ownerUserId,
    workspace.legacyOwnerClerkId,
    ...members.map((member) => member.userId),
  ].filter((value): value is string => Boolean(value));
  const uniqueUserIds = [...new Set(candidateUserIds)];
  const exclusiveUserIds = await exclusiveWorkspaceUsers(
    workspaceObjectId,
    uniqueUserIds,
  );

  // Each client receives a dedicated Clerk organization. Removing the whole
  // organization revokes all memberships and outstanding invitations without
  // deleting any person's global Clerk account.
  if (workspace.clerkOrganizationId) {
    try {
      await clerkClient.organizations.deleteOrganization(
        workspace.clerkOrganizationId,
      );
    } catch (error) {
      if (!clerkNotFound(error)) throw error;
    }
  }

  // Normal client removal only revokes organization access. Full agency
  // termination additionally removes invited identities that have no access
  // to any other agency/workspace. External deletion happens before the local
  // transaction so a Clerk failure remains safely retryable while the member
  // identifiers are still available in MongoDB.
  if (deleteExclusiveClerkUsers) {
    for (const userId of exclusiveUserIds) {
      try {
        await clerkClient.users.deleteUser(userId);
      } catch (error) {
        if (!clerkNotFound(error)) throw error;
      }
      await deleteUserData(userId);
    }
  }

  const instagramAccountFilter = workspaceOrLegacyIdentity(
    workspaceObjectId,
    "userId",
    exclusiveUserIds,
  );
  const instagramAccounts = await InstagramAccount.find(instagramAccountFilter)
    .select("instagramId")
    .lean();
  const instagramAccountIds = instagramAccounts.map((account) => account.instagramId);
  const instagramChildFilter = {
    $or: [
      { workspaceId: workspaceObjectId },
      ...(instagramAccountIds.length ? [{ accountId: { $in: instagramAccountIds } }] : []),
      ...(exclusiveUserIds.length
        ? [{ workspaceId: null, userId: { $in: exclusiveUserIds } }]
        : []),
    ],
  };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await WhatsAppWorkspace.deleteMany(
        workspaceOrLegacyIdentity(workspaceObjectId, "clerkId", exclusiveUserIds),
        { session },
      );
      await InstagramAiConversation.deleteMany(
        workspaceOrLegacyIdentity(workspaceObjectId, "clerkId", exclusiveUserIds),
        { session },
      );
      await InstaReplyTemplate.deleteMany(instagramChildFilter, { session });
      await InstaReplyLog.deleteMany(instagramChildFilter, { session });
      await InstaLeadCollection.deleteMany(instagramChildFilter, { session });
      await InstagramAccount.deleteMany(instagramAccountFilter, { session });

      await WebChatConversation.deleteMany(
        workspaceOrLegacyIdentity(workspaceObjectId, "clerkId", exclusiveUserIds),
        { session },
      );
      await WebChatbot.deleteMany(
        workspaceOrLegacyIdentity(workspaceObjectId, "clerkId", exclusiveUserIds),
        { session },
      );
      if (exclusiveUserIds.length) {
        await webFaq.deleteMany({ clerkId: { $in: exclusiveUserIds } }, { session });
        await WebAppointmentQuestions.deleteMany(
          { clerkId: { $in: exclusiveUserIds } },
          { session },
        );
        await SharedBusinessKnowledge.deleteMany(
          { clerkId: { $in: exclusiveUserIds } },
          { session },
        );
        await TokenBalance.deleteMany({ userId: { $in: exclusiveUserIds } }, { session });
        await TokenUsage.deleteMany({ userId: { $in: exclusiveUserIds } }, { session });
        await RateLimitQueue.deleteMany({ clerkId: { $in: exclusiveUserIds } }, { session });
        await UserRateLimit.deleteMany({ clerkId: { $in: exclusiveUserIds } }, { session });
        await EmailNotificationLog.deleteMany({ userId: { $in: exclusiveUserIds } }, { session });
        await AppointmentNotificationLog.deleteMany(
          { userId: { $in: exclusiveUserIds } },
          { session },
        );
      }

      await CallAssistantWorkspace.deleteMany(
        workspaceOrLegacyIdentity(workspaceObjectId, "clerkId", exclusiveUserIds),
        { session },
      );
      await MyAppointment.deleteMany({ workspaceId: workspaceObjectId }, { session });
      await UsageLedger.deleteMany({ workspaceId: workspaceObjectId }, { session });
      await UsageCounter.deleteMany({ workspaceId: workspaceObjectId }, { session });
      await WorkspaceService.deleteMany({ workspaceId: workspaceObjectId }, { session });
      await WorkspaceOnboarding.deleteMany({ workspaceId: workspaceObjectId }, { session });
      await WorkspaceMember.deleteMany({ workspaceId: workspaceObjectId }, { session });
      if (deleteExclusiveClerkUsers) {
        await PlatformAuditLog.deleteMany(
          { workspaceId: workspaceObjectId },
          { session },
        );
      }
      await ProvisioningOperation.deleteMany({ workspaceId: workspaceObjectId }, { session });

      if (relationship) {
        await UsageCounter.updateOne(
          {
            ownerType: "AGENCY",
            ownerId: agencyObjectId,
            metric: "clientWorkspaces",
            periodKey: "current",
            used: { $gt: 0 },
          },
          { $inc: { used: -1 } },
          { session },
        );
      }
      await AgencyClient.deleteMany(
        { agencyId: agencyObjectId, workspaceId: workspaceObjectId },
        { session },
      );
      await Workspace.deleteOne({ _id: workspaceObjectId }, { session });

      if (exclusiveUserIds.length) {
        if (deleteExclusiveClerkUsers) {
          await User.deleteMany(
            { clerkId: { $in: exclusiveUserIds } },
            { session },
          );
        } else {
          await User.updateMany(
            {
              clerkId: { $in: exclusiveUserIds },
              platformAccountType: "MEMBER",
            },
            { $unset: { platformAccountType: 1, platformOwnerId: 1 } },
            { session },
          );
        }
      }
    });
  } finally {
    await session.endSession();
  }

  await Promise.allSettled(
    exclusiveUserIds.flatMap((userId) => [
      redisHelpers.del(`user:tier:${userId}`),
      redisHelpers.del(`user:accounts:${userId}`),
      redisHelpers.del(`user:limits:${userId}`),
    ]),
  );

  return {
    workspaceId,
    clerkOrganizationDeleted: Boolean(workspace.clerkOrganizationId),
    removedMemberCount: members.length,
    deletedClerkUserCount: deleteExclusiveClerkUsers
      ? exclusiveUserIds.length
      : 0,
    releasedClientSlot: true,
    dataDeleted: true,
  };
}
