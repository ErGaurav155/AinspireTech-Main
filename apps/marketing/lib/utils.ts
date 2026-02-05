import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  message?: string;
}

// Core API request function
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  try {
    const url = `${API_BASE_URL}/api${endpoint}`;

    // Create headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add API key for embed routes
    if (endpoint.startsWith("/embed")) {
      headers["x-api-key"] = API_KEY;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "omit", // Change from "include" for public endpoints
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed for ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      throw new Error(errorText || `API request failed: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || result.message || "API request failed");
    }

    return result.data;
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
};

// Appointment API function
export const createAppointment = async (appointmentData: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  subject?: string;
  message?: string;
  source?: string;
}): Promise<any> => {
  return apiRequest("/embed/appointments", {
    method: "POST",
    body: JSON.stringify(appointmentData),
  });
};
