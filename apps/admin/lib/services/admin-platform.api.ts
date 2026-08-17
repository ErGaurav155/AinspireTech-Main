import { ApiRequestFn } from "../useApi";

export type AdminProduct = "whatsapp" | "call" | "packages";

export type AdminWorkspaceAction = "set-status" | "reset-usage";
export type AdminManagedServiceType =
  | "package"
  | "meta-ads"
  | "website-maintenance"
  | "content-creation";

export interface AdminListQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  hasPrevPage?: boolean;
}

export interface AdminPersonSummary {
  _id?: string;
  id?: string;
  clerkId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface AdminUsageSummary {
  used?: number;
  current?: number;
  consumed?: number;
  limit?: number;
  total?: number;
  remaining?: number;
  unit?: string;
  resetAt?: string;
  [key: string]: unknown;
}

export interface AdminWorkspaceItem {
  _id?: string;
  id?: string;
  product?: AdminProduct | string;
  name?: string;
  workspaceName?: string;
  businessName?: string;
  organizationName?: string;
  packageName?: string;
  status?: string;
  plan?: string | Record<string, unknown>;
  planName?: string;
  packageId?: string;
  subscriptionId?: string;
  clerkId?: string;
  customer?: AdminPersonSummary;
  owner?: AdminPersonSummary;
  user?: AdminPersonSummary;
  subscription?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
  usage?: AdminUsageSummary | number;
  limit?: number;
  usageUsed?: number;
  usageLimit?: number;
  externalId?: string;
  amount?: number;
  amountInr?: number;
  billingCycle?: string;
  expiresAt?: string;
  metrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  lastActivity?: string;
  [key: string]: unknown;
}

export interface AdminWorkspaceSummary {
  total?: number;
  active?: number;
  paused?: number;
  pending?: number;
  disabled?: number;
  needsAttention?: number;
  usage?: number | AdminUsageSummary;
  [key: string]: unknown;
}

export interface AdminWorkspaceListResponse {
  items: AdminWorkspaceItem[];
  summary: AdminWorkspaceSummary;
  pagination: AdminPagination;
}

export interface UpdateAdminWorkspaceInput {
  action: AdminWorkspaceAction;
  status?: string;
  serviceType?: AdminManagedServiceType;
  reason?: string;
}

export interface AdminOverviewResponse {
  generatedAt: string;
  summary: Record<string, number>;
  products: Array<Record<string, unknown>>;
  engagement: Record<string, number>;
  attention: Array<Record<string, unknown>>;
  recentActivity: Array<Record<string, unknown>>;
}

export interface AdminCustomer extends AdminPersonSummary {
  status?: string;
  tier?: string;
  accountLimit?: number;
  replyLimit?: number;
  tokenLimit?: number;
  createdAt?: string;
  updatedAt?: string;
  products?: Record<string, number>;
  usage?: Record<string, number>;
  limits?: Record<string, number>;
}

export interface AdminCustomerListResponse {
  items: AdminCustomer[];
  summary?: Record<string, unknown>;
  pagination: AdminPagination;
}

export interface UpdateCustomerLimitsInput {
  accountLimit?: number;
  replyLimit?: number;
  reason: string;
}

export interface AdminSubscription {
  _id?: string;
  id?: string;
  subscriptionId?: string;
  clerkId?: string;
  customer?: AdminPersonSummary;
  product?: string;
  plan?: string;
  billingCycle?: string;
  status?: string;
  amountInr?: number | null;
  usage?: number;
  limit?: number;
  externalId?: string;
  createdAt?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export interface AdminSubscriptionListResponse {
  items: AdminSubscription[];
  summary?: Record<string, unknown>;
  pagination: AdminPagination;
}

export interface UpdateAdminSubscriptionInput {
  status: string;
  reason: string;
}

function withQuery(path: string, query: AdminListQuery = {}) {
  const params = new URLSearchParams();

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status && query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));

  const value = params.toString();
  return value ? `${path}?${value}` : path;
}

export const getAdminOverview = (apiRequest: ApiRequestFn) =>
  apiRequest<AdminOverviewResponse>("/admin/overview", { method: "GET" });

export const getAdminCustomers = (
  apiRequest: ApiRequestFn,
  query: AdminListQuery = {},
) =>
  apiRequest<AdminCustomerListResponse>(withQuery("/admin/customers", query), {
    method: "GET",
  });

export const updateCustomerLimits = (
  apiRequest: ApiRequestFn,
  customerId: string,
  input: UpdateCustomerLimitsInput,
) =>
  apiRequest<{ customer?: AdminCustomer; message?: string }>(
    `/admin/customers/${encodeURIComponent(customerId)}/limits`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

export const getAdminSubscriptions = (
  apiRequest: ApiRequestFn,
  query: AdminListQuery = {},
) =>
  apiRequest<AdminSubscriptionListResponse>(
    withQuery("/admin/subscriptions", query),
    { method: "GET" },
  );

export const updateSubscription = (
  apiRequest: ApiRequestFn,
  product: string,
  subscriptionId: string,
  input: UpdateAdminSubscriptionInput,
) =>
  apiRequest<{ subscription?: AdminSubscription; message?: string }>(
    `/admin/subscriptions/${encodeURIComponent(product)}/${encodeURIComponent(subscriptionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

export const getAdminWorkspaces = (
  apiRequest: ApiRequestFn,
  product: AdminProduct,
  query: AdminListQuery = {},
) =>
  apiRequest<AdminWorkspaceListResponse>(
    withQuery(`/admin/workspaces/${product}`, query),
    { method: "GET" },
  );

export const updateWorkspace = (
  apiRequest: ApiRequestFn,
  product: AdminProduct,
  workspaceId: string,
  input: UpdateAdminWorkspaceInput,
) =>
  apiRequest<{
    item?: AdminWorkspaceItem;
    workspace?: AdminWorkspaceItem;
    message?: string;
  }>(`/admin/workspaces/${product}/${encodeURIComponent(workspaceId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
