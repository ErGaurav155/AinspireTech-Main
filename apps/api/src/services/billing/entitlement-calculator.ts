import type {
  EntitlementFeature,
  EntitlementLimit,
  FeatureEntitlements,
  LimitEntitlements,
} from "@rocketreplai/shared/platform";

export interface BaseEntitlementSource {
  code: string;
  features: FeatureEntitlements;
  limits: LimitEntitlements;
}

export interface AddonEntitlementSource extends BaseEntitlementSource {
  quantity: number;
  limitOperation: "add" | "replace";
}

const baseLimit = (current: number | undefined, incoming: number) => {
  if (current === -1 || incoming === -1) return -1;
  return Math.max(current || 0, incoming);
};

const addedLimit = (current: number | undefined, incoming: number) => {
  if (current === -1 || incoming === -1) return -1;
  return (current || 0) + incoming;
};

export function calculateEntitlements(
  baseSources: BaseEntitlementSource[],
  addonSources: AddonEntitlementSource[],
) {
  const features: FeatureEntitlements = {};
  const limits: LimitEntitlements = {};

  for (const source of baseSources) {
    for (const [key, enabled] of Object.entries(source.features)) {
      if (enabled) features[key as EntitlementFeature] = true;
    }
    for (const [key, value] of Object.entries(source.limits)) {
      if (Number.isFinite(value)) {
        const metric = key as EntitlementLimit;
        limits[metric] = baseLimit(limits[metric], value);
      }
    }
  }

  for (const source of addonSources) {
    for (const [key, enabled] of Object.entries(source.features)) {
      if (enabled) features[key as EntitlementFeature] = true;
    }
    for (const [key, value] of Object.entries(source.limits)) {
      if (!Number.isFinite(value)) continue;
      const metric = key as EntitlementLimit;
      const multiplied = value * source.quantity;
      limits[metric] =
        source.limitOperation === "replace"
          ? multiplied
          : addedLimit(limits[metric], multiplied);
    }
  }

  return { features, limits };
}
