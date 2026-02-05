import { apiRequest } from "../utils";

// User methods
export const getUserProfile = async (): Promise<any> => {
  return apiRequest("/web/user/profile", {
    method: "GET",
  });
};

export const updateUserProfile = async (
  name: string,
  email: string,
): Promise<any> => {
  return apiRequest("/web/user/profile", {
    method: "PUT",
    body: JSON.stringify({ name, email }),
  });
};

// Subscription methods
export const getSubscriptions = async (): Promise<any> => {
  return apiRequest(`/web/subscription/list`, {
    method: "GET",
  });
};

export const createSubscription = async (
  chatbotType: string,
  plan: string,
  billingCycle: string,
  subscriptionId: string,
  referralCode?: string | null,
): Promise<any> => {
  return apiRequest("/web/subscription/create", {
    method: "POST",
    body: JSON.stringify({
      chatbotType,
      plan,
      billingCycle,
      subscriptionId,
      referralCode: referralCode || null,
    }),
  });
};

export const cancelSubscription = async (chatbotType: string): Promise<any> => {
  return apiRequest("/web/subscription/cancel", {
    method: "POST",
    body: JSON.stringify({ chatbotType }),
  });
};

// Chatbot methods
export const getChatbots = async (): Promise<any> => {
  return apiRequest(`/web/chatbot/list`, {
    method: "GET",
  });
};

export const getChatbot = async (chatbotId: string): Promise<any> => {
  return apiRequest(`/web/chatbot/${chatbotId}`, {
    method: "GET",
  });
};

export const createWebChatbot = async (data: {
  name: string;
  type: string;
  websiteUrl?: string;
  subscriptionId?: string;
}): Promise<any> => {
  return apiRequest("/web/chatbot/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateWebChatbot = async (
  chatbotId: string,
  updates: any,
): Promise<any> => {
  return apiRequest(`/web/chatbot/${chatbotId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const deleteChatbot = async (chatbotId: string): Promise<any> => {
  return apiRequest(`/web/chatbot/${chatbotId}`, {
    method: "DELETE",
  });
};

// Analytics methods
export const getAnalytics = async (
  chatbotType: string,
  period: string = "7d",
): Promise<any> => {
  return apiRequest(`/web/analytics/${chatbotType}?period=${period}`, {
    method: "GET",
  });
};

export const scrapeWebsite = async (
  url: string,
  chatbotId: string,
): Promise<any> => {
  return apiRequest("/scrape/scrape-anu", {
    method: "POST",
    body: JSON.stringify({ url, chatbotId }),
  });
};

export const processScrapedData = async (data: any): Promise<any> => {
  return apiRequest("/scrape/process-data", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Conversations methods
export const getConversations = async (
  chatbotType: string,
  limit: number = 20,
  offset: number = 0,
): Promise<any> => {
  return apiRequest(
    `/web/conversations/${chatbotType}?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
    },
  );
};

// Appointment questions methods
export const getAppointmentQuestions = async (
  chatbotType: string,
): Promise<any> => {
  return apiRequest(`/web/appointment-question?chatbotType=${chatbotType}`, {
    method: "GET",
  });
};

export const saveAppointmentQuestions = async (
  chatbotType: string,
  questions: any[],
): Promise<any> => {
  return apiRequest("/web/appointment-question", {
    method: "POST",
    body: JSON.stringify({ chatbotType, questions }),
  });
};

export const saveFAQ = async (
  clerkId: string,
  chatbotType: string,
  questions: any[],
): Promise<any> => {
  return apiRequest("/web/faq", {
    method: "POST",
    body: JSON.stringify({ clerkId, chatbotType, questions }),
  });
};

export const getFAQ = async (chatbotType: string): Promise<any> => {
  return apiRequest(`/web/faq?chatbotType=${chatbotType}`, {
    method: "GET",
  });
};

export const getEmbedFAQ = async (
  userId: string,
  chatbotType: string,
): Promise<any> => {
  return apiRequest("/web/faq", {
    method: "POST",
    body: JSON.stringify({ userId, chatbotType }),
  });
};
export const resetFreeTokens = async (): Promise<any> => {
  return apiRequest("/tokens/reset-free", {
    method: "POST",
  });
};
export const purchaseTokens = async (data: {
  tokens: number;
  amount: number;
  planId?: string;
  buyerId?: string;
}): Promise<any> => {
  return apiRequest("/tokens/purchase", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const verifyPurchaseTokens = async (data: any): Promise<any> => {
  return apiRequest("/tokens/purchase", {
    method: "PUT",
    body: JSON.stringify(data),
  });
};
export const getPurchaseHistory = async (): Promise<any> => {
  return apiRequest("/tokens/purchase-history", {
    method: "GET",
  });
};
export const getTokenBalance = async (): Promise<any> => {
  return apiRequest("/tokens/balance", {
    method: "GET",
  });
};
export const getTokenUsage = async (
  period: string = "month", // Default to "month" if not provided
): Promise<any> => {
  return apiRequest(`/tokens/usage?period=${period}`, {
    method: "GET",
  });
};
export const sendOtp = async (fullPhoneNumber: string): Promise<any> => {
  return apiRequest("/web/send-otp", {
    method: "POST",
    body: JSON.stringify({ fullPhoneNumber }),
  });
};
