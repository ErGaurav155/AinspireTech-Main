import { apiRequest } from "../utils";

// Replace direct service calls with API calls
export const getWindowStats = async (windowStart?: Date) => {
  const params = windowStart ? `?windowStart=${windowStart.toISOString()}` : "";
  return apiRequest(`/rate-limit/window-stats${params}`, {
    method: "GET",
  });
};

export const getUserRateLimitStats = async (clerkId: string) => {
  return apiRequest(`/rate-limit/user-stats?clerkId=${clerkId}`, {
    method: "GET",
  });
};

export const getCurrentWindow = async () => {
  return apiRequest("/rate-limit/current-window", {
    method: "GET",
  });
};

export const getNextWindow = async () => {
  return apiRequest("/rate-limit/next-window", {
    method: "GET",
  });
};

export const isAppLimitReached = async () => {
  return apiRequest("/rate-limit/app-limit", {
    method: "GET",
  });
};

export const canMakeCall = async (
  clerkId: string,
  instagramAccountId?: string,
) => {
  return apiRequest("/rate-limit/check-call", {
    method: "POST",
    body: JSON.stringify({ clerkId, instagramAccountId }),
  });
};

export const recordCall = async (
  clerkId: string,
  instagramAccountId: string,
  actionType: string,
  metadata?: any,
  incrementBy?: number,
) => {
  return apiRequest("/rate-limit/record-call", {
    method: "POST",
    body: JSON.stringify({
      clerkId,
      instagramAccountId,
      actionType,
      metadata,
      incrementBy,
    }),
  });
};

export const queueCall = async (
  clerkId: string,
  instagramAccountId: string,
  actionType: string,
  actionPayload: any,
  priority: number = 5,
  reason?: string,
) => {
  return apiRequest("/rate-limit/queue-call", {
    method: "POST",
    body: JSON.stringify({
      clerkId,
      instagramAccountId,
      actionType,
      actionPayload,
      priority,
      reason,
    }),
  });
};

export const resetWindowAndProcessQueue = async () => {
  return apiRequest("/rate-limit/reset-window", {
    method: "POST",
  });
};

export const getAllAccountsUsage = async (windowStart?: Date) => {
  const params = windowStart ? `?windowStart=${windowStart.toISOString()}` : "";
  return apiRequest(`/rate-limit/all-accounts-usage${params}`, {
    method: "GET",
  });
};

export const toggleUserAutomation = async (clerkId: string, pause: boolean) => {
  return apiRequest("/rate-limit/toggle-user-automation", {
    method: "POST",
    body: JSON.stringify({ clerkId, pause }),
  });
};

export const getAccountQueueItems = async (
  instagramAccountId: string,
  limit: number = 50,
) => {
  return apiRequest(
    `/rate-limit/account-queue?instagramAccountId=${instagramAccountId}&limit=${limit}`,
    {
      method: "GET",
    },
  );
};

export const pauseAppAutomation = async () => {
  return apiRequest("/rate-limit/pause-app", {
    method: "POST",
  });
};

export const resumeAppAutomation = async () => {
  return apiRequest("/rate-limit/resume-app", {
    method: "POST",
  });
};
