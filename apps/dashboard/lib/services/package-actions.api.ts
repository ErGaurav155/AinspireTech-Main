import { ApiRequestFn } from "../useApi";

export type DashboardPackageServiceKey = "insta" | "web" | "whatsapp" | "call";

export interface DashboardPackagePlan {
  id: "package-starter" | "package-whatsapp" | "package-call" | "package-complete";
  name: string;
  description: string;
  amountInr: number;
  billingCycle: "monthly";
  includedServices: DashboardPackageServiceKey[];
  features: string[];
  setupServices: DashboardPackageServiceKey[];
}

export interface DashboardPackageServiceCheck {
  key: DashboardPackageServiceKey;
  label: string;
  ready: boolean;
  setupUrl: string;
  successText: string;
  missingTitle: string;
  missingDescription: string;
}

export interface DashboardPackageSubscription {
  _id: string;
  clerkId: string;
  packageId: DashboardPackagePlan["id"];
  packageName: string;
  subscriptionId: string;
  amountInr: number;
  includedServices: DashboardPackageServiceKey[];
  status: "active" | "cancelled" | "expired";
  expiresAt: string;
}

export interface MetaAdsPlan {
  id: "meta-ads-5000" | "meta-ads-10000" | "meta-ads-15000" | "meta-ads-20000";
  name: string;
  description: string;
  amountInr: number;
  monthlyBudgetInr: number;
  features: string[];
}

export interface MetaAdsSubscription {
  _id: string;
  clerkId: string;
  planId: MetaAdsPlan["id"];
  planName: string;
  subscriptionId: string;
  monthlyBudgetInr: number;
  status: "active" | "cancelled" | "expired";
  expiresAt: string;
}

export interface WebsiteMaintenancePlan {
  id: "website-maintenance";
  name: string;
  description: string;
  amountInr: number;
  firstMonthInr: number;
  features: string[];
}

export interface WebsiteMaintenanceSubscription {
  _id: string;
  clerkId: string;
  planId: WebsiteMaintenancePlan["id"];
  planName: string;
  subscriptionId: string;
  amountInr: number;
  status: "active" | "cancelled" | "expired";
  expiresAt: string;
}

export interface ActiveSeparateServiceSubscription {
  service: DashboardPackageServiceKey;
  label: string;
  plan: string;
  subscriptionId?: string;
  manageUrl: string;
}

export interface DashboardPackageStatus {
  plans: DashboardPackagePlan[];
  metaAdsPlans: MetaAdsPlan[];
  websiteMaintenancePlans: WebsiteMaintenancePlan[];
  activePackage: DashboardPackageSubscription | null;
  activeMetaAdsSubscription: MetaAdsSubscription | null;
  activeWebsiteMaintenanceSubscription: WebsiteMaintenanceSubscription | null;
  firstTimeDiscountEligible: boolean;
  activeSeparateServices: ActiveSeparateServiceSubscription[];
  serviceChecks: DashboardPackageServiceCheck[];
}

export const getDashboardPackageStatus = (
  apiRequest: ApiRequestFn,
): Promise<DashboardPackageStatus> => {
  return apiRequest("/packages/status", { method: "GET" });
};

export const cancelDashboardPackageSubscription = (
  apiRequest: ApiRequestFn,
  data: {
    subscriptionId: string;
    reason?: string;
    mode?: "Immediate" | "EndOfCycle";
  },
): Promise<any> => {
  return apiRequest("/packages/subscription/cancel", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const cancelMetaAdsSubscription = (
  apiRequest: ApiRequestFn,
  data: {
    subscriptionId: string;
    reason?: string;
    mode?: "Immediate" | "EndOfCycle";
  },
): Promise<any> => {
  return apiRequest("/packages/meta-ads/subscription/cancel", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const cancelWebsiteMaintenanceSubscription = (
  apiRequest: ApiRequestFn,
  data: {
    subscriptionId: string;
    reason?: string;
    mode?: "Immediate" | "EndOfCycle";
  },
): Promise<any> => {
  return apiRequest("/packages/website-maintenance/subscription/cancel", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
