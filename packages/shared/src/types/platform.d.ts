export const ACCOUNT_TYPES = ["BUSINESS", "AGENCY"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const OWNER_TYPES = ["WORKSPACE", "AGENCY"] as const;
export type BillingOwnerType = (typeof OWNER_TYPES)[number];

export const PLATFORM_SERVICES = [
  "WHATSAPP",
  "INSTAGRAM",
  "WEBSITE",
  "CALL",
] as const;
export type PlatformService = (typeof PLATFORM_SERVICES)[number];

export const PLATFORM_ROLES = [
  "AGENCY_OWNER",
  "AGENCY_ADMIN",
  "AGENCY_STAFF",
  "CLIENT_OWNER",
  "CLIENT_MEMBER",
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_PERMISSIONS = [
  "agency.view",
  "agency.manage",
  "agency.billing.manage",
  "agency.team.manage",
  "clients.view",
  "clients.create",
  "clients.archive",
  "clients.services.manage",
  "workspace.view",
  "workspace.manage",
  "workspace.billing.manage",
  "workspace.team.manage",
  "automation.view",
  "automation.manage",
  "leads.view",
  "conversations.view",
  "conversations.manage",
  "appointments.view",
  "appointments.manage",
  "integrations.view",
  "integrations.manage",
  "analytics.view",
] as const;
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const ENTITLEMENT_FEATURES = [
  "whatsapp",
  "instagram",
  "websiteChatbot",
  "callAssistant",
  "callAssistantPreview",
  "clientLogin",
  "agencyDashboard",
  "customBranding",
  "advancedReporting",
  "prioritySupport",
] as const;
export type EntitlementFeature = (typeof ENTITLEMENT_FEATURES)[number];

export const ENTITLEMENT_LIMITS = [
  "clientWorkspaces",
  "teamMembers",
  "aiTokens",
  "conversations",
  "instagramAccounts",
  "whatsappAccounts",
  "websiteChatbots",
  "callAssistants",
  "instagramAccountsPerWorkspace",
  "whatsappAccountsPerWorkspace",
  "websiteChatbotsPerWorkspace",
  "callAssistantsPerWorkspace",
] as const;
export type EntitlementLimit = (typeof ENTITLEMENT_LIMITS)[number];

export type FeatureEntitlements = Partial<
  Record<EntitlementFeature, boolean>
>;
export type LimitEntitlements = Partial<Record<EntitlementLimit, number>>;

export interface EffectiveEntitlements {
  ownerType: BillingOwnerType;
  ownerId: string;
  features: FeatureEntitlements;
  limits: LimitEntitlements;
  sourcePlanCodes: string[];
  sourceAddonCodes: string[];
  calculatedAt: string;
}
