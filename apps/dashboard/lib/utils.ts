/* eslint-disable prefer-const */
/* eslint-disable no-prototype-builtins */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
