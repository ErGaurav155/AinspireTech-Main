/* eslint-disable prefer-const */
/* eslint-disable no-prototype-builtins */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ERROR HANDLER
export const handleError = (error: unknown) => {
  if (error instanceof Error) {
    // This is a native JavaScript error (e.g., TypeError, RangeError)
    throw new Error(`Error: ${error.message}`);
  } else if (typeof error === "string") {
    // This is a string error message
    throw new Error(`Error: ${error}`);
  } else {
    // This is an unknown type of error
    throw new Error(`Unknown error: ${JSON.stringify(error)}`);
  }
};

export function createAuthResponse(error: string, status: number = 401) {
  return Response.json({ error }, { status });
}

class ApiClient {
  private async getAuthHeaders() {
    // For client-side requests, we'll rely on Clerk's automatic session handling
    return {
      "Content-Type": "application/json",
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const config = {
      headers: await this.getAuthHeaders(),
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  }

  // User methods
  async getUserProfile() {
    return this.request("/web/user/profile");
  }

  async updateUserProfile(name: string, email: string) {
    return this.request("/web/user/profile", {
      method: "PUT",
      body: JSON.stringify({ name, email }),
    });
  }

  // Subscription methods
  async getSubscriptions(userId: string) {
    return this.request(`/web/subscription/list?userId=${userId}`);
  }

  async createSubscription(
    chatbotType: string,
    plan: string,
    billingCycle: string,
    subscriptionId: string,
    referralCode?: string | null,
  ) {
    return this.request("/web/subscription/create", {
      method: "POST",
      body: JSON.stringify({
        chatbotType,
        plan,
        billingCycle,
        subscriptionId,
        referralCode: referralCode || null,
      }),
    });
  }

  async cancelSubscription(chatbotType: string) {
    return this.request("/web/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ chatbotType }),
    });
  }

  // Chatbot methods
  async getChatbots(userId: string) {
    return this.request(`/web/chatbot/list?userId=${userId}`);
  }
  async getChatbot(chatbotId: string) {
    return this.request(`/web/chatbot/${chatbotId}`);
  }

  async createChatbot(data: {
    name: string;
    type: string;
    websiteUrl: string;
    subscriptionId?: string;
  }) {
    return this.request("/web/chatbot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async updateChatbot(chatbotId: string, updates: any) {
    return this.request(`/web/chatbot/${chatbotId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  async deleteChatbot(chatbotId: string) {
    return this.request(`/web/chatbot/${chatbotId}`, {
      method: "DELETE",
    });
  }

  // Analytics methods
  async getAnalytics(chatbotType: string, period: string = "7d") {
    return this.request(`/web/analytics/${chatbotType}?period=${period}`);
  }
  async scrapeWebsite(data: {
    url: string;
    userId: string;
    chatbotId: string;
  }) {
    return this.request(
      `/scrape-anu?url=${encodeURIComponent(
        data.url,
      )}&userId=${encodeURIComponent(
        data.userId,
      )}&chatbotId=${encodeURIComponent(data.chatbotId)}`,
    );
  }
  async processScrapedData(data: any) {
    return this.request("/scrape-anu/process-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }
  // Conversations methods
  async getConversations(
    chatbotType: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    return this.request(
      `/web/conversations/${chatbotType}?limit=${limit}&offset=${offset}`,
    );
  }

  // Appointment questions methods
  async getAppointmentQuestions(chatbotType: string) {
    return this.request(
      `/web/appointment-questions?chatbotType=${chatbotType}`,
    );
  }

  async saveAppointmentQuestions(chatbotType: string, questions: any[]) {
    return this.request("/web/appointment-questions", {
      method: "POST",
      body: JSON.stringify({ chatbotType, questions }),
    });
  }
  async saveFAQ(clerkId: string, chatbotType: string, questions: any[]) {
    return this.request("/web/faq", {
      method: "POST",
      body: JSON.stringify({ clerkId, chatbotType, questions }),
    });
  }

  async getFAQ(clerkId: string, chatbotType: string) {
    return this.request(
      `/web/faq?chatbotType=${chatbotType}&clerkId=${clerkId}`,
    );
  }
  async getEmbedFAQ(userId: string, chatbotType: string) {
    return this.request("/web/faq", {
      method: "POST",
      body: JSON.stringify({ userId, chatbotType }),
    });
  }
}

export const apiClient = new ApiClient();

// lib/cacheUtils.ts
const ACCOUNTS_CACHE_KEY = "instagramAccounts";

export interface InstagramAccount {
  id: string;
  accountId: string;
  username: string;
  displayName: string;
  profilePicture: string;
  followersCount: number;
  postsCount: number;
  isActive: boolean;
  templatesCount: number;
  repliesCount: number;
  lastActivity: string;
  engagementRate: number;
  avgResponseTime: string;
  accessToken: string;
}

// Get all cached accounts
export function getCachedAccounts(): InstagramAccount[] | null {
  try {
    const cachedData = localStorage.getItem(ACCOUNTS_CACHE_KEY);
    if (!cachedData) return null;

    const { data } = JSON.parse(cachedData);
    return data;
  } catch (error) {
    console.error("Error reading account cache:", error);
    return null;
  }
}

// Get specific account by ID
export function getCachedAccountById(
  accountId: string,
): InstagramAccount | null {
  try {
    const cachedData = localStorage.getItem(ACCOUNTS_CACHE_KEY);
    if (!cachedData) return null;

    const { data } = JSON.parse(cachedData);
    return (
      data.find((account: InstagramAccount) => account.id === accountId) || null
    );
  } catch (error) {
    console.error("Error reading account cache:", error);
    return null;
  }
}

// Check if cache is valid
export function isCacheValid(): boolean {
  try {
    const cachedData = localStorage.getItem(ACCOUNTS_CACHE_KEY);
    if (!cachedData) return false;

    const { timestamp } = JSON.parse(cachedData);
    const cacheDuration = 15 * 60 * 1000; // 15 minutes
    return Date.now() - timestamp < cacheDuration;
  } catch (error) {
    console.error("Error checking cache validity:", error);
    return false;
  }
}
export const formatResponseTimeSmart = (milliseconds: number): string => {
  if (!milliseconds || milliseconds <= 0) return "0s";

  const seconds = milliseconds / 1000;

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
};
export function verifyApiKey(apiKey: string): boolean {
  // In production, you should store this in environment variables
  const validApiKeys = process.env.API_KEYS?.split(",") || [];

  // For development/testing, accept the hardcoded key
  if (apiKey === "your_32byte_encryption_key_here_12345") {
    return true;
  }

  // Check against environment variable
  return validApiKeys.includes(apiKey.trim());
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  message?: string;
}

// Core API request function - SIMPLIFIED
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  try {
    const url = `${API_BASE_URL}/api${endpoint}`;

    // Create headers - No Authorization header needed!
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed for ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      throw new Error(errorText || response.statusText);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || "API request failed");
    }

    return result.data;
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
};
