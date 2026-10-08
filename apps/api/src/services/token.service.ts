// apps/api/services/token.service.ts
import { connectToDatabase } from "@/config/database.config";
import TokenUsage from "@/models/web/token/TokenUsage.model";
import { sendWebTokenExhaustedEmailToUser } from "@/services/sendEmail.service";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import Agency from "@/models/tenant/Agency.model";
import User from "@/models/user.model";
import { usageService } from "@/services/usage/usage.service";
import { Types } from "mongoose";
import {
  getAgencyWorkspaceAiTokenSummary,
  resolveAgencyWorkspaceAiUsageOwner,
} from "@/services/usage/agency-ai-usage.service";
import {
  checkIndividualAiTokens,
  getIndividualAiTokenSummary,
  recordIndividualAiTokens,
} from "@/services/usage/individual-ai-usage.service";

async function getAgencyManagedUsageOwner(userId: string) {
  const memberships = await WorkspaceMember.find({ userId, status: "active" }, { workspaceId: 1 }).limit(2).lean();
  if (memberships.length > 1) {
    throw new Error("Multiple active client workspaces are not supported");
  }
  if (memberships.length === 0) return null;
  return resolveAgencyWorkspaceAiUsageOwner(String(memberships[0].workspaceId));
}

async function isAgencyOwnerAccount(userId: string) {
  const [agency, user] = await Promise.all([
    Agency.exists({ ownerUserId: userId, status: { $ne: "archived" } }),
    User.findOne({ clerkId: userId }).select("platformAccountType").lean(),
  ]);
  return Boolean(agency || user?.platformAccountType === "AGENCY");
}

// Check if user has enough tokens for a specific chatbot
export async function hasSufficientTokens(
  userId: string,
  requiredTokens: number,
  chatbotId?: string,
) {
  const agencyOwner = await getAgencyManagedUsageOwner(userId);
  if (agencyOwner) {
    const quota = await usageService.checkLimit(
      agencyOwner,
      "aiTokens",
      Math.max(1, requiredTokens),
    );
    return quota.allowed;
  }
  if (await isAgencyOwnerAccount(userId)) return false;
  const quota = await checkIndividualAiTokens(
    userId,
    "website",
    Math.max(1, requiredTokens),
  );
  return quota.allowed;
}

// Use tokens
export async function usedTokens(
  userId: string,
  tokens: number,
  chatbotId?: string,
  totalCost: number = 0,
) {
  if (chatbotId !== "chatbot-lead-generation") {
    throw new Error("Unsupported chatbot type");
  }

  await connectToDatabase();

  const agencyOwner = await getAgencyManagedUsageOwner(userId);
  if (agencyOwner) {
    const result = await usageService.recordUsage({
      owner: agencyOwner,
      metric: "aiTokens",
      amount: tokens,
      idempotencyKey: `web-ai:${new Types.ObjectId().toString()}`,
      source: "website_chatbot",
      metadata: { chatbotId },
    }) as { applied?: boolean; limit?: number; used?: number };
    if (!result.applied) throw new Error("Insufficient tokens");
    const remainingTokens = result.limit === -1 ? -1 : Math.max(0, Number(result.limit || 0) - Number(result.used || 0));
    const tokenUsage = await TokenUsage.create({
      userId,
      chatbotId,
      tokensUsed: tokens,
      totalCost,
      timestamp: new Date(),
    });
    return {
      success: true,
      agencyManaged: true,
      workspaceId: agencyOwner.workspaceId,
      tokenUsage,
      remainingTokens,
      freeTokensRemaining: 0,
      subscriptionTokensRemaining: remainingTokens,
    };
  }

  if (await isAgencyOwnerAccount(userId)) {
    throw new Error("Agency owner accounts cannot consume automation tokens");
  }

  try {
    await recordIndividualAiTokens({
      userId,
      service: "website",
      tokens,
      idempotencyKey: `individual-web-ai:${new Types.ObjectId().toString()}`,
      source: "website_chatbot",
      metadata: { chatbotId },
    });
  } catch (error) {
    try {
      const summary = await getIndividualAiTokenSummary(userId, "website");
      await sendWebTokenExhaustedEmailToUser({
        userId,
        chatbotType: chatbotId,
        nextResetAt: summary.periodEnd,
      });
    } catch (emailError) {
      console.error("Failed to send web token exhausted email:", emailError);
    }
    throw new Error("Insufficient tokens");
  }

  // Record token usage
  const tokenUsage = await TokenUsage.create({
    userId,
    chatbotId: chatbotId || "unknown",
    tokensUsed: tokens,
    totalCost,
    timestamp: new Date(),
  });

  const individualSummary = await getIndividualAiTokenSummary(
    userId,
    "website",
  );

  return {
    success: true,
    tokenUsage,
    remainingTokens: individualSummary.remaining,
    freeTokensRemaining:
      individualSummary.buckets.find((bucket) => bucket.kind === "free")
        ?.remaining || 0,
    subscriptionTokensRemaining: individualSummary.buckets
      .filter((bucket) => bucket.kind !== "free")
      .reduce((sum, bucket) => sum + bucket.remaining, 0),
  };
}

// Get token balance summary
export async function getTokenBalanceSummary(userId: string) {
  await connectToDatabase();

  const agencyOwner = await getAgencyManagedUsageOwner(userId);
  if (agencyOwner?.workspaceId) {
    const summary = await getAgencyWorkspaceAiTokenSummary(
      agencyOwner.workspaceId,
    );
    if (!summary) throw new Error("Agency-managed token balance unavailable");
    return {
      userId,
      agencyManaged: true,
      sharedAcrossServices: true,
      workspaceId: summary.workspaceId,
      availableTokens: summary.remaining,
      freeTokensRemaining: 0,
      subscriptionTokensRemaining: summary.remaining,
      planTokensRemaining: summary.remaining,
      subscriptionTokens: {
        agencyWorkspace: {
          name: "Agency workspace allowance",
          total: summary.limit,
          used: summary.used,
          remaining: summary.remaining,
        },
      },
      freeTokens: 0,
      planTokens: summary.limit,
      usedFreeTokens: 0,
      usedPlanTokens: summary.used,
      totalTokensUsed: summary.used,
      lastResetAt: summary.periodStart,
      nextResetAt: summary.periodEnd,
      isLow:
        summary.remaining !== -1 &&
        summary.remaining <= Math.max(1_000, summary.limit * 0.1),
      exhausted: summary.exhausted,
      byService: summary.byService,
    };
  }

  if (await isAgencyOwnerAccount(userId)) {
    return {
      userId,
      agencyManaged: false,
      agencyOwner: true,
      availableTokens: 0,
      freeTokensRemaining: 0,
      subscriptionTokens: {},
      freeTokens: 0,
      usedFreeTokens: 0,
      totalTokensUsed: 0,
      isLow: true,
    };
  }

  const individualSummary = await getIndividualAiTokenSummary(
    userId,
    "website",
  );
  const freeBucket = individualSummary.buckets.find(
    (bucket) => bucket.kind === "free",
  );
  const paidBuckets = individualSummary.buckets.filter(
    (bucket) => bucket.kind !== "free",
  );
  const paidLimit = paidBuckets.reduce(
    (sum, bucket) => sum + bucket.limit,
    0,
  );
  const paidUsed = paidBuckets.reduce((sum, bucket) => sum + bucket.used, 0);
  const paidRemaining = paidBuckets.reduce(
    (sum, bucket) => sum + bucket.remaining,
    0,
  );
  return {
    userId,
    individual: true,
    sharedAcrossServices: individualSummary.sharedAcrossServices,
    availableTokens: individualSummary.remaining,
    freeTokensRemaining: freeBucket?.remaining || 0,
    subscriptionTokensRemaining: paidRemaining,
    planTokensRemaining: paidRemaining,
    subscriptionTokens: Object.fromEntries(
      paidBuckets.map((bucket) => [
        bucket.key,
        {
          name: bucket.label,
          total: bucket.limit,
          used: bucket.used,
          remaining: bucket.remaining,
        },
      ]),
    ),
    freeTokens: freeBucket?.limit || 0,
    planTokens: paidLimit,
    usedFreeTokens: freeBucket?.used || 0,
    usedPlanTokens: paidUsed,
    totalTokensUsed: individualSummary.used,
    lastResetAt: individualSummary.periodStart,
    nextResetAt: individualSummary.periodEnd,
    isLow:
      individualSummary.remaining <=
      Math.max(1_000, individualSummary.limit * 0.1),
    exhausted: individualSummary.exhausted,
    buckets: individualSummary.buckets,
    byService: individualSummary.byService,
  };
}
