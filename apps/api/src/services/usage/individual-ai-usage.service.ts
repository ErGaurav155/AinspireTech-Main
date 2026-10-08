import mongoose from "mongoose";
import {
  INDIVIDUAL_AI_ALLOWANCES,
  PACKAGE_AI_SERVICES,
  type IndividualAiService,
} from "@/config/individual-ai-catalog.config";
import { connectToDatabase } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import User from "@/models/user.model";
import WebSubscription from "@/models/web/Websubcription.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import IndividualAiUsageCounter from "@/models/usage/IndividualAiUsageCounter.model";
import IndividualAiUsageLedger from "@/models/usage/IndividualAiUsageLedger.model";
import { AiTokenAllowanceExhaustedError } from "@/services/usage/agency-ai-usage.service";

type IndividualAiBucket = {
  key: string;
  kind: "free" | "service" | "package";
  label: string;
  limit: number;
  services: IndividualAiService[];
};

const monthlyPeriod = (date = new Date()) => {
  const periodStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  return {
    periodKey: periodStart.toISOString().slice(0, 7),
    periodStart,
    periodEnd,
  };
};

const packageServiceKey: Record<IndividualAiService, string> = {
  website: "web",
  instagram: "insta",
  whatsapp: "whatsapp",
};

async function resolveIndividualAccount(userId: string) {
  const [agency, ownedWorkspace, membership, user] = await Promise.all([
    Agency.exists({ ownerUserId: userId, status: { $ne: "archived" } }),
    Workspace.exists({
      $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
      agencyId: { $exists: false },
      status: { $ne: "archived" },
    }),
    WorkspaceMember.exists({ userId, status: "active" }),
    User.findOne({ clerkId: userId }).select("platformAccountType").lean(),
  ]);

  if (agency || user?.platformAccountType === "AGENCY") return false;
  if (membership && !ownedWorkspace) return false;
  return Boolean(
    ownedWorkspace ||
      user?.platformAccountType === "BUSINESS" ||
      (!membership && !agency),
  );
}

async function resolveBuckets(
  userId: string,
  service: IndividualAiService,
): Promise<{ individual: boolean; buckets: IndividualAiBucket[] }> {
  await connectToDatabase();
  if (!(await resolveIndividualAccount(userId))) {
    return { individual: false, buckets: [] };
  }

  const now = new Date();
  const [activePackage, webSubscription, instaSubscription, whatsappWorkspace] =
    await Promise.all([
      PackageSubscription.findOne({
        clerkId: userId,
        status: "active",
        expiresAt: { $gt: now },
      })
        .sort({ createdAt: -1 })
        .lean(),
      service === "website"
        ? WebSubscription.findOne({
            clerkId: userId,
            chatbotType: "chatbot-lead-generation",
            status: "active",
            expiresAt: { $gt: now },
            subscriptionId: { $not: /^pkg:/ },
          })
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve(null),
      service === "instagram"
        ? InstaSubscription.findOne({
            clerkId: userId,
            status: "active",
            expiresAt: { $gt: now },
            subscriptionId: { $not: /^pkg:/ },
          })
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve(null),
      service === "whatsapp"
        ? WhatsAppWorkspace.findOne({ clerkId: userId })
            .select("subscription")
            .lean()
        : Promise.resolve(null),
    ]);

  const buckets: IndividualAiBucket[] = [];
  if (service === "website") {
    buckets.push({
      key: "free:website",
      kind: "free",
      label: "Website free allowance",
      limit: INDIVIDUAL_AI_ALLOWANCES.free.website,
      services: ["website"],
    });
  }

  const hasStandalone =
    (service === "website" && Boolean(webSubscription)) ||
    (service === "instagram" && Boolean(instaSubscription)) ||
    (service === "whatsapp" &&
      whatsappWorkspace?.subscription?.plan === "launch" &&
      whatsappWorkspace.subscription.status === "active");
  if (hasStandalone) {
    buckets.push({
      key: `service:${service}`,
      kind: "service",
      label: `${service} subscription allowance`,
      limit: INDIVIDUAL_AI_ALLOWANCES.standalone[service],
      services: [service],
    });
  }

  if (activePackage) {
    const packageId = activePackage.packageId as keyof typeof PACKAGE_AI_SERVICES;
    const configuredServices = PACKAGE_AI_SERVICES[packageId] || [];
    const includedBySubscription = activePackage.includedServices.includes(
      packageServiceKey[service] as any,
    );
    if (configuredServices.includes(service) && includedBySubscription) {
      buckets.push({
        key: `package:${packageId}`,
        kind: "package",
        label: `${activePackage.packageName} shared allowance`,
        limit: INDIVIDUAL_AI_ALLOWANCES.packages[packageId],
        services: configuredServices,
      });
    }
  }

  return { individual: true, buckets };
}

async function bucketStates(userId: string, buckets: IndividualAiBucket[]) {
  const period = monthlyPeriod();
  const counters = buckets.length
    ? await IndividualAiUsageCounter.find({
        userId,
        bucketKey: { $in: buckets.map((bucket) => bucket.key) },
        periodKey: period.periodKey,
      }).lean()
    : [];
  const counterMap = new Map(counters.map((counter) => [counter.bucketKey, counter]));
  return {
    period,
    buckets: buckets.map((bucket) => {
      const used = Number(counterMap.get(bucket.key)?.used || 0);
      return {
        ...bucket,
        used,
        remaining: Math.max(0, bucket.limit - used),
      };
    }),
  };
}

export async function checkIndividualAiTokens(
  userId: string,
  service: IndividualAiService,
  amount = 1,
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("AI token amount must be positive");
  }
  const resolved = await resolveBuckets(userId, service);
  if (!resolved.individual) {
    return { applicable: true, allowed: false, limit: 0, used: 0, remaining: 0 };
  }
  if (resolved.buckets.length === 0) {
    // Free Instagram/WhatsApp behavior remains governed by their existing
    // action/message caps until a paid AI allowance is active.
    return { applicable: false, allowed: true, limit: 0, used: 0, remaining: 0 };
  }
  const state = await bucketStates(userId, resolved.buckets);
  const limit = state.buckets.reduce((sum, bucket) => sum + bucket.limit, 0);
  const used = state.buckets.reduce((sum, bucket) => sum + bucket.used, 0);
  const remaining = state.buckets.reduce(
    (sum, bucket) => sum + bucket.remaining,
    0,
  );
  return {
    applicable: true,
    allowed: remaining >= amount,
    limit,
    used,
    remaining,
    periodStart: state.period.periodStart,
    periodEnd: state.period.periodEnd,
    buckets: state.buckets,
  };
}

export async function recordIndividualAiTokens({
  userId,
  service,
  tokens,
  idempotencyKey,
  source,
  metadata = {},
}: {
  userId: string;
  service: IndividualAiService;
  tokens: number;
  idempotencyKey: string;
  source: string;
  metadata?: Record<string, unknown>;
}) {
  const amount = Math.max(1, Math.ceil(tokens));
  const resolved = await resolveBuckets(userId, service);
  if (!resolved.individual) throw new AiTokenAllowanceExhaustedError();
  if (resolved.buckets.length === 0) {
    return { applied: false, unmetered: true, amount };
  }

  const period = monthlyPeriod();
  const session = await mongoose.startSession();
  try {
    let result: Record<string, unknown> = {};
    await session.withTransaction(async () => {
      const existing = await IndividualAiUsageLedger.findOne({
        idempotencyKey,
      }).session(session);
      if (existing) {
        result = {
          applied: existing.status === "applied",
          duplicate: true,
          amount: existing.amount,
        };
        return;
      }

      let remaining = amount;
      const allocations: Array<{ bucketKey: string; amount: number }> = [];
      for (const bucket of resolved.buckets) {
        await IndividualAiUsageCounter.updateOne(
          {
            userId,
            bucketKey: bucket.key,
            periodKey: period.periodKey,
          },
          {
            $setOnInsert: {
              used: 0,
              limitSnapshot: bucket.limit,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            },
          },
          { upsert: true, session },
        );
        const counter = await IndividualAiUsageCounter.findOne({
          userId,
          bucketKey: bucket.key,
          periodKey: period.periodKey,
        }).session(session);
        const available = Math.max(0, bucket.limit - Number(counter?.used || 0));
        const debit = Math.min(available, remaining);
        if (debit <= 0) continue;
        const updated = await IndividualAiUsageCounter.findOneAndUpdate(
          {
            userId,
            bucketKey: bucket.key,
            periodKey: period.periodKey,
            $expr: { $lte: [{ $add: ["$used", debit] }, bucket.limit] },
          },
          {
            $inc: { used: debit },
            $set: { limitSnapshot: bucket.limit },
          },
          { new: true, session },
        );
        if (!updated) throw new AiTokenAllowanceExhaustedError();
        allocations.push({ bucketKey: bucket.key, amount: debit });
        remaining -= debit;
        if (remaining === 0) break;
      }

      if (remaining > 0) throw new AiTokenAllowanceExhaustedError();

      await IndividualAiUsageLedger.create(
        [
          {
            idempotencyKey,
            userId,
            service,
            amount,
            periodKey: period.periodKey,
            source,
            status: "applied",
            allocations,
            metadata,
          },
        ],
        { session },
      );
      result = { applied: true, duplicate: false, amount, allocations };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function getIndividualAiTokenSummary(
  userId: string,
  service: IndividualAiService,
) {
  const resolved = await resolveBuckets(userId, service);
  const state = await bucketStates(userId, resolved.buckets);
  const bucketKeys = state.buckets.map((bucket) => bucket.key);
  const usageByService = bucketKeys.length
    ? await IndividualAiUsageLedger.aggregate<{
        _id: IndividualAiService;
        used: number;
      }>([
        {
          $match: {
            userId,
            periodKey: state.period.periodKey,
            status: "applied",
            "allocations.bucketKey": { $in: bucketKeys },
          },
        },
        { $unwind: "$allocations" },
        { $match: { "allocations.bucketKey": { $in: bucketKeys } } },
        {
          $group: {
            _id: "$service",
            used: { $sum: "$allocations.amount" },
          },
        },
      ])
    : [];
  const byService: Record<IndividualAiService, number> = {
    website: 0,
    instagram: 0,
    whatsapp: 0,
  };
  for (const row of usageByService) byService[row._id] = Number(row.used || 0);
  const limit = state.buckets.reduce((sum, bucket) => sum + bucket.limit, 0);
  const used = state.buckets.reduce((sum, bucket) => sum + bucket.used, 0);
  const remaining = state.buckets.reduce(
    (sum, bucket) => sum + bucket.remaining,
    0,
  );
  return {
    mode: "individual" as const,
    service,
    applicable: resolved.individual,
    metered: state.buckets.length > 0,
    sharedAcrossServices: state.buckets.some(
      (bucket) => bucket.kind === "package",
    ),
    limit,
    used,
    remaining,
    exhausted: limit > 0 && remaining === 0,
    periodStart: state.period.periodStart,
    periodEnd: state.period.periodEnd,
    buckets: state.buckets,
    byService,
  };
}
