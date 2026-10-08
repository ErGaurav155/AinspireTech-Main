import { Types } from "mongoose";
import type {
  BillingOwnerType,
  EffectiveEntitlements,
  EntitlementFeature,
  EntitlementLimit,
  FeatureEntitlements,
  LimitEntitlements,
  PlatformService,
} from "@rocketreplai/shared/platform";
import { connectToDatabase } from "@/config/database.config";
import AddonDefinition from "@/models/billing/AddonDefinition.model";
import PlanDefinition from "@/models/billing/PlanDefinition.model";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";
import WorkspaceService from "@/models/tenant/WorkspaceService.model";
import { calculateEntitlements } from "@/services/billing/entitlement-calculator";
import {
  AGENCY_ADDONS_ENABLED,
  FREE_AGENCY_PLAN,
} from "@/config/platform-catalog.config";
import Agency from "@/models/tenant/Agency.model";

const SERVICE_FEATURE: Record<PlatformService, EntitlementFeature> = {
  WHATSAPP: "whatsapp",
  INSTAGRAM: "instagram",
  WEBSITE: "websiteChatbot",
  CALL: "callAssistant",
};

const toRecord = <T>(value: unknown): Record<string, T> => {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (value && typeof value === "object") return value as Record<string, T>;
  return {};
};

export class EntitlementService {
  async getEffectiveEntitlements({
    ownerType,
    ownerId,
  }: {
    ownerType: BillingOwnerType;
    ownerId: string;
  }): Promise<EffectiveEntitlements> {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new Error("Invalid entitlement owner id");
    }

    await connectToDatabase();
    const now = new Date();
    const ownerObjectId = new Types.ObjectId(ownerId);

    const [subscriptions, purchasedAddons] = await Promise.all([
      PlatformSubscription.find({
        ownerType,
        ownerId: ownerObjectId,
        $or: [
          {
            status: { $in: ["active", "trialing"] },
            $or: [
              { currentPeriodEnd: { $exists: false } },
              { currentPeriodEnd: null },
              { currentPeriodEnd: { $gt: now } },
            ],
          },
          { status: "past_due", gracePeriodEnd: { $gt: now } },
        ],
      }).lean(),
      PurchasedAddon.find({
        ownerType,
        ownerId: ownerObjectId,
        status: "active",
        $or: [
          { currentPeriodEnd: { $exists: false } },
          { currentPeriodEnd: null },
          { currentPeriodEnd: { $gt: now } },
        ],
      }).lean(),
    ]);

    const effectivePurchasedAddons =
      ownerType === "AGENCY" && !AGENCY_ADDONS_ENABLED
        ? []
        : purchasedAddons;
    const planIds = subscriptions.map((subscription) => subscription.planId);
    const addonIds = effectivePurchasedAddons.map((addon) => addon.addonId);
    const [plans, addonDefinitions] = await Promise.all([
      PlanDefinition.find({ _id: { $in: planIds } }).lean(),
      AddonDefinition.find({ _id: { $in: addonIds }, active: true }).lean(),
    ]);
    const plansById = new Map(plans.map((plan) => [String(plan._id), plan]));
    const addonsById = new Map(
      addonDefinitions.map((addon) => [String(addon._id), addon]),
    );

    const sourcePlanCodes = new Set<string>();
    const sourceAddonCodes = new Set<string>();
    const baseSources: Array<{
      code: string;
      features: FeatureEntitlements;
      limits: LimitEntitlements;
    }> = [];
    const addonSources: Array<{
      code: string;
      features: FeatureEntitlements;
      limits: LimitEntitlements;
      quantity: number;
      limitOperation: "add" | "replace";
    }> = [];

    // An agency without a verified paid subscription receives exactly one
    // small client workspace. A paid subscription replaces this base rather
    // than stacking on top of it.
    if (ownerType === "AGENCY" && subscriptions.length === 0) {
      const agency = await Agency.findById(ownerObjectId)
        .select("ownerUserId status")
        .lean();
      const primaryAgency = agency
        ? await Agency.findOne({
            ownerUserId: agency.ownerUserId,
            status: { $in: ["pending", "active"] },
          })
            .sort({ createdAt: 1, _id: 1 })
            .select("_id")
            .lean()
        : null;
      if (primaryAgency && String(primaryAgency._id) === ownerId) {
        sourcePlanCodes.add(FREE_AGENCY_PLAN.code);
        baseSources.push({
          code: FREE_AGENCY_PLAN.code,
          features: { ...FREE_AGENCY_PLAN.features },
          limits: { ...FREE_AGENCY_PLAN.limits },
        });
      }
    }

    for (const subscription of subscriptions) {
      const plan = plansById.get(String(subscription.planId));
      const planFeatures = toRecord<boolean>(
        subscription.entitlementSnapshot?.features || plan?.features,
      );
      const planLimits = toRecord<number>(
        subscription.entitlementSnapshot?.limits || plan?.limits,
      );
      sourcePlanCodes.add(subscription.planCode);
      baseSources.push({
        code: subscription.planCode,
        features: planFeatures,
        limits: planLimits,
      });
    }

    for (const purchase of effectivePurchasedAddons) {
      const definition = addonsById.get(String(purchase.addonId));
      if (!definition) continue;
      sourceAddonCodes.add(purchase.addonCode);

      const changes = definition.entitlementChanges || {
        features: {},
        limits: {},
      };
      addonSources.push({
        code: purchase.addonCode,
        features: toRecord<boolean>(changes.features),
        limits: toRecord<number>(changes.limits),
        quantity: purchase.quantity,
        limitOperation: definition.limitOperation,
      });
    }

    const { features, limits } = calculateEntitlements(baseSources, addonSources);

    return {
      ownerType,
      ownerId,
      features,
      limits,
      sourcePlanCodes: [...sourcePlanCodes],
      sourceAddonCodes: [...sourceAddonCodes],
      calculatedAt: new Date().toISOString(),
    };
  }

  async canUseWorkspaceService({
    workspaceId,
    service,
    ownerType,
    ownerId,
  }: {
    workspaceId: string;
    service: PlatformService;
    ownerType: BillingOwnerType;
    ownerId: string;
  }) {
    if (!Types.ObjectId.isValid(workspaceId)) return false;
    const [configuration, entitlements] = await Promise.all([
      WorkspaceService.findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        service,
        enabled: true,
      }).lean(),
      this.getEffectiveEntitlements({ ownerType, ownerId }),
    ]);

    return Boolean(configuration && entitlements.features[SERVICE_FEATURE[service]]);
  }
}

export const entitlementService = new EntitlementService();
