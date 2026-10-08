import { Types } from "mongoose";
import Workspace from "@/models/tenant/Workspace.model";
import UsageLedger from "@/models/usage/UsageLedger.model";
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

export type AgencyAiTokenService =
  | "website"
  | "instagram"
  | "whatsapp"
  | "other";

export function aiTokenServiceFromSource(source: string): AgencyAiTokenService {
  if (source.startsWith("website_") || source.startsWith("web_")) {
    return "website";
  }
  if (source.startsWith("instagram_")) return "instagram";
  if (source.startsWith("whatsapp_")) return "whatsapp";
  return "other";
}

export async function getAgencyWorkspaceAiTokenSummary(workspaceId: string) {
  const owner = await resolveAgencyWorkspaceAiUsageOwner(workspaceId);
  if (!owner) return null;

  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const [quota, sourceUsage] = await Promise.all([
    usageService.checkLimit(owner, "aiTokens", 1),
    UsageLedger.aggregate<{ _id: string; used: number }>([
      {
        $match: {
          ownerType: "AGENCY",
          ownerId: new Types.ObjectId(owner.ownerId),
          workspaceId: new Types.ObjectId(workspaceId),
          metric: "aiTokens",
          status: "applied",
          createdAt: { $gte: periodStart, $lt: periodEnd },
        },
      },
      { $group: { _id: "$source", used: { $sum: "$amount" } } },
    ]),
  ]);

  const byService: Record<AgencyAiTokenService, number> = {
    website: 0,
    instagram: 0,
    whatsapp: 0,
    other: 0,
  };
  for (const row of sourceUsage) {
    byService[aiTokenServiceFromSource(row._id)] += Number(row.used || 0);
  }

  const limit = Number(quota.limit || 0);
  const used = Number(quota.used || 0);
  return {
    mode: "agency_workspace" as const,
    workspaceId,
    limit,
    used,
    remaining: limit === -1 ? -1 : Math.max(0, limit - used),
    exhausted: limit !== -1 && used >= limit,
    periodStart,
    periodEnd,
    byService,
  };
}
