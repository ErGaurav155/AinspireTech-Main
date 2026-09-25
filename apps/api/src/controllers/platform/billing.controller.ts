import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import AddonDefinition from "@/models/billing/AddonDefinition.model";
import PlanDefinition from "@/models/billing/PlanDefinition.model";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";
import { writePlatformAuditLog } from "@/services/audit/platform-audit.service";
import { getRazorpay } from "@/utils/util";

const planCheckoutSchema = z.object({ planCode: z.string().trim().min(2).max(100) }).strict();
const addonCheckoutSchema = z
  .object({ addonCode: z.string().trim().min(2).max(100), quantity: z.number().int().min(1).max(100) })
  .strict();
const addonQuantitySchema = z.object({ quantity: z.number().int().min(0).max(100) }).strict();

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data, timestamp: new Date().toISOString() });
const fail = (res: Response, status: number, error: string, details?: unknown) =>
  res.status(status).json({ success: false, error, ...(details ? { details } : {}), timestamp: new Date().toISOString() });

const checkoutKey = (req: Request, type: string) => {
  const key = String(req.headers["x-idempotency-key"] || "").trim();
  return /^[A-Za-z0-9:_-]{8,200}$/.test(key)
    ? `${type}:${req.agencyContext!.agencyId}:${key}`
    : null;
};

export const listAgencyPlansController = async (req: Request, res: Response) => {
  try {
    const [plans, addons] = await Promise.all([
      PlanDefinition.find({ accountType: "AGENCY", active: true })
        .select("code revision name description billingInterval price currency features limits kind")
        .sort({ price: 1 })
        .lean(),
      AddonDefinition.find({ accountTypes: "AGENCY", active: true })
        .select("code revision name billingInterval price currency entitlementChanges limitOperation")
        .sort({ price: 1 })
        .lean(),
    ]);
    return ok(res, { plans, addons });
  } catch (error) {
    console.error("Unable to list agency plans:", error);
    return fail(res, 500, "Unable to list plans");
  }
};

export const createAgencyPlanCheckoutController = async (req: Request, res: Response) => {
  const parsed = planCheckoutSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());
  const key = checkoutKey(req, "plan");
  if (!key) return fail(res, 400, "A valid X-Idempotency-Key header is required");
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);

  try {
    const existingCheckout = await PlatformSubscription.findOne({ checkoutIdempotencyKey: key }).lean();
    if (existingCheckout) {
      return ok(res, {
        subscriptionId: existingCheckout.providerSubscriptionId,
        localSubscriptionId: String(existingCheckout._id),
        status: existingCheckout.status,
      });
    }

    const plan = await PlanDefinition.findOne({
      code: parsed.data.planCode.toLowerCase(),
      accountType: "AGENCY",
      active: true,
    }).sort({ revision: -1 });
    if (!plan || !plan.razorpay?.planId) return fail(res, 404, "Plan is not available");

    const current = await PlatformSubscription.findOne({
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      status: { $in: ["active", "trialing", "past_due"] },
    }).sort({ createdAt: -1 });

    if (current?.provider === "razorpay" && current.providerSubscriptionId) {
      const currentPlan = await PlanDefinition.findById(current.planId).lean();
      const isDowngrade = Number(plan.price) < Number(currentPlan?.price || 0);
      const providerSubscription = await getRazorpay().subscriptions.update(
        current.providerSubscriptionId,
        {
          plan_id: plan.razorpay.planId,
          schedule_change_at: isDowngrade ? "cycle_end" : "now",
        },
      );
      current.pendingChange = {
        planId: plan._id,
        planCode: plan.code,
        effectiveAt: isDowngrade && current.currentPeriodEnd ? current.currentPeriodEnd : new Date(),
        status: "pending",
      };
      current.checkoutIdempotencyKey = key;
      await current.save();
      await writePlatformAuditLog({
        req,
        action: isDowngrade ? "plan.downgrade_requested" : "plan.upgrade_requested",
        targetType: "subscription",
        targetId: String(current._id),
        metadata: { fromPlan: current.planCode, toPlan: plan.code, effective: isDowngrade ? "cycle_end" : "provider_confirmation" },
      });
      return ok(res, {
        subscriptionId: providerSubscription.id,
        localSubscriptionId: String(current._id),
        status: "pending_provider_confirmation",
        effectiveAt: current.pendingChange.effectiveAt,
      });
    }

    const local = await PlatformSubscription.create({
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      planId: plan._id,
      planCode: plan.code,
      planRevision: plan.revision,
      provider: "razorpay",
      status: "pending",
      billingInterval: plan.billingInterval,
      cancelAtPeriodEnd: false,
      checkoutIdempotencyKey: key,
    });
    try {
      const providerSubscription = await getRazorpay().subscriptions.create({
        plan_id: plan.razorpay.planId,
        total_count: plan.billingInterval === "monthly" ? 120 : 10,
        customer_notify: 1,
        ...(plan.razorpay.offerId ? { offer_id: plan.razorpay.offerId } : {}),
        notes: {
          platformType: "plan",
          platformSubscriptionId: String(local._id),
          ownerType: "AGENCY",
          ownerId: String(agencyId),
          planCode: plan.code,
          planRevision: plan.revision,
          requestedBy: req.agencyContext!.userId,
        },
      });
      local.providerSubscriptionId = providerSubscription.id;
      await local.save();
      return ok(res, {
        subscriptionId: providerSubscription.id,
        localSubscriptionId: String(local._id),
        status: "pending_payment",
        keyId: process.env.RAZORPAY_KEY_ID,
      }, 201);
    } catch (error) {
      await PlatformSubscription.updateOne(
        { _id: local._id },
        { $set: { status: "cancelled", cancelledAt: new Date() } },
      );
      throw error;
    }
  } catch (error) {
    console.error("Unable to create plan checkout:", error);
    return fail(res, 500, "Unable to create plan checkout");
  }
};

export const createAgencyAddonCheckoutController = async (req: Request, res: Response) => {
  const parsed = addonCheckoutSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());
  const key = checkoutKey(req, "addon");
  if (!key) return fail(res, 400, "A valid X-Idempotency-Key header is required");
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
  try {
    const existing = await PurchasedAddon.findOne({ checkoutIdempotencyKey: key }).lean();
    if (existing) return ok(res, { localAddonId: String(existing._id), subscriptionId: existing.providerReference, status: existing.status });
    const addon = await AddonDefinition.findOne({
      code: parsed.data.addonCode.toLowerCase(),
      accountTypes: "AGENCY",
      active: true,
    }).sort({ revision: -1 });
    if (!addon?.razorpay?.planId) return fail(res, 404, "Add-on is not available");
    const baseSubscription = await PlatformSubscription.findOne({
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      status: { $in: ["active", "trialing"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!baseSubscription) return fail(res, 409, "An active agency plan is required before purchasing add-ons");
    if (baseSubscription.billingInterval !== addon.billingInterval) {
      return fail(res, 409, `Choose the ${baseSubscription.billingInterval} version of this add-on`);
    }
    const purchase = await PurchasedAddon.create({
      ownerType: "AGENCY",
      ownerId: agencyId,
      addonId: addon._id,
      addonCode: addon.code,
      addonRevision: addon.revision,
      quantity: parsed.data.quantity,
      provider: "razorpay",
      status: "pending",
      cancelAtPeriodEnd: false,
      checkoutIdempotencyKey: key,
    });
    try {
      const providerSubscription = await getRazorpay().subscriptions.create({
        plan_id: addon.razorpay.planId,
        total_count: addon.billingInterval === "monthly" ? 120 : 10,
        quantity: parsed.data.quantity,
        customer_notify: 1,
        ...(addon.razorpay.offerId ? { offer_id: addon.razorpay.offerId } : {}),
        notes: {
          platformType: "addon",
          purchasedAddonId: String(purchase._id),
          ownerType: "AGENCY",
          ownerId: String(agencyId),
          addonCode: addon.code,
          addonRevision: addon.revision,
          requestedBy: req.agencyContext!.userId,
        },
      });
      purchase.providerReference = providerSubscription.id;
      await purchase.save();
      return ok(res, {
        subscriptionId: providerSubscription.id,
        localAddonId: String(purchase._id),
        status: "pending_payment",
        keyId: process.env.RAZORPAY_KEY_ID,
      }, 201);
    } catch (error) {
      await PurchasedAddon.updateOne({ _id: purchase._id }, { $set: { status: "cancelled" } });
      throw error;
    }
  } catch (error) {
    console.error("Unable to create add-on checkout:", error);
    return fail(res, 500, "Unable to create add-on checkout");
  }
};

export const updateAgencyAddonController = async (req: Request, res: Response) => {
  const parsed = addonQuantitySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid add-on quantity", parsed.error.flatten());
  const purchaseId = String(req.params.purchaseId || "");
  if (!Types.ObjectId.isValid(purchaseId)) return fail(res, 400, "Invalid add-on purchase id");
  try {
    const purchase = await PurchasedAddon.findOne({
      _id: new Types.ObjectId(purchaseId),
      ownerType: "AGENCY",
      ownerId: new Types.ObjectId(req.agencyContext!.agencyId),
      provider: "razorpay",
      status: { $in: ["active", "past_due"] },
    });
    if (!purchase?.providerReference) return fail(res, 404, "Active add-on not found");

    if (parsed.data.quantity === 0) {
      await getRazorpay().subscriptions.cancel(purchase.providerReference, true);
      purchase.cancelAtPeriodEnd = true;
      purchase.pendingChange = {
        quantity: 0,
        effectiveAt: purchase.currentPeriodEnd,
        status: "pending",
      };
      await purchase.save();
      await writePlatformAuditLog({
        req,
        action: "addon.cancellation_scheduled",
        targetType: "purchased_addon",
        targetId: String(purchase._id),
        metadata: { effectiveAt: purchase.currentPeriodEnd },
      });
      return ok(res, {
        purchaseId: String(purchase._id),
        status: "active_until_period_end",
        effectiveAt: purchase.currentPeriodEnd,
      });
    }

    await getRazorpay().subscriptions.update(purchase.providerReference, {
      quantity: parsed.data.quantity,
      schedule_change_at: "cycle_end",
    });
    purchase.pendingChange = {
      quantity: parsed.data.quantity,
      effectiveAt: purchase.currentPeriodEnd,
      status: "pending",
    };
    await purchase.save();
    await writePlatformAuditLog({
      req,
      action: "addon.quantity_change_scheduled",
      targetType: "purchased_addon",
      targetId: String(purchase._id),
      metadata: { currentQuantity: purchase.quantity, requestedQuantity: parsed.data.quantity },
    });
    return ok(res, {
      purchaseId: String(purchase._id),
      currentQuantity: purchase.quantity,
      pendingQuantity: parsed.data.quantity,
      effectiveAt: purchase.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Unable to update add-on:", error);
    return fail(res, 500, "Unable to update add-on");
  }
};

export const createWorkspacePlanCheckoutController = async (req: Request, res: Response) => {
  const context = req.platformContext;
  if (!context || context.billingOwnerType !== "WORKSPACE" || context.billingOwnerId !== context.workspaceId) {
    return fail(res, 403, "This workspace does not own its billing");
  }
  const parsed = planCheckoutSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());
  const rawKey = String(req.headers["x-idempotency-key"] || "").trim();
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(rawKey)) {
    return fail(res, 400, "A valid X-Idempotency-Key header is required");
  }
  const key = `plan:${context.workspaceId}:${rawKey}`;
  const ownerId = new Types.ObjectId(context.workspaceId);
  try {
    const existing = await PlatformSubscription.findOne({ checkoutIdempotencyKey: key }).lean();
    if (existing) return ok(res, { localSubscriptionId: String(existing._id), subscriptionId: existing.providerSubscriptionId, status: existing.status });
    const plan = await PlanDefinition.findOne({
      code: parsed.data.planCode.toLowerCase(),
      accountType: "BUSINESS",
      active: true,
    }).sort({ revision: -1 });
    if (!plan?.razorpay?.planId) return fail(res, 404, "Plan is not available");

    const current = await PlatformSubscription.findOne({
      ownerType: "WORKSPACE",
      ownerId,
      kind: "base",
      provider: "razorpay",
      status: { $in: ["active", "trialing", "past_due"] },
      providerSubscriptionId: { $exists: true },
    }).sort({ createdAt: -1 });
    if (current?.providerSubscriptionId) {
      const currentPlan = await PlanDefinition.findById(current.planId).lean();
      const isDowngrade = Number(plan.price) < Number(currentPlan?.price || 0);
      await getRazorpay().subscriptions.update(current.providerSubscriptionId, {
        plan_id: plan.razorpay.planId,
        schedule_change_at: isDowngrade ? "cycle_end" : "now",
      });
      current.pendingChange = {
        planId: plan._id,
        planCode: plan.code,
        effectiveAt: isDowngrade && current.currentPeriodEnd ? current.currentPeriodEnd : new Date(),
        status: "pending",
      };
      current.checkoutIdempotencyKey = key;
      await current.save();
      return ok(res, {
        localSubscriptionId: String(current._id),
        subscriptionId: current.providerSubscriptionId,
        status: "pending_provider_confirmation",
      });
    }

    const local = await PlatformSubscription.create({
      ownerType: "WORKSPACE",
      ownerId,
      kind: "base",
      planId: plan._id,
      planCode: plan.code,
      planRevision: plan.revision,
      provider: "razorpay",
      status: "pending",
      billingInterval: plan.billingInterval,
      cancelAtPeriodEnd: false,
      checkoutIdempotencyKey: key,
    });
    try {
      const provider = await getRazorpay().subscriptions.create({
        plan_id: plan.razorpay.planId,
        total_count: plan.billingInterval === "monthly" ? 120 : 10,
        customer_notify: 1,
        ...(plan.razorpay.offerId ? { offer_id: plan.razorpay.offerId } : {}),
        notes: {
          platformType: "plan",
          platformSubscriptionId: String(local._id),
          ownerType: "WORKSPACE",
          ownerId: String(ownerId),
          planCode: plan.code,
          planRevision: plan.revision,
          requestedBy: context.userId,
        },
      });
      local.providerSubscriptionId = provider.id;
      await local.save();
      return ok(res, {
        localSubscriptionId: String(local._id),
        subscriptionId: provider.id,
        status: "pending_payment",
        keyId: process.env.RAZORPAY_KEY_ID,
      }, 201);
    } catch (error) {
      await PlatformSubscription.updateOne({ _id: local._id }, { $set: { status: "cancelled", cancelledAt: new Date() } });
      throw error;
    }
  } catch (error) {
    console.error("Unable to create workspace plan checkout:", error);
    return fail(res, 500, "Unable to create workspace plan checkout");
  }
};
