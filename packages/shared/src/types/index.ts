export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: "active" | "cancelled" | "expired";
  startDate: string;
  endDate: string;
  razorpaySubscriptionId?: string;
}
