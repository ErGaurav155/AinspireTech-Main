import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import { z } from "zod";
import IndividualSubscriptionChange from "@/models/billing/IndividualSubscriptionChange.model";
import Plan from "@/models/plan.model";
import {
  findOwnedIndividualSubscription,
} from "@/services/billing/individual-subscription-change.service";
import {
  canUpdateRazorpaySubscription,
  shouldUseIndividualReplacementCheckout,
  supportsIndividualReplacementCheckout,
} from "@/services/billing/individual-subscription-provider-policy.service";
import {
  getContentCreationPlan,
  getDashboardPackagePlan,
  getMetaAdsPlan,
  getWebsiteMaintenancePlan,
} from "@/services/packages/package-subscription.service";
import { getRazorpay } from "@/utils/util";

const changeSchema = z
  .object({
    subscriptionId: z.string().trim().min(5).max(100),
    subscriptionKind: z.enum([
      "web",
      "insta",
      "whatsapp",
      "call",
      "package",
      "meta-ads",
      "website-maintenance",
      "content-creation",
    ]),
    targetProductId: z.string().trim().min(2).max(100),
    targetBillingCycle: z.enum(["monthly", "yearly"]),
    scheduleChangeAt: z.enum(["now", "cycle_end"]),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const validProductForKind = (kind: string, productId: string) => {
  if (kind === "web") return productId === "chatbot-lead-generation";
  if (kind === "insta") return productId === "Insta-Automation-Pro";
  if (kind === "whatsapp") return ["whatsapp-launch", "launch"].includes(productId);
  if (kind === "call") return ["call-business", "business"].includes(productId);
  if (kind === "package") return Boolean(getDashboardPackagePlan(productId));
  if (kind === "meta-ads") return Boolean(getMetaAdsPlan(productId));
  if (kind === "website-maintenance") return Boolean(getWebsiteMaintenancePlan(productId));
  return Boolean(getContentCreationPlan(productId));
};

const noteValue = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  return undefined;
};

const abandonSchema = z
  .object({ changeId: z.string().trim().regex(/^[a-f\d]{24}$/i) })
  .strict();

export const changeRazorpaySubscriptionController = async (
  req: Request,
  res: Response,
) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const parsed = changeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid subscription change request",
      details: parsed.error.flatten(),
    });
  }

  try {
    const request = parsed.data;
    if (!validProductForKind(request.subscriptionKind, request.targetProductId)) {
      return res.status(400).json({ success: false, error: "The target plan is not valid for this subscription" });
    }
    if (
      ["package", "meta-ads", "website-maintenance", "content-creation"].includes(
        request.subscriptionKind,
      ) && request.targetBillingCycle !== "monthly"
    ) {
      return res.status(400).json({ success: false, error: "This plan currently supports monthly billing only" });
    }

    const ownedSubscription = await findOwnedIndividualSubscription(
      userId,
      request.subscriptionId,
      request.subscriptionKind,
    );
    if (!ownedSubscription) {
      return res.status(404).json({ success: false, error: "Active subscription not found" });
    }

    const targetPlan = await Plan.findOne({ productId: request.targetProductId }).lean();
    const targetProviderPlanId =
      request.targetBillingCycle === "yearly"
        ? targetPlan?.razorpayyearlyplanId
        : targetPlan?.razorpaymonthlyplanId;
    if (!targetProviderPlanId) {
      return res.status(409).json({ success: false, error: "The selected Razorpay plan is not configured" });
    }

    const pending = await IndividualSubscriptionChange.findOne({
      subscriptionId: request.subscriptionId,
      status: "pending",
    });
    if (pending) {
      if (
        pending.replacementSubscriptionId &&
        pending.targetProviderPlanId === targetProviderPlanId
      ) {
        const replacement = await getRazorpay().subscriptions.fetch(
          pending.replacementSubscriptionId,
        );
        if (String(replacement.status) === "created") {
          return res.status(200).json({
            success: true,
            data: {
              changeId: String(pending._id),
              subscriptionId: pending.replacementSubscriptionId,
              previousSubscriptionId: pending.subscriptionId,
              status: "replacement_checkout_required",
              scheduleChangeAt: pending.scheduleChangeAt,
              effectiveAt: pending.effectiveAt,
              keyId: process.env.RAZORPAY_KEY_ID,
            },
          });
        }
      }
      return res.status(409).json({ success: false, error: "Another subscription change is already pending" });
    }

    const providerSubscription = await getRazorpay().subscriptions.fetch(request.subscriptionId);
    if (providerSubscription.notes?.buyerId && providerSubscription.notes.buyerId !== userId) {
      return res.status(403).json({ success: false, error: "Subscription does not belong to this user" });
    }
    if (String(providerSubscription.plan_id) === targetProviderPlanId) {
      return res.status(409).json({ success: false, error: "This plan and billing cycle are already active" });
    }

    const change = await IndividualSubscriptionChange.create({
      clerkId: userId,
      subscriptionId: request.subscriptionId,
      subscriptionKind: request.subscriptionKind,
      fromProviderPlanId: String(providerSubscription.plan_id || "unknown"),
      targetProviderPlanId,
      targetProductId: request.targetProductId,
      targetBillingCycle: request.targetBillingCycle,
      scheduleChangeAt: request.scheduleChangeAt,
      status: "pending",
      metadata: request.metadata || {},
    });

    const createReplacementCheckout = async () => {
      if (!supportsIndividualReplacementCheckout(request.subscriptionKind)) {
        throw new Error(
          `The current Razorpay subscription is ${providerSubscription.status} and cannot be changed`,
        );
      }

      const providerPlan = await getRazorpay().plans.fetch(targetProviderPlanId);
      const providerAmount = Number((providerPlan as any)?.item?.amount);
      const amountInRupees =
        Number.isFinite(providerAmount) && providerAmount > 0
          ? providerAmount / 100
          : 0;
      if (amountInRupees <= 0) {
        throw new Error("Unable to resolve the target Razorpay plan amount");
      }

      const startAt =
        request.scheduleChangeAt === "cycle_end" &&
        Number(providerSubscription.current_end) > 0
          ? Math.max(
              Number(providerSubscription.current_end),
              Math.floor(Date.now() / 1000) + 60,
            )
          : undefined;
      const metadataNotes = Object.fromEntries(
        Object.entries(request.metadata || {})
          .map(([key, value]) => [key, noteValue(value)] as const)
          .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
      );
      const replacement = await getRazorpay().subscriptions.create({
        plan_id: targetProviderPlanId,
        total_count: request.targetBillingCycle === "monthly" ? 120 : 10,
        customer_notify: 1,
        ...(startAt ? { start_at: startAt } : {}),
        notes: {
          ...metadataNotes,
          subscriptionType: request.subscriptionKind,
          buyerId: userId,
          productId: request.targetProductId,
          amount: String(amountInRupees),
          billingCycle: request.targetBillingCycle,
          replacementForSubscriptionId: request.subscriptionId,
          replacementTiming: request.scheduleChangeAt,
          individualChangeId: String(change._id),
        },
      } as any);
      const effectiveAt = startAt ? new Date(startAt * 1000) : new Date();
      change.replacementSubscriptionId = replacement.id;
      change.effectiveAt = effectiveAt;
      await change.save();

      return res.status(200).json({
        success: true,
        data: {
          changeId: String(change._id),
          subscriptionId: replacement.id,
          previousSubscriptionId: request.subscriptionId,
          status: "replacement_checkout_required",
          scheduleChangeAt: request.scheduleChangeAt,
          effectiveAt,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    };

    if (!canUpdateRazorpaySubscription(providerSubscription.status)) {
      try {
        return await createReplacementCheckout();
      } catch (error) {
        await IndividualSubscriptionChange.updateOne(
          { _id: change._id, status: "pending" },
          { $set: { status: "failed" } },
        );
        throw error;
      }
    }

    let updated: any;
    try {
      updated = await getRazorpay().subscriptions.update(request.subscriptionId, {
        plan_id: targetProviderPlanId,
        schedule_change_at: request.scheduleChangeAt,
      });
    } catch (error) {
      if (shouldUseIndividualReplacementCheckout(error)) {
        try {
          return await createReplacementCheckout();
        } catch (replacementError) {
          await IndividualSubscriptionChange.updateOne(
            { _id: change._id, status: "pending" },
            { $set: { status: "failed" } },
          );
          throw replacementError;
        }
      }
      await IndividualSubscriptionChange.updateOne(
        { _id: change._id, status: "pending" },
        { $set: { status: "failed" } },
      );
      throw error;
    }
    const currentEnd = Number((updated as any).current_end || providerSubscription.current_end);
    const effectiveAt =
      request.scheduleChangeAt === "cycle_end" && currentEnd > 0
        ? new Date(currentEnd * 1000)
        : new Date();

    await IndividualSubscriptionChange.updateOne(
      { _id: change._id },
      { $set: { effectiveAt } },
    );

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId: request.subscriptionId,
        status: "pending_provider_confirmation",
        scheduleChangeAt: request.scheduleChangeAt,
        effectiveAt,
      },
    });
  } catch (error: any) {
    console.error("Unable to change Razorpay subscription:", error);
    return res.status(500).json({
      success: false,
      error: error?.error?.description || error?.message || "Unable to change subscription",
    });
  }
};

export const abandonIndividualSubscriptionChangeController = async (
  req: Request,
  res: Response,
) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
  const parsed = abandonSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Invalid change checkout" });
  }

  try {
    const change = await IndividualSubscriptionChange.findOne({
      _id: parsed.data.changeId,
      clerkId: userId,
      status: "pending",
      replacementSubscriptionId: { $exists: true },
    });
    if (!change?.replacementSubscriptionId) {
      return res.status(404).json({ success: false, error: "Pending replacement checkout not found" });
    }
    const replacement = await getRazorpay().subscriptions.fetch(
      change.replacementSubscriptionId,
    );
    const status = String(replacement.status || "");
    if (!["created", "cancelled", "expired"].includes(status)) {
      return res.status(409).json({
        success: false,
        error: "This replacement has already been authorized and cannot be discarded",
      });
    }
    if (status === "created") {
      await getRazorpay().subscriptions.cancel(
        change.replacementSubscriptionId,
        false,
      );
    }
    change.status = "cancelled";
    await change.save();
    return res.status(200).json({
      success: true,
      data: { status: "cancelled" },
    });
  } catch (error: any) {
    console.error("Unable to abandon individual subscription change:", error);
    return res.status(500).json({
      success: false,
      error: error?.error?.description || error?.message || "Unable to discard checkout",
    });
  }
};
