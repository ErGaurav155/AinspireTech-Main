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
      teamMembers: 2,
      aiTokens: 1_000_000,
      conversations: 10_000,
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
      teamMembers: 5,
      aiTokens: 5_000_000,
      conversations: 50_000,
      instagramAccounts: 60,
      whatsappAccounts: 20,
      websiteChatbots: 20,
    },
  },
  {
    code: "agency",
    revision: 1,
    name: "Agency",
    description: "For established agencies managing a large client portfolio.",
    monthlyPrice: 59_999,
    yearlyPrice: 599_990,
    razorpayProductId: "agency",
    features: {
      advancedReporting: true,
      customBranding: true,
      prioritySupport: true,
    },
    limits: {
      clientWorkspaces: 50,
      teamMembers: 10,
      aiTokens: 15_000_000,
      conversations: 150_000,
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

export const AGENCY_ADDON_CATALOG = [
  {
    code: "extra-client-slots",
    revision: 1,
    name: "5 Extra Client Workspaces",
    monthlyPrice: 2_499,
    yearlyPrice: 24_990,
    razorpayProductId: "addon-extra-client-slots",
    limits: {
      clientWorkspaces: 5,
      instagramAccounts: 15,
      whatsappAccounts: 5,
      websiteChatbots: 5,
    },
  },
  {
    code: "extra-team-seats",
    revision: 1,
    name: "2 Extra Agency Team Seats",
    monthlyPrice: 999,
    yearlyPrice: 9_990,
    razorpayProductId: "addon-extra-team-seats",
    limits: { teamMembers: 2 },
  },
  {
    code: "extra-ai-tokens",
    revision: 1,
    name: "1 Million Extra AI Tokens",
    monthlyPrice: 1_499,
    yearlyPrice: 14_990,
    razorpayProductId: "addon-extra-ai-tokens",
    limits: { aiTokens: 1_000_000 },
  },
  {
    code: "extra-conversations",
    revision: 1,
    name: "10,000 Extra Conversations",
    monthlyPrice: 999,
    yearlyPrice: 9_990,
    razorpayProductId: "addon-extra-conversations",
    limits: { conversations: 10_000 },
  },
] as const;

export const PLATFORM_URLS = {
  clerkInvitationRedirect: "https://app.rocketreplai.com/select-workspace",
} as const;
