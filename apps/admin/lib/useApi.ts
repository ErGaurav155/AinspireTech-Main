"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  message?: string;
}

export const useApi = () => {
  const { getToken } = useAuth();

  const apiRequest = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {},
    ): Promise<T> => {
      try {
        const token = await getToken();

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api${endpoint}`,
          {
            ...options,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...(options.headers || {}),
            },
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            // Avoid hard reload infinite loop
            if (typeof window !== "undefined") {
              window.location.href = "/sign-in";
            }
            throw new Error("Unauthorized");
          }

          const errorText = await response.text();
          throw new Error(errorText || "API request failed");
        }

        const result: ApiResponse<T> = await response.json();

        if (!result.success) {
          throw new Error(
            result.error || result.message || "API request failed",
          );
        }

        return result.data;
      } catch (error) {
        console.error("API Request Error:", error);
        throw error;
      }
    },
    [getToken], // 🔥 CRITICAL — keeps apiRequest stable
  );

  return { apiRequest };
};

export type ApiRequestFn = <T = any>(
  endpoint: string,
  options?: RequestInit,
) => Promise<T>;
