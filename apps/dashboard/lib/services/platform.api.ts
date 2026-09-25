import type { ApiRequestFn } from "../useApi";

export type PlatformService = "WHATSAPP" | "INSTAGRAM" | "WEBSITE" | "CALL";

export const getPlatformContext = (apiRequest: ApiRequestFn) =>
  apiRequest<{
    accountModes: { business: boolean; agency: boolean };
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
