import { ApiRequestFn } from "../useApi";

/* =========================
   USER ACTIONS
========================= */

export const createUser = (apiRequest: ApiRequestFn, user: any) =>
  apiRequest("/user/create", {
    method: "POST",
    body: JSON.stringify(user),
  });

export const getUserById = (apiRequest: ApiRequestFn, userId: string) =>
  apiRequest(`/user/${userId}`, {
    method: "GET",
  });

export const updateNumberByUserId = (
  apiRequest: ApiRequestFn,
  userId: string,
  newNumber: string,
) =>
  apiRequest("/user/update-number", {
    method: "PUT",
    body: JSON.stringify({ userId, newNumber }),
  });

export const updateUser = (
  apiRequest: ApiRequestFn,
  clerkId: string,
  user: any,
) =>
  apiRequest("/user/update", {
    method: "PUT",
    body: JSON.stringify({ clerkId, ...user }),
  });

export const cleanupUserData = async (
  apiRequest: ApiRequestFn,
  clerkId: string,
): Promise<{ success: boolean; message: string }> => {
  const data = await apiRequest<{ message: string }>("/user/cleanup", {
    method: "DELETE",
    body: JSON.stringify({ clerkId }),
  });

  return {
    success: true,
    message: data.message,
  };
};

export const hasActiveSubscriptions = (apiRequest: ApiRequestFn) =>
  apiRequest(`/user/active-subscriptions`, {
    method: "GET",
  });

export const updateUserLimits = async (
  apiRequest: ApiRequestFn,
  replyLimit: number,
  accountLimit: number,
): Promise<{
  success: boolean;
  tier?: string;
  hourlyRateLimit?: number;
  error?: string;
}> => {
  try {
    const data = await apiRequest<{ tier: string; hourlyRateLimit: number }>(
      "/user/update-limits",
      {
        method: "PUT",
        body: JSON.stringify({ replyLimit, accountLimit }),
      },
    );

    return {
      success: true,
      tier: data.tier,
      hourlyRateLimit: data.hourlyRateLimit,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update user limits",
    };
  }
};

export const resetFreeRepliesForAllUsers = (apiRequest: ApiRequestFn) =>
  apiRequest("/user/reset-free-replies", {
    method: "POST",
  });

export const getAffiliateUser = async (
  apiRequest: ApiRequestFn,
  userId: string,
): Promise<{ success: boolean; user?: any; message?: string }> => {
  try {
    const data = await apiRequest<{ user: any }>(`/user/affiliate/${userId}`, {
      method: "GET",
    });

    return {
      success: true,
      user: data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch affiliate user",
    };
  }
};

export const checkAndPrepareScrape = async (
  apiRequest: ApiRequestFn,
  input: {
    userId: string;
    url: string;
    chatbotId: string;
  },
): Promise<{
  success: boolean;
  alreadyScrapped?: boolean;
  message?: string;
  data?: any;
  error?: string;
}> => {
  try {
    const data = await apiRequest("/user/check-scrape", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return {
      success: true,
      alreadyScrapped: data.alreadyScrapped,
      message: data.message,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to check scrape status",
    };
  }
};

/* =========================
   HELPER FUNCTIONS
========================= */

export const getUserTier = async (
  apiRequest: ApiRequestFn,
  userId: string,
): Promise<string> => {
  try {
    const user = await getUserById(apiRequest, userId);
    return user.tier || "free";
  } catch {
    return "free";
  }
};

export const getUserAccountLimit = async (
  apiRequest: ApiRequestFn,
  userId: string,
): Promise<number> => {
  try {
    const user = await getUserById(apiRequest, userId);
    return user.accountLimit || 1;
  } catch {
    return 1;
  }
};

export const getUserReplyLimit = async (
  apiRequest: ApiRequestFn,
  userId: string,
): Promise<number> => {
  try {
    const user = await getUserById(apiRequest, userId);
    return user.replyLimit || 500;
  } catch {
    return 500;
  }
};
