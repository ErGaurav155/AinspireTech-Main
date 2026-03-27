// lib/services/insta-actions.api.ts

import { ApiRequestFn } from "../useApi";

// ==================== ACCOUNT FUNCTIONS ====================

export const getInstaAccount = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/insta/accounts", { method: "GET" });
};

export const connectInstaAccount = (
  apiRequest: ApiRequestFn,
  code: string,
): Promise<any> => {
  return apiRequest(`/insta/callback?code=${code}`, { method: "GET" });
};

export const getInstaAccountById = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<any> => {
  return apiRequest(`/insta/accounts/${accountId}`, { method: "GET" });
};

// ==================== TEMPLATE FUNCTIONS ====================

export const getInstaMedia = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<{ media: MediaItem[] }> => {
  return apiRequest(`/insta/media?accountId=${accountId}`, { method: "GET" });
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
  return apiRequest(`/insta/templates/${templateId}`, { method: "DELETE" });
};

export const getInstaTemplateById = (
  apiRequest: ApiRequestFn,
  templateId: string,
): Promise<any> => {
  return apiRequest(`/insta/templates/${templateId}`, { method: "GET" });
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
    mediaType?: string;
    delaySeconds?: number;
    delayOption?: "immediate" | "3min" | "5min" | "10min";
    automationType?: "comments" | "stories" | "dms" | "live";
    anyPostOrReel?: boolean;
    anyKeyword?: boolean;
    welcomeMessage: { text: string; buttonTitle: string };
    publicReply?: {
      enabled: boolean;
      replies: string[];
      tagType: "none" | "user" | "account";
    };
    askFollow?: {
      enabled: boolean;
      message: string;
      visitProfileBtn: string;
      followingBtn: string;
    };
    askEmail?: {
      enabled: boolean;
      openingMessage: string;
      retryMessage: string;
      sendDmIfNoEmail: boolean;
    };
    askPhone?: {
      enabled: boolean;
      openingMessage: string;
      retryMessage: string;
      sendDmIfNoPhone: boolean;
    };
    followUpDMs?: {
      enabled: boolean;
      messages: Array<{
        condition: string;
        waitTime: number;
        waitUnit: "minutes" | "hours";
        message: string;
        links: { url: string; buttonTitle: string }[];
      }>;
    };
    isActive?: boolean;
  },
): Promise<{ template: any }> => {
  const payload = {
    accountId,
    accountUsername,
    name: templateData.name.trim(),
    content: templateData.content.filter((c) => c.text?.trim() !== ""),
    reply: templateData.reply.filter((r) => r?.trim() !== ""),
    triggers: templateData.triggers?.filter((t) => t?.trim() !== "") || [],
    isFollow: templateData.isFollow || false,
    priority: templateData.priority || 5,
    mediaId: templateData.mediaId || "",
    mediaUrl: templateData.mediaUrl || "",
    mediaType: templateData.mediaType || "",
    delaySeconds: templateData.delaySeconds || 0,
    delayOption: templateData.delayOption || "immediate",
    automationType: templateData.automationType || "comments",
    anyPostOrReel: templateData.anyPostOrReel || false,
    anyKeyword: templateData.anyKeyword || false,
    isActive:
      templateData.isActive !== undefined ? templateData.isActive : true,
    welcomeMessage: templateData.welcomeMessage || {
      text: "Hi {{username}}! So glad you're interested 🎉\nClick below and I'll share the link with you in a moment 🧲",
      buttonTitle: "Send me the link",
    },
    publicReply: templateData.publicReply || {
      enabled: false,
      replies: ["Replied in DMs 📨", "Coming your way 🧲", "Check your DM 📩"],
      tagType: "none",
    },
    askFollow: templateData.askFollow || {
      enabled: false,
      message:
        "Hey! It seems you haven't followed me yet 🙂\n\nHit the follow button on my profile, then tap 'I'm following' below to get your link 🧲",
      visitProfileBtn: "Visit Profile",
      followingBtn: "I'm following ✅",
    },
    askEmail: templateData.askEmail || {
      enabled: false,
      openingMessage:
        "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your email address first. Please share it in the chat.",
      retryMessage: "Please enter a correct email address, e.g. info@gmail.com",
      sendDmIfNoEmail: true,
    },
    askPhone: templateData.askPhone || {
      enabled: false,
      openingMessage:
        "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your phone number first. Please share it in the chat.",
      retryMessage: "Please enter a correct phone number, e.g. +1234567890",
      sendDmIfNoPhone: true,
    },
    followUpDMs: templateData.followUpDMs || {
      enabled: false,
      messages: [],
    },
  };

  console.log("Sending payload to server:", payload);
  return apiRequest("/insta/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ==================== ACCOUNT MANAGEMENT ====================

export const getAllInstagramAccounts = (
  apiRequest: ApiRequestFn,
): Promise<{ accounts: any }> => {
  return apiRequest("/insta/accounts", { method: "GET" });
};

export const deleteInstaAccount = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/insta/accounts/${accountId}`, { method: "DELETE" });
};

export const refreshInstagramToken = (
  apiRequest: ApiRequestFn,
  accountId: string,
): Promise<{ success: boolean; accessToken?: string }> => {
  return apiRequest(`/insta/accounts/${accountId}/refresh`, {
    method: "POST",
  });
};

export function reconnectInstagramAccount() {
  window.location.href = "/api/instagram/connect";
}

// ==================== LEADS FUNCTIONS ====================

export interface GetLeadsParams {
  accountId?: string;
  templateId?: string;
  source?: "all" | "email_collection" | "phone_collection";
  automationType?: "all" | "comments" | "stories" | "dms";
  page?: number;
  limit?: number;
}

export interface LeadItem {
  _id: string;
  templateId: string;
  templateName: string;
  commenterUserId: string;
  commenterUsername: string;
  automationType: "comments" | "stories" | "dms";
  email?: string;
  phone?: string;
  source: "email_collection" | "phone_collection";
  createdAt: string;
  updatedAt: string;
}

export interface GetLeadsResponse {
  success: boolean;
  leads: LeadItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export const getLeads = (
  apiRequest: ApiRequestFn,
  params: GetLeadsParams,
): Promise<GetLeadsResponse> => {
  const searchParams = new URLSearchParams();
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.templateId) searchParams.set("templateId", params.templateId);
  if (params.source && params.source !== "all")
    searchParams.set("source", params.source);
  if (params.automationType && params.automationType !== "all")
    searchParams.set("automationType", params.automationType);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  return apiRequest(`/insta/leads?${searchParams.toString()}`, {
    method: "GET",
  });
};

export const deleteLead = (
  apiRequest: ApiRequestFn,
  leadId: string,
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/insta/leads?id=${leadId}`, { method: "DELETE" });
};

// ==================== UPLOAD FUNCTIONS ====================

export interface UploadMediaResult {
  success: boolean;
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  width?: number;
  height?: number;
  bytes: number;
}

/**
 * Upload a file to Cloudinary via the /api/upload endpoint.
 * Uses fetch directly (not apiRequest) because it sends FormData.
 */
export async function uploadMedia(file: File): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/misc/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  return response.json();
}

// ==================== RATE LIMIT FUNCTIONS ====================

export const getRateLimitStats = (
  apiRequest: ApiRequestFn,
): Promise<UserTierInfo> => {
  return apiRequest("/rate-limit/stats", { method: "GET" });
};

export const getUserTierInfo = (
  apiRequest: ApiRequestFn,
): Promise<UserTierInfo> => {
  return apiRequest("/rate-limit/stats", { method: "GET" });
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
  return apiRequest("/rate-limit/window/current", { method: "GET" });
};

export const resetRateLimitWindow = (
  apiRequest: ApiRequestFn,
): Promise<{
  success: boolean;
  message: string;
  processed: number;
  resetAccounts: number;
}> => {
  return apiRequest("/rate-limit/window/reset", { method: "POST" });
};

// ==================== QUEUE MANAGEMENT ====================

export const processQueue = (
  apiRequest: ApiRequestFn,
  limit?: number,
): Promise<ProcessQueueResponse> => {
  const url = limit
    ? `/rate-limit/queue/process?limit=${limit}`
    : "/rate-limit/queue/process";
  return apiRequest(url, { method: "GET" });
};

// ==================== USER TIER FUNCTIONS ====================

export const getUserTier = (
  apiRequest: ApiRequestFn,
): Promise<{ tier: "free" | "pro" }> => {
  return apiRequest("/user/tier", { method: "GET" });
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
        headers: { "Content-Type": "application/json" },
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
  return apiRequest(`/insta/replylogs?limit=${limit}`, { method: "GET" });
};

export const getSubscriptioninfo = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/insta/subscription/list", { method: "GET" });
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
    storyAutomationsEnabled?: boolean;
    trackDmUrlEnabled?: boolean;
  },
): Promise<{ success: boolean; account: any }> => {
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
  return apiRequest(url, { method: "GET" });
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

// ==================== INTERFACES ====================

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
  mediaUrl?: string;
  mediaType?: string;
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

export type AutomationType = "comments" | "stories" | "dms" | "live";
export type DelayOption = "immediate" | "3min" | "5min" | "10min";
export type TagType = "none" | "user" | "account";

export interface WelcomeMessageConfig {
  text: string;
  buttonTitle: string;
}

export interface PublicReplyConfig {
  enabled: boolean;
  replies: string[];
  tagType: TagType;
}

export interface AskFollowConfig {
  enabled: boolean;
  message: string;
  visitProfileBtn: string;
  followingBtn: string;
}

export interface AskEmailConfig {
  enabled: boolean;
  openingMessage: string;
  retryMessage: string;
  sendDmIfNoEmail: boolean;
}

export interface AskPhoneConfig {
  enabled: boolean;
  openingMessage: string;
  retryMessage: string;
  sendDmIfNoPhone: boolean;
}

export interface FollowUpLink {
  url: string;
  buttonTitle: string;
}

export interface FollowUpMessageConfig {
  condition: string;
  waitTime: number;
  waitUnit: "minutes" | "hours";
  message: string;
  links: FollowUpLink[];
}

export interface FollowUpDMsConfig {
  enabled: boolean;
  messages: FollowUpMessageConfig[];
}

export interface TemplateType {
  _id: string;
  name: string;
  userId: string;
  accountId: string;
  accountUsername: string;
  mediaId: string;
  mediaUrl?: string;
  mediaType?: string;
  content: ContentItem[];
  reply: string[];
  triggers: string[];
  isFollow: boolean;
  delaySeconds?: number;
  delayOption?: DelayOption;
  isActive: boolean;
  priority: number;
  usageCount?: number;
  lastUsed?: string;
  successRate?: number;
  settingsByTier?: TemplateSettingsByTier;
  automationType: AutomationType;
  anyPostOrReel?: boolean;
  anyKeyword?: boolean;
  welcomeMessage: WelcomeMessageConfig;
  publicReply?: PublicReplyConfig;
  askFollow?: AskFollowConfig;
  askEmail?: AskEmailConfig;
  askPhone?: AskPhoneConfig;
  followUpDMs?: FollowUpDMsConfig;
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
  storyAutomationsEnabled: boolean;
  trackDmUrlEnabled: boolean;
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
