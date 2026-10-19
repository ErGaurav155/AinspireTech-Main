import { Types } from "mongoose";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import { permanentlyDeleteAgencyClientWorkspace } from "@/services/tenant/client-workspace-deletion.service";
import { selectAgencyWorkspaceIdsForRemoval } from "@/services/billing/agency-plan-retention-policy.service";

export async function reconcileAgencyClientsForConfirmedPlan({
  agencyId,
  retainedWorkspaceIds,
  targetLimit,
}: {
  agencyId: string;
  retainedWorkspaceIds: string[];
  targetLimit: number;
}) {
  if (!Types.ObjectId.isValid(agencyId)) throw new Error("Invalid agency id");
  const relationships = await AgencyClient.find({
    agencyId: new Types.ObjectId(agencyId),
    status: { $in: ["provisioning", "active", "suspended"] },
  })
    .sort({ createdAt: 1 })
    .select("workspaceId")
    .lean();
  const activeWorkspaceIds = relationships.map((item) => String(item.workspaceId));
  const workspaceIdsToDelete = selectAgencyWorkspaceIdsForRemoval({
    activeWorkspaceIds,
    retainedWorkspaceIds,
    targetLimit,
  });

  const deletedWorkspaceIds: string[] = [];
  for (const workspaceId of workspaceIdsToDelete) {
    const result = await permanentlyDeleteAgencyClientWorkspace({
      agencyId,
      workspaceId,
    });
    if (result) deletedWorkspaceIds.push(workspaceId);
  }

  return {
    targetLimit,
    retainedWorkspaceIds: activeWorkspaceIds.filter(
      (workspaceId) => !workspaceIdsToDelete.includes(workspaceId),
    ),
    deletedWorkspaceIds,
  };
}
