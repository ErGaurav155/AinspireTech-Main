import { ApiRequestFn } from "../useApi";

/* =========================
   USER METHODS
========================= */

export const getUserProfile = (apiRequest: ApiRequestFn) =>
  apiRequest("/web/user/profile", { method: "GET" });

export const updateUserProfile = (
  apiRequest: ApiRequestFn,
  name: string,
  email: string,
) =>
  apiRequest("/web/user/profile", {
    method: "PUT",
    body: JSON.stringify({ name, email }),
  });

/* =========================
   SUBSCRIPTION METHODS
========================= */

export const getSubscriptions = (apiRequest: ApiRequestFn) =>
  apiRequest("/web/subscription/list", { method: "GET" });

export const createSubscription = (
  apiRequest: ApiRequestFn,
  chatbotType: string,
  plan: string,
  billingCycle: string,
  subscriptionId: string,
  referralCode?: string | null,
) =>
  apiRequest("/web/subscription/create", {
    method: "POST",
    body: JSON.stringify({
      chatbotType,
      plan,
      billingCycle,
      subscriptionId,
      referralCode: referralCode || null,
    }),
  });

export const cancelSubscription = (
  apiRequest: ApiRequestFn,
  chatbotType: string,
) =>
  apiRequest("/web/subscription/cancel", {
    method: "POST",
    body: JSON.stringify({ chatbotType }),
  });

/* =========================
   CHATBOT METHODS
========================= */

export const getChatbots = (apiRequest: ApiRequestFn) =>
  apiRequest("/web/chatbot/list", { method: "GET" });

export const getChatbot = (apiRequest: ApiRequestFn, chatbotId: string) =>
  apiRequest(`/web/chatbot/${chatbotId}`, { method: "GET" });

export const createWebChatbot = (
  apiRequest: ApiRequestFn,
  data: {
    name: string;
    type: string;
    websiteUrl?: string;
    subscriptionId?: string;
  },
) =>
  apiRequest("/web/chatbot/create", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWebChatbot = (
  apiRequest: ApiRequestFn,
  chatbotId: string,
  updates: any,
) =>
  apiRequest(`/web/chatbot/${chatbotId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

export const deleteChatbot = (apiRequest: ApiRequestFn, chatbotId: string) =>
  apiRequest(`/web/chatbot/${chatbotId}`, {
    method: "DELETE",
  });

/* =========================
   ANALYTICS
========================= */

export const getAnalytics = (
  apiRequest: ApiRequestFn,
  chatbotType: string,
  period: string = "7d",
) =>
  apiRequest(`/web/analytics/${chatbotType}?period=${period}`, {
    method: "GET",
  });

export const scrapeWebsite = (
  apiRequest: ApiRequestFn,
  url: string,
  chatbotId: string,
) =>
  apiRequest("/scrape/scrape-anu", {
    method: "POST",
    body: JSON.stringify({ url, chatbotId }),
  });

export const processScrapedData = (apiRequest: ApiRequestFn, data: any) =>
  apiRequest("/scrape/process-data", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* =========================
   CONVERSATIONS
========================= */

export const getConversations = (
  apiRequest: ApiRequestFn,
  chatbotType: string,
  limit: number = 20,
  offset: number = 0,
) =>
  apiRequest(
    `/web/conversations/${chatbotType}?limit=${limit}&offset=${offset}`,
    { method: "GET" },
  );

/* =========================
   APPOINTMENTS
========================= */

export const getAppointmentQuestions = (
  apiRequest: ApiRequestFn,
  chatbotType: string,
) =>
  apiRequest(`/web/appointment-question?chatbotType=${chatbotType}`, {
    method: "GET",
  });

export const saveAppointmentQuestions = (
  apiRequest: ApiRequestFn,
  chatbotType: string,
  questions: any[],
) =>
  apiRequest("/web/appointment-question", {
    method: "POST",
    body: JSON.stringify({ chatbotType, questions }),
  });

/* =========================
   FAQ
========================= */

export const saveFAQ = (
  apiRequest: ApiRequestFn,
  clerkId: string,
  chatbotType: string,
  questions: any[],
) =>
  apiRequest("/web/faq", {
    method: "POST",
    body: JSON.stringify({ clerkId, chatbotType, questions }),
  });

export const getFAQ = (apiRequest: ApiRequestFn, chatbotType: string) =>
  apiRequest(`/web/faq?chatbotType=${chatbotType}`, {
    method: "GET",
  });

export const getEmbedFAQ = (
  apiRequest: ApiRequestFn,
  userId: string,
  chatbotType: string,
) =>
  apiRequest("/web/faq", {
    method: "POST",
    body: JSON.stringify({ userId, chatbotType }),
  });

/* =========================
   TOKENS
========================= */

export const resetFreeTokens = (apiRequest: ApiRequestFn) =>
  apiRequest("/tokens/reset-free", { method: "POST" });

export const purchaseTokens = (
  apiRequest: ApiRequestFn,
  data: {
    tokens: number;
    amount: number;
    planId?: string;
    buyerId?: string;
  },
) =>
  apiRequest("/tokens/purchase", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const verifyPurchaseTokens = (apiRequest: ApiRequestFn, data: any) =>
  apiRequest("/tokens/purchase", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const getPurchaseHistory = (apiRequest: ApiRequestFn) =>
  apiRequest("/tokens/purchase-history", { method: "GET" });

export const getTokenBalance = (apiRequest: ApiRequestFn) =>
  apiRequest("/tokens/balance", { method: "GET" });

export const getTokenUsage = (
  apiRequest: ApiRequestFn,
  period: string = "month",
) => apiRequest(`/tokens/usage?period=${period}`, { method: "GET" });

/* =========================
   OTP
========================= */

export const sendOtp = (apiRequest: ApiRequestFn, fullPhoneNumber: string) =>
  apiRequest("/web/send-otp", {
    method: "POST",
    body: JSON.stringify({ fullPhoneNumber }),
  });
