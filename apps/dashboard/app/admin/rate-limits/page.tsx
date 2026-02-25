"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();
  const [userStats, setUserStats] = useState<UserRateLimitStats | null>(null);
  const [appLimit, setAppLimit] = useState<AppRateLimitStats | null>(null);
  const [windowStats, setWindowStats] = useState<WindowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Theme styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FC]",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-500",
      textMuted: isDark ? "text-gray-500" : "text-gray-400",
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      cardBorder: isDark ? "border-gray-800" : "border-gray-100",
      hoverBorder: isDark
        ? "hover:border-orange-500/50"
        : "hover:border-orange-300",
      badgeBg: isDark ? "bg-gray-800" : "bg-gray-100",
      inputBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
      tableBg: isDark ? "bg-[#1A1A1E]" : "bg-white",
      tableBorder: isDark ? "border-gray-800" : "border-gray-100",
      tableRowHover: isDark ? "hover:bg-[#252529]" : "hover:bg-gray-50",
    };
  }, [currentTheme]);

  // Fetch all rate limit data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Verify owner
      const ownerVerification = await verifyOwner(apiRequest);

      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      // Fetch all rate limit data
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

  // Calculate status color based on usage
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600 bg-red-100 border-red-200";
    if (percentage >= 70)
      return "text-yellow-600 bg-yellow-100 border-yellow-200";
    return "text-green-600 bg-green-100 border-green-200";
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

  // Check access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access the admin dashboard.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-500 mb-2">
            You are not authorized to view this page.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Logged in as:{" "}
            <span className="text-orange-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-orange-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading rate limit data...</p>
        </div>
      </div>
    );
  }

  if (error && error !== "ACCESS_DENIED") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-2xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">Error loading data</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userStats || !appLimit || !windowStats) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No rate limit data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Rate Limits</h1>
              <p className="text-sm text-gray-500">
                Monitor Instagram API rate limits and usage across all users
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Current Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* User Rate Limit Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Server className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">
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
            <p className="text-3xl font-bold text-gray-800">
              {userStats.callsMade.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              of {userStats.tierLimit.toLocaleString()} calls
            </p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(userStats.usagePercentage)} transition-all`}
                style={{
                  width: `${Math.min(userStats.usagePercentage, 100)}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500">Tier: {userStats.tier}</span>
              <span className="text-gray-500">
                Remaining: {userStats.remainingCalls}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Next reset: {formatDateTime(userStats.nextReset)}
            </p>
          </div>

          {/* App Limit Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">App Limit</p>
              </div>
              <Badge className={getStatusColor(appLimit.percentage)}>
                {getStatusIcon(appLimit.percentage)}
                <span className="ml-1">{appLimit.percentage.toFixed(1)}%</span>
              </Badge>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {appLimit.current.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              of {appLimit.limit.toLocaleString()} limit
            </p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(appLimit.percentage)} transition-all`}
                style={{ width: `${Math.min(appLimit.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Reached: {appLimit.reached ? "Yes" : "No"}
            </p>
          </div>

          {/* Queue Status Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">
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
            <p className="text-3xl font-bold text-gray-800">
              {windowStats.queue.queuedItems.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">items waiting</p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center">
                <p className="text-xs text-gray-400">Processing</p>
                <p className="text-sm font-semibold text-blue-600">
                  {windowStats.queue.processing}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Pending</p>
                <p className="text-sm font-semibold text-yellow-600">
                  {windowStats.queue.pending}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Failed</p>
                <p className="text-sm font-semibold text-red-600">
                  {windowStats.queue.failed}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 w-full"
        >
          <div className="w-full overflow-x-auto">
            <TabsList className="bg-gray-100 p-1 rounded-xl w-max flex-nowrap">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-2 shrink-0"
              >
                <PieChart className="h-4 w-4" />
                Overview
              </TabsTrigger>

              <TabsTrigger
                value="windows"
                className="flex items-center gap-2 shrink-0"
              >
                <Calendar className="h-4 w-4" />
                Time Windows
              </TabsTrigger>

              <TabsTrigger
                value="queue"
                className="flex items-center gap-2 shrink-0"
              >
                <Layers className="h-4 w-4" />
                Queue Details
              </TabsTrigger>

              <TabsTrigger
                value="tiers"
                className="flex items-center gap-2 shrink-0"
              >
                <BarChart className="h-4 w-4" />
                Tier Breakdown
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Window */}
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Current Window
                  </CardTitle>
                  <CardDescription>
                    {windowStats.isCurrentWindow
                      ? "Active window"
                      : "Previous window"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Window Time</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {windowStats.window}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">
                          Total Calls
                        </p>
                        <p className="text-xl font-bold text-gray-800">
                          {windowStats.global.totalCalls.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Accounts</p>
                        <p className="text-xl font-bold text-gray-800">
                          {windowStats.global.accountsProcessed.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Window Usage</p>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressBarColor(windowStats.global.usagePercentage)}`}
                          style={{
                            width: `${Math.min(windowStats.global.usagePercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Automation Paused:{" "}
                      {windowStats.global.isAutomationPaused ? "Yes" : "No"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Queue Note */}
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-500" />
                    Queue Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-sm text-purple-700">
                      {windowStats.queue.note}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Completed</p>
                      <p className="text-lg font-semibold text-green-600">
                        {windowStats.queue.completed}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Failed</p>
                      <p className="text-lg font-semibold text-red-600">
                        {windowStats.queue.failed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <Card
              className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  Account Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">
                      Active Accounts
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {windowStats.accounts.totalActive}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">
                      App Limit/Account
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {windowStats.accounts.appLimitPerAccount}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">
                      Total App Limit
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {windowStats.accounts.totalAppLimit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Windows Tab */}
          <TabsContent value="windows" className="space-y-6">
            <Card
              className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Current Window Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Window Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Window Time
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {windowStats.window}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Status</span>
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
                        <span className="text-sm text-gray-500">
                          Total Calls
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {windowStats.global.totalCalls.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Accounts Processed
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {windowStats.global.accountsProcessed.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Usage
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-500">
                            Usage Percentage
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {windowStats.global.usagePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor(windowStats.global.usagePercentage)}`}
                            style={{
                              width: `${Math.min(windowStats.global.usagePercentage, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
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
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-500" />
                    Queue Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-xs text-purple-600 mb-1">
                          Total Queued
                        </p>
                        <p className="text-2xl font-bold text-purple-800">
                          {windowStats.queue.queuedItems}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-xs text-blue-600 mb-1">Processing</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {windowStats.queue.processing}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 rounded-xl p-4">
                        <p className="text-xs text-yellow-600 mb-1">Pending</p>
                        <p className="text-2xl font-bold text-yellow-800">
                          {windowStats.queue.pending}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4">
                        <p className="text-xs text-red-600 mb-1">Failed</p>
                        <p className="text-2xl font-bold text-red-800">
                          {windowStats.queue.failed}
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-green-600 mb-1">Completed</p>
                      <p className="text-2xl font-bold text-green-800">
                        {windowStats.queue.completed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Queue by Type */}
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                            <span className="text-sm capitalize text-gray-700">
                              {item._id.replace(/_/g, " ")}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {item.count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
                      <p className="text-sm text-gray-400 text-center py-4">
                        No items in queue
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Note */}
            <Card
              className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
            >
              <CardContent className="pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
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
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    Free Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Users</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {windowStats.users.byTier.free.count}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">
                          Total Calls
                        </p>
                        <p className="text-2xl font-bold text-gray-800">
                          {windowStats.users.byTier.free.totalCalls.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        Average Calls/User
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {windowStats.users.byTier.free.averageCallsPerUser.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Limit per user</span>
                      <span className="font-medium text-gray-800">
                        {windowStats.users.byTier.free.limit} calls
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Tier */}
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-500" />
                    Pro Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Users</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {windowStats.users.byTier.pro.count}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">
                          Total Calls
                        </p>
                        <p className="text-2xl font-bold text-gray-800">
                          {windowStats.users.byTier.pro.totalCalls.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        Average Calls/User
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {windowStats.users.byTier.pro.averageCallsPerUser.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Limit per user</span>
                      <span className="font-medium text-gray-800">
                        {windowStats.users.byTier.pro.limit} calls
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall User Statistics */}
            <Card
              className={`${themeStyles.cardBg} border ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-blue-500" />
                  Overall User Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {windowStats.users.totalUsers}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {windowStats.users.totalCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Avg Calls/User</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {windowStats.users.averageCallsPerUser.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            Status Legend
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Normal (&lt;70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Warning (70-89%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Critical (≥90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Auto-refresh every 30s
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
