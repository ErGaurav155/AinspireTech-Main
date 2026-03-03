"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  BarChart,
  Users,
  Zap,
  Instagram,
  Globe,
  Search,
  Filter,
  Eye,
  Calendar,
  ArrowUpRight,
  Download,
  Loader2,
  TrendingUp,
  PieChart,
  Server,
  Cpu,
  Database,
  Layers,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";

import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";
import { Spinner } from "@/components/shared/Spinner";
import { GateScreen } from "@/components/shared/GateScreen";

import {
  getWindowStats,
  getAppRateLimitStats,
  getUserRateLimitStats,
} from "@/lib/services/admin-actions.api";
import { verifyOwner } from "@/lib/services/admin-actions.api";

interface UserRateLimitStats {
  callsMade: number;
  nextReset: string;
  queuedItems: number;
  remainingCalls: number;
  tier: string;
  tierLimit: number;
  usagePercentage: number;
}

interface AppRateLimitStats {
  current: number;
  limit: number;
  percentage: number;
  reached: boolean;
}

interface WindowStats {
  accounts: {
    appLimitPerAccount: number;
    totalActive: number;
    totalAppLimit: number;
  };
  global: {
    accountsProcessed: number;
    isAutomationPaused: boolean;
    totalCalls: number;
    usagePercentage: number;
  };
  isCurrentWindow: boolean;
  queue: {
    byReason: any[];
    byType: Array<{ _id: string; count: number }>;
    completed: number;
    failed: number;
    note: string;
    pending: number;
    processing: number;
    queuedItems: number;
  };
  users: {
    averageCallsPerUser: number;
    byTier: {
      free: {
        averageCallsPerUser: number;
        count: number;
        limit: number;
        totalCalls: number;
      };
      pro: {
        averageCallsPerUser: number;
        count: number;
        limit: number;
        totalCalls: number;
      };
    };
    totalCalls: number;
    totalUsers: number;
  };
  window: string;
}

export default function AdminRateLimitsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [userStats, setUserStats] = useState<UserRateLimitStats | null>(null);
  const [appLimit, setAppLimit] = useState<AppRateLimitStats | null>(null);
  const [windowStats, setWindowStats] = useState<WindowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  type ActiveTab = "overview" | "windows" | "queue" | "tiers";
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all rate limit data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const ownerVerification = await verifyOwner(apiRequest);
      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      const [stats, appLimitData, windowData] = await Promise.all([
        getUserRateLimitStats(apiRequest),
        getAppRateLimitStats(apiRequest),
        getWindowStats(apiRequest),
      ]);

      setUserStats(stats);
      setAppLimit(appLimitData);
      setWindowStats(windowData);
    } catch (err) {
      console.error("Error fetching rate limit data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch rate limit data",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, apiRequest]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-100 text-red-600 border-red-200";
    if (percentage >= 70)
      return "bg-yellow-100 text-yellow-600 border-yellow-200";
    return "bg-green-100 text-green-600 border-green-200";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <XCircle className="h-4 w-4" />;
    if (percentage >= 70) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";
  const TAB_CONFIG: Record<
    ActiveTab,
    { label: string; icon: React.ElementType }
  > = {
    overview: {
      label: "Overview",
      icon: PieChart,
    },
    windows: {
      label: "Time Windows",
      icon: Calendar,
    },
    queue: {
      label: "Queue Details",
      icon: Layers,
    },
    tiers: {
      label: "Tier Breakdown",
      icon: BarChart,
    },
  };
  // Guard screens
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className={`text-sm ${styles.text.secondary}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <GateScreen
        icon={<Shield className="h-8 w-8 text-orange-400" />}
        title="Authentication Required"
        body="Please sign in to access the admin dashboard."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Sign In <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Access Denied"
        body="You are not authorized to view this page."
        subText={`Logged in as: ${user.primaryEmailAddress?.emailAddress}`}
      >
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Return to Home <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (loading) {
    return <Spinner label="Loading rate limit data…" />;
  }

  if (error && error !== "ACCESS_DENIED") {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Something went wrong"
        body={error}
      >
        <button
          onClick={fetchData}
          className={`px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Try Again
        </button>
      </GateScreen>
    );
  }

  if (!userStats || !appLimit || !windowStats) {
    return (
      <div className={styles.page}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Activity
              className={`h-12 w-12 mx-auto mb-4 ${styles.text.muted}`}
            />
            <p className={styles.text.secondary}>
              No rate limit data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${styles.text.primary}`}>
                Rate Limits
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                Monitor Instagram API rate limits and usage across all users
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Current Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* User Rate Limit Card */}
          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark
                      ? "bg-orange-500/20 border border-orange-500/30"
                      : "bg-orange-100"
                  }`}
                >
                  <Server className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <p className={`text-sm font-medium ${styles.text.secondary}`}>
                  Your Rate Limit
                </p>
              </div>
              <Badge className={getStatusColor(userStats.usagePercentage)}>
                {getStatusIcon(userStats.usagePercentage)}
                <span className="ml-1">
                  {userStats.usagePercentage.toFixed(1)}%
                </span>
              </Badge>
            </div>
            <p className={`text-3xl font-bold ${styles.text.primary}`}>
              {userStats.callsMade.toLocaleString()}
            </p>
            <p className={`text-sm ${styles.text.secondary} mt-1`}>
              of {userStats.tierLimit.toLocaleString()} calls
            </p>
            <div
              className={`mt-3 h-2 bg-white/10 dark:bg-white/10 bg-gray-100 rounded-full overflow-hidden`}
            >
              <div
                className={`h-full ${getProgressBarColor(userStats.usagePercentage)} transition-all`}
                style={{
                  width: `${Math.min(userStats.usagePercentage, 100)}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={styles.text.secondary}>
                Tier: {userStats.tier}
              </span>
              <span className={styles.text.secondary}>
                Remaining: {userStats.remainingCalls}
              </span>
            </div>
            <p className={`text-xs mt-2 ${styles.text.muted}`}>
              Next reset: {formatDateTime(userStats.nextReset)}
            </p>
          </div>

          {/* App Limit Card */}
          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark
                      ? "bg-blue-500/20 border border-blue-500/30"
                      : "bg-blue-100"
                  }`}
                >
                  <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className={`text-sm font-medium ${styles.text.secondary}`}>
                  App Limit
                </p>
              </div>
              <Badge className={getStatusColor(appLimit.percentage)}>
                {getStatusIcon(appLimit.percentage)}
                <span className="ml-1">{appLimit.percentage.toFixed(1)}%</span>
              </Badge>
            </div>
            <p className={`text-3xl font-bold ${styles.text.primary}`}>
              {appLimit.current.toLocaleString()}
            </p>
            <p className={`text-sm ${styles.text.secondary} mt-1`}>
              of {appLimit.limit.toLocaleString()} limit
            </p>
            <div
              className={`mt-3 h-2 bg-white/10 dark:bg-white/10 bg-gray-100 rounded-full overflow-hidden`}
            >
              <div
                className={`h-full ${getProgressBarColor(appLimit.percentage)} transition-all`}
                style={{ width: `${Math.min(appLimit.percentage, 100)}%` }}
              />
            </div>
            <p className={`text-xs mt-2 ${styles.text.muted}`}>
              Reached: {appLimit.reached ? "Yes" : "No"}
            </p>
          </div>

          {/* Queue Status Card */}
          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark
                      ? "bg-purple-500/20 border border-purple-500/30"
                      : "bg-purple-100"
                  }`}
                >
                  <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className={`text-sm font-medium ${styles.text.secondary}`}>
                  Queue Status
                </p>
              </div>
              <Badge
                className={
                  windowStats.queue.queuedItems > 0
                    ? "bg-yellow-100 text-yellow-600 border-yellow-200"
                    : "bg-green-100 text-green-600 border-green-200"
                }
              >
                {windowStats.queue.queuedItems > 0 ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    {windowStats.queue.queuedItems} queued
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Empty
                  </>
                )}
              </Badge>
            </div>
            <p className={`text-3xl font-bold ${styles.text.primary}`}>
              {windowStats.queue.queuedItems.toLocaleString()}
            </p>
            <p className={`text-sm ${styles.text.secondary} mt-1`}>
              items waiting
            </p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center">
                <p className={`text-xs ${styles.text.secondary}`}>Processing</p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {windowStats.queue.processing}
                </p>
              </div>
              <div className="text-center">
                <p className={`text-xs ${styles.text.secondary}`}>Pending</p>
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  {windowStats.queue.pending}
                </p>
              </div>
              <div className="text-center">
                <p className={`text-xs ${styles.text.secondary}`}>Failed</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {windowStats.queue.failed}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 w-full"
        >
          {/* Tabs */}
          <div className={`border-b ${styles.divider}`}>
            <nav className="flex gap-6 overflow-x-auto">
              {(Object.keys(TAB_CONFIG) as ActiveTab[]).map((tab) => {
                const Icon = TAB_CONFIG[tab].icon;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? styles.tab.active
                        : styles.tab.inactive
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        activeTab === tab ? "text-blue-500" : "text-gray-400"
                      }`}
                    />
                    {TAB_CONFIG[tab].label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Window */}
              <Card className={styles.card}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${styles.text.primary}`}
                  >
                    <Clock className="h-5 w-5 text-orange-500" />
                    Current Window
                  </CardTitle>
                  <CardDescription className={styles.text.secondary}>
                    {windowStats.isCurrentWindow
                      ? "Active window"
                      : "Previous window"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className={`text-sm ${styles.text.secondary}`}>
                        Window Time
                      </p>
                      <p
                        className={`text-lg font-semibold ${styles.text.primary}`}
                      >
                        {windowStats.window}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                      >
                        <p className={`text-xs ${styles.text.muted} mb-1`}>
                          Total Calls
                        </p>
                        <p
                          className={`text-xl font-bold ${styles.text.primary}`}
                        >
                          {windowStats.global.totalCalls.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                      >
                        <p className={`text-xs ${styles.text.muted} mb-1`}>
                          Accounts
                        </p>
                        <p
                          className={`text-xl font-bold ${styles.text.primary}`}
                        >
                          {windowStats.global.accountsProcessed.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-sm ${styles.text.secondary} mb-2`}>
                        Window Usage
                      </p>
                      <div
                        className={`h-3 ${isDark ? "bg-white/10" : "bg-gray-100"} rounded-full overflow-hidden`}
                      >
                        <div
                          className={`h-full ${getProgressBarColor(windowStats.global.usagePercentage)}`}
                          style={{
                            width: `${Math.min(windowStats.global.usagePercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className={`text-xs ${styles.text.muted}`}>
                      Automation Paused:{" "}
                      {windowStats.global.isAutomationPaused ? "Yes" : "No"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Queue Note */}
              <Card className={styles.card}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${styles.text.primary}`}
                  >
                    <Database className="h-5 w-5 text-purple-500" />
                    Queue Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-200"}`}
                  >
                    <p
                      className={`text-sm ${isDark ? "text-purple-300" : "text-purple-700"}`}
                    >
                      {windowStats.queue.note}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                    >
                      <p className={`text-xs ${styles.text.muted}`}>
                        Completed
                      </p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {windowStats.queue.completed}
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                    >
                      <p className={`text-xs ${styles.text.muted}`}>Failed</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {windowStats.queue.failed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <Card className={styles.card}>
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${styles.text.primary}`}
                >
                  <Instagram className="h-5 w-5 text-pink-500" />
                  Account Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <p className={`text-xs ${styles.text.muted} mb-1`}>
                      Active Accounts
                    </p>
                    <p className={`text-2xl font-bold ${styles.text.primary}`}>
                      {windowStats.accounts.totalActive}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <p className={`text-xs ${styles.text.muted} mb-1`}>
                      App Limit/Account
                    </p>
                    <p className={`text-2xl font-bold ${styles.text.primary}`}>
                      {windowStats.accounts.appLimitPerAccount}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <p className={`text-xs ${styles.text.muted} mb-1`}>
                      Total App Limit
                    </p>
                    <p className={`text-2xl font-bold ${styles.text.primary}`}>
                      {windowStats.accounts.totalAppLimit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Windows Tab */}
          <TabsContent value="windows" className="space-y-6">
            <Card className={styles.card}>
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${styles.text.primary}`}
                >
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Current Window Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <h3
                      className={`text-sm font-medium ${styles.text.primary} mb-3`}
                    >
                      Window Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className={`text-sm ${styles.text.secondary}`}>
                          Window Time
                        </span>
                        <span
                          className={`text-sm font-medium ${styles.text.primary}`}
                        >
                          {windowStats.window}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${styles.text.secondary}`}>
                          Status
                        </span>
                        <Badge
                          className={
                            windowStats.isCurrentWindow
                              ? "bg-green-100 text-green-600 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {windowStats.isCurrentWindow ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${styles.text.secondary}`}>
                          Total Calls
                        </span>
                        <span
                          className={`text-sm font-medium ${styles.text.primary}`}
                        >
                          {windowStats.global.totalCalls.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${styles.text.secondary}`}>
                          Accounts Processed
                        </span>
                        <span
                          className={`text-sm font-medium ${styles.text.primary}`}
                        >
                          {windowStats.global.accountsProcessed.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <h3
                      className={`text-sm font-medium ${styles.text.primary} mb-3`}
                    >
                      Usage
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className={`text-sm ${styles.text.secondary}`}>
                            Usage Percentage
                          </span>
                          <span
                            className={`text-sm font-medium ${styles.text.primary}`}
                          >
                            {windowStats.global.usagePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className={`h-2 ${isDark ? "bg-white/10" : "bg-gray-200"} rounded-full overflow-hidden`}
                        >
                          <div
                            className={`h-full ${getProgressBarColor(windowStats.global.usagePercentage)}`}
                            style={{
                              width: `${Math.min(windowStats.global.usagePercentage, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${styles.text.secondary}`}>
                          Automation Paused
                        </span>
                        <Badge
                          className={
                            windowStats.global.isAutomationPaused
                              ? "bg-red-100 text-red-600 border-red-200"
                              : "bg-green-100 text-green-600 border-green-200"
                          }
                        >
                          {windowStats.global.isAutomationPaused ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Details Tab */}
          <TabsContent value="queue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Queue Statistics */}
              <Card className={styles.card}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${styles.text.primary}`}
                  >
                    <Database className="h-5 w-5 text-purple-500" />
                    Queue Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-200"}`}
                      >
                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                          Total Queued
                        </p>
                        <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                          {windowStats.queue.queuedItems}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}
                      >
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                          Processing
                        </p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                          {windowStats.queue.processing}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-yellow-50 border border-yellow-200"}`}
                      >
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                          Pending
                        </p>
                        <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                          {windowStats.queue.pending}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}
                      >
                        <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                          Failed
                        </p>
                        <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                          {windowStats.queue.failed}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-xl ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}
                    >
                      <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                        Completed
                      </p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                        {windowStats.queue.completed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Queue by Type */}
              <Card className={styles.card}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${styles.text.primary}`}
                  >
                    <Layers className="h-5 w-5 text-indigo-500" />
                    Queue by Action Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {windowStats.queue.byType.map((item) => {
                      const percentage =
                        windowStats.queue.queuedItems > 0
                          ? (item.count / windowStats.queue.queuedItems) * 100
                          : 0;
                      return (
                        <div key={item._id}>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm capitalize ${styles.text.primary}`}
                            >
                              {item._id.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`text-sm font-medium ${styles.text.primary}`}
                            >
                              {item.count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            className={`h-2 ${isDark ? "bg-white/10" : "bg-gray-100"} rounded-full overflow-hidden`}
                          >
                            <div
                              className={`h-full ${
                                item._id.includes("comment")
                                  ? "bg-blue-500"
                                  : item._id.includes("dm")
                                    ? "bg-green-500"
                                    : item._id.includes("follow")
                                      ? "bg-purple-500"
                                      : item._id.includes("media")
                                        ? "bg-pink-500"
                                        : "bg-gray-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {windowStats.queue.byType.length === 0 && (
                      <p
                        className={`text-sm ${styles.text.secondary} text-center py-4`}
                      >
                        No items in queue
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Note */}
            <Card className={styles.card}>
              <CardContent className="pt-6">
                <div
                  className={`p-4 rounded-xl ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}
                >
                  <p
                    className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}
                  >
                    <span className="font-semibold">Note:</span>{" "}
                    {windowStats.queue.note}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tier Breakdown Tab */}
          <TabsContent value="tiers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Tier */}
              <Card className={styles.card}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${styles.text.primary}`}
                  >
                    <Users className="h-5 w-5 text-gray-500" />
                    Free Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                      >
                        <p className={`text-xs ${styles.text.muted} mb-1`}>
                          Users
                        </p>
                        <p
                          className={`text-2xl font-bold ${styles.text.primary}`}
                        >
                          {windowStats.users.byTier.free.count}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                      >
                        <p className={`text-xs ${styles.text.muted} mb-1`}>
                          Total Calls
                        </p>
                        <p
                          className={`text-2xl font-bold ${styles.text.primary}`}
                        >
                          {windowStats.users.byTier.free.totalCalls.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                    >
                      <p className={`text-xs ${styles.text.muted} mb-1`}>
                        Average Calls/User
                      </p>
                      <p
                        className={`text-2xl font-bold ${styles.text.primary}`}
                      >
                        {windowStats.users.byTier.free.averageCallsPerUser.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={styles.text.secondary}>
                        Limit per user
                      </span>
                      <span className={`font-medium ${styles.text.primary}`}>
                        {windowStats.users.byTier.free.limit} calls
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Tier */}
              <Card className={styles.card}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${styles.text.primary}`}
                  >
                    <Users className="h-5 w-5 text-yellow-500" />
                    Pro Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                      >
                        <p className={`text-xs ${styles.text.muted} mb-1`}>
                          Users
                        </p>
                        <p
                          className={`text-2xl font-bold ${styles.text.primary}`}
                        >
                          {windowStats.users.byTier.pro.count}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                      >
                        <p className={`text-xs ${styles.text.muted} mb-1`}>
                          Total Calls
                        </p>
                        <p
                          className={`text-2xl font-bold ${styles.text.primary}`}
                        >
                          {windowStats.users.byTier.pro.totalCalls.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                    >
                      <p className={`text-xs ${styles.text.muted} mb-1`}>
                        Average Calls/User
                      </p>
                      <p
                        className={`text-2xl font-bold ${styles.text.primary}`}
                      >
                        {windowStats.users.byTier.pro.averageCallsPerUser.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={styles.text.secondary}>
                        Limit per user
                      </span>
                      <span className={`font-medium ${styles.text.primary}`}>
                        {windowStats.users.byTier.pro.limit} calls
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall User Statistics */}
            <Card className={styles.card}>
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${styles.text.primary}`}
                >
                  <BarChart className="h-5 w-5 text-blue-500" />
                  Overall User Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <p className={`text-xs ${styles.text.muted} mb-1`}>
                      Total Users
                    </p>
                    <p className={`text-2xl font-bold ${styles.text.primary}`}>
                      {windowStats.users.totalUsers}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <p className={`text-xs ${styles.text.muted} mb-1`}>
                      Total Calls
                    </p>
                    <p className={`text-2xl font-bold ${styles.text.primary}`}>
                      {windowStats.users.totalCalls.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
                  >
                    <p className={`text-xs ${styles.text.muted} mb-1`}>
                      Avg Calls/User
                    </p>
                    <p className={`text-2xl font-bold ${styles.text.primary}`}>
                      {windowStats.users.averageCallsPerUser.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div
          className={`p-4 rounded-2xl ${isDark ? "glass-card" : "bg-white border border-gray-100"}`}
        >
          <h4 className={`text-sm font-semibold ${styles.text.primary} mb-3`}>
            Status Legend
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className={`text-sm ${styles.text.secondary}`}>
                Normal (&lt;70%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className={`text-sm ${styles.text.secondary}`}>
                Warning (70-89%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className={`text-sm ${styles.text.secondary}`}>
                Critical (≥90%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${styles.text.muted}`} />
              <span className={`text-sm ${styles.text.secondary}`}>
                Auto-refresh every 30s
              </span>
            </div>
          </div>
          <p className={`text-xs ${styles.text.muted} mt-4`}>
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
