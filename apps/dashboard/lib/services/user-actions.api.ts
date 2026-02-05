import { apiRequest } from "../utils";

// User Actions API Functions
export const createUser = async (user: any): Promise<any> => {
  return apiRequest("/user/create", {
    method: "POST",
    body: JSON.stringify(user),
  });
};

export const getUserById = async (userId: string): Promise<any> => {
  return apiRequest(`/user/${userId}`, {
    method: "GET",
  });
};

export const updateNumberByUserId = async (
  userId: string,
  newNumber: string,
): Promise<any> => {
  return apiRequest("/user/update-number", {
    method: "PUT",
    body: JSON.stringify({ userId, newNumber }),
  });
};

export const updateUser = async (clerkId: string, user: any): Promise<any> => {
  return apiRequest("/user/update", {
    method: "PUT",
    body: JSON.stringify({ clerkId, ...user }),
  });
};

export const cleanupUserData = async (
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

export const hasActiveSubscriptions = async (): Promise<{
  webSubscriptionIds: string[];
  instaSubscriptionIds: string[];
}> => {
  return apiRequest(`/user/active-subscriptions`, {
    method: "GET",
  });
};

export const updateUserLimits = async (
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

export const resetFreeRepliesForAllUsers = async (): Promise<{
  processedCount: number;
}> => {
  return apiRequest(
    "/user/reset-free-replies",
    {
      method: "POST",
    },
    // Note: This might need a special admin userId if it requires auth
  );
};

export const getAffiliateUser = async (
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

export const checkAndPrepareScrape = async (input: {
  userId: string;
  url: string;
  chatbotId: string;
}): Promise<{
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
      data: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to check scrape status",
    };
  }
};

// Additional helper functions
export const getUserTier = async (userId: string): Promise<string> => {
  try {
    const user = await getUserById(userId);
    return user.tier || "free";
  } catch {
    return "free";
  }
};

export const getUserAccountLimit = async (userId: string): Promise<number> => {
  try {
    const user = await getUserById(userId);
    return user.accountLimit || 1;
  } catch {
    return 1;
  }
};

export const getUserReplyLimit = async (userId: string): Promise<number> => {
  try {
    const user = await getUserById(userId);
    return user.replyLimit || 500;
  } catch {
    return 500;
  }
};
