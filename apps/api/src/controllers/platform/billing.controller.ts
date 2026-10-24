import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import AddonDefinition from "@/models/billing/AddonDefinition.model";
import PlanDefinition from "@/models/billing/PlanDefinition.model";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import { writePlatformAuditLog } from "@/services/audit/platform-audit.service";
import { syncPlatformCatalog } from "@/services/billing/platform-catalog-sync.service";
import { getRazorpay } from "@/utils/util";
import {
  AGENCY_ADDONS_ENABLED,
  RETIRED_AGENCY_ADDON_CODES,
} from "@/config/platform-catalog.config";
import { ensurePlatformBillingIndexes } from "@/services/billing/platform-billing-index.service";
import { getPlanChangePolicy } from "@/services/billing/plan-change-policy.service";
import { resolvePromotionCode } from "@/services/billing/promotion.service";

const retiredAgencyAddonCodes = new Set<string>(RETIRED_AGENCY_ADDON_CODES);

const isUpiSubscriptionUpdateError = (error: any) =>
  Number(error?.statusCode) === 400 &&
  /subscriptions cannot be updated when payment mode is upi/i.test(
    String(error?.error?.description || error?.message || ""),
  );

const createAgencyReplacementSubscription = async ({
  req,
  agencyId,
  current,
  plan,
  scheduleChangeAt,
  checkoutKeyValue,
  retainedWorkspaceIds,
  targetClientLimit,
  offerId,
  promotionCode,
}: {
  req: Request;
  agencyId: Types.ObjectId;
  current: any;
  plan: any;
  scheduleChangeAt: "now" | "cycle_end";
  checkoutKeyValue: string;
  retainedWorkspaceIds?: Types.ObjectId[];
  targetClientLimit?: number;
  offerId?: string;
  promotionCode?: string;
}) => {
  const replacement = await PlatformSubscription.create({
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
    checkoutIdempotencyKey: checkoutKeyValue,
    replacementForSubscriptionId: current._id,
    replacementTiming: scheduleChangeAt,
  });

  try {
    const startAt =
      scheduleChangeAt === "cycle_end" && current.currentPeriodEnd
        ? Math.max(
            Math.floor(new Date(current.currentPeriodEnd).getTime() / 1000),
            Math.floor(Date.now() / 1000) + 60,
          )
        : undefined;
    const providerSubscription = await getRazorpay().subscriptions.create({
      plan_id: plan.razorpay.planId,
      total_count: plan.billingInterval === "monthly" ? 120 : 10,
      customer_notify: 1,
      ...(startAt ? { start_at: startAt } : {}),
      ...(offerId ? { offer_id: offerId } : {}),
      notes: {
        platformType: "plan",
        platformSubscriptionId: String(replacement._id),
        replacementForPlatformSubscriptionId: String(current._id),
        replacementTiming: scheduleChangeAt,
        ownerType: "AGENCY",
        ownerId: String(agencyId),
        planCode: plan.code,
        planRevision: plan.revision,
        requestedBy: req.agencyContext!.userId,
        promotionCode: promotionCode || "",
      },
    } as any);
    replacement.providerSubscriptionId = providerSubscription.id;
    await replacement.save();
    current.replacedBySubscriptionId = replacement._id;
    current.pendingChange = {
      planId: plan._id,
      planCode: plan.code,
      effectiveAt:
        scheduleChangeAt === "cycle_end" && current.currentPeriodEnd
          ? current.currentPeriodEnd
          : new Date(),
      status: "pending",
      ...(retainedWorkspaceIds
        ? {
            retainedWorkspaceIds,
            targetClientLimit,
            clientCleanupStatus: "pending" as const,
          }
        : {}),
    };
    await current.save();
    return { replacement, providerSubscription };
  } catch (error) {
    await PlatformSubscription.updateOne(
      { _id: replacement._id },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
    );
    throw error;
  }
};

const planCheckoutSchema = z
  .object({
    planCode: z.string().trim().min(2).max(100),
    scheduleChangeAt: z.enum(["now", "cycle_end"]).optional(),
    retainedWorkspaceIds: z
      .array(
        z.string().refine((value) => Types.ObjectId.isValid(value), {
          message: "Invalid workspace id",
        }),
      )
      .max(500)
      .optional(),
    promoCode: z.string().trim().min(2).max(40).optional(),
    downgradeConfirmations: z
      .object({
        deleteNonSelectedClientData: z.literal(true),
        removeNonSelectedClerkOrganizations: z.literal(true),
        permanentAndIrreversible: z.literal(true),
      })
      .strict()
      .optional(),
  })
  .strict();
const cancelAgencyPlanSchema = z
  .object({
    confirmations: z
      .object({
        removeClientAccess: z.literal(true),
        deleteAutomationData: z.literal(true),
        deleteLeadsAndAppointments: z.literal(true),
        permanentAndIrreversible: z.literal(true),
      })
      .strict(),
  })
  .strict();
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
    const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
    let plans = await PlanDefinition.find({ accountType: "AGENCY", active: true })
      .select("code revision name description billingInterval price currency features limits kind")
      .sort({ price: 1 })
      .lean();

    // A fresh production database may only contain the legacy Plan records.
    // Materialize the platform catalog once instead of returning a blank page.
    if (plans.length === 0) {
      await syncPlatformCatalog();
      plans = await PlanDefinition.find({ accountType: "AGENCY", active: true })
        .select("code revision name description billingInterval price currency features limits kind")
        .sort({ price: 1 })
        .lean();
    }

    let currentSubscription = await PlatformSubscription.findOne({
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      status: { $in: ["active", "trialing", "past_due", "paused"] },
    })
      .sort({ createdAt: -1 })
      .select(
        "planCode status billingInterval currentPeriodStart currentPeriodEnd cancelAtPeriodEnd pendingChange createdAt updatedAt",
      )
      .lean();
    if (!currentSubscription) {
      currentSubscription = await PlatformSubscription.findOne({
        ownerType: "AGENCY",
        ownerId: agencyId,
        kind: "base",
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .select(
          "planCode status billingInterval currentPeriodStart currentPeriodEnd cancelAtPeriodEnd pendingChange createdAt updatedAt",
        )
        .lean();
    }
    const pendingReplacement = currentSubscription?.pendingChange
      ? await PlatformSubscription.exists({
          replacementForSubscriptionId: currentSubscription._id,
          planCode: currentSubscription.pendingChange.planCode,
          status: "pending",
          providerSubscriptionId: { $type: "string" },
        })
      : null;

    return ok(res, {
      plans,
      addons: [],
      currentSubscription: currentSubscription
        ? {
            id: String(currentSubscription._id),
            planCode: currentSubscription.planCode,
            status: currentSubscription.status,
            billingInterval: currentSubscription.billingInterval,
            currentPeriodStart: currentSubscription.currentPeriodStart,
            currentPeriodEnd: currentSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd,
            pendingChange:
              currentSubscription.pendingChange?.status === "pending"
                ? {
                    planCode: currentSubscription.pendingChange.planCode,
                    effectiveAt: currentSubscription.pendingChange.effectiveAt,
                    status: currentSubscription.pendingChange.status,
                    requiresCheckout: Boolean(pendingReplacement),
                    pendingCheckoutId: pendingReplacement
                      ? String(pendingReplacement._id)
                      : undefined,
                  }
                : null,
          }
        : null,
    });
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
    await ensurePlatformBillingIndexes();
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
    const promotion = await resolvePromotionCode({
      code: parsed.data.promoCode,
      accountType: "AGENCY",
      planCode: plan.code,
      productId: plan.razorpay.productId,
      billingInterval: plan.billingInterval,
    });
    const checkoutOfferId = promotion?.razorpayOfferId || plan.razorpay.offerId;

    const current = await PlatformSubscription.findOne({
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      status: { $in: ["active", "trialing", "past_due"] },
    }).sort({ createdAt: -1 });

    if (current?.provider === "razorpay" && current.providerSubscriptionId) {
      if (current.cancelAtPeriodEnd) {
        return fail(res, 409, "This subscription is already scheduled for cancellation", {
          code: "PLAN_CANCELLATION_PENDING",
        });
      }
      const currentPlan = await PlanDefinition.findById(current.planId).lean();
      if (!currentPlan) return fail(res, 409, "Current plan configuration is unavailable");
      if (current.pendingChange?.status === "pending") {
        const pendingReplacement = await PlatformSubscription.findOne({
          replacementForSubscriptionId: current._id,
          planCode: plan.code,
          provider: "razorpay",
          status: "pending",
          providerSubscriptionId: { $type: "string" },
        })
          .sort({ createdAt: -1 })
          .lean();
        if (pendingReplacement?.providerSubscriptionId) {
          return ok(res, {
            subscriptionId: pendingReplacement.providerSubscriptionId,
            localSubscriptionId: String(pendingReplacement._id),
            status: "pending_payment",
            replacementCheckout: true,
            scheduleChangeAt: pendingReplacement.replacementTiming,
            effectiveAt: current.pendingChange.effectiveAt,
            keyId: process.env.RAZORPAY_KEY_ID,
          });
        }
        return fail(
          res,
          409,
          `A change to ${current.pendingChange.planCode} is already pending`,
          { code: "PLAN_CHANGE_PENDING" },
        );
      }

      const policy = getPlanChangePolicy(
        {
          code: currentPlan.code,
          billingInterval: currentPlan.billingInterval,
          price: currentPlan.price,
          limits: currentPlan.limits as Record<string, unknown>,
        },
        {
          code: plan.code,
          billingInterval: plan.billingInterval,
          price: plan.price,
          limits: plan.limits as Record<string, unknown>,
        },
      );
      if (policy.type === "same") {
        return fail(res, 409, "This is already your current plan", {
          code: "PLAN_ALREADY_ACTIVE",
        });
      }

      const scheduleChangeAt = parsed.data.scheduleChangeAt;
      if (!scheduleChangeAt) {
        return fail(
          res,
          400,
          "Choose whether the plan change should happen immediately or at the end of the billing cycle",
        );
      }

      const targetClientLimit = Number(plan.limits?.clientWorkspaces ?? 0);
      let retainedWorkspaceIds: Types.ObjectId[] | undefined;
      const currentClientLimit = Number(currentPlan.limits?.clientWorkspaces ?? 0);
      const reducesClientCapacity =
        Number.isFinite(targetClientLimit) &&
        targetClientLimit >= 0 &&
        (currentClientLimit < 0 || targetClientLimit < currentClientLimit);
      if (reducesClientCapacity) {
        const activeRelationships = await AgencyClient.find({
          agencyId,
          status: { $in: ["provisioning", "active", "suspended"] },
        })
          .select("workspaceId")
          .lean();
        if (activeRelationships.length > targetClientLimit) {
          const requested = parsed.data.retainedWorkspaceIds;
          const uniqueRequested = requested ? [...new Set(requested)] : [];
          if (
            !requested ||
            !parsed.data.downgradeConfirmations ||
            uniqueRequested.length !== targetClientLimit
          ) {
            return fail(
              res,
              409,
              `Select exactly ${targetClientLimit} client${targetClientLimit === 1 ? "" : "s"} to keep before downgrading`,
              {
                code: "DOWNGRADE_CLIENT_SELECTION_REQUIRED",
                activeClientCount: activeRelationships.length,
                targetClientLimit,
              },
            );
          }
          const allowedWorkspaceIds = new Set(
            activeRelationships.map((item) => String(item.workspaceId)),
          );
          if (uniqueRequested.some((workspaceId) => !allowedWorkspaceIds.has(workspaceId))) {
            return fail(res, 403, "One or more selected clients do not belong to this agency", {
              code: "INVALID_RETAINED_CLIENT",
            });
          }
          retainedWorkspaceIds = uniqueRequested.map(
            (workspaceId) => new Types.ObjectId(workspaceId),
          );
        } else {
          retainedWorkspaceIds = activeRelationships.map(
            (item) => new Types.ObjectId(String(item.workspaceId)),
          );
        }
      }

      const provisionalEffectiveAt =
        scheduleChangeAt === "cycle_end" && current.currentPeriodEnd
          ? current.currentPeriodEnd
          : new Date();
      current.pendingChange = {
        planId: plan._id,
        planCode: plan.code,
        effectiveAt: provisionalEffectiveAt,
        status: "pending",
        ...(retainedWorkspaceIds
          ? {
              retainedWorkspaceIds,
              targetClientLimit,
              offerId: checkoutOfferId,
              promotionCode: promotion?.code,
              clientCleanupStatus: "pending" as const,
            }
          : {}),
      };
      // Reserve the change before calling Razorpay. A fast webhook can now
      // always find the retention decision and cannot apply a destructive
      // downgrade without it.
      await current.save();

      if (promotion) {
        try {
          const replacementResult = await createAgencyReplacementSubscription({
            req,
            agencyId,
            current,
            plan,
            scheduleChangeAt,
            checkoutKeyValue: key,
            retainedWorkspaceIds,
            targetClientLimit,
            offerId: checkoutOfferId,
            promotionCode: promotion.code,
          });
          await writePlatformAuditLog({
            req,
            action: "plan.promotion_checkout_created",
            targetType: "subscription",
            targetId: String(replacementResult.replacement._id),
            metadata: {
              fromPlan: current.planCode,
              toPlan: plan.code,
              promotionCode: promotion.code,
              effective: scheduleChangeAt,
            },
          });
          return ok(
            res,
            {
              subscriptionId: replacementResult.providerSubscription.id,
              localSubscriptionId: String(replacementResult.replacement._id),
              status: "pending_payment",
              replacementCheckout: true,
              scheduleChangeAt,
              effectiveAt: current.pendingChange?.effectiveAt,
              promotion: {
                code: promotion.code,
                name: promotion.name,
                durationCycles: promotion.durationCycles,
              },
              keyId: process.env.RAZORPAY_KEY_ID,
            },
            201,
          );
        } catch (promotionError) {
          current.pendingChange = undefined;
          await current.save().catch(() => undefined);
          throw promotionError;
        }
      }

      let providerSubscription: any;
      try {
        providerSubscription = await getRazorpay().subscriptions.update(
          current.providerSubscriptionId,
          {
            plan_id: plan.razorpay.planId,
            schedule_change_at: scheduleChangeAt,
          },
        );
      } catch (error) {
        if (!isUpiSubscriptionUpdateError(error)) {
          current.pendingChange = undefined;
          await current.save();
          throw error;
        }

        // Razorpay cannot mutate UPI-backed subscriptions. Keep the paid
        // subscription active and ask the customer to authorize a replacement
        // mandate. Webhooks switch entitlements and retire the old mandate only
        // after the replacement is authenticated/activated.
        let replacement: any;
        let created: any;
        try {
          const replacementResult = await createAgencyReplacementSubscription({
              req,
              agencyId,
              current,
              plan,
              scheduleChangeAt,
              checkoutKeyValue: key,
              retainedWorkspaceIds,
              targetClientLimit,
            });
          replacement = replacementResult.replacement;
          created = replacementResult.providerSubscription;
        } catch (replacementError) {
          current.pendingChange = undefined;
          await current.save().catch(() => undefined);
          throw replacementError;
        }
        await writePlatformAuditLog({
          req,
          action: "plan.replacement_checkout_created",
          targetType: "subscription",
          targetId: String(replacement._id),
          metadata: {
            fromPlan: current.planCode,
            toPlan: plan.code,
            effective: scheduleChangeAt,
            reason: "razorpay_upi_update_not_supported",
          },
        });
        return ok(
          res,
          {
            subscriptionId: created.id,
            localSubscriptionId: String(replacement._id),
            status: "pending_payment",
            replacementCheckout: true,
            scheduleChangeAt,
            effectiveAt: current.pendingChange?.effectiveAt,
            keyId: process.env.RAZORPAY_KEY_ID,
          },
          201,
        );
      }
      const providerPeriodEnd = Number((providerSubscription as any).current_end);
      const cycleEnd =
        current.currentPeriodEnd ||
        (Number.isFinite(providerPeriodEnd) && providerPeriodEnd > 0
          ? new Date(providerPeriodEnd * 1000)
          : new Date());
      const effectiveAt = scheduleChangeAt === "cycle_end" ? cycleEnd : new Date();
      await PlatformSubscription.updateOne(
        { _id: current._id, "pendingChange.status": "pending" },
        {
          $set: {
            "pendingChange.effectiveAt": effectiveAt,
            checkoutIdempotencyKey: key,
          },
        },
      );
      await writePlatformAuditLog({
        req,
        action:
          policy.type === "upgrade"
            ? "plan.upgrade_requested"
            : policy.type === "downgrade"
              ? "plan.downgrade_requested"
              : "plan.billing_interval_change_requested",
        targetType: "subscription",
        targetId: String(current._id),
        metadata: {
          fromPlan: current.planCode,
          toPlan: plan.code,
          changeType: policy.type,
          effective: scheduleChangeAt,
        },
      });
      return ok(res, {
        subscriptionId: providerSubscription.id,
        localSubscriptionId: String(current._id),
        status: "pending_provider_confirmation",
        changeType: policy.type,
        scheduleChangeAt,
        effectiveAt,
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
        ...(checkoutOfferId ? { offer_id: checkoutOfferId } : {}),
        notes: {
          platformType: "plan",
          platformSubscriptionId: String(local._id),
          ownerType: "AGENCY",
          ownerId: String(agencyId),
          planCode: plan.code,
          planRevision: plan.revision,
          requestedBy: req.agencyContext!.userId,
          promotionCode: promotion?.code || "",
        },
      });
      local.providerSubscriptionId = providerSubscription.id;
      await local.save();
      return ok(res, {
        subscriptionId: providerSubscription.id,
        localSubscriptionId: String(local._id),
        status: "pending_payment",
        promotion: promotion
          ? {
              code: promotion.code,
              name: promotion.name,
              durationCycles: promotion.durationCycles,
            }
          : undefined,
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
    if (error instanceof Error && error.message.startsWith("Coupon is")) {
      return fail(res, 400, error.message, { code: "INVALID_PROMOTION_CODE" });
    }
    return fail(res, 500, "Unable to create plan checkout");
  }
};

export const abandonAgencyPlanCheckoutController = async (
  req: Request,
  res: Response,
) => {
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
  const subscriptionId = String(req.params.subscriptionId || "");
  if (!Types.ObjectId.isValid(subscriptionId)) {
    return fail(res, 400, "Invalid pending checkout id");
  }

  try {
    const replacement = await PlatformSubscription.findOne({
      _id: new Types.ObjectId(subscriptionId),
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      status: "pending",
      replacementForSubscriptionId: { $exists: true },
    });
    if (!replacement) {
      return fail(res, 404, "Pending plan checkout was not found");
    }

    if (replacement.providerSubscriptionId) {
      const providerSubscription = await getRazorpay().subscriptions.fetch(
        replacement.providerSubscriptionId,
      );
      const providerStatus = String((providerSubscription as any).status || "");
      if (!["created", "cancelled", "expired"].includes(providerStatus)) {
        return fail(
          res,
          409,
          "This checkout has already been authorized and can no longer be discarded",
          { code: "PLAN_CHECKOUT_ALREADY_AUTHORIZED" },
        );
      }
      if (providerStatus === "created") {
        await getRazorpay().subscriptions.cancel(
          replacement.providerSubscriptionId,
          false,
        );
      }
    }

    const cancelledAt = new Date();
    const cancelled = await PlatformSubscription.findOneAndUpdate(
      { _id: replacement._id, status: { $in: ["pending", "cancelled"] } },
      { $set: { status: "cancelled", cancelledAt } },
      { new: true },
    );
    if (!cancelled) {
      return fail(res, 409, "This checkout is no longer pending");
    }

    const previous = await PlatformSubscription.findOne({
      _id: replacement.replacementForSubscriptionId,
      ownerType: "AGENCY",
      ownerId: agencyId,
      "pendingChange.status": "pending",
      "pendingChange.planCode": replacement.planCode,
    });
    if (previous) {
      previous.pendingChange = undefined;
      previous.replacedBySubscriptionId = undefined;
      await previous.save();
    }

    await writePlatformAuditLog({
      req,
      action: "plan.replacement_checkout_abandoned",
      targetType: "subscription",
      targetId: String(replacement._id),
      metadata: {
        planCode: replacement.planCode,
        providerSubscriptionId: replacement.providerSubscriptionId,
      },
    });
    return ok(res, { status: "cancelled" });
  } catch (error) {
    console.error("Unable to discard pending agency plan checkout:", error);
    return fail(res, 500, "Unable to discard pending plan checkout");
  }
};

export const cancelAgencyPlanController = async (req: Request, res: Response) => {
  const parsed = cancelAgencyPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(
      res,
      400,
      "All cancellation confirmations are required",
      parsed.error.flatten(),
    );
  }
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
  try {
    const subscription = await PlatformSubscription.findOne({
      ownerType: "AGENCY",
      ownerId: agencyId,
      kind: "base",
      status: { $in: ["active", "trialing", "past_due", "paused"] },
    }).sort({ createdAt: -1 });
    if (!subscription?.providerSubscriptionId || subscription.provider !== "razorpay") {
      return fail(res, 404, "No cancellable agency subscription was found");
    }
    if (subscription.pendingChange?.status === "pending") {
      return fail(res, 409, "Wait for the pending plan change before cancelling", {
        code: "PLAN_CHANGE_PENDING",
      });
    }
    if (subscription.cancelAtPeriodEnd) {
      return ok(res, {
        status: "cancellation_scheduled",
        effectiveAt: subscription.currentPeriodEnd,
      });
    }

    await getRazorpay().subscriptions.cancel(
      subscription.providerSubscriptionId,
      true,
    );
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();
    await writePlatformAuditLog({
      req,
      action: "plan.cancellation_scheduled",
      targetType: "subscription",
      targetId: String(subscription._id),
      metadata: {
        planCode: subscription.planCode,
        effectiveAt: subscription.currentPeriodEnd,
        providerSubscriptionId: subscription.providerSubscriptionId,
      },
    });
    return ok(res, {
      status: "cancellation_scheduled",
      effectiveAt: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Unable to cancel agency plan:", error);
    return fail(res, 500, "Unable to schedule agency plan cancellation");
  }
};

export const createAgencyAddonCheckoutController = async (req: Request, res: Response) => {
  if (!AGENCY_ADDONS_ENABLED) return fail(res, 404, "Agency add-ons are not available");
  const parsed = addonCheckoutSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());
  if (retiredAgencyAddonCodes.has(parsed.data.addonCode.toLowerCase())) {
    return fail(res, 404, "Add-on is not available");
  }
  const key = checkoutKey(req, "addon");
  if (!key) return fail(res, 400, "A valid X-Idempotency-Key header is required");
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
  try {
    await ensurePlatformBillingIndexes();
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
  if (!AGENCY_ADDONS_ENABLED) return fail(res, 404, "Agency add-ons are not available");
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
    await ensurePlatformBillingIndexes();
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
      const scheduleChangeAt = parsed.data.scheduleChangeAt;
      if (!scheduleChangeAt) {
        return fail(
          res,
          400,
          "Choose whether the plan change should happen immediately or at the end of the billing cycle",
        );
      }
      await getRazorpay().subscriptions.update(current.providerSubscriptionId, {
        plan_id: plan.razorpay.planId,
        schedule_change_at: scheduleChangeAt,
      });
      current.pendingChange = {
        planId: plan._id,
        planCode: plan.code,
        effectiveAt:
          scheduleChangeAt === "cycle_end" && current.currentPeriodEnd
            ? current.currentPeriodEnd
            : new Date(),
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
