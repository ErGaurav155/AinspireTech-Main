// ==================== ACCOUNT FUNCTIONS ====================

import { ApiRequestFn } from "../useApi";

export const getInstaAccount = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/insta/getAccount", {
    method: "GET",
  });
};

export const connectInstaAccount = (
  apiRequest: ApiRequestFn,
  code: string,
): Promise<any> => {
  return apiRequest(`/insta/callback?code=${code}`, {
    method: "GET",
  });
};

// ==================== TEMPLATE FUNCTIONS ====================

export const getInstaMedia = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<{ media: MediaItem[] }> => {
  return apiRequest(`/insta/media?accountId=${accountId}`, {
    method: "GET",
  });
};

export const updateTemplate = (
  apiRequest: ApiRequestFn,
  templateId: string,
  data: Partial<TemplateType>,
): Promise<any> => {
  return apiRequest(`/insta/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteTemplate = (
  apiRequest: ApiRequestFn,
  templateId: string,
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/insta/templates/${templateId}`, {
    method: "DELETE",
  });
};

interface GetTemplatesParams {
  accountId?: string;
  loadMoreCount?: number;
  filterAccount?: string;
  filterStatus?: "all" | "active" | "inactive";
}

export const getInstaTemplates = (
  apiRequest: ApiRequestFn,
  params: GetTemplatesParams,
): Promise<{
  templates: TemplateType[];
  hasMore: boolean;
  totalCount: number;
}> => {
  const searchParams = new URLSearchParams();

  if (params.accountId && params.accountId !== "all") {
    searchParams.set("accountId", params.accountId);
  }

  if (params.loadMoreCount) {
    searchParams.set("loadMoreCount", params.loadMoreCount.toString());
  }

  if (params.filterAccount && params.filterAccount !== "all") {
    searchParams.set("filterAccount", params.filterAccount);
  }

  if (params.filterStatus && params.filterStatus !== "all") {
    searchParams.set("filterStatus", params.filterStatus);
  }

  return apiRequest(`/insta/templates?${searchParams.toString()}`, {
    method: "GET",
  });
};

export const createInstaTemplate = (
  apiRequest: ApiRequestFn,
  accountId: string,
  accountUsername: string,
  templateData: {
    name: string;
    content: ContentItem[];
    reply: string[];
    triggers: string[];
    isFollow: boolean;
    priority: number;
    mediaId: string;
    mediaUrl: string;
    delaySeconds?: number;
    settingsByTier?: TemplateSettingsByTier;
  },
): Promise<{ template: TemplateType }> => {
  const payload = {
    accountId,
    accountUsername,
    name: templateData.name,
    content: templateData.content.filter((c: any) => c.text.trim() !== ""),
    reply: templateData.reply.filter((r: any) => r.trim() !== ""),
    triggers: templateData.triggers.filter((t: any) => t.trim() !== ""),
    isFollow: templateData.isFollow,
    priority: templateData.priority,
    mediaId: templateData.mediaId,
    mediaUrl: templateData.mediaUrl,
    delaySeconds: templateData.delaySeconds || 0,
    settingsByTier: templateData.settingsByTier || {
      free: {
        requireFollow: false,
        skipFollowCheck: true,
        directLink: true,
      },
      pro: {
        requireFollow: true,
        useAdvancedFlow: true,
        maxRetries: 3,
      },
    },
  };

  return apiRequest("/insta/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ==================== ACCOUNT FUNCTIONS ====================

export const getInstaAccounts = (
  apiRequest: ApiRequestFn,
): Promise<{ accounts: InstagramAccount[] }> => {
  return apiRequest("/insta/accounts", {
    method: "GET",
  });
};

export const getAllInstagramAccounts = (
  apiRequest: ApiRequestFn,
): Promise<{ accounts: InstagramAccount[] }> => {
  return apiRequest("/insta/accounts", {
    method: "GET",
  });
};

export const deleteInstaAccount = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/insta/accounts/${accountId}`, {
    method: "DELETE",
  });
};

export const refreshInstagramToken = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<{ success: boolean; accessToken?: string }> => {
  return apiRequest(`/insta/accounts/${accountId}/refresh`, {
    method: "POST",
  });
};

// ==================== DASHBOARD FUNCTIONS ====================

export const getDashboardData = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/insta/dashboard", {
    method: "GET",
  });
};

// ==================== RATE LIMIT FUNCTIONS ====================

export const getRateLimitStats = (
  apiRequest: ApiRequestFn,
): Promise<UserTierInfo> => {
  return apiRequest("/rate-limit/stats", {
    method: "GET",
  });
};

export const getUserTierInfo = (
  apiRequest: ApiRequestFn,
): Promise<UserTierInfo> => {
  return apiRequest("/rate-limit/stats", {
    method: "GET",
  });
};

export const getAppLimitStatus = (
  apiRequest: ApiRequestFn,
): Promise<AppLimitStatus> => {
  return apiRequest("/rate-limit/app-limit", {
    method: "GET",
  });
};

export const checkRateLimit = (
  apiRequest: ApiRequestFn,
  accountId: string,
  actionType: string,
  isFollowCheck?: boolean,
): Promise<CanMakeCallResponse> => {
  return apiRequest("/rate-limit/check", {
    method: "POST",
    body: JSON.stringify({ accountId, actionType, isFollowCheck }),
  });
};

export const recordRateLimitCall = (
  apiRequest: ApiRequestFn,
  accountId: string,
  actionType: string,
  metaCalls?: number,
  metadata?: any,
): Promise<RecordCallResponse> => {
  return apiRequest("/rate-limit/record", {
    method: "POST",
    body: JSON.stringify({ accountId, actionType, metaCalls, metadata }),
  });
};

export const getCurrentWindow = (
  apiRequest: ApiRequestFn,
): Promise<RateLimitWindow> => {
  return apiRequest("/rate-limit/window/current", {
    method: "GET",
  });
};

export const resetRateLimitWindow = (
  apiRequest: ApiRequestFn,
): Promise<{
  success: boolean;
  message: string;
  processed: number;
  resetAccounts: number;
}> => {
  return apiRequest("/rate-limit/window/reset", {
    method: "POST",
  });
};

// ==================== QUEUE MANAGEMENT ====================

export const processQueue = (
  apiRequest: ApiRequestFn,
  limit?: number,
): Promise<ProcessQueueResponse> => {
  const url = limit
    ? `/rate-limit/queue/process?limit=${limit}`
    : "/rate-limit/queue/process";
  return apiRequest(url, {
    method: "GET",
  });
};

// ==================== USER TIER FUNCTIONS ====================

export const getUserTier = (
  apiRequest: ApiRequestFn,
): Promise<{ tier: "free" | "pro" }> => {
  return apiRequest("/user/tier", {
    method: "GET",
  });
};

export const updateUserTier = (
  apiRequest: ApiRequestFn,
  tier: "free" | "pro",
): Promise<{ success: boolean; message: string }> => {
  return apiRequest("/user/tier", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
};

// ==================== OTHER FUNCTIONS ====================

export const getInstagramUser = async (
  accessToken: string,
  fields: string[] = ["id", "username", "media_count", "account_type"],
): Promise<any> => {
  const fieldsString = fields.join(",");
  try {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=${fieldsString}&access_token=${accessToken}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Instagram user:", error);
    throw error;
  }
};

export const getReplyLogs = (
  apiRequest: ApiRequestFn,
  limit: number = 10,
): Promise<any> => {
  return apiRequest(`/insta/replylogs?limit=${limit}`, {
    method: "GET",
  });
};

export const getSubscriptioninfo = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/insta/subscription/list", {
    method: "GET",
  });
};

export const cancelRazorPaySubscription = (
  apiRequest: ApiRequestFn,
  data: {
    subscriptionId: string;
    subscriptionType: "insta" | "web";
    reason: string;
    mode: string;
  },
): Promise<any> => {
  return apiRequest("/razorpay/subscription/cancel", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// ==================== TEMPLATE BULK OPERATIONS ====================

export const bulkUpdateTemplates = (
  apiRequest: ApiRequestFn,
  templateIds: string[],
  updates: Partial<TemplateType>,
): Promise<{ success: boolean; updatedCount: number; failedCount: number }> => {
  return apiRequest("/insta/templates/bulk", {
    method: "PUT",
    body: JSON.stringify({ templateIds, updates }),
  });
};

export const bulkDeleteTemplates = (
  apiRequest: ApiRequestFn,
  templateIds: string[],
): Promise<{ success: boolean; deletedCount: number; failedCount: number }> => {
  return apiRequest("/insta/templates/bulk", {
    method: "DELETE",
    body: JSON.stringify({ templateIds }),
  });
};

// ==================== ACCOUNT SETTINGS ====================

export const updateAccountSettings = (
  apiRequest: ApiRequestFn,
  accountId: string,
  settings: {
    isActive?: boolean;
    autoReplyEnabled?: boolean;
    autoDMEnabled?: boolean;
    followCheckEnabled?: boolean;
    requireFollowForFreeUsers?: boolean;
  },
): Promise<{ success: boolean; account: InstagramAccount }> => {
  return apiRequest(`/insta/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
};

// ==================== TEMPLATE ANALYTICS ====================

export const getTemplateAnalytics = (
  apiRequest: ApiRequestFn,
  templateId: string,
): Promise<{
  template: TemplateType;
  usageStats: {
    totalUses: number;
    successRate: number;
    averageResponseTime: number;
    last30Days: Array<{ date: string; count: number }>;
  };
  recentLogs: any[];
}> => {
  return apiRequest(`/insta/templates/${templateId}/analytics`, {
    method: "GET",
  });
};

// ==================== BULK TEMPLATE IMPORT/EXPORT ====================

export const exportTemplates = (
  apiRequest: ApiRequestFn,
  accountId?: string,
): Promise<{
  templates: TemplateType[];
  exportDate: string;
  version: string;
}> => {
  const url = accountId
    ? `/insta/templates/export?accountId=${accountId}`
    : "/insta/templates/export";
  return apiRequest(url, {
    method: "GET",
  });
};

export const importTemplates = (
  apiRequest: ApiRequestFn,
  templates: Omit<TemplateType, "_id" | "userId" | "createdAt" | "updatedAt">[],
  accountId: string,
): Promise<{
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: string[];
}> => {
  return apiRequest("/insta/templates/import", {
    method: "POST",
    body: JSON.stringify({ templates, accountId }),
  });
};

// ==================== TEMPLATE VALIDATION ====================

export const validateTemplate = (
  apiRequest: ApiRequestFn,
  templateData: Partial<TemplateType>,
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}> => {
  return apiRequest("/insta/templates/validate", {
    method: "POST",
    body: JSON.stringify(templateData),
  });
};

// ==================== INTERFACES (keep as is) ====================

export interface UserTierInfo {
  tier: "free" | "pro";
  tierLimit: number;
  callsMade: number;
  remainingCalls: number;
  usagePercentage: number;
  accountUsage: Array<{
    instagramAccountId: string;
    accountUsername?: string;
    callsMade: number;
    lastCallAt: Date;
  }>;
  queuedItems: number;
  nextReset: Date;
}

export interface RateLimitWindow {
  start: string;
  end: string;
  key: string;
  label: string;
}

export interface AppLimitStatus {
  reached: boolean;
  current: number;
  limit: number;
  percentage: number;
}

export interface CanMakeCallResponse {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  tier?: "free" | "pro";
  metaLimitReached?: boolean;
}

export interface RecordCallResponse {
  success: boolean;
  queued?: boolean;
  queueId?: string;
  reason?: string;
  callsRecorded?: number;
}

export interface ProcessQueueResponse {
  processed: number;
  failed: number;
  skipped: number;
  remaining: number;
}

export interface ContentItem {
  text: string;
  link: string;
  buttonTitle?: string;
}

export interface TemplateSettingsByTier {
  free: {
    requireFollow: boolean;
    skipFollowCheck: boolean;
    directLink: boolean;
  };
  pro: {
    requireFollow: boolean;
    useAdvancedFlow: boolean;
    maxRetries: number;
  };
}

export interface TemplateType {
  _id: string;
  name: string;
  userId: string;
  accountId: string;
  content: ContentItem[];
  reply: string[];
  triggers: string[];
  isFollow: boolean;
  priority: number;
  accountUsername: string;
  mediaId: string;
  mediaUrl?: string;
  mediaType?: string;
  isActive: boolean;
  usageCount?: number;
  lastUsed?: string;
  successRate?: number;
  delaySeconds?: number;
  settingsByTier?: TemplateSettingsByTier;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramAccount {
  instagramId: string;
  userId: string;
  username: string;
  accessToken: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;
  accountReply: number;
  accountFollowCheck: number;
  accountDMSent: number;
  lastActivity: string;
  profilePicture?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  metaCallsThisHour: number;
  lastMetaCallAt: string;
  isMetaRateLimited: boolean;
  metaRateLimitResetAt?: string;
  tokenExpiresAt: Date;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  timestamp: string;
  caption?: string;
  likes?: number;
  comments?: number;
}

export interface SubscriptionInfo {
  clerkId: string;
  chatbotType: string;
  subscriptionId: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  expiresAt: string;
}
