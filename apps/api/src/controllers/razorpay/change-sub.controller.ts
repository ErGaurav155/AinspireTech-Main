import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import { z } from "zod";
import IndividualSubscriptionChange from "@/models/billing/IndividualSubscriptionChange.model";
import Plan from "@/models/plan.model";
import {
  findOwnedIndividualSubscription,
} from "@/services/billing/individual-subscription-change.service";
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

    let updated: any;
    try {
      updated = await getRazorpay().subscriptions.update(request.subscriptionId, {
        plan_id: targetProviderPlanId,
        schedule_change_at: request.scheduleChangeAt,
      });
    } catch (error) {
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
