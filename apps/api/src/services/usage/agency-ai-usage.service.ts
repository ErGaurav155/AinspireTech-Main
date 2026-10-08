import Workspace from "@/models/tenant/Workspace.model";
import { usageService, type UsageOwner } from "@/services/usage/usage.service";

export class AiTokenAllowanceExhaustedError extends Error {
  constructor() {
    super("Monthly AI token allowance exhausted");
    this.name = "AiTokenAllowanceExhaustedError";
  }
}

export async function resolveAgencyWorkspaceAiUsageOwner(
  workspaceId: string,
): Promise<UsageOwner | null> {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    agencyId: { $exists: true },
    billingOwnerType: "AGENCY",
    status: "active",
  })
    .select("_id billingOwnerId")
    .lean();

  if (!workspace) return null;
  return {
    ownerType: "AGENCY",
    ownerId: String(workspace.billingOwnerId),
    workspaceId: String(workspace._id),
  };
}

export async function checkAgencyWorkspaceAiTokens(
  workspaceId: string,
  amount = 1,
) {
  const owner = await resolveAgencyWorkspaceAiUsageOwner(workspaceId);
  if (!owner) return null;
  return usageService.checkLimit(owner, "aiTokens", amount);
}

export async function recordAgencyWorkspaceAiTokens({
  workspaceId,
  tokens,
  idempotencyKey,
  source,
  metadata = {},
}: {
  workspaceId: string;
  tokens: number;
  idempotencyKey: string;
  source: string;
  metadata?: Record<string, unknown>;
}) {
  const owner = await resolveAgencyWorkspaceAiUsageOwner(workspaceId);
  if (!owner) return null;
  const result = await usageService.recordUsage({
    owner,
    metric: "aiTokens",
    amount: Math.max(1, Math.ceil(tokens)),
    idempotencyKey,
    source,
    metadata,
  });
  if (!(result as { applied?: boolean }).applied) {
    throw new AiTokenAllowanceExhaustedError();
  }
  return result;
}
