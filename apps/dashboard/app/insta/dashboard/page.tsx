"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Instagram,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Zap,
  X,
  RefreshCw,
  Loader2,
  Shield,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  Battery,
  Database,
  Server,
} from "lucide-react";

import defaultImg from "@ainspiretech/public/assets/img/default-img.jpg";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AccountSelectionDialog } from "@/components/insta/AccountSelectionDialog";

import { useTheme } from "next-themes";

import { Badge } from "@ainspiretech/ui/components/radix/badge";
import { Button } from "@ainspiretech/ui/components/radix/button";
import { BreadcrumbsDefault } from "@ainspiretech/ui/components/shared/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ainspiretech/ui/components/radix/card";
import { Progress } from "@ainspiretech/ui/components/radix/progress";
import { formatResponseTimeSmart } from "@ainspiretech/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ainspiretech/ui/components/radix/alert-dialog";
import { Textarea } from "@ainspiretech/ui/components/radix/textarea";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  cancelRazorPaySubscription,
  deleteInstaAccount,
  getDashboardData,
  getInstagramUser,
  getReplyLogs,
  getSubscriptioninfo,
  refreshInstagramToken,
  getRateLimitStats,
  getAppLimitStatus,
  getUserTier,
  updateUserTier,
  checkRateLimit,
  recordRateLimitCall,
  getCurrentWindow,
  resetRateLimitWindow,
  processQueue,
  UserTierInfo,
  AppLimitStatus,
  RateLimitWindow,
  InstagramAccount,
  SubscriptionInfo,
  MediaItem,
  ProcessQueueResponse,
  CanMakeCallResponse,
  RecordCallResponse,
} from "@/lib/services/insta-actions.api";

// Types
interface DashboardAccount extends InstagramAccount {
  id: string;
  templatesCount: number;
  repliesCount: number;
  replyLimit: number;
  accountLimit: number;
  totalAccounts: number;
  lastActivity: string;
  engagementRate: number;
  successRate: number;
  avgResponseTime: number;
  callsMade?: number;
  callsRemaining?: number;
  tokenExpiresAt: Date;
  tier?: "free" | "pro";
}

interface DashboardData {
  totalAccounts: number;
  activeAccounts: number;
  totalTemplates: number;
  totalReplies: number;
  accountLimit: number;
  replyLimit: number;
  engagementRate: number;
  successRate: number;
  overallAvgResponseTime: number;
  accounts: DashboardAccount[];
  recentActivity?: any[];
  rateLimit: UserTierInfo | null;
  appLimit: AppLimitStatus | null;
}

interface ThemeStyles {
  containerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  alertBg: string;
  buttonOutlineBorder: string;
  buttonOutlineText: string;
}

interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
}

// Constants
const ACCOUNTS_CACHE_KEY = "instagramAccounts";
const RATE_LIMIT_CACHE_KEY = "rateLimitStats";
const APP_LIMIT_CACHE_KEY = "appLimitStatus";
const DASHBOARD_CACHE_KEY = "dashboardData";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ACCOUNTS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for accounts
const FREE_PLAN_ACCOUNT_LIMIT = 1;
const CANCELLATION_REASON_PLACEHOLDER = "User requested cancellation";

// Rate Limit Constants
const TIER_LIMITS = {
  free: 100,
  pro: 999999,
} as const;

export default function Dashboard() {
  const { userId, isLoaded, getToken } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Refs to track initial load and prevent re-fetching
  const isInitialMount = useRef(true);
  const isFetching = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<string[]>([]);
  const [userAccounts, setUserAccounts] = useState<DashboardAccount[]>([]);
  const [rateLimitStats, setRateLimitStats] = useState<UserTierInfo | null>(
    null,
  );
  const [appLimitStatus, setAppLimitStatus] = useState<AppLimitStatus | null>(
    null,
  );
  const [rateLimitWindow, setRateLimitWindow] =
    useState<RateLimitWindow | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isQueueProcessing, setIsQueueProcessing] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<ProcessQueueResponse | null>(
    null,
  );
  const [rateLimitCheckResult, setRateLimitCheckResult] =
    useState<CanMakeCallResponse | null>(null);

  // Dialog states
  const [showAccountLimitDialog, setShowAccountLimitDialog] =
    useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] =
    useState<boolean>(false);
  const [showCancelAccountDialog, setShowCancelAccountDialog] =
    useState<boolean>(false);
  const [showTierUpgradeDialog, setShowTierUpgradeDialog] =
    useState<boolean>(false);
  const [showQueueDialog, setShowQueueDialog] = useState<boolean>(false);
  const [showRateLimitTestDialog, setShowRateLimitTestDialog] =
    useState<boolean>(false);

  // Cancellation states
  const [selectedSubscriptionId, setSelectedSubscriptionId] =
    useState<string>("");
  const [cancellationMode, setCancellationMode] = useState<
    "Immediate" | "End-of-term"
  >("End-of-term");
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isProcessingCancellation, setIsProcessingCancellation] =
    useState<boolean>(false);

  // Rate limit test states
  const [testAccountId, setTestAccountId] = useState<string>("");
  const [testActionType, setTestActionType] = useState<string>("comment_reply");
  const [isTestingRateLimit, setIsTestingRateLimit] = useState<boolean>(false);

  // Theme-based styles
  const themeStyles = useMemo((): ThemeStyles => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-transparent" : "bg-gray-50",
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      cardBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      badgeBg: isDark ? "bg-[#0a0a0a]" : "bg-white",
      alertBg: isDark ? "bg-[#6d1717]/5" : "bg-red-50/80",
      buttonOutlineBorder: isDark ? "border-white/20" : "border-gray-300",
      buttonOutlineText: isDark ? "text-gray-300" : "text-n-5",
    };
  }, [currentTheme]);

  // Helper: Get cached data with different durations
  const getCachedData = <T,>(
    key: string,
    duration: number = CACHE_DURATION,
  ): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > duration) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  };

  // Helper: Set cached data
  const setCachedData = <T,>(key: string, data: T): void => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Failed to cache data:", error);
    }
  };

  // Helper: Show toast notifications
  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info" = "success",
    ) => {
      if (type === "success") {
        toast.success(message);
      } else if (type === "error") {
        toast.error(message);
      } else if (type === "warning") {
        toast.warning(message);
      } else {
        toast.info(message);
      }
    },
    [],
  );

  // Helper: Format timestamp
  const formatTimestamp = useCallback((timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else {
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
      }
    } catch {
      return "Just now";
    }
  }, []);

  // Helper: Format date for display
  const formatDate = useCallback((date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Transform accounts to dashboard data
  const transformAccountsToDashboardData = useCallback(
    (
      accounts: DashboardAccount[],
      rateLimit: UserTierInfo | null,
      appLimit: AppLimitStatus | null,
    ): DashboardData => {
      return {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter((account) => account.isActive).length,
        totalTemplates: accounts.reduce(
          (sum, account) => sum + account.templatesCount,
          0,
        ),
        totalReplies: accounts.reduce(
          (sum, account) => sum + (account.accountReply || 0),
          0,
        ),
        accountLimit: accounts[0]?.accountLimit || 1,
        replyLimit: accounts[0]?.replyLimit || 500,
        engagementRate:
          accounts.length > 0
            ? accounts.reduce(
                (sum, account) => sum + account.engagementRate,
                0,
              ) / accounts.length
            : 0,
        successRate:
          accounts.length > 0
            ? accounts.reduce((sum, account) => sum + account.successRate, 0) /
              accounts.length
            : 0,
        overallAvgResponseTime:
          accounts.length > 0
            ? accounts.reduce(
                (sum, account) => sum + account.avgResponseTime,
                0,
              ) / accounts.length
            : 0,
        accounts,
        rateLimit,
        appLimit,
      };
    },
    [],
  );

  // Helper: Handle image error
  const handleImageError = useCallback((id: string): void => {
    setHasError((prev) => [...prev, id]);
  }, []);

  // Fetch rate limit statistics with caching
  const fetchRateLimitStats =
    useCallback(async (): Promise<UserTierInfo | null> => {
      if (!userId) return null;

      try {
        // Check cache first
        const cached = getCachedData<UserTierInfo>(RATE_LIMIT_CACHE_KEY);
        if (cached) {
          setRateLimitStats(cached);
          return cached;
        }

        const stats = await getRateLimitStats();

        if (stats) {
          setCachedData(RATE_LIMIT_CACHE_KEY, stats);
          setRateLimitStats(stats);
          return stats;
        }

        return null;
      } catch (error) {
        console.error("Failed to fetch rate limit stats:", error);
        return null;
      }
    }, [userId]);

  // Fetch current rate limit window
  const fetchCurrentWindow =
    useCallback(async (): Promise<RateLimitWindow | null> => {
      try {
        const window = await getCurrentWindow();
        setRateLimitWindow(window);
        return window;
      } catch (error) {
        console.error("Failed to fetch current window:", error);
        return null;
      }
    }, []);

  // Fetch app limit status with caching
  const fetchAppLimitStatus =
    useCallback(async (): Promise<AppLimitStatus | null> => {
      try {
        // Check cache first
        const cached = getCachedData<AppLimitStatus>(APP_LIMIT_CACHE_KEY);
        if (cached) {
          setAppLimitStatus(cached);
          return cached;
        }

        const status = await getAppLimitStatus();

        if (status) {
          setCachedData(APP_LIMIT_CACHE_KEY, status);
          setAppLimitStatus(status);
          return status;
        }

        return null;
      } catch (error) {
        console.error("Failed to fetch app limit status:", error);
        return null;
      }
    }, []);

  // Fetch Instagram accounts with caching
  const fetchAccounts = useCallback(async (): Promise<
    DashboardAccount[] | null
  > => {
    if (!userId) {
      router.push("/sign-in");
      return null;
    }

    try {
      setError(null);

      // Check cache first
      const cachedAccounts = getCachedData<DashboardAccount[]>(
        ACCOUNTS_CACHE_KEY,
        ACCOUNTS_CACHE_DURATION,
      );
      if (cachedAccounts) {
        setUserAccounts(cachedAccounts);
        return cachedAccounts;
      }

      // Fetch from API
      const dashboardResponse = await getDashboardData();
      const {
        accounts: dbAccounts,
        totalReplies,
        accountLimit,
        replyLimit,
        totalAccounts,
        totalTemplates,
        activeAccounts,
        successRate,
        engagementRate,
        overallAvgResponseTime,
      } = dashboardResponse;

      if (!dbAccounts?.length) {
        return [];
      }

      // Get rate limit stats for account usage
      const rateStats = await fetchRateLimitStats();

      // Transform accounts
      const completeAccounts: DashboardAccount[] = dbAccounts.map(
        (dbAccount: any) => {
          // Find account usage from rate limit stats
          const accountUsage = rateStats?.accountUsage?.find(
            (usage) => usage.instagramAccountId === dbAccount.instagramId,
          );

          return {
            id: dbAccount._id,
            instagramId: dbAccount.instagramId,
            userId: dbAccount.userId,
            username: dbAccount.username,
            accessToken: dbAccount.accessToken,
            isActive: dbAccount.isActive || false,
            autoReplyEnabled: dbAccount.autoReplyEnabled || false,
            autoDMEnabled: dbAccount.autoDMEnabled || false,
            followCheckEnabled: dbAccount.followCheckEnabled || false,
            requireFollowForFreeUsers:
              dbAccount.requireFollowForFreeUsers || false,
            accountReply: dbAccount.accountReply || 0,
            accountFollowCheck: dbAccount.accountFollowCheck || 0,
            accountDMSent: dbAccount.accountDMSent || 0,
            lastActivity: dbAccount.lastActivity || new Date().toISOString(),
            profilePicture: dbAccount.profilePicture || defaultImg.src,
            followersCount: dbAccount.followersCount || 0,
            followingCount: dbAccount.followingCount || 0,
            mediaCount: dbAccount.mediaCount || 0,
            metaCallsThisHour: dbAccount.metaCallsThisHour || 0,
            lastMetaCallAt:
              dbAccount.lastMetaCallAt || new Date().toISOString(),
            isMetaRateLimited: dbAccount.isMetaRateLimited || false,
            metaRateLimitResetAt: dbAccount.metaRateLimitResetAt,
            createdAt: dbAccount.createdAt,
            updatedAt: dbAccount.updatedAt,

            // Additional dashboard fields
            templatesCount: dbAccount.templatesCount || 0,
            repliesCount: totalReplies || 0,
            replyLimit: replyLimit || 500,
            accountLimit: accountLimit || 1,
            totalAccounts: totalAccounts || 0,
            engagementRate: engagementRate || 0,
            successRate: successRate || 0,
            avgResponseTime: overallAvgResponseTime || 0,
            callsMade: accountUsage?.callsMade || 0,
            callsRemaining: rateStats
              ? Math.max(
                  0,
                  rateStats.tierLimit - (accountUsage?.callsMade || 0),
                )
              : TIER_LIMITS.free,
            tier: rateStats?.tier || "free",
          };
        },
      );

      if (completeAccounts.length > 0) {
        setCachedData(ACCOUNTS_CACHE_KEY, completeAccounts);
        setUserAccounts(completeAccounts);
      }

      return completeAccounts;
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts",
      );
      showToast("Failed to load accounts", "error");
      return null;
    }
  }, [userId, router, fetchRateLimitStats, showToast]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current) return;

    isFetching.current = true;

    try {
      setIsLoading(true);

      // Fetch data in parallel
      const [accountsData, rateLimitData, appLimitData, windowData] =
        await Promise.all([
          fetchAccounts(),
          fetchRateLimitStats(),
          fetchAppLimitStatus(),
          fetchCurrentWindow(),
        ]);

      if (!accountsData) {
        setDashboardData(null);
        return;
      }

      // Transform to dashboard data
      const dashboardStats = transformAccountsToDashboardData(
        accountsData,
        rateLimitData,
        appLimitData,
      );

      // Fetch recent activity only if needed
      try {
        const { logs: replyLogs } = await getReplyLogs(10);

        if (replyLogs && replyLogs.length > 0) {
          dashboardStats.recentActivity = replyLogs
            .slice(0, 5)
            .map((log: any) => ({
              id: log._id,
              message: log.success
                ? `Replied to comment from @${log.commenterUsername}`
                : `Failed to reply to comment: ${log.errorMessage || "Unknown error"}`,
              timestamp: log.createdAt,
            }));
        } else {
          dashboardStats.recentActivity = [];
        }
      } catch (activityError) {
        console.error("Error fetching recent activity:", activityError);
        dashboardStats.recentActivity = [];
      }

      setDashboardData(dashboardStats);

      // Cache full dashboard data
      setCachedData(DASHBOARD_CACHE_KEY, dashboardStats);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
      showToast("Failed to load dashboard data", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetching.current = false;
    }
  }, [
    fetchAccounts,
    fetchRateLimitStats,
    fetchAppLimitStatus,
    fetchCurrentWindow,
    transformAccountsToDashboardData,
    showToast,
  ]);

  // Fetch user subscriptions
  const fetchSubscriptions = useCallback(async () => {
    if (!userId) return;

    try {
      const userData = await getUserById(userId);
      if (userData) {
        const { subscriptions } = await getSubscriptioninfo();
        setSubscriptions(subscriptions || []);
        setUserInfo(userData);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      showToast("Failed to load subscription information", "error");
    }
  }, [userId, showToast]);

  // Initialize dashboard - Run only once on mount
  useEffect(() => {
    if (!isLoaded || !isInitialMount.current) return;

    const initializeDashboard = async () => {
      try {
        await fetchSubscriptions();
        await fetchDashboardData();
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initializeDashboard();
    isInitialMount.current = false;

    // Set up auto-refresh every 30 seconds for rate limit stats
    refreshIntervalRef.current = setInterval(async () => {
      if (document.visibilityState === "visible") {
        await fetchRateLimitStats();
        await fetchAppLimitStatus();
        await fetchCurrentWindow();
      }
    }, 30000);

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [
    isLoaded,
    fetchSubscriptions,
    fetchDashboardData,
    fetchRateLimitStats,
    fetchAppLimitStatus,
    fetchCurrentWindow,
  ]);

  // Handle refresh
  const refresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    // Clear all caches
    localStorage.removeItem(ACCOUNTS_CACHE_KEY);
    localStorage.removeItem(RATE_LIMIT_CACHE_KEY);
    localStorage.removeItem(APP_LIMIT_CACHE_KEY);
    localStorage.removeItem(DASHBOARD_CACHE_KEY);

    // Reset refetching flag
    isFetching.current = false;

    await fetchDashboardData();
  };

  // Handle add account click
  const handleAddAccountClick = () => {
    const accountLimit = dashboardData?.accountLimit || 1;
    const currentAccounts = dashboardData?.totalAccounts || 0;

    if (currentAccounts >= accountLimit) {
      setShowAccountLimitDialog(true);
    } else {
      router.push("/insta/accounts/add");
    }
  };

  // Handle tier upgrade
  const handleTierUpgrade = async () => {
    try {
      const result = await updateUserTier("pro");

      if (result.success) {
        showToast("Successfully upgraded to Pro tier!", "success");

        // Clear cache and refresh data
        localStorage.removeItem(RATE_LIMIT_CACHE_KEY);
        localStorage.removeItem(APP_LIMIT_CACHE_KEY);
        localStorage.removeItem(DASHBOARD_CACHE_KEY);
        await fetchRateLimitStats();
        await fetchDashboardData();

        setShowTierUpgradeDialog(false);
      } else {
        showToast("Failed to upgrade tier", "error");
      }
    } catch (error) {
      console.error("Error upgrading tier:", error);
      showToast("Failed to upgrade tier", "error");
    }
  };

  // Handle cancellation initiation
  const handleCancelInitiation = () => {
    if (subscriptions.length > 0) {
      setSelectedSubscriptionId(subscriptions[0].subscriptionId);
      setShowCancelConfirmDialog(true);
    }
  };

  // Handle confirmed cancellation
  const handleConfirmedCancellation = async () => {
    setShowCancelConfirmDialog(false);

    // Check if we need to delete accounts (free plan only allows 1 account)
    if (userAccounts.length > FREE_PLAN_ACCOUNT_LIMIT) {
      setShowCancelAccountDialog(true);
    } else {
      setShowCancelDialog(true);
    }
  };

  // Handle account deletion for cancellation
  const handleCancelAccountDeletion = async (selectedAccountIds: string[]) => {
    setIsProcessingCancellation(true);
    setShowCancelAccountDialog(false);

    try {
      // Delete selected accounts
      for (const accountId of selectedAccountIds) {
        const result = await deleteInstaAccount(accountId);
        if (!result.success) {
          showToast(`Failed to delete account`, "error");
          setIsProcessingCancellation(false);
          return;
        }
      }

      showToast("Accounts deleted successfully", "success");

      // Update user accounts list
      const updatedAccounts = userAccounts.filter(
        (account) => !selectedAccountIds.includes(account.id),
      );
      setUserAccounts(updatedAccounts);

      // Clear cache and refresh
      localStorage.removeItem(ACCOUNTS_CACHE_KEY);
      localStorage.removeItem(DASHBOARD_CACHE_KEY);
      await fetchDashboardData();

      // Show cancellation options
      setShowCancelDialog(true);
    } catch (error) {
      console.error("Error deleting accounts:", error);
      showToast("Failed to delete accounts", "error");
      setIsProcessingCancellation(false);
    } finally {
      setIsProcessingCancellation(false);
    }
  };

  // Process the actual cancellation
  const handleCancelSubscription = async () => {
    if (!selectedSubscriptionId) {
      showToast("No subscription selected", "error");
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelRazorPaySubscription({
        subscriptionId: selectedSubscriptionId,
        subscriptionType: "insta",
        reason: cancellationReason || CANCELLATION_REASON_PLACEHOLDER,
        mode: cancellationMode,
      });

      if (result.success) {
        showToast("Subscription cancelled successfully", "success");
        setSubscriptions([]);

        // Update user tier to free
        await updateUserTier("free");

        // Refresh rate limit stats and clear cache
        localStorage.removeItem(RATE_LIMIT_CACHE_KEY);
        localStorage.removeItem(APP_LIMIT_CACHE_KEY);
        localStorage.removeItem(DASHBOARD_CACHE_KEY);
        await fetchRateLimitStats();
        await fetchDashboardData();
      } else {
        showToast(result.message || "Failed to cancel subscription", "error");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      showToast("Failed to cancel subscription", "error");
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
      setCancellationReason("");
    }
  };

  // Handle queue processing
  const handleProcessQueue = async () => {
    setIsQueueProcessing(true);
    try {
      const result = await processQueue(50);
      setQueueStatus(result);
      showToast(`Processed ${result.processed} queued items`, "success");

      // Refresh rate limit stats
      await fetchRateLimitStats();
    } catch (error) {
      console.error("Error processing queue:", error);
      showToast("Failed to process queue", "error");
    } finally {
      setIsQueueProcessing(false);
      setShowQueueDialog(true);
    }
  };

  // Handle rate limit test
  const handleRateLimitTest = async () => {
    if (!testAccountId) {
      showToast("Please select an account", "error");
      return;
    }

    setIsTestingRateLimit(true);
    try {
      const result = await checkRateLimit(
        testAccountId,
        testActionType,
        testActionType.includes("follow"),
      );
      setRateLimitCheckResult(result);
      showToast(
        result.allowed
          ? "Rate limit check passed"
          : `Rate limited: ${result.reason}`,
        result.allowed ? "success" : "warning",
      );
    } catch (error) {
      console.error("Error testing rate limit:", error);
      showToast("Failed to test rate limit", "error");
    } finally {
      setIsTestingRateLimit(false);
    }
  };

  // Handle rate limit window reset
  const handleResetRateLimitWindow = async () => {
    try {
      const result = await resetRateLimitWindow();
      if (result.success) {
        showToast("Rate limit window reset successfully", "success");

        // Refresh all data
        localStorage.removeItem(RATE_LIMIT_CACHE_KEY);
        localStorage.removeItem(APP_LIMIT_CACHE_KEY);
        await fetchRateLimitStats();
        await fetchAppLimitStatus();
        await fetchCurrentWindow();
      } else {
        showToast(`Failed to reset window: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Error resetting rate limit window:", error);
      showToast("Failed to reset rate limit window", "error");
    }
  };

  // Render rate limit status badge
  const renderRateLimitStatus = () => {
    if (!rateLimitStats) return null;

    const { tier, callsMade, tierLimit, usagePercentage, remainingCalls } =
      rateLimitStats;

    if (tier === "pro") {
      return (
        <Badge className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 text-purple-300 border-purple-500/30">
          <Shield className="mr-1 h-3 w-3" />
          Pro Unlimited
        </Badge>
      );
    }

    if (usagePercentage >= 90) {
      return (
        <Badge className="bg-red-900/20 text-red-300 border-red-500/30">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {remainingCalls} calls left
        </Badge>
      );
    } else if (usagePercentage >= 70) {
      return (
        <Badge className="bg-yellow-900/20 text-yellow-300 border-yellow-500/30">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {remainingCalls} calls left
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-900/20 text-green-300 border-green-500/30">
        <CheckCircle className="mr-1 h-3 w-3" />
        {remainingCalls} calls left
      </Badge>
    );
  };

  // Render app limit status
  const renderAppLimitStatus = () => {
    if (!appLimitStatus) return null;

    const { reached, current, limit, percentage } = appLimitStatus;

    if (reached) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/10 border border-red-500/30">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-300">
              App Limit Reached
            </p>
            <p className="text-xs text-red-400">
              Global limit: {current.toLocaleString()}/{limit.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }

    if (percentage >= 80) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-900/10 border border-yellow-500/30">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-300">High Usage</p>
            <p className="text-xs text-yellow-400">
              {percentage.toFixed(1)}% of app limit used
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/10 border border-green-500/30">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <div>
          <p className="text-sm font-medium text-green-300">System Normal</p>
          <p className="text-xs text-green-400">
            {percentage.toFixed(1)}% of app limit used
          </p>
        </div>
      </div>
    );
  };

  // Render rate limit progress
  const renderRateLimitProgress = () => {
    if (!rateLimitStats) return null;

    const { tier, callsMade, tierLimit, usagePercentage, nextReset } =
      rateLimitStats;

    if (tier === "pro") {
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span
              className={`text-sm font-medium ${themeStyles.textSecondary}`}
            >
              <Zap className="inline mr-1 h-3 w-3" />
              Pro Unlimited
            </span>
            <span className={`text-sm ${themeStyles.textMuted}`}>
              No limits
            </span>
          </div>
          <Progress value={0} className="h-2 bg-green-900/20" />
          <p className={`text-xs ${themeStyles.textMuted}`}>
            You have unlimited API calls with Pro tier
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${themeStyles.textSecondary}`}>
            <Clock className="inline mr-1 h-3 w-3" />
            Rate Limit Usage ({callsMade}/{tierLimit})
          </span>
          <span className={`text-sm ${themeStyles.textMuted}`}>
            {usagePercentage.toFixed(1)}%
          </span>
        </div>
        <Progress
          value={usagePercentage}
          className={`h-2 ${
            usagePercentage >= 90
              ? "bg-red-900/20"
              : usagePercentage >= 70
                ? "bg-yellow-900/20"
                : "bg-green-900/20"
          }`}
        />
        <div className="flex justify-between text-xs">
          <span className={themeStyles.textMuted}>
            Resets: {formatDate(new Date(nextReset))}
          </span>
          <span className={themeStyles.textMuted}>
            {rateLimitStats.remainingCalls} calls remaining
          </span>
        </div>
      </div>
    );
  };

  // Render current window info
  const renderCurrentWindow = () => {
    if (!rateLimitWindow) return null;

    return (
      <div className="mt-4 p-3 rounded-lg bg-blue-900/10 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className={`text-sm font-medium ${themeStyles.textSecondary}`}>
            Current Window: {rateLimitWindow.label}
          </span>
        </div>
        <p className={`text-xs ${themeStyles.textMuted}`}>
          Window resets at {formatDate(new Date(rateLimitWindow.end))}
        </p>
      </div>
    );
  };

  // Render account card with rate limit info
  const renderAccountCard = (account: DashboardAccount) => {
    const isTokenExpiring =
      account.tokenExpiresAt &&
      new Date(account.tokenExpiresAt) <
        new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Find account usage from rate limit stats
    const accountUsage = rateLimitStats?.accountUsage?.find(
      (usage) => usage.instagramAccountId === account.instagramId,
    );

    const metaCallsPercentage = account.metaCallsThisHour
      ? Math.min((account.metaCallsThisHour / 200) * 100, 100)
      : 0;

    return (
      <div
        key={account.id}
        className={`flex flex-wrap gap-3 md:gap-0 items-center justify-between p-2 md:p-4 border ${themeStyles.cardBorder} rounded-lg hover:bg-white/5 transition-colors`}
      >
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="relative">
            <Image
              width={48}
              height={48}
              src={
                hasError.includes(account.id)
                  ? defaultImg.src
                  : account.profilePicture || "Onwer"
              }
              alt={account.username}
              onError={() => handleImageError(account.id)}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 ${
                account.isActive ? "bg-[#00F0FF]" : "bg-gray-400"
              }`}
            />
          </div>
          <div>
            <h3
              className={`font-semibold text-sm md:text-base ${themeStyles.textPrimary}`}
            >
              @{account.username}
            </h3>
            <p className={`text-sm ${themeStyles.textSecondary}`}>
              {account.followersCount?.toLocaleString() || 0} followers
            </p>
            <div className="flex items-center gap-4 mt-1">
              {accountUsage && (
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  {accountUsage.callsMade} calls
                </span>
              )}
              {account.metaCallsThisHour > 0 && (
                <div className="flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-blue-500" />
                  <span className={`text-xs ${themeStyles.textMuted}`}>
                    Meta: {account.metaCallsThisHour}/200
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge
            variant={account.isActive ? "default" : "secondary"}
            className={
              account.isActive
                ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30"
                : `${
                    currentTheme === "dark"
                      ? "bg-gray-800 text-gray-400"
                      : "bg-gray-200 text-gray-600"
                  }`
            }
          >
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {/* Meta API usage indicator */}
          {account.metaCallsThisHour > 0 && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-blue-500" />
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  Meta API
                </span>
              </div>
              <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${metaCallsPercentage >= 90 ? "bg-red-500" : metaCallsPercentage >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${metaCallsPercentage}%` }}
                />
              </div>
            </div>
          )}

          {isTokenExpiring && userId && (
            <Button
              onClick={() => refreshInstagramToken(account.instagramId)}
              variant="outline"
              size="sm"
              className={`${themeStyles.buttonOutlineBorder} p-2 bg-gradient-to-r from-[#0ce05d]/80 to-[#054e29] text-black hover:bg-white/10`}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Token
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText} bg-[#B026FF]/70 hover:bg-[#B026FF]/15 transition-colors`}
            asChild
          >
            <Link href={`/insta/accounts/${account.id}`}>
              <Settings className="h-4 w-4" /> Manage
            </Link>
          </Button>
        </div>
      </div>
    );
  };

  // Render recent activity
  const renderRecentActivity = () => {
    if (!dashboardData?.recentActivity?.length) {
      return <p className={themeStyles.textMuted}>No recent activity</p>;
    }

    return dashboardData.recentActivity
      .slice(0, 3)
      .map((activity: RecentActivity) => (
        <div
          key={activity.id}
          className="flex items-center justify-between text-sm"
        >
          <span
            className={`${themeStyles.textSecondary} font-montserrat text-lg`}
          >
            {activity.message}
          </span>
          <span className={themeStyles.textMuted}>
            {formatTimestamp(activity.timestamp)}
          </span>
        </div>
      ));
  };

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${themeStyles.textPrimary} ${themeStyles.containerBg}`}
    >
      <BreadcrumbsDefault />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 lg:gap-0 mb-8">
          <div>
            <h1
              className={`text-3xl lg:text-5xl font-bold mb-2 ${themeStyles.textPrimary}`}
            >
              Dashboard
            </h1>
            <p
              className={`${themeStyles.textSecondary} text-lg font-montserrat`}
            >
              Manage your Instagram auto-reply system and monitor performance
            </p>
            <div className="flex items-center gap-2 mt-2">
              {renderRateLimitStatus()}
              {rateLimitStats?.queuedItems &&
                rateLimitStats.queuedItems > 0 && (
                  <Badge className="bg-blue-900/20 text-blue-300 border-blue-500/30">
                    <Clock className="mr-1 h-3 w-3" />
                    {rateLimitStats.queuedItems} queued
                  </Badge>
                )}
              {rateLimitWindow && (
                <Badge
                  variant="outline"
                  className="border-blue-500/30 text-blue-400"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {rateLimitWindow.label}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              onClick={refresh}
              variant="outline"
              className={`${themeStyles.buttonOutlineBorder} p-2 bg-gradient-to-r from-[#0ce05d]/80 to-[#09ab5a]/80 hover:bg-white/10`}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>

            {rateLimitStats?.tier === "free" && (
              <Button
                onClick={() => setShowTierUpgradeDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
              >
                <Zap className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            )}

            <Button
              onClick={handleAddAccountClick}
              className="btn-gradient-cyan hover:opacity-90 transition-opacity"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        {/* System Status Alert */}
        {appLimitStatus && <div className="mb-6">{renderAppLimitStatus()}</div>}

        {/* Rate Limit Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={`text-sm font-medium ${themeStyles.textPrimary}`}
                >
                  Rate Limit Controls
                </h3>
                <Server className="h-4 w-4 text-blue-500" />
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleProcessQueue}
                  disabled={isQueueProcessing}
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90"
                >
                  {isQueueProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Cpu className="mr-2 h-3 w-3" />
                      Process Queue
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowRateLimitTestDialog(true)}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <Activity className="mr-2 h-3 w-3" />
                  Test Rate Limit
                </Button>

                <Button
                  onClick={handleResetRateLimitWindow}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Reset Window
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Queue Status */}
          {queueStatus && (
            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`text-sm font-medium ${themeStyles.textPrimary}`}
                  >
                    Queue Status
                  </h3>
                  <Database className="h-4 w-4 text-purple-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={themeStyles.textSecondary}>
                      Processed:
                    </span>
                    <span className="text-green-400">
                      {queueStatus.processed}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={themeStyles.textSecondary}>Failed:</span>
                    <span className="text-red-400">{queueStatus.failed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={themeStyles.textSecondary}>Skipped:</span>
                    <span className="text-yellow-400">
                      {queueStatus.skipped}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={themeStyles.textSecondary}>
                      Remaining:
                    </span>
                    <span className={themeStyles.textPrimary}>
                      {queueStatus.remaining}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rate Limit Test Result */}
          {rateLimitCheckResult && (
            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`text-sm font-medium ${themeStyles.textPrimary}`}
                  >
                    Rate Limit Test
                  </h3>
                  <Activity
                    className={`h-4 w-4 ${rateLimitCheckResult.allowed ? "text-green-500" : "text-red-500"}`}
                  />
                </div>
                <div className="space-y-2">
                  <div
                    className={`text-sm ${rateLimitCheckResult.allowed ? "text-green-400" : "text-red-400"}`}
                  >
                    {rateLimitCheckResult.allowed
                      ? "✅ Allowed"
                      : "❌ Not Allowed"}
                  </div>
                  {rateLimitCheckResult.reason && (
                    <div className="text-xs text-gray-400">
                      Reason: {rateLimitCheckResult.reason}
                    </div>
                  )}
                  {rateLimitCheckResult.remaining !== undefined && (
                    <div className="text-xs text-blue-400">
                      Remaining: {rateLimitCheckResult.remaining} calls
                    </div>
                  )}
                  {rateLimitCheckResult.tier && (
                    <div className="text-xs text-purple-400">
                      Tier: {rateLimitCheckResult.tier}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active Subscription */}
        {subscriptions.length > 0 && (
          <Card
            className={`bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm border border-purple-500/30 mb-8 ${themeStyles.cardBg}`}
          >
            <CardHeader className="text-center">
              <Badge className="max-w-min mx-auto bg-green-900/20 text-green-700 border-green-400/20">
                Active
              </Badge>
              <CardTitle
                className={`flex text-start md:items-center justify-center gap-2 ${themeStyles.textPrimary}`}
              >
                <Zap className="h-5 w-5 text-yellow-400" />
                Your Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row justify-center items-center gap-4">
              <div className="flex  flex-wrap text-start md:items-center justify-center gap-4">
                <h3 className={`text-xl font-bold ${themeStyles.textPrimary}`}>
                  {subscriptions[0].chatbotType}
                </h3>
                <p className={themeStyles.textSecondary}>
                  Next billing:{" "}
                  {new Date(subscriptions[0].expiresAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant="destructive"
                  onClick={handleCancelInitiation}
                  disabled={isCancelling || isProcessingCancellation}
                >
                  {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                </Button>

                <Button
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
                  asChild
                >
                  <Link href="/insta/pricing">
                    <Zap className="mr-2 h-4 w-4" />
                    Upgrade Subscription
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card
            className={`card-hover group ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Active Accounts
              </CardTitle>
              <Instagram className="h-4 w-4 text-[#00F0FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00F0FF]">
                {dashboardData?.activeAccounts || 0} /{" "}
                {dashboardData?.accountLimit || 1}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                {(dashboardData?.totalAccounts || 0) -
                  (dashboardData?.activeAccounts || 0)}{" "}
                inactive
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover group ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Rate Limit Usage
              </CardTitle>
              <Activity className="h-4 w-4 text-[#B026FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#B026FF]">
                {rateLimitStats?.callsMade || 0} /{" "}
                {rateLimitStats?.tier === "pro"
                  ? "∞"
                  : rateLimitStats?.tierLimit || TIER_LIMITS.free}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                {rateLimitStats?.usagePercentage?.toFixed(1) || 0}% used
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover group ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Reply Templates
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-[#FF2E9F]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#FF2E9F]">
                {dashboardData?.totalTemplates || 0}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                Across all accounts
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover group ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Engagement Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#00F0FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00F0FF]">
                {dashboardData?.engagementRate || 0}%
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                +5% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Account Management & Rate Limits */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card
            className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader>
              <CardTitle
                className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
              >
                <Users className="h-5 w-5 text-[#00F0FF]" />
                Instagram Accounts
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat text-lg`}
              >
                Manage your connected Instagram accounts and their auto-reply
                settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
              {dashboardData?.accounts?.map(renderAccountCard)}

              {(!dashboardData?.accounts ||
                dashboardData.accounts.length === 0) && (
                <div className="text-center py-8">
                  <Instagram className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <p
                    className={`${themeStyles.textSecondary} mb-4 font-montserrat`}
                  >
                    No accounts connected yet
                  </p>
                  <Button className="btn-gradient-cyan" asChild>
                    <Link href="/insta/accounts/add">
                      <Plus className="mr-2 h-4 w-4" />
                      Connect Your First Account
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-8">
            {/* Rate Limits Card */}
            <Card
              className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
                >
                  <Shield className="h-5 w-5 text-[#B026FF]" />
                  Rate Limits
                </CardTitle>
                <CardDescription
                  className={`${themeStyles.textSecondary} text-lg font-montserrat`}
                >
                  Monitor your API usage and rate limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-2">
                {renderRateLimitProgress()}
                {renderCurrentWindow()}

                {/* Account-specific usage */}
                {rateLimitStats?.accountUsage &&
                  rateLimitStats.accountUsage.length > 0 && (
                    <div>
                      <h4
                        className={`font-semibold mb-3 ${themeStyles.textPrimary}`}
                      >
                        Account Usage
                      </h4>
                      <div className="space-y-2">
                        {rateLimitStats.accountUsage
                          .slice(0, 3)
                          .map((usage) => (
                            <div
                              key={usage.instagramAccountId}
                              className="flex items-center justify-between text-sm"
                            >
                              <span
                                className={`${themeStyles.textSecondary} truncate max-w-[150px]`}
                              >
                                @{usage.accountUsername || "Unknown"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={themeStyles.textMuted}>
                                  {usage.callsMade} calls
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(usage.lastCallAt.toString())}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Queued items */}
                {rateLimitStats?.queuedItems &&
                  rateLimitStats.queuedItems > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className={themeStyles.textSecondary}>
                          {rateLimitStats.queuedItems} items in queue
                        </span>
                      </div>
                      <p className={`text-xs ${themeStyles.textMuted} mt-1`}>
                        These will be processed automatically when limits allow
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Performance Overview Card */}
            <Card
              className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
                >
                  <BarChart3 className="h-5 w-5 text-[#FF2E9F]" />
                  Performance Overview
                </CardTitle>
                <CardDescription
                  className={`${themeStyles.textSecondary} text-lg font-montserrat`}
                >
                  Monitor your auto-reply performance and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-2">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-sm font-medium ${themeStyles.textSecondary}`}
                    >
                      Reply Success Rate
                    </span>
                    <span className={`text-sm ${themeStyles.textMuted}`}>
                      {dashboardData?.successRate || 0}%
                    </span>
                  </div>
                  <Progress
                    value={dashboardData?.successRate || 0}
                    className="h-2 bg-white/10"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-sm font-medium ${themeStyles.textSecondary}`}
                    >
                      Template Usage
                    </span>
                    <span className={`text-sm ${themeStyles.textMuted}`}>
                      {dashboardData?.totalReplies || 0}%
                    </span>
                  </div>
                  <Progress
                    value={dashboardData?.totalReplies || 0}
                    className="h-2 bg-white/10"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-sm font-medium ${themeStyles.textSecondary}`}
                    >
                      Response Time
                    </span>
                    <span className={`text-sm ${themeStyles.textMuted}`}>
                      {dashboardData?.overallAvgResponseTime
                        ? formatResponseTimeSmart(
                            dashboardData.overallAvgResponseTime,
                          )
                        : "0s"}
                    </span>
                  </div>
                  <Progress value={85} className="h-2 bg-white/10" />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4
                    className={`font-semibold mb-3 ${themeStyles.textPrimary}`}
                  >
                    Recent Activity
                  </h4>
                  <div className="space-y-2">{renderRecentActivity()}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card
          className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
        >
          <CardHeader>
            <CardTitle className={themeStyles.textPrimary}>
              Quick Actions
            </CardTitle>
            <CardDescription
              className={`${themeStyles.textSecondary} font-mono`}
            >
              Common tasks and shortcuts to manage your Instagram automation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className={`h-auto p-6 flex flex-col items-center gap-3 bg-[#00F0FF]/10 border-[#00F0FF]/20 hover:bg-[#00F0FF]/15 hover:border-[#00F0FF]/40 transition-all ${themeStyles.textPrimary}`}
                asChild
              >
                <Link href="/insta/templates">
                  <MessageSquare className="h-8 w-8 text-[#00F0FF]" />
                  <span className="font-medium">Manage Templates</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className={`h-auto p-6 flex flex-col items-center gap-3 border-[#B026FF]/20 bg-[#B026FF]/10 hover:bg-[#B026FF]/15 hover:border-[#B026FF]/40 transition-all ${themeStyles.textPrimary}`}
                asChild
              >
                <Link href="/insta/analytics">
                  <BarChart3 className="h-8 w-8 text-[#B026FF]" />
                  <span className="font-medium">View Analytics</span>
                </Link>
              </Button>

              <Button
                onClick={handleAddAccountClick}
                variant="outline"
                className={`h-auto p-6 flex flex-col items-center gap-3 border-[#FF2E9F]/20 bg-[#FF2E9F]/10 hover:bg-[#FF2E9F]/15 hover:border-[#FF2E9F]/40 transition-all ${themeStyles.textPrimary}`}
              >
                <Plus className="h-8 w-8 text-[#FF2E9F]" />
                <span className="font-medium">Add Account</span>
              </Button>

              <Button
                variant="outline"
                className={`h-auto p-6 flex flex-col items-center gap-3 border-[#0ce05d]/20 bg-[#0ce05d]/10 hover:bg-[#0ce05d]/15 hover:border-[#0ce05d]/40 transition-all ${themeStyles.textPrimary}`}
                onClick={refresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-8 w-8 text-[#0ce05d] ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="font-medium">Refresh Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Limit Dialog */}
      <AlertDialog
        open={showAccountLimitDialog}
        onOpenChange={setShowAccountLimitDialog}
      >
        <AlertDialogContent
          className={`${themeStyles.alertBg} backdrop-blur-md`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeStyles.textPrimary}>
              Account Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className={themeStyles.textSecondary}>
              Your current plan allows {dashboardData?.accountLimit || 1}
              account(s). Upgrade to Pro Unlimited to connect up to 3 Instagram
              accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={themeStyles.buttonOutlineBorder}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => router.push("/insta/pricing")}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Upgrade Now
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tier Upgrade Dialog */}
      <AlertDialog
        open={showTierUpgradeDialog}
        onOpenChange={setShowTierUpgradeDialog}
      >
        <AlertDialogContent
          className={`${themeStyles.alertBg} backdrop-blur-md`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeStyles.textPrimary}>
              Upgrade to Pro Tier
            </AlertDialogTitle>
            <AlertDialogDescription className={themeStyles.textSecondary}>
              Upgrade to Pro tier for unlimited API calls, no rate limits, and
              priority processing. Pro tier also includes advanced features like
              follow verification flows and custom templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={themeStyles.buttonOutlineBorder}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleTierUpgrade}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Zap className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rate Limit Test Dialog */}
      <AlertDialog
        open={showRateLimitTestDialog}
        onOpenChange={setShowRateLimitTestDialog}
      >
        <AlertDialogContent
          className={`${themeStyles.alertBg} backdrop-blur-md`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeStyles.textPrimary}>
              Test Rate Limit
            </AlertDialogTitle>
            <AlertDialogDescription className={themeStyles.textSecondary}>
              Test if an action would be allowed given current rate limits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account</label>
              <select
                value={testAccountId}
                onChange={(e) => setTestAccountId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
              >
                <option value="">Select an account</option>
                {userAccounts.map((account) => (
                  <option key={account.id} value={account.instagramId}>
                    @{account.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Action Type
              </label>
              <select
                value={testActionType}
                onChange={(e) => setTestActionType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
              >
                <option value="comment_reply">Comment Reply</option>
                <option value="dm_initial">Initial DM</option>
                <option value="dm_follow_check">Follow Check DM</option>
                <option value="dm_final_link">Final Link DM</option>
                <option value="follow_verification">Follow Verification</option>
              </select>
            </div>
          </CardContent>
          <AlertDialogFooter>
            <AlertDialogCancel className={themeStyles.buttonOutlineBorder}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleRateLimitTest}
              disabled={isTestingRateLimit || !testAccountId}
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {isTestingRateLimit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Rate Limit"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Queue Process Dialog */}
      <AlertDialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <AlertDialogContent
          className={`${themeStyles.alertBg} backdrop-blur-md`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeStyles.textPrimary}>
              Queue Processing Results
            </AlertDialogTitle>
            <AlertDialogDescription className={themeStyles.textSecondary}>
              {queueStatus
                ? `Processed ${queueStatus.processed} items from the queue.`
                : "No queue processing results."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {queueStatus && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={themeStyles.textSecondary}>Processed:</span>
                <span className="text-green-400">{queueStatus.processed}</span>
              </div>
              <div className="flex justify-between">
                <span className={themeStyles.textSecondary}>Failed:</span>
                <span className="text-red-400">{queueStatus.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className={themeStyles.textSecondary}>Skipped:</span>
                <span className="text-yellow-400">{queueStatus.skipped}</span>
              </div>
              <div className="flex justify-between">
                <span className={themeStyles.textSecondary}>Remaining:</span>
                <span className={themeStyles.textPrimary}>
                  {queueStatus.remaining}
                </span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className={themeStyles.buttonOutlineBorder}>
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`p-3 md:p-8 rounded-xl max-w-md w-full ${
              currentTheme === "dark" ? "bg-[#0a0a0a]/90" : "bg-white/90"
            } backdrop-blur-lg border ${themeStyles.cardBorder}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FF2E9F] to-[#B026FF]">
                Cancel Subscription
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
              >
                <X
                  className={`${themeStyles.textMuted} h-5 w-5 hover:${themeStyles.textPrimary}`}
                />
              </Button>
            </div>
            <div className="space-y-6">
              <div>
                <label
                  className={`block text-lg font-semibold ${themeStyles.textSecondary} mb-2`}
                >
                  Please Provide Reason
                </label>
                <Textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className={`w-full ${
                    currentTheme === "dark" ? "bg-gray-800/50" : "bg-gray-100"
                  } border ${themeStyles.cardBorder} rounded-lg p-3 ${
                    themeStyles.textPrimary
                  } focus:outline-none focus:ring-2 focus:ring-[#B026FF] font-montserrat`}
                  placeholder="Cancellation reason"
                  required
                  disabled={isCancelling}
                />
              </div>

              <div
                className={`text-xs ${themeStyles.textMuted} font-montserrat`}
              >
                <p className="mb-2">
                  <strong>Immediate Cancellation:</strong> Service ends
                  immediately
                </p>
                <p>
                  <strong>End-of-term Cancellation:</strong> Service continues
                  until the end of billing period
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setCancellationMode("Immediate");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className="px-6 py-2"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Immediately"}
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF]"
                  onClick={() => {
                    setCancellationMode("End-of-term");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Cancel at End of Term"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancellation Dialog */}
      <AlertDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
      >
        <AlertDialogContent
          className={`${themeStyles.alertBg} backdrop-blur-md`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeStyles.textPrimary}>
              Confirm Cancellation
            </AlertDialogTitle>
            <AlertDialogDescription className={themeStyles.textSecondary}>
              Are you sure you want to cancel your subscription? Your plan will
              revert to the Free plan which only allows 1 Instagram account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={themeStyles.buttonOutlineBorder}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedCancellation}
              disabled={isCancelling}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Selection Dialog for Cancellation */}
      <AccountSelectionDialog
        isOpen={showCancelAccountDialog}
        onClose={() => setShowCancelAccountDialog(false)}
        onConfirm={handleCancelAccountDeletion}
        accounts={userAccounts}
        newPlan={{
          id: "Insta-Automation-Free",
          name: "Free",
          description: "",
          monthlyPrice: 0,
          yearlyPrice: 0,
          account: 1,
          limit: 500,
          features: [],
          popular: false,
        }}
        isLoading={isProcessingCancellation}
      />
    </div>
  );
}
