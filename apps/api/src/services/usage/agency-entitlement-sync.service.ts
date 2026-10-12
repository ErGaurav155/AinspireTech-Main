import { Types } from "mongoose";
import type { LimitEntitlements } from "@rocketreplai/shared/platform";
import UsageCounter from "@/models/usage/UsageCounter.model";

const RESOURCE_LIMITS = [
  "clientWorkspaces",
  "teamMembers",
  "instagramAccounts",
  "whatsappAccounts",
  "websiteChatbots",
  "callAssistants",
] as const;

/**
 * Updates only recorded limit snapshots. Usage and reservations are retained,
 * so upgrades add capacity immediately and downgrades never destroy data.
 */
export async function syncAgencyUsageLimitSnapshots({
  agencyId,
  limits,
}: {
  agencyId: string;
  limits: LimitEntitlements | Record<string, number>;
}) {
  if (!Types.ObjectId.isValid(agencyId)) return;
  const ownerId = new Types.ObjectId(agencyId);
  const writes: Promise<unknown>[] = [];

  const perWorkspace = Number(limits.aiTokensPerWorkspace ?? 0);
  const totalTokens = Number(limits.aiTokens ?? 0);
  writes.push(
    UsageCounter.updateMany(
      {
        ownerType: "AGENCY",
        ownerId,
        metric: "aiTokens",
        workspaceId: { $exists: true },
      },
      { $set: { limitSnapshot: perWorkspace } },
    ),
    UsageCounter.updateMany(
      {
        ownerType: "AGENCY",
        ownerId,
        metric: "aiTokens",
        $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }],
      },
      { $set: { limitSnapshot: totalTokens } },
    ),
  );

  for (const metric of RESOURCE_LIMITS) {
    const limit = limits[metric];
    if (typeof limit !== "number") continue;
    writes.push(
      UsageCounter.updateMany(
        { ownerType: "AGENCY", ownerId, metric },
        { $set: { limitSnapshot: limit } },
      ),
    );
  }

  await Promise.all(writes);
}
