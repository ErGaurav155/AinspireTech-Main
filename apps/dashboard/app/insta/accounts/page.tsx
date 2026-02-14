"use client";

import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import defaultImg from "public/assets/img/default-img.jpg";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import {
  AlertCircle,
  BarChart3,
  Instagram,
  Plus,
  RefreshCw,
  Settings,
  Users,
  Zap,
  Shield,
  Activity,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import Image from "next/image";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Label } from "@rocketreplai/ui/components/radix/label";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import Link from "next/link";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  getDashboardData,
  getInstagramUser,
  getSubscriptioninfo,
  refreshInstagramToken,
  getRateLimitStats,
  getAppLimitStatus,
  UserTierInfo,
  AppLimitStatus,
  updateAccountSettings,
} from "@/lib/services/insta-actions.api";
import { Progress } from "@rocketreplai/ui/components/radix/progress";

// Types
interface InstagramAccount {
  id: string;
  instagramId: string;
  userId: string;
  username: string;
  accessToken: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;
  accountReply: number;
  accountFollowCheck: number;
  accountDMSent: number;
  lastActivity: string;
  profilePicture: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  metaCallsThisHour: number;
  lastMetaCallAt: string;
  isMetaRateLimited: boolean;
  metaRateLimitResetAt?: string;
  createdAt: string;
  updatedAt: string;

  // Additional fields for display
  displayName: string;
  templatesCount: number;
  replyLimit: number;
  accountLimit: number;
  totalAccounts: number;
  engagementRate: number;
  successRate: number;
  avgResponseTime: number;
  tier?: "free" | "pro";
  callsMade?: number;
  callsRemaining?: number;
  isTokenExpiring?: boolean;
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

// Constants
const ACCOUNTS_CACHE_KEY = "instagramAccounts";
const RATE_LIMIT_CACHE_KEY = "rateLimitStatsAccounts";
const APP_LIMIT_CACHE_KEY = "appLimitStatusAccounts";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const TIER_LIMITS = {
  free: 100,
  pro: 999999,
} as const;

export default function AccountsPage() {
  // Hooks
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // State
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showAccountLimitDialog, setShowAccountLimitDialog] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState<string | null>(
    null,
  );
  const [rateLimitStats, setRateLimitStats] = useState<UserTierInfo | null>(
    null,
  );
  const [appLimitStatus, setAppLimitStatus] = useState<AppLimitStatus | null>(
    null,
  );

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

  // Helper: Get cached data
  const getCachedData = <T,>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
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

  // Helper: Format last activity
  const formatLastActivity = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return "N/A";
    }
  };

  // Helper: Format time
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper: Check if token is expiring
  const checkTokenExpiry = (account: any): boolean => {
    if (!account.tokenExpiresAt) return false;
    const expiryDate = new Date(account.tokenExpiresAt);
    const now = new Date();
    const hoursUntilExpiry =
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24; // Expiring in less than 24 hours
  };

  // Helper: Handle image error
  const handleImageError = (id: string): void => {
    setHasError((prev) => [...prev, id]);
  };

  // Fetch rate limit statistics
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

  // Fetch app limit status
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
  const fetchAccounts = useCallback(async (): Promise<void> => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cachedAccounts =
        getCachedData<InstagramAccount[]>(ACCOUNTS_CACHE_KEY);
      if (cachedAccounts) {
        setAccounts(cachedAccounts);
        return;
      }

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
        setAccounts([]);
        return;
      }

      // Get rate limit stats
      const rateStats = await fetchRateLimitStats();

      // Transform accounts
      const completeAccounts: InstagramAccount[] = await Promise.all(
        dbAccounts.map(async (dbAccount: any) => {
          try {
            // Fetch Instagram data for display
            let instaData = null;
            try {
              instaData = await getInstagramUser(dbAccount.accessToken, [
                "username",
                "user_id",
                "followers_count",
                "media_count",
                "profile_picture_url",
              ]);
            } catch (instaError) {
              console.warn(
                `Could not fetch Instagram data for ${dbAccount.username}:`,
                instaError,
              );
            }

            // Find account usage from rate limit stats
            const accountUsage = rateStats?.accountUsage?.find(
              (usage) => usage.instagramAccountId === dbAccount.instagramId,
            );

            // Check token expiry
            const isTokenExpiring = checkTokenExpiry(dbAccount);

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
              profilePicture:
                instaData?.profile_picture_url ||
                dbAccount.profilePicture ||
                defaultImg.src,
              followersCount:
                instaData?.followers_count || dbAccount.followersCount || 0,
              followingCount: dbAccount.followingCount || 0,
              mediaCount: instaData?.media_count || dbAccount.mediaCount || 0,
              metaCallsThisHour: dbAccount.metaCallsThisHour || 0,
              lastMetaCallAt:
                dbAccount.lastMetaCallAt || new Date().toISOString(),
              isMetaRateLimited: dbAccount.isMetaRateLimited || false,
              metaRateLimitResetAt: dbAccount.metaRateLimitResetAt,
              createdAt: dbAccount.createdAt,
              updatedAt: dbAccount.updatedAt,

              // Additional fields for display
              displayName:
                dbAccount.displayName ||
                dbAccount.username ||
                "Instagram Account",
              templatesCount: dbAccount.templatesCount || 0,
              replyLimit: replyLimit || 500,
              accountLimit: accountLimit || 1,
              totalAccounts: totalAccounts || 0,
              engagementRate: engagementRate || 0,
              successRate: successRate || 0,
              avgResponseTime: overallAvgResponseTime || 0,
              tier: rateStats?.tier || "free",
              callsMade: accountUsage?.callsMade || 0,
              callsRemaining: rateStats
                ? Math.max(
                    0,
                    rateStats.tierLimit - (accountUsage?.callsMade || 0),
                  )
                : TIER_LIMITS.free,
              isTokenExpiring,
            };
          } catch (error) {
            console.error(`Error processing account ${dbAccount._id}:`, error);
            return null;
          }
        }),
      );

      const validAccounts = completeAccounts.filter(
        (account): account is InstagramAccount => account !== null,
      );

      setAccounts(validAccounts);

      if (validAccounts.length > 0) {
        setCachedData(ACCOUNTS_CACHE_KEY, validAccounts);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, router, fetchRateLimitStats]);

  // Fetch user subscriptions
  const fetchSubscriptions = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      const userData = await getUserById(userId);
      if (userData) {
        const subs = await getSubscriptioninfo();
        setSubscriptions(subs.subscriptions);
        setUserInfo(userData);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    }
  }, [userId]);

  // Initialize component
  useEffect(() => {
    if (!isLoaded) return;

    const initializeData = async () => {
      await Promise.all([
        fetchSubscriptions(),
        fetchAccounts(),
        fetchRateLimitStats(),
        fetchAppLimitStatus(),
      ]);
    };

    initializeData();
  }, [
    userId,
    isLoaded,
    fetchSubscriptions,
    fetchAccounts,
    fetchRateLimitStats,
    fetchAppLimitStatus,
  ]);

  // Handle toggle account status
  const handleToggleAccount = async (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;

    const newActiveState = !account.isActive;
    setIsUpdatingAccount(accountId);

    try {
      await updateAccountSettings(accountId, {
        isActive: newActiveState,
      });
      // Optimistic UI update
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, isActive: newActiveState } : acc,
        ),
      );

      // Update cache
      const cachedAccounts =
        getCachedData<InstagramAccount[]>(ACCOUNTS_CACHE_KEY);
      if (cachedAccounts) {
        const updatedCache = cachedAccounts.map((acc) =>
          acc.id === accountId ? { ...acc, isActive: newActiveState } : acc,
        );
        setCachedData(ACCOUNTS_CACHE_KEY, updatedCache);
      }
    } catch (error) {
      console.error("Error updating account:", error);
      // Revert optimistic update
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, isActive: !newActiveState } : acc,
        ),
      );
    } finally {
      setIsUpdatingAccount(null);
    }
  };

  // Handle add account click
  const handleAddAccountClick = () => {
    const accountLimit = accounts[0]?.accountLimit || 1;

    if (accounts.length >= accountLimit) {
      setShowAccountLimitDialog(true);
    } else {
      router.push("/insta/accounts/add");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    localStorage.removeItem(ACCOUNTS_CACHE_KEY);
    localStorage.removeItem(RATE_LIMIT_CACHE_KEY);
    localStorage.removeItem(APP_LIMIT_CACHE_KEY);
    await Promise.all([
      fetchAccounts(),
      fetchRateLimitStats(),
      fetchAppLimitStatus(),
    ]);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const activeAccounts = accounts.filter(
      (account) => account.isActive,
    ).length;
    const totalFollowers = accounts.reduce(
      (sum, acc) => sum + acc.followersCount,
      0,
    );
    const totalReplies = accounts.reduce(
      (sum, acc) => sum + acc.accountReply,
      0,
    );
    const totalMetaCalls = accounts.reduce(
      (sum, acc) => sum + acc.metaCallsThisHour,
      0,
    );
    const avgEngagement =
      accounts.length > 0
        ? (
            accounts.reduce((sum, acc) => sum + acc.engagementRate, 0) /
            accounts.length
          ).toFixed(1)
        : "0";

    return {
      activeAccounts,
      totalFollowers,
      totalReplies,
      totalMetaCalls,
      avgEngagement,
    };
  }, [accounts]);

  // Get account limits
  const accountLimit = accounts[0]?.accountLimit || 1;
  const replyLimit = accounts[0]?.replyLimit || 500;

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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/10 border border-red-500/30 mb-4">
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-900/10 border border-yellow-500/30 mb-4">
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
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/10 border border-green-500/30 mb-4">
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

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`min-h-screen ${themeStyles.textPrimary} flex items-center justify-center ${themeStyles.containerBg}`}
      >
        <Card
          className={`max-w-md ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
        >
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Accounts</h2>
            <p className={`mb-6 ${themeStyles.textSecondary}`}>{error}</p>
            <Button onClick={fetchAccounts} className="btn-gradient-cyan">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
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
        <div className="flex flex-wrap gap-3 md:gap-0 justify-between items-center mb-8">
          <div>
            <div
              className={`inline-flex items-center ${
                currentTheme === "dark"
                  ? "bg-blue-100/10 text-blue-400 border-blue-400/30"
                  : "bg-blue-100 text-blue-600 border-blue-300"
              } border rounded-full px-4 py-1 mb-4`}
            >
              <Instagram className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Account Management</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] bg-clip-text text-transparent">
              Instagram Accounts
            </h1>
            <p
              className={`${themeStyles.textSecondary} font-montserrat text-xl`}
            >
              Manage all your connected Instagram accounts and their auto-reply
              settings
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
            </div>
          </div>
          <div className="flex gap-3 mt-1 md:mt-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isRefreshing}
              className={`${themeStyles.buttonOutlineBorder} p-2 bg-gradient-to-r from-[#0ce05d]/80 to-[#05a957]/80 hover:bg-white/10`}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              className="btn-gradient-cyan hover:opacity-90 transition-opacity"
              onClick={handleAddAccountClick}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        {/* System Status Alert */}
        {appLimitStatus && renderAppLimitStatus()}

        {/* Rate Limit Overview */}
        {rateLimitStats && (
          <Card
            className={`${themeStyles.cardBg} ${themeStyles.cardBorder} mb-8`}
          >
            <CardHeader>
              <CardTitle
                className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
              >
                <Activity className="h-5 w-5 text-[#B026FF]" />
                Rate Limit Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>{renderRateLimitProgress()}</div>
                <div>
                  {/* Meta API usage per account */}
                  {accounts.length > 0 && (
                    <div>
                      <h4
                        className={`font-semibold mb-3 ${themeStyles.textPrimary}`}
                      >
                        Meta API Usage (This Hour)
                      </h4>
                      <div className="space-y-3">
                        {accounts.slice(0, 3).map((account) => {
                          const metaCallsPercentage = account.metaCallsThisHour
                            ? Math.min(
                                (account.metaCallsThisHour / 200) * 100,
                                100,
                              )
                            : 0;

                          return (
                            <div key={account.id} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className={themeStyles.textSecondary}>
                                  @{account.username}
                                </span>
                                <span className={themeStyles.textMuted}>
                                  {account.metaCallsThisHour || 0}/200
                                </span>
                              </div>
                              <Progress
                                value={metaCallsPercentage}
                                className={`h-2 ${
                                  metaCallsPercentage >= 90
                                    ? "bg-red-900/20"
                                    : metaCallsPercentage >= 70
                                      ? "bg-yellow-900/20"
                                      : "bg-green-900/20"
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Total Accounts
              </CardTitle>
              <Instagram className="h-4 w-4 text-[#00F0FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00F0FF]">
                {accounts.length} / {accountLimit}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                {stats.activeAccounts} active
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Total Followers
              </CardTitle>
              <Users className="h-4 w-4 text-[#B026FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#B026FF]">
                {stats.totalFollowers.toLocaleString()}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                Across all accounts
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Auto Replies
              </CardTitle>
              <Zap className="h-4 w-4 text-[#FF2E9F]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#FF2E9F]">
                {stats.totalReplies} / {replyLimit}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                Total sent
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Meta API Calls
              </CardTitle>
              <Cpu className="h-4 w-4 text-[#00F0FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00F0FF]">
                {stats.totalMetaCalls}
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                This hour
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Grid */}
        <div className="grid gap-6">
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                theme={currentTheme}
                themeStyles={themeStyles}
                isUpdating={isUpdatingAccount === account.id}
                hasError={hasError.includes(account.id)}
                onToggleAccount={handleToggleAccount}
                onImageError={handleImageError}
                userId={userId}
                rateLimitStats={rateLimitStats}
              />
            ))
          ) : (
            <EmptyAccountsCard
              themeStyles={themeStyles}
              currentTheme={currentTheme}
            />
          )}
        </div>
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
              You have reached the maximum number of accounts for your current
              plan. To add more accounts, please upgrade your subscription.
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
    </div>
  );
}

// Account Card Component
interface AccountCardProps {
  account: InstagramAccount;
  theme: string;
  themeStyles: ThemeStyles;
  isUpdating: boolean;
  hasError: boolean;
  onToggleAccount: (accountId: string) => void;
  onImageError: (accountId: string) => void;
  userId: string | null;
  rateLimitStats: UserTierInfo | null;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  theme,
  themeStyles,
  isUpdating,
  hasError,
  onToggleAccount,
  onImageError,
  userId,
  rateLimitStats,
}) => {
  const isTokenExpiring = account.isTokenExpiring || false;

  // Calculate Meta API usage percentage
  const metaCallsPercentage = account.metaCallsThisHour
    ? Math.min((account.metaCallsThisHour / 200) * 100, 100)
    : 0;

  // Get account usage from rate limit stats
  const accountUsage = rateLimitStats?.accountUsage?.find(
    (usage) => usage.instagramAccountId === account.instagramId,
  );

  // Format response time
  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <Card
      className={`card-hover transition-all duration-300 ${
        themeStyles.cardBg
      } ${themeStyles.cardBorder} ${
        account.isActive
          ? "border-[#00F0FF]/30 bg-gradient-to-r from-[#00F0FF]/5 to-transparent"
          : ""
      }`}
    >
      <CardContent className="pt-6 p-2 md:p-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Image
                src={hasError ? defaultImg.src : account.profilePicture}
                alt={account.displayName}
                onError={() => onImageError(account.id)}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 ${
                  account.isActive ? "bg-[#00F0FF]" : "bg-gray-400"
                }`}
              />
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>
                  @{account.username}
                </h3>
                <Badge
                  variant={account.isActive ? "default" : "secondary"}
                  className={
                    account.isActive
                      ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30"
                      : `${
                          theme === "dark"
                            ? "bg-gray-800 text-gray-400"
                            : "bg-gray-200 text-gray-600"
                        }`
                  }
                >
                  {account.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className={themeStyles.textMuted}>{account.displayName}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <span className={`text-sm ${themeStyles.textMuted}`}>
                  {account.followersCount.toLocaleString()} followers
                </span>
                <span className={`text-sm ${themeStyles.textMuted}`}>
                  {account.mediaCount} posts
                </span>
                <span className={`text-sm ${themeStyles.textMuted}`}>
                  {account.engagementRate}% engagement
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className={`font-bold ${themeStyles.textPrimary}`}>
                  {account.templatesCount}
                </span>
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  Templates
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`font-bold ${themeStyles.textPrimary}`}>
                  {account.accountReply}
                </span>
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  Replies
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`font-bold ${themeStyles.textPrimary}`}>
                  {account.lastActivity}
                </span>
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  Active
                </span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
              <div className="flex items-center justify-center gap-2">
                <Label className={`text-sm ${themeStyles.textSecondary} mr-2`}>
                  Auto-replies
                </Label>
                <Switch
                  checked={account.isActive}
                  onCheckedChange={() => onToggleAccount(account.id)}
                  disabled={isUpdating}
                  className="data-[state=checked]:bg-[#00F0FF]"
                />
              </div>

              <div className="flex items-center justify-center gap-2">
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
                  className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText} p-2 bg-[#B026FF]/10 hover:bg-[#B026FF]/15 transition-colors`}
                  asChild
                >
                  <Link href={`/insta/accounts/${account.id}`}>
                    <Settings className="h-4 w-4 mr-1" /> Manage
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics Section */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Meta API Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span
                  className={`flex items-center gap-1 ${themeStyles.textSecondary}`}
                >
                  <Cpu className="h-3 w-3" />
                  Meta API
                </span>
                <span className={themeStyles.textMuted}>
                  {account.metaCallsThisHour || 0}/200
                </span>
              </div>
              <Progress
                value={metaCallsPercentage}
                className={`h-2 ${
                  metaCallsPercentage >= 90
                    ? "bg-red-900/20"
                    : metaCallsPercentage >= 70
                      ? "bg-yellow-900/20"
                      : "bg-green-900/20"
                }`}
              />
              {account.isMetaRateLimited && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Rate limited
                  {account.metaRateLimitResetAt && (
                    <span className="text-gray-500">
                      (resets {account.metaRateLimitResetAt})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Rate Limit Usage */}
            {accountUsage && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span
                    className={`flex items-center gap-1 ${themeStyles.textSecondary}`}
                  >
                    <Zap className="h-3 w-3" />
                    Rate Limit
                  </span>
                  <span className={themeStyles.textMuted}>
                    {accountUsage.callsMade || 0}/
                    {account.tier === "pro" ? "∞" : TIER_LIMITS.free}
                  </span>
                </div>
                <Progress
                  value={
                    account.tier === "pro"
                      ? 0
                      : ((accountUsage.callsMade || 0) / TIER_LIMITS.free) * 100
                  }
                  className={`h-2 ${
                    account.tier === "pro"
                      ? "bg-green-900/20"
                      : ((accountUsage.callsMade || 0) / TIER_LIMITS.free) *
                            100 >=
                          90
                        ? "bg-red-900/20"
                        : ((accountUsage.callsMade || 0) / TIER_LIMITS.free) *
                              100 >=
                            70
                          ? "bg-yellow-900/20"
                          : "bg-green-900/20"
                  }`}
                />
              </div>
            )}

            {/* Performance Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={themeStyles.textSecondary}>Success Rate</span>
                <span className={themeStyles.textMuted}>
                  {account.successRate || 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={themeStyles.textSecondary}>Avg Response</span>
                <span className={themeStyles.textMuted}>
                  {formatResponseTime(account.avgResponseTime || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Empty Accounts Card Component
interface EmptyAccountsCardProps {
  themeStyles: ThemeStyles;
  currentTheme: string;
}

const EmptyAccountsCard: React.FC<EmptyAccountsCardProps> = ({
  themeStyles,
  currentTheme,
}) => (
  <Card
    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
  >
    <CardContent className="text-center py-12">
      <div
        className={`mx-auto w-24 h-24 ${
          currentTheme === "dark" ? "bg-white/5" : "bg-gray-100"
        } rounded-full flex items-center justify-center mb-4`}
      >
        <Instagram className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}>
        No accounts connected
      </h3>
      <p className={`${themeStyles.textMuted} mb-4 font-mono`}>
        Connect your first Instagram account to start automating replies
      </p>
      <Button className="btn-gradient-cyan" asChild>
        <Link href="/insta/accounts/add">
          <Plus className="mr-2 h-4 w-4" />
          Connect Account
        </Link>
      </Button>
    </CardContent>
  </Card>
);
