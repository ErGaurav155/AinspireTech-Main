import mongoose, { Types } from "mongoose";
import type {
  BillingOwnerType,
  EntitlementLimit,
  LimitEntitlements,
} from "@rocketreplai/shared/platform";
import { connectToDatabase } from "@/config/database.config";
import UsageCounter from "@/models/usage/UsageCounter.model";
import UsageLedger from "@/models/usage/UsageLedger.model";
import { entitlementService } from "@/services/billing/entitlement.service";

export interface UsageOwner {
  ownerType: BillingOwnerType;
  ownerId: string;
  workspaceId?: string;
}

const monthlyPeriod = (date = new Date(), workspaceId?: string) => {
  const periodStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  return {
    periodKey: `${periodStart.toISOString().slice(0, 7)}${
      workspaceId ? `:workspace:${workspaceId}` : ""
    }`,
    periodStart,
    periodEnd,
  };
};

const CURRENT_RESOURCE_METRICS = new Set<EntitlementLimit>([
  "clientWorkspaces",
  "teamMembers",
  "instagramAccounts",
  "whatsappAccounts",
  "websiteChatbots",
  "callAssistants",
]);

const periodForMetric = (metric: EntitlementLimit, workspaceId?: string) =>
  CURRENT_RESOURCE_METRICS.has(metric)
    ? {
        periodKey: "current",
        periodStart: new Date(0),
        periodEnd: new Date("9999-12-31T23:59:59.999Z"),
      }
    : monthlyPeriod(
        new Date(),
        metric === "aiTokens" ? workspaceId : undefined,
      );

const objectId = (value: string, label: string) => {
  if (!Types.ObjectId.isValid(value)) throw new Error(`Invalid ${label}`);
  return new Types.ObjectId(value);
};

const workspaceAiTokenLimit = (limits: LimitEntitlements) => {
  if (limits.aiTokensPerWorkspace !== undefined) {
    return limits.aiTokensPerWorkspace;
  }
  const total = limits.aiTokens ?? 0;
  const workspaces = limits.clientWorkspaces ?? 0;
  if (total === -1) return -1;
  return workspaces > 0 ? Math.floor(total / workspaces) : total;
};

export class UsageService {
  async getUsage(owner: UsageOwner, metric?: EntitlementLimit) {
    await connectToDatabase();
    const monthly = monthlyPeriod();
    const workspaceId = owner.workspaceId
      ? objectId(owner.workspaceId, "workspace id")
      : undefined;
    const periodFilter = metric
      ? { periodKey: periodForMetric(metric, owner.workspaceId).periodKey }
      : {
          $or: [
            { periodKey: { $in: ["current", monthly.periodKey] } },
            {
              metric: "aiTokens",
              periodStart: monthly.periodStart,
              periodEnd: monthly.periodEnd,
            },
          ],
        };
    return UsageCounter.find({
      ownerType: owner.ownerType,
      ownerId: objectId(owner.ownerId, "usage owner id"),
      ...periodFilter,
      ...(workspaceId ? { workspaceId } : {}),
      ...(metric ? { metric } : {}),
    }).lean();
  }

  async checkLimit(
    owner: UsageOwner,
    metric: EntitlementLimit,
    amount = 1,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Usage amount must be positive");
    }

    const workspaceScopedAi = metric === "aiTokens" && Boolean(owner.workspaceId);
    const [entitlements, counters, ownerCounters] = await Promise.all([
      entitlementService.getEffectiveEntitlements(owner),
      this.getUsage(owner, metric),
      workspaceScopedAi
        ? this.getUsage(
            { ownerType: owner.ownerType, ownerId: owner.ownerId },
            metric,
          )
        : Promise.resolve([]),
    ]);
    const limit =
      metric === "aiTokens" && owner.workspaceId
        ? workspaceAiTokenLimit(entitlements.limits)
        : entitlements.limits[metric] || 0;
    const used = counters[0]?.used || 0;
    const reserved = counters[0]?.reserved || 0;
    const ownerLimit = entitlements.limits.aiTokens ?? 0;
    const ownerUsed = ownerCounters[0]?.used || 0;
    const ownerReserved = ownerCounters[0]?.reserved || 0;
    const workspaceAllowed = limit === -1 || used + reserved + amount <= limit;
    const ownerAllowed =
      !workspaceScopedAi ||
      ownerLimit === -1 ||
      ownerUsed + ownerReserved + amount <= ownerLimit;
    const allowed = workspaceAllowed && ownerAllowed;

    return {
      allowed,
      limit,
      used,
      reserved,
      requested: amount,
      ...(workspaceScopedAi
        ? { ownerLimit, ownerUsed, ownerReserved }
        : {}),
    };
  }

  async recordUsage({
    owner,
    metric,
    amount = 1,
    idempotencyKey,
    source,
    metadata = {},
  }: {
    owner: UsageOwner;
    metric: EntitlementLimit;
    amount?: number;
    idempotencyKey: string;
    source: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!idempotencyKey.trim()) throw new Error("Idempotency key is required");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Usage amount must be positive");
    }

    await connectToDatabase();
    const entitlement = await entitlementService.getEffectiveEntitlements(owner);
    const limit =
      metric === "aiTokens" && owner.workspaceId
        ? workspaceAiTokenLimit(entitlement.limits)
        : entitlement.limits[metric] || 0;
    const period = periodForMetric(metric, owner.workspaceId);
    const ownerId = objectId(owner.ownerId, "usage owner id");
    const workspaceId = owner.workspaceId
      ? objectId(owner.workspaceId, "workspace id")
      : undefined;
    const workspaceScopedAi = metric === "aiTokens" && Boolean(workspaceId);
    const ownerLimit = entitlement.limits.aiTokens ?? 0;
    const ownerPeriod = monthlyPeriod();

    const session = await mongoose.startSession();
    try {
      let result: Record<string, unknown> = {};
      await session.withTransaction(async () => {
        const existing = await UsageLedger.findOne({ idempotencyKey }).session(
          session,
        );
        if (existing) {
          result = {
            applied: existing.status === "applied",
            duplicate: true,
            status: existing.status,
          };
          return;
        }

        const [ledger] = await UsageLedger.create(
          [
            {
              idempotencyKey,
              ownerType: owner.ownerType,
              ownerId,
              workspaceId,
              metric,
              amount,
              periodKey: period.periodKey,
              source,
              status: "pending",
              metadata,
            },
          ],
          { session },
        );

        const counterIdentity = {
          ownerType: owner.ownerType,
          ownerId,
          metric,
          periodKey: period.periodKey,
        };
        await UsageCounter.updateOne(
          counterIdentity,
          {
            $setOnInsert: {
              workspaceId,
              used: 0,
              reserved: 0,
              limitSnapshot: limit,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            },
          },
          { upsert: true, session },
        );

        const filter: Record<string, unknown> = { ...counterIdentity };
        if (limit !== -1) {
          filter.$expr = {
            $lte: [{ $add: ["$used", "$reserved", amount] }, limit],
          };
        }

        const counter = await UsageCounter.findOneAndUpdate(
          filter,
          {
            $inc: { used: amount },
            $set: { limitSnapshot: limit, workspaceId },
          },
          { new: true, session },
        );

        if (!counter && limit !== -1) {
          ledger.status = "rejected";
          await ledger.save({ session });
          result = { applied: false, duplicate: false, limit };
          return;
        }

        let ownerCounter: { used?: number } | null = null;
        if (workspaceScopedAi) {
          const ownerCounterIdentity = {
            ownerType: owner.ownerType,
            ownerId,
            metric,
            periodKey: ownerPeriod.periodKey,
          };
          await UsageCounter.updateOne(
            ownerCounterIdentity,
            {
              $setOnInsert: {
                used: 0,
                reserved: 0,
                limitSnapshot: ownerLimit,
                periodStart: ownerPeriod.periodStart,
                periodEnd: ownerPeriod.periodEnd,
              },
            },
            { upsert: true, session },
          );
          const ownerFilter: Record<string, unknown> = {
            ...ownerCounterIdentity,
          };
          if (ownerLimit !== -1) {
            ownerFilter.$expr = {
              $lte: [
                { $add: ["$used", "$reserved", amount] },
                ownerLimit,
              ],
            };
          }
          ownerCounter = await UsageCounter.findOneAndUpdate(
            ownerFilter,
            {
              $inc: { used: amount },
              $set: { limitSnapshot: ownerLimit },
            },
            { new: true, session },
          );
          if (!ownerCounter && ownerLimit !== -1) {
            await UsageCounter.updateOne(
              counterIdentity,
              { $inc: { used: -amount } },
              { session },
            );
            ledger.status = "rejected";
            await ledger.save({ session });
            result = {
              applied: false,
              duplicate: false,
              limit,
              ownerLimit,
            };
            return;
          }
        }

        ledger.status = "applied";
        await ledger.save({ session });
        result = {
          applied: true,
          duplicate: false,
          limit,
          used: counter?.used || amount,
          ...(workspaceScopedAi
            ? { ownerLimit, ownerUsed: ownerCounter?.used || amount }
            : {}),
        };
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}

export const usageService = new UsageService();
