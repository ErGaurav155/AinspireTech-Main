import type {
  FeatureEntitlements,
  LimitEntitlements,
} from "@rocketreplai/shared/platform";

export type PlatformCatalogItem = {
  code: string;
  revision: number;
  name: string;
  description: string;
  billingInterval: "monthly" | "yearly";
  price: number;
  currency: "INR";
  razorpayProductId: string;
  features: FeatureEntitlements;
  limits: LimitEntitlements;
  active: boolean;
};

export type PlatformAddonCatalogItem = {
  code: string;
  revision: number;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  razorpayProductId: string;
  limits: LimitEntitlements;
};

const baseFeatures: FeatureEntitlements = {
  whatsapp: true,
  instagram: true,
  websiteChatbot: true,
  callAssistant: false,
  callAssistantPreview: true,
  clientLogin: true,
  agencyDashboard: true,
};

// Edit pricing, limits and feature flags here, then run:
// npm run sync:platform-catalog --workspace=api
export const AGENCY_PLAN_TIERS = [
  {
    code: "partner",
    revision: 1,
    name: "Partner",
    description: "For small agencies launching managed automation services.",
    monthlyPrice: 9_999,
    yearlyPrice: 99_990,
    razorpayProductId: "agency-partner",
    features: {},
    limits: {
      clientWorkspaces: 5,
      aiTokens: 1_000_000,
      aiTokensPerWorkspace: 200_000,
      conversations: -1,
      instagramAccounts: 15,
      whatsappAccounts: 5,
      websiteChatbots: 5,
    },
  },
  {
    code: "growth-partner",
    revision: 1,
    name: "Growth Partner",
    description: "For growing agencies that need branding and reporting.",
    monthlyPrice: 29_999,
    yearlyPrice: 299_990,
    razorpayProductId: "agency-growth-partner",
    features: { advancedReporting: true, customBranding: true },
    limits: {
      clientWorkspaces: 20,
      aiTokens: 5_000_000,
      aiTokensPerWorkspace: 250_000,
      conversations: -1,
      instagramAccounts: 60,
      whatsappAccounts: 20,
      websiteChatbots: 20,
    },
  },
  {
    code: "agency",
    revision: 1,
    name: "Agency Pro Partner",
    description: "For established agencies managing a large client portfolio.",
    monthlyPrice: 59_999,
    yearlyPrice: 599_990,
    razorpayProductId: "agency-pro-partner",
    features: {
      advancedReporting: true,
      customBranding: true,
      prioritySupport: true,
    },
    limits: {
      clientWorkspaces: 50,
      aiTokens: 15_000_000,
      aiTokensPerWorkspace: 300_000,
      conversations: -1,
      instagramAccounts: 150,
      whatsappAccounts: 50,
      websiteChatbots: 50,
    },
  },
] as const;

const perClientLimits: LimitEntitlements = {
  instagramAccountsPerWorkspace: 3,
  whatsappAccountsPerWorkspace: 1,
  websiteChatbotsPerWorkspace: 1,
  callAssistantsPerWorkspace: 0,
  callAssistants: 0,
};

// Free agency access is intentionally kept outside Razorpay's paid catalog.
// Edit these allowances here; every API limit check consumes this same object.
export const FREE_AGENCY_PLAN = {
  code: "agency-free",
  name: "Free Agency",
  features: {
    ...baseFeatures,
    advancedReporting: false,
    customBranding: false,
    prioritySupport: false,
  } satisfies FeatureEntitlements,
  limits: {
    clientWorkspaces: 1,
    aiTokens: 100_000,
    aiTokensPerWorkspace: 100_000,
    conversations: -1,
    instagramAccounts: 3,
    whatsappAccounts: 1,
    websiteChatbots: 1,
    ...perClientLimits,
  } satisfies LimitEntitlements,
} as const;

export const AGENCY_PLAN_CATALOG: PlatformCatalogItem[] = AGENCY_PLAN_TIERS.flatMap(
  (tier) =>
    (["monthly", "yearly"] as const).map((billingInterval) => ({
      code: `${tier.code}-${billingInterval}`,
      revision: tier.revision,
      name: tier.name,
      description: tier.description,
      billingInterval,
      price:
        billingInterval === "monthly" ? tier.monthlyPrice : tier.yearlyPrice,
      currency: "INR" as const,
      razorpayProductId: tier.razorpayProductId,
      features: { ...baseFeatures, ...tier.features },
      limits: { ...tier.limits, ...perClientLimits },
      active: true,
    })),
);

export const AGENCY_ADDONS_ENABLED = false;
export const AGENCY_ADDON_CATALOG: PlatformAddonCatalogItem[] = [];

// Kept as explicit tombstones so previously synchronized definitions cannot
// remain visible or purchasable after agency team seats were removed.
export const RETIRED_AGENCY_ADDON_CODES = [
  "extra-client-slots-monthly",
  "extra-client-slots-yearly",
  "extra-team-seats-monthly",
  "extra-team-seats-yearly",
  "extra-ai-tokens-monthly",
  "extra-ai-tokens-yearly",
  "extra-conversations-monthly",
  "extra-conversations-yearly",
] as const;

export const PLATFORM_URLS = {
  clerkInvitationRedirect: "https://app.rocketreplai.com/accept-invitation",
} as const;
