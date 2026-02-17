import { ApiRequestFn } from "../useApi";

/* ==================== WINDOW STATS ==================== */

export const getWindowStats = (
  apiRequest: ApiRequestFn,
  windowStart?: Date,
) => {
  const params = windowStart ? `?windowStart=${windowStart.toISOString()}` : "";

  return apiRequest(`/rate-limit/window-stats${params}`, {
    method: "GET",
  });
};

/* ==================== USER RATE LIMIT STATS ==================== */

export const getUserRateLimitStats = (
  apiRequest: ApiRequestFn,
  clerkId: string,
) => {
  return apiRequest(`/rate-limit/user-stats?clerkId=${clerkId}`, {
    method: "GET",
  });
};
