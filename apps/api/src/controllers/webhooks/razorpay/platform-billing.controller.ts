import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import BillingEvent from "@/models/billing/BillingEvent.model";
import PlanDefinition from "@/models/billing/PlanDefinition.model";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";
import { connectToDatabase } from "@/config/database.config";
import { purgeAgencyClients } from "@/services/tenant/agency-termination.service";
import { syncAgencyUsageLimitSnapshots } from "@/services/usage/agency-entitlement-sync.service";
import { applyConfirmedIndividualSubscriptionChange } from "@/services/billing/individual-subscription-change.service";
import { getRazorpay } from "@/utils/util";

const dateFromSeconds = (value: unknown) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : undefined;
};

const safeEqual = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
};

const localStatus = (event: string, providerStatus: string) => {
  if (["subscription.activated", "subscription.charged", "subscription.resumed"].includes(event)) return "active";
  if (event === "subscription.updated" && providerStatus === "active") return "active";
  if (event === "subscription.pending" || providerStatus === "pending") return "past_due";
  if (event === "subscription.halted" || providerStatus === "halted") return "past_due";
  if (event === "subscription.paused" || providerStatus === "paused") return "paused";
  if (event === "subscription.cancelled" || providerStatus === "cancelled") return "cancelled";
  if (event === "subscription.completed" || providerStatus === "completed") return "expired";
  return null;
};

export const platformRazorpayWebhookController = async (req: Request, res: Response) => {
  const rawBody = String((req as any).rawBody || "");
  const signature = String(req.headers["x-razorpay-signature"] || "");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) {
    return res.status(secret ? 400 : 500).json({ success: false, error: "Webhook configuration or signature is missing" });
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!safeEqual(expected, signature)) {
    return res.status(401).json({ success: false, error: "Invalid signature" });
  }

  let eventRecord: any;
  try {
    const body = JSON.parse(rawBody);
    const entity = body.payload?.subscription?.entity;
    const eventType = String(body.event || "unknown");
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    const providerEventId = String(req.headers["x-razorpay-event-id"] || payloadHash);
    await connectToDatabase();

    eventRecord = await BillingEvent.findOne({ provider: "razorpay", providerEventId });
    if (eventRecord?.status === "processed" || eventRecord?.status === "ignored") {
      return res.status(200).json({ success: true, message: "Webhook already processed" });
    }
    if (eventRecord) {
      eventRecord.status = "processing";
      eventRecord.attempts += 1;
      eventRecord.error = undefined;
      await eventRecord.save();
    } else {
      try {
        eventRecord = await BillingEvent.create({
          provider: "razorpay",
          providerEventId,
          eventType,
          providerResourceId: entity?.id,
          payloadHash,
          status: "processing",
          attempts: 1,
          metadata: {},
        });
      } catch (error: any) {
        if (error?.code === 11000) {
          return res.status(200).json({ success: true, message: "Webhook is already being processed" });
        }
        throw error;
      }
    }

    if (!entity?.id) {
      eventRecord.status = "ignored";
      eventRecord.processedAt = new Date();
      await eventRecord.save();
      return res.status(200).json({ success: true, message: "Non-subscription event ignored" });
    }

    const status = localStatus(eventType, String(entity.status || ""));
    if (eventType === "subscription.authenticated") {
      const authenticatedReplacement = await PlatformSubscription.findOne({
        provider: "razorpay",
        providerSubscriptionId: entity.id,
        replacementForSubscriptionId: { $exists: true },
      });
      if (authenticatedReplacement?.replacementForSubscriptionId) {
        const previous = await PlatformSubscription.findById(
          authenticatedReplacement.replacementForSubscriptionId,
        );
        if (
          previous?.providerSubscriptionId &&
          authenticatedReplacement.replacementTiming === "cycle_end" &&
          !previous.cancelAtPeriodEnd
        ) {
          await getRazorpay().subscriptions.cancel(
            previous.providerSubscriptionId,
            true,
          );
          previous.cancelAtPeriodEnd = true;
          await previous.save();
        }
        eventRecord.status = "processed";
        eventRecord.processedAt = new Date();
        eventRecord.metadata = {
          platformType: "plan_replacement_authenticated",
          localId: String(authenticatedReplacement._id),
        };
        await eventRecord.save();
        return res.status(200).json({
          success: true,
          message: "Replacement mandate authenticated",
        });
      }
    }
    if (!status) {
      eventRecord.status = "ignored";
      eventRecord.processedAt = new Date();
      await eventRecord.save();
      return res.status(200).json({ success: true, message: "Event does not affect entitlements" });
    }

    const notes = entity.notes || {};
    const platformSubscription = await PlatformSubscription.findOne({
      provider: "razorpay",
      providerSubscriptionId: entity.id,
    });
    const purchasedAddon = platformSubscription
      ? null
      : await PurchasedAddon.findOne({ provider: "razorpay", providerReference: entity.id });

    if (platformSubscription) {
      const providerPlanId = String(entity.plan_id || "");
      const confirmedPlan = providerPlanId
        ? await PlanDefinition.findOne({ "razorpay.planId": providerPlanId }).sort({ revision: -1 })
        : null;
      if (["active", "past_due"].includes(status) && !confirmedPlan) {
        throw new Error("Razorpay plan does not map to a configured platform plan");
      }
      if (confirmedPlan) {
        platformSubscription.planId = confirmedPlan._id;
        platformSubscription.planCode = confirmedPlan.code;
        platformSubscription.planRevision = confirmedPlan.revision;
        platformSubscription.billingInterval = confirmedPlan.billingInterval;
        platformSubscription.entitlementSnapshot = {
          features: confirmedPlan.features as Record<string, boolean>,
          limits: confirmedPlan.limits as Record<string, number>,
        };
        if (platformSubscription.pendingChange?.planCode === confirmedPlan.code) {
          platformSubscription.pendingChange.status = "applied";
        }
      }
      platformSubscription.status = status as any;
      platformSubscription.currentPeriodStart = dateFromSeconds(entity.current_start);
      platformSubscription.currentPeriodEnd = dateFromSeconds(entity.current_end);
      platformSubscription.cancelledAt = status === "cancelled" ? new Date() : undefined;
      platformSubscription.lastProviderEventAt = new Date();
      await platformSubscription.save();
      if (
        platformSubscription.replacementForSubscriptionId &&
        status === "active"
      ) {
        const previous = await PlatformSubscription.findById(
          platformSubscription.replacementForSubscriptionId,
        );
        if (previous) {
          previous.replacedBySubscriptionId = platformSubscription._id;
          if (previous.pendingChange) {
            previous.pendingChange.status = "applied";
          }
          if (
            platformSubscription.replacementTiming === "now" &&
            previous.providerSubscriptionId &&
            !previous.cancelledAt
          ) {
            await getRazorpay().subscriptions.cancel(
              previous.providerSubscriptionId,
              false,
            );
            previous.status = "cancelled";
            previous.cancelledAt = new Date();
          }
          await previous.save();
        }
      }
      if (
        confirmedPlan &&
        platformSubscription.ownerType === "AGENCY" &&
        ["active", "trialing"].includes(platformSubscription.status)
      ) {
        await syncAgencyUsageLimitSnapshots({
          agencyId: String(platformSubscription.ownerId),
          limits: confirmedPlan.limits as Record<string, number>,
        });
      }
      const activeReplacement = platformSubscription.replacedBySubscriptionId
        ? await PlatformSubscription.exists({
            _id: platformSubscription.replacedBySubscriptionId,
            status: { $in: ["pending", "trialing", "active"] },
          })
        : null;
      if (
        platformSubscription.ownerType === "AGENCY" &&
        platformSubscription.kind === "base" &&
        ["cancelled", "expired"].includes(status) &&
        !activeReplacement
      ) {
        await purgeAgencyClients({
          agencyId: String(platformSubscription.ownerId),
          reason: status === "expired" ? "plan_expired" : "plan_cancelled",
          skipProviderSubscriptionId: platformSubscription.providerSubscriptionId,
        });
      }
    } else if (purchasedAddon) {
      purchasedAddon.status = status === "paused" ? "past_due" : (status as any);
      const confirmedQuantity = Number(entity.quantity);
      if (Number.isInteger(confirmedQuantity) && confirmedQuantity > 0) {
        purchasedAddon.quantity = confirmedQuantity;
        if (purchasedAddon.pendingChange?.quantity === confirmedQuantity) {
          purchasedAddon.pendingChange.status = "applied";
        }
      }
      if (["cancelled", "expired"].includes(status)) {
        purchasedAddon.cancelAtPeriodEnd = false;
        if (purchasedAddon.pendingChange?.quantity === 0) {
          purchasedAddon.pendingChange.status = "applied";
        }
      }
      purchasedAddon.currentPeriodStart = dateFromSeconds(entity.current_start);
      purchasedAddon.currentPeriodEnd = dateFromSeconds(entity.current_end);
      await purchasedAddon.save();
    } else {
      const individualChange =
        await applyConfirmedIndividualSubscriptionChange(entity);
      if (individualChange) {
        eventRecord.status = "processed";
        eventRecord.processedAt = new Date();
        eventRecord.metadata = {
          platformType: "individual_subscription_change",
          localId: String(individualChange._id),
        };
        await eventRecord.save();
        return res.status(200).json({
          success: true,
          message: "Individual subscription change synchronized",
        });
      }
      eventRecord.status = "ignored";
      eventRecord.processedAt = new Date();
      eventRecord.metadata = { reason: "legacy_or_unmanaged_subscription" };
      await eventRecord.save();
      return res.status(200).json({ success: true, message: "Legacy subscription left to legacy handler" });
    }

    eventRecord.status = "processed";
    eventRecord.processedAt = new Date();
    eventRecord.metadata = {
      platformType: platformSubscription ? "plan" : "addon",
      localId: String(platformSubscription?._id || purchasedAddon?._id),
    };
    await eventRecord.save();
    return res.status(200).json({ success: true, message: "Platform billing state synchronized" });
  } catch (error: any) {
    console.error("Platform Razorpay webhook failed:", error);
    if (eventRecord) {
      eventRecord.status = "failed";
      eventRecord.error = String(error?.message || "Webhook processing failed").slice(0, 1900);
      await eventRecord.save().catch(() => undefined);
    }
    return res.status(500).json({ success: false, error: "Webhook processing failed" });
  }
};
