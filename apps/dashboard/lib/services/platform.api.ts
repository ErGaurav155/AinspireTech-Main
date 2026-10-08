import type { ApiRequestFn } from "../useApi";

export type PlatformService = "WHATSAPP" | "INSTAGRAM" | "WEBSITE" | "CALL";

export const getPlatformContext = (apiRequest: ApiRequestFn) =>
  apiRequest<{
    primaryAccountType: "AGENCY" | "BUSINESS" | "MEMBER";
    accountModes: { business: boolean; agency: boolean };
    canCreatePrimaryAccount: boolean;
    agencies: any[];
    workspaces: any[];
  }>("/platform/context");

export const createAgency = (apiRequest: ApiRequestFn, name: string) =>
  apiRequest<{ agency: any }>("/platform/agencies", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ name }),
  });

export const createBusinessWorkspace = (
  apiRequest: ApiRequestFn,
  name: string,
) =>
  apiRequest<{ workspace: any }>("/platform/workspaces", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      name,
      services: ["WHATSAPP", "INSTAGRAM", "WEBSITE"],
    }),
  });

export const getAgency = (apiRequest: ApiRequestFn, agencyId: string) =>
  apiRequest<any>(`/platform/agencies/${agencyId}`);

export const getAgencyClients = (apiRequest: ApiRequestFn, agencyId: string) =>
  apiRequest<any[]>(`/platform/agencies/${agencyId}/clients`);

export const getAgencyAnalytics = (apiRequest: ApiRequestFn, agencyId: string, days = 30) => {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return apiRequest<any>(`/platform/agencies/${agencyId}/analytics?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
};

export const createAgencyClient = (
  apiRequest: ApiRequestFn,
  agencyId: string,
  data: {
    businessName: string;
    ownerContactName?: string;
    ownerEmail: string;
    phone?: string;
    services: PlatformService[];
    sendInvitation: boolean;
  },
) =>
  apiRequest<{ workspace: any }>(`/platform/agencies/${agencyId}/clients`, {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(data),
  });

export const deleteAgencyClient = (
  apiRequest: ApiRequestFn,
  agencyId: string,
  workspaceId: string,
) =>
  apiRequest<{
    workspaceId: string;
    clerkOrganizationDeleted: boolean;
    removedMemberCount: number;
    releasedClientSlot: boolean;
    dataDeleted: boolean;
  }>(`/platform/agencies/${agencyId}/clients/${workspaceId}`, {
    method: "DELETE",
    body: JSON.stringify({
      confirmations: {
        removeClerkAccess: true,
        deleteAutomationData: true,
        deleteLeadsAndAppointments: true,
        permanentAndIrreversible: true,
      },
    }),
  });

export const getAgencyPlans = (apiRequest: ApiRequestFn, agencyId: string) =>
  apiRequest<{ plans: any[]; addons: any[] }>(
    `/platform/agencies/${agencyId}/billing/plans`,
  );

export const createAgencyPlanCheckout = (
  apiRequest: ApiRequestFn,
  agencyId: string,
  planCode: string,
) =>
  apiRequest<any>(`/platform/agencies/${agencyId}/billing/checkout`, {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ planCode }),
  });

export const getWorkspace = (apiRequest: ApiRequestFn, workspaceId: string) =>
  apiRequest<any>(`/platform/workspaces/${workspaceId}`);

export type WorkspaceAiTokenUsage = {
  mode: "agency_workspace";
  workspaceId: string;
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
  periodStart: string;
  periodEnd: string;
  byService: {
    website: number;
    instagram: number;
    whatsapp: number;
    other: number;
  };
};

export type IndividualAiTokenUsage = {
  mode: "individual";
  service: "website" | "instagram" | "whatsapp";
  applicable: boolean;
  metered: boolean;
  sharedAcrossServices: boolean;
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
  periodStart: string;
  periodEnd: string;
  buckets: Array<{
    key: string;
    kind: "free" | "service" | "package";
    label: string;
    limit: number;
    used: number;
    remaining: number;
    services: Array<"website" | "instagram" | "whatsapp">;
  }>;
  byService: {
    website: number;
    instagram: number;
    whatsapp: number;
  };
};

export const getWorkspaceAiTokenUsage = (
  apiRequest: ApiRequestFn,
  workspaceId: string,
) =>
  apiRequest<WorkspaceAiTokenUsage>(
    `/platform/workspaces/${workspaceId}/usage/ai-tokens`,
  );

export const getIndividualAiTokenUsage = (
  apiRequest: ApiRequestFn,
  service: "website" | "instagram" | "whatsapp",
) =>
  apiRequest<IndividualAiTokenUsage>(
    `/tokens/ai-usage?service=${encodeURIComponent(service)}`,
  );
