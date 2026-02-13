"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Users,
  Clock,
  Target,
  Filter,
  RefreshCw,
  Plus,
  Instagram,
  Activity,
  Zap,
  Cpu,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import Image from "next/image";
import { AnalyticsDashboard } from "@/components/insta/Analytics-dashboard";
import { useAuth } from "@clerk/nextjs";
import defaultImg from "@rocketreplai/public/assets/img/default-img.jpg";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button } from "@rocketreplai/ui/components/radix/button";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rocketreplai/ui/components/radix/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Progress } from "@rocketreplai/ui/components/radix/progress";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  getDashboardData,
  getInstagramUser,
  getInstaTemplates,
  getReplyLogs,
  getSubscriptioninfo,
  refreshInstagramToken,
  getRateLimitStats,
  getAppLimitStatus,
  UserTierInfo,
  AppLimitStatus,
  InstagramAccount as APIIInstagramAccount,
  SubscriptionInfo,
} from "@/lib/services/insta-actions.api";

// Types
interface InstagramAccount extends APIIInstagramAccount {
  id: string;
  displayName: string;
  postsCount: number;
  templatesCount: number;
  repliesCount: number;
  replyLimit: number;
  accountLimit: number;
  totalAccounts: number;
  engagementRate: number;
  successRate: number;
  avgResponseTime: number;
  callsMade?: number;
  callsRemaining?: number;
  tier?: "free" | "pro";
}

interface RecentActivity {
  id: string;
  type: string;
  account: string;
  template: string;
  timestamp: string;
  success: boolean;
  responseTime: number;
}

interface AnalyticsData {
  totalAccounts: number;
  activeAccounts: number;
  totalTemplates: number;
  totalReplies: number;
  engagementRate: number;
  successRate: number;
  overallAvgResponseTime: number;
  accountLimit: number;
  replyLimit: number;
  accounts: InstagramAccount[];
  recentActivity: RecentActivity[];
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
  selectBg: string;
  selectBorder: string;
  buttonOutlineBorder: string;
  buttonOutlineText: string;
}

// Constants
const ACCOUNTS_CACHE_KEY = "instagramAccountsAnalytics";
const ANALYTICS_CACHE_KEY = "analyticsData";
const RATE_LIMIT_CACHE_KEY = "rateLimitStatsAnalytics";
const APP_LIMIT_CACHE_KEY = "appLimitStatusAnalytics";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Rate Limit Constants
const TIER_LIMITS = {
  free: 100,
  pro: 999999,
} as const;

export default function AnalyticsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // State
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [hasError, setHasError] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<AnalyticsData | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rateLimitStats, setRateLimitStats] = useState<UserTierInfo | null>(
    null,
  );
  const [appLimitStatus, setAppLimitStatus] = useState<AppLimitStatus | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Theme styles
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
      selectBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white",
      selectBorder: isDark ? "border-white/20" : "border-gray-300",
      buttonOutlineBorder: isDark ? "border-white/20" : "border-gray-300",
      buttonOutlineText: isDark ? "text-gray-300" : "text-n-6",
    };
  }, [currentTheme]);

  // Authentication check
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.push("/sign-in");
      return;
    }
  }, [userId, router, isLoaded]);

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

  // Helper: Format response time
  const formatResponseTimeSmart = useCallback((ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }, []);

  // Fetch cached data helper
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

  // Set cached data helper
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

  // Fetch Instagram accounts
  const fetchAccounts = useCallback(async (): Promise<AnalyticsData | null> => {
    if (!userId) {
      router.push("/sign-in");
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cachedAccounts =
        getCachedData<InstagramAccount[]>(ACCOUNTS_CACHE_KEY);
      if (cachedAccounts) {
        return transformAccountsToAnalyticsData(cachedAccounts, null, null);
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
      } = await dashboardResponse;

      if (!dbAccounts?.length) {
        return null;
      }

      // Get rate limit stats
      const rateStats = await fetchRateLimitStats();

      // Transform accounts
      const completeAccounts: InstagramAccount[] = dbAccounts.map(
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

            // Additional analytics fields
            displayName:
              dbAccount.displayName || dbAccount.username || "No Name",
            postsCount: dbAccount.mediaCount || 0,
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
      }

      // Get app limit status
      const appLimit = await fetchAppLimitStatus();

      return transformAccountsToAnalyticsData(
        completeAccounts,
        rateStats,
        appLimit,
      );
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, router, fetchRateLimitStats, fetchAppLimitStatus]);

  // Transform accounts to analytics data
  const transformAccountsToAnalyticsData = (
    accounts: InstagramAccount[],
    rateLimit: UserTierInfo | null,
    appLimit: AppLimitStatus | null,
  ): AnalyticsData => {
    const activeAccounts = accounts.filter((account) => account.isActive);

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      totalTemplates: accounts.reduce(
        (sum, account) => sum + account.templatesCount,
        0,
      ),
      totalReplies: accounts.reduce(
        (sum, account) => sum + (account.accountReply || 0),
        0,
      ),
      engagementRate:
        activeAccounts.length > 0
          ? activeAccounts.reduce(
              (sum, account) => sum + account.engagementRate,
              0,
            ) / activeAccounts.length
          : 0,
      successRate:
        activeAccounts.length > 0
          ? activeAccounts.reduce(
              (sum, account) => sum + account.successRate,
              0,
            ) / activeAccounts.length
          : 0,
      overallAvgResponseTime:
        activeAccounts.length > 0
          ? activeAccounts.reduce(
              (sum, account) => sum + account.avgResponseTime,
              0,
            ) / activeAccounts.length
          : 0,
      accountLimit: accounts[0]?.accountLimit || 1,
      replyLimit: accounts[0]?.replyLimit || 500,
      accounts,
      recentActivity: [],
      rateLimit,
      appLimit,
    };
  };

  // Fetch templates
  const fetchTemplates = useCallback(
    async (accountId?: string): Promise<void> => {
      if (!userId) return;

      try {
        const response = await getInstaTemplates({
          accountId: accountId !== "all" ? accountId : undefined,
        });

        if (response.templates.length === 0) {
          setTemplates([]);
        } else {
          const formattedTemplates = response.templates.map(
            (template: any) => ({
              ...template,
              lastUsed: template.lastUsed
                ? new Date(template.lastUsed).toISOString()
                : new Date().toISOString(),
              successRate: template.successRate || 0,
            }),
          );
          setTemplates(formattedTemplates);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        setTemplates([]);
      }
    },
    [userId],
  );

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // Check cache first
      const cachedAnalytics = getCachedData<AnalyticsData>(ANALYTICS_CACHE_KEY);
      if (cachedAnalytics) {
        setAnalyticsData(cachedAnalytics);
        await fetchTemplates();
        return;
      }

      // Fetch accounts data with rate limits
      const accountsData = await fetchAccounts();
      if (!accountsData) {
        return;
      }

      // Fetch recent activity
      try {
        const { logs: replyLogs } = await getReplyLogs(10);

        if (replyLogs && replyLogs.length > 0) {
          accountsData.recentActivity = replyLogs
            .slice(0, 10)
            .map((log: any) => ({
              id: log._id,
              type: log.success ? "reply_sent" : "reply_failed",
              account: log.commenterUsername || "Unknown",
              template: log.templateName || "Unknown Template",
              timestamp: log.createdAt,
              success: log.success || false,
              responseTime: log.responseTime || 0,
            }));
        } else {
          accountsData.recentActivity = [];
        }
      } catch (activityError) {
        console.error("Failed to fetch recent activity:", activityError);
        accountsData.recentActivity = [];
      }

      setAnalyticsData(accountsData);
      setCachedData(ANALYTICS_CACHE_KEY, accountsData);
      await fetchTemplates();
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchAccounts, fetchTemplates]);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async (): Promise<void> => {
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
    }
  }, [userId]);

  // Initial data fetch
  useEffect(() => {
    if (!userId || !isLoaded) return;

    const loadData = async () => {
      await Promise.all([fetchSubscriptions(), fetchAnalyticsData()]);
    };

    loadData();
  }, [userId, isLoaded, fetchSubscriptions, fetchAnalyticsData]);

  // Filter data when account selection changes
  useEffect(() => {
    if (!analyticsData) return;

    if (selectedAccount === "all") {
      setFilteredData(analyticsData);
      return;
    }

    const account = analyticsData.accounts.find(
      (acc) => acc.username === selectedAccount,
    );

    if (!account) {
      setFilteredData(analyticsData);
      return;
    }

    const filteredRecentActivity = analyticsData.recentActivity?.filter(
      (activity: any) => {
        // Find if this activity belongs to the selected account
        const matchingAccount = analyticsData.accounts.find(
          (acc) =>
            activity.account.includes(acc.username) ||
            activity.template.includes(acc.username),
        );
        return matchingAccount?.username === selectedAccount;
      },
    );

    const filteredData: AnalyticsData = {
      ...analyticsData,
      accounts: [account],
      recentActivity: filteredRecentActivity || [],
      totalReplies: account.accountReply || 0,
      successRate: account.successRate || 94,
      overallAvgResponseTime: account.avgResponseTime || 0,
      engagementRate: account.engagementRate || 87,
    };

    setFilteredData(filteredData);
  }, [analyticsData, selectedAccount]);

  // Fetch templates for selected account
  useEffect(() => {
    if (!analyticsData) return;

    if (selectedAccount !== "all") {
      const account = analyticsData.accounts.find(
        (acc) => acc.username === selectedAccount,
      );
      if (account) {
        fetchTemplates(account.instagramId);
      }
    } else {
      fetchTemplates();
    }
  }, [selectedAccount, analyticsData, fetchTemplates]);

  // Handle image error
  const handleImageError = (id: string): void => {
    setHasError((prev) => [...prev, id]);
  };

  // Refresh data
  const refreshData = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      localStorage.removeItem(ACCOUNTS_CACHE_KEY);
      localStorage.removeItem(ANALYTICS_CACHE_KEY);
      localStorage.removeItem(RATE_LIMIT_CACHE_KEY);
      localStorage.removeItem(APP_LIMIT_CACHE_KEY);
      await fetchAnalyticsData();
    } catch (error) {
      console.error("Failed to refresh data:", error);
      setError("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
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

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`min-h-screen ${themeStyles.textPrimary} ${themeStyles.containerBg} flex items-center justify-center`}
      >
        <div className="text-center p-6 bg-red-900/20 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Error Loading Analytics</h2>
          <p className={`${themeStyles.textSecondary} mb-6`}>{error}</p>
          <Button onClick={refreshData} className="btn-gradient-cyan">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div
      className={`min-h-screen ${themeStyles.textPrimary} ${themeStyles.containerBg}`}
    >
      <BreadcrumbsDefault />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 md:gap-0 mb-8">
          <div>
            <div
              className={`inline-flex items-center ${
                currentTheme === "dark"
                  ? "bg-blue-100/10 text-blue-400 border-blue-400/30"
                  : "bg-blue-100 text-blue-600 border-blue-300"
              } border rounded-full px-4 py-1 mb-4`}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Performance Analytics</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p
              className={`${themeStyles.textSecondary} text-xl font-medium font-montserrat`}
            >
              {selectedAccount === "all"
                ? "Track performance across all accounts"
                : `Tracking performance for @${selectedAccount}`}
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

          <div className="flex flex-col md:flex-row gap-4">
            <Button
              onClick={refreshData}
              variant="outline"
              className={`${themeStyles.buttonOutlineBorder} p-2 bg-gradient-to-r from-[#0ce05d]/80 to-[#0fcd6e]/80 hover:bg-white/10`}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>

            {rateLimitStats?.tier === "free" && (
              <Button
                onClick={() => (window.location.href = "/insta/pricing")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
              >
                <Zap className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            )}

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger
                className={`w-48 ${themeStyles.selectBg} ${themeStyles.selectBorder}`}
              >
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent
                className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}
              >
                <SelectItem value="all">All Accounts</SelectItem>
                {analyticsData?.accounts?.map((account: InstagramAccount) => (
                  <SelectItem key={account.id} value={account.username}>
                    {account.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* System Status Alert */}
        {appLimitStatus && <div className="mb-6">{renderAppLimitStatus()}</div>}

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
              <CardDescription className={themeStyles.textSecondary}>
                Monitor your API usage and rate limits
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {renderRateLimitProgress()}

                  {/* Account-specific usage */}
                  {rateLimitStats?.accountUsage &&
                    rateLimitStats.accountUsage.length > 0 && (
                      <div className="mt-4">
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
                                    {formatTimestamp(
                                      usage.lastCallAt.toString(),
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>

                <div>
                  {/* Meta API usage per account */}
                  {analyticsData?.accounts &&
                    analyticsData.accounts.length > 0 && (
                      <div>
                        <h4
                          className={`font-semibold mb-3 ${themeStyles.textPrimary}`}
                        >
                          Meta API Usage
                        </h4>
                        <div className="space-y-3">
                          {analyticsData.accounts.slice(0, 3).map((account) => {
                            const metaCallsPercentage =
                              account.metaCallsThisHour
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

                  {/* Queued items */}
                  {rateLimitStats?.queuedItems &&
                    rateLimitStats.queuedItems > 0 && (
                      <div className="pt-4 mt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className={themeStyles.textSecondary}>
                            {rateLimitStats.queuedItems} items in queue
                          </span>
                        </div>
                        <p className={`text-xs ${themeStyles.textMuted} mt-1`}>
                          These will be processed automatically when limits
                          allow
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card
            className={`card-hover group hover:shadow-lg transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Total Replies
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-[#00F0FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#B026FF]">
                {filteredData?.totalReplies || 0}
              </div>
              <p
                className={`text-xs ${themeStyles.textMuted} flex items-center font-montserrat`}
              >
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +12% from last period
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover group hover:shadow-lg transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Success Rate
              </CardTitle>
              <Target className="h-4 w-4 text-[#B026FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#FF2E9F]">
                {filteredData?.successRate || 0}%
              </div>
              <p
                className={`text-xs ${themeStyles.textMuted} flex items-center font-montserrat`}
              >
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +2.1% from last period
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover group hover:shadow-lg transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Avg Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-[#FF2E9F]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#10B981]">
                {filteredData?.overallAvgResponseTime
                  ? formatResponseTimeSmart(filteredData.overallAvgResponseTime)
                  : "0s"}
              </div>
              <p
                className={`text-xs ${themeStyles.textMuted} flex items-center font-montserrat`}
              >
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                -0.5s improvement
              </p>
            </CardContent>
          </Card>

          <Card
            className={`card-hover group hover:shadow-lg transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${themeStyles.textSecondary}`}
              >
                Engagement Boost
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-[#00F0FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00F0FF]">
                +{filteredData?.engagementRate || 0}%
              </div>
              <p className={`text-xs ${themeStyles.textMuted} font-montserrat`}>
                Since auto-replies enabled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Account Performance */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card
            className={`card-hover group ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader>
              <CardTitle
                className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
              >
                <Users className="h-5 w-5 text-[#00F0FF]" />
                {selectedAccount === "all"
                  ? "Account Performance"
                  : "Account Details"}
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                {selectedAccount === "all"
                  ? "Compare performance across your Instagram accounts"
                  : `Performance details for @${selectedAccount}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 w-full p-2">
              {filteredData?.accounts?.map((account: InstagramAccount) => {
                const isTokenExpiring =
                  account.tokenExpiresAt &&
                  new Date(account.tokenExpiresAt) <
                    new Date(Date.now() + 24 * 60 * 60 * 1000);

                const metaCallsPercentage = account.metaCallsThisHour
                  ? Math.min((account.metaCallsThisHour / 200) * 100, 100)
                  : 0;

                return (
                  <div
                    key={account.id}
                    className={`flex flex-col w-full items-center justify-between p-4 gap-3 border ${themeStyles.cardBorder} rounded-lg`}
                  >
                    <div className="flex items-center space-x-2 lg:space-x-4 w-full">
                      <div className="relative">
                        <Image
                          width={48}
                          height={48}
                          src={
                            hasError.includes(account.id)
                              ? defaultImg
                              : account.profilePicture || "Owner"
                          }
                          onError={() => handleImageError(account.id)}
                          alt={account.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 ${
                            account.isActive ? "bg-[#00F0FF]" : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4
                          className={`text-base lg:text-lg font-medium lg:font-semibold font-montserrat ${themeStyles.textPrimary}`}
                        >
                          @{account.username}
                        </h4>
                        <p
                          className={`text-sm ${themeStyles.textMuted} font-montserrat`}
                        >
                          {account.accountReply} replies
                        </p>
                        {account.metaCallsThisHour > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Cpu className="h-3 w-3 text-blue-500" />
                            <span
                              className={`text-xs ${themeStyles.textMuted}`}
                            >
                              Meta: {account.metaCallsThisHour}/200
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full font-montserrat mt-2">
                      <div className={`text-xs ${themeStyles.textPrimary}`}>
                        {account.engagementRate}% engagement
                      </div>
                      <div className={`text-xs ${themeStyles.textMuted}`}>
                        {account.avgResponseTime
                          ? formatResponseTimeSmart(account.avgResponseTime)
                          : "0s"}{" "}
                        avg time
                      </div>
                    </div>

                    {/* Meta API usage indicator */}
                    {account.metaCallsThisHour > 0 && (
                      <div className="w-full mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={themeStyles.textMuted}>
                            Meta API Usage
                          </span>
                          <span className={themeStyles.textMuted}>
                            {account.metaCallsThisHour}/200
                          </span>
                        </div>
                        <Progress
                          value={metaCallsPercentage}
                          className={`h-1 ${
                            metaCallsPercentage >= 90
                              ? "bg-red-900/20"
                              : metaCallsPercentage >= 70
                                ? "bg-yellow-900/20"
                                : "bg-green-900/20"
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 w-full mt-2">
                      {isTokenExpiring && userId && (
                        <Button
                          onClick={() =>
                            refreshInstagramToken(account.instagramId)
                          }
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
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}

              {(!filteredData || filteredData.accounts.length === 0) && (
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

          <Card
            className={`card-hover group ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
          >
            <CardHeader>
              <CardTitle
                className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
              >
                <Clock className="h-5 w-5 text-[#FF2E9F]" />
                Recent Activity
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                {selectedAccount === "all"
                  ? "Latest auto-reply activities across all accounts"
                  : `Recent activities for @${selectedAccount}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-4 max-h-96 overflow-y-auto no-scrollbar">
                {filteredData?.recentActivity?.map(
                  (activity: RecentActivity) => (
                    <div
                      key={activity.id}
                      className={`flex items-center justify-between p-3 border ${themeStyles.cardBorder} rounded-lg`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-2 w-2 rounded-full ${activity.success ? "bg-[#00F0FF]" : "bg-red-500"}`}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${themeStyles.textPrimary} font-montserrat`}
                          >
                            {activity.type === "reply_sent"
                              ? "Reply sent"
                              : "Reply failed"}
                            <span className={themeStyles.textSecondary}>
                              {" "}
                              to @{activity.account}
                            </span>
                          </p>
                          <p
                            className={`text-xs ${themeStyles.textMuted} font-montserrat`}
                          >
                            Template: {activity.template}
                          </p>
                          {activity.responseTime && (
                            <p className={`text-xs ${themeStyles.textMuted}`}>
                              Response:{" "}
                              {formatResponseTimeSmart(activity.responseTime)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={activity.success ? "default" : "destructive"}
                          className={
                            activity.success
                              ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30"
                              : "bg-red-900/20 text-red-300 border-red-500/30"
                          }
                        >
                          {activity.success ? "Success" : "Failed"}
                        </Badge>
                        <p className={`text-xs ${themeStyles.textMuted} mt-1`}>
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ),
                )}

                {(!filteredData?.recentActivity ||
                  filteredData.recentActivity.length === 0) && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                    <p className={`${themeStyles.textMuted} font-montserrat`}>
                      No recent activity recorded yet
                    </p>
                    <p className={`text-sm ${themeStyles.textMuted} mt-2`}>
                      Activity will appear here as your templates are used
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Analytics Dashboard */}
        {templates.length > 0 && <AnalyticsDashboard templates={templates} />}
      </div>
    </div>
  );
}
