"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";

import {
  AlertTriangle,
  Activity,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  BarChart,
  Users,
  Zap,
  User,
  Shield,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { TIER_INFO, TIER_LIMITS, TierType } from "@rocketreplai/shared";
import {
  getWindowStats,
  getUserRateLimitStats,
} from "@/lib/services/hourlyRateLimiter.api";
import { useApi } from "@/lib/useApi";

interface ThemeStyles {
  containerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  alertBg: string;
}

interface RateLimitStats {
  window: string;
  isCurrentWindow: boolean;
  global: {
    totalCalls: number;
    appLimit: number;
    accountsProcessed: number;
  };
  queue: {
    queuedItems: number;
    byType: Array<{ _id: string; count: number }>;
    processing?: number;
    pending?: number;
    failed?: number;
    avgProcessingTime?: number;
  };
  users: {
    totalUsers: number;
    totalCalls: number;
    averageCallsPerUser: number;
  };
}

interface UserStats {
  tier: string;
  tierLimit: number;
  callsMade: number;
  remainingCalls: number;
  usagePercentage: number;
  isAutomationPaused: boolean;
  queuedItems: number;
}

export default function RateLimitDashboard({ clerkId }: { clerkId?: string }) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"global" | "user">("global");
  const { apiRequest } = useApi();

  // Theme-based styles
  const themeStyles = useMemo((): ThemeStyles => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]" : "bg-gray-50",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      cardBg: isDark
        ? "bg-[#0a0a0a]/60 border-white/10"
        : "bg-white/80 border-gray-200",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      badgeBg: isDark ? "bg-[#0a0a0a]" : "bg-white",
      alertBg: isDark ? "bg-[#0a0a0a]/80" : "bg-white/80",
    };
  }, [currentTheme]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWindowStats(apiRequest);
      setStats(data);

      if (clerkId) {
        const userData = await getUserRateLimitStats(apiRequest, clerkId);
        setUserStats(userData);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      setError("Failed to load rate limit statistics");
    } finally {
      setLoading(false);
    }
  }, [clerkId, apiRequest]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [clerkId, loadStats]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center py-12 ${themeStyles.containerBg}`}
      >
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className={`${themeStyles.textPrimary} text-lg`}>
            Loading dashboard...
          </p>
          <p className={`${themeStyles.textMuted} text-sm mt-2`}>
            Fetching rate limit data
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${themeStyles.containerBg}`}>
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className={`${themeStyles.textPrimary} text-lg mb-2`}>
          Error Loading Data
        </p>
        <p className={`${themeStyles.textSecondary} mb-4`}>{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`text-center py-12 ${themeStyles.containerBg}`}>
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className={`${themeStyles.textPrimary} text-lg`}>
          No Data Available
        </p>
        <p className={`${themeStyles.textMuted}`}>
          Rate limit statistics are not available
        </p>
      </div>
    );
  }

  // Calculate percentage used
  const usagePercentage = stats.global?.appLimit
    ? Math.min((stats.global.totalCalls / stats.global.appLimit) * 100, 100)
    : 0;

  // Determine status color based on usage
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 90) return "Critical";
    if (percentage >= 70) return "Warning";
    return "Normal";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <XCircle className="h-5 w-5 text-red-500" />;
    if (percentage >= 70) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getTierColor = (tier: string) => {
    const tierKey = tier as TierType;
    return TIER_INFO[tierKey]?.color || "bg-gray-500";
  };

  const getTierName = (tier: string) => {
    const tierKey = tier as TierType;
    return TIER_INFO[tierKey]?.name || tier;
  };

  return (
    <div className={`bg-transparent space-y-6 ${themeStyles.containerBg}`}>
      {/* Header with Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
            Rate Limit Dashboard
          </h2>
          <p className={`${themeStyles.textSecondary} mt-1`}>
            Real-time monitoring of Instagram API rate limits
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(usagePercentage)}
            <span className={`${themeStyles.textPrimary} font-medium`}>
              Status: {getStatusText(usagePercentage)}
            </span>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      {clerkId && (
        <div className="flex border-b border-gray-700">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "global"
                ? "border-b-2 border-cyan-500 text-cyan-400"
                : `${themeStyles.textSecondary} hover:text-white`
            }`}
            onClick={() => setActiveTab("global")}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Global Stats
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "user"
                ? "border-b-2 border-cyan-500 text-cyan-400"
                : `${themeStyles.textSecondary} hover:text-white`
            }`}
            onClick={() => setActiveTab("user")}
          >
            <User className="h-4 w-4 inline mr-2" />
            My Usage
          </button>
        </div>
      )}

      {/* Global Stats */}
      {activeTab === "global" && (
        <>
          {/* Current Window Status */}
          <div
            className={`bg-transparent ${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-2 md:p-6`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className={`text-lg font-semibold ${themeStyles.textPrimary} flex items-center`}
                >
                  <Activity className="h-5 w-5 text-cyan-400 mr-2" />
                  Current Window
                </h3>
                <p className={`${themeStyles.textSecondary} text-sm mt-1`}>
                  {stats.isCurrentWindow ? "Active window" : "Previous window"}{" "}
                  • {stats.window}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full ${
                  currentTheme === "dark" ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    stats.isCurrentWindow ? "text-green-400" : "text-gray-400"
                  }`}
                >
                  {stats.isCurrentWindow ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className={`${themeStyles.textSecondary} text-sm`}>
                  API Calls Usage
                </span>
                <span className={`${themeStyles.textPrimary} font-medium`}>
                  {stats.global.totalCalls.toLocaleString()} /{" "}
                  {stats.global.appLimit.toLocaleString()} calls
                </span>
              </div>
              <div
                className={`h-3 ${
                  currentTheme === "dark" ? "bg-gray-800" : "bg-gray-200"
                } rounded-full overflow-hidden`}
              >
                <div
                  className={`h-full ${getStatusColor(
                    usagePercentage,
                  )} transition-all duration-500`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className={`${themeStyles.textMuted} text-xs`}>0%</span>
                <span className={`${themeStyles.textMuted} text-xs`}>50%</span>
                <span className={`${themeStyles.textMuted} text-xs`}>100%</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`${
                  currentTheme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
                } rounded-lg p-4`}
              >
                <div className="flex items-center mb-2">
                  <div
                    className={`w-10 h-10 ${
                      currentTheme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
                    } rounded-lg flex items-center justify-center mr-3`}
                  >
                    <Zap className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`${themeStyles.textSecondary} text-sm`}>
                      Global Calls
                    </p>
                    <p
                      className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                    >
                      {stats.global.totalCalls.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  of {stats.global.appLimit.toLocaleString()} limit
                </span>
              </div>

              <div
                className={`${
                  currentTheme === "dark" ? "bg-green-500/10" : "bg-green-50"
                } rounded-lg p-4`}
              >
                <div className="flex items-center mb-2">
                  <div
                    className={`w-10 h-10 ${
                      currentTheme === "dark"
                        ? "bg-green-500/20"
                        : "bg-green-100"
                    } rounded-lg flex items-center justify-center mr-3`}
                  >
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className={`${themeStyles.textSecondary} text-sm`}>
                      Accounts Processed
                    </p>
                    <p
                      className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                    >
                      {stats.global.accountsProcessed.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  Instagram accounts
                </span>
              </div>

              <div
                className={`${
                  currentTheme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50"
                } rounded-lg p-4`}
              >
                <div className="flex items-center mb-2">
                  <div
                    className={`w-10 h-10 ${
                      currentTheme === "dark"
                        ? "bg-yellow-500/20"
                        : "bg-yellow-100"
                    } rounded-lg flex items-center justify-center mr-3`}
                  >
                    <BarChart className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className={`${themeStyles.textSecondary} text-sm`}>
                      Queued Items
                    </p>
                    <p
                      className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                    >
                      {stats.queue.queuedItems.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-xs ${themeStyles.textMuted}`}>
                  Waiting for next window
                </span>
              </div>
            </div>
          </div>

          {/* Queue Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue by Action Type */}
            <div
              className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-2 md:p-6 bg-transparent`}
            >
              <h3
                className={`text-lg font-semibold ${themeStyles.textPrimary} mb-4`}
              >
                Queue by Action Type
              </h3>
              <div className="space-y-3">
                {stats.queue.byType?.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-3 ${
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
                      />
                      <span className={`${themeStyles.textPrimary} capitalize`}>
                        {item._id.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          currentTheme === "dark"
                            ? "bg-gray-800 text-gray-300"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.count} items
                      </span>
                    </div>
                  </div>
                ))}
                {(!stats.queue.byType || stats.queue.byType.length === 0) && (
                  <div className="text-center py-4">
                    <span className={`${themeStyles.textMuted}`}>
                      No queued items
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* User Statistics */}
            <div
              className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-2 md:p-6 bg-transparent`}
            >
              <h3
                className={`text-lg font-semibold ${themeStyles.textPrimary} mb-4 flex items-center`}
              >
                <Users className="h-5 w-5 text-cyan-400 mr-2" />
                User Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`${
                    currentTheme === "dark"
                      ? "bg-gray-900/50"
                      : "bg-gray-100/50"
                  } rounded-lg p-4`}
                >
                  <p className={`${themeStyles.textSecondary} text-sm`}>
                    Active Users
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {stats.users.totalUsers.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`${
                    currentTheme === "dark"
                      ? "bg-gray-900/50"
                      : "bg-gray-100/50"
                  } rounded-lg p-4`}
                >
                  <p className={`${themeStyles.textSecondary} text-sm`}>
                    Total Calls
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {stats.users.totalCalls.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`${
                    currentTheme === "dark"
                      ? "bg-gray-900/50"
                      : "bg-gray-100/50"
                  } rounded-lg p-4`}
                >
                  <p className={`${themeStyles.textSecondary} text-sm`}>
                    Avg Calls/User
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {stats.users.averageCallsPerUser.toFixed(1)}
                  </p>
                </div>
                <div
                  className={`${
                    currentTheme === "dark"
                      ? "bg-gray-900/50"
                      : "bg-gray-100/50"
                  } rounded-lg p-4`}
                >
                  <p className={`${themeStyles.textSecondary} text-sm`}>
                    Success Rate
                  </p>
                  <p className={`text-2xl font-bold text-green-500`}>
                    {stats.global.totalCalls > 0
                      ? Math.round(
                          ((stats.global.totalCalls -
                            (stats.queue.failed || 0)) /
                            stats.global.totalCalls) *
                            100,
                        )
                      : 100}
                    %
                  </p>
                </div>
              </div>

              {/* Additional Queue Stats if Available */}
              {stats.queue.processing !== undefined && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4
                    className={`text-sm font-medium ${themeStyles.textSecondary} mb-3`}
                  >
                    Queue Status Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-cyan-400">
                        {stats.queue.processing || 0}
                      </div>
                      <div className={`text-xs ${themeStyles.textMuted}`}>
                        Processing
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-400">
                        {stats.queue.pending || 0}
                      </div>
                      <div className={`text-xs ${themeStyles.textMuted}`}>
                        Pending
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-400">
                        {stats.queue.failed || 0}
                      </div>
                      <div className={`text-xs ${themeStyles.textMuted}`}>
                        Failed
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* User Stats */}
      {activeTab === "user" && userStats && (
        <div className="space-y-6">
          <div
            className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-2 md:p-6`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className={`text-lg font-semibold ${themeStyles.textPrimary} flex items-center`}
                >
                  <User className="h-5 w-5 text-cyan-400 mr-2" />
                  My Rate Limit Usage
                </h3>
                <p className={`${themeStyles.textSecondary} text-sm mt-1`}>
                  Current window: {stats.window}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full ${getTierColor(
                  userStats.tier,
                )}`}
              >
                <span className="text-sm font-medium text-white">
                  {getTierName(userStats.tier)} Tier
                </span>
              </div>
            </div>

            {/* User Usage Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className={`${themeStyles.textSecondary} text-sm`}>
                  Your API Calls
                </span>
                <span className={`${themeStyles.textPrimary} font-medium`}>
                  {userStats.callsMade.toLocaleString()} /{" "}
                  {userStats.tierLimit.toLocaleString()} calls
                </span>
              </div>
              <div
                className={`h-3 ${
                  currentTheme === "dark" ? "bg-gray-800" : "bg-gray-200"
                } rounded-full overflow-hidden`}
              >
                <div
                  className={`h-full ${getStatusColor(
                    userStats.usagePercentage,
                  )} transition-all duration-500`}
                  style={{
                    width: `${Math.min(userStats.usagePercentage, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className={`${themeStyles.textMuted} text-xs`}>0%</span>
                <span className={`${themeStyles.textMuted} text-xs`}>50%</span>
                <span className={`${themeStyles.textMuted} text-xs`}>100%</span>
              </div>
            </div>

            {/* User Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 rounded-lg p-4">
                <p className={`${themeStyles.textSecondary} text-sm`}>
                  Calls Made
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {userStats.callsMade.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4">
                <p className={`${themeStyles.textSecondary} text-sm`}>
                  Remaining
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {userStats.remainingCalls.toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4">
                <p className={`${themeStyles.textSecondary} text-sm`}>Queued</p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {userStats.queuedItems.toLocaleString()}
                </p>
              </div>
              <div
                className={`${
                  userStats.isAutomationPaused
                    ? "bg-red-500/10"
                    : "bg-green-500/10"
                } rounded-lg p-4`}
              >
                <p className={`${themeStyles.textSecondary} text-sm`}>Status</p>
                <div className="flex items-center">
                  {userStats.isAutomationPaused ? (
                    <>
                      <PauseCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-lg font-bold text-red-500">
                        Paused
                      </span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-lg font-bold text-green-500">
                        Active
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Automation Status Message */}
            {userStats.isAutomationPaused && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className={`${themeStyles.textPrimary} font-medium`}>
                    Automation Paused
                  </p>
                </div>
                <p className={`${themeStyles.textSecondary} text-sm mt-1`}>
                  Your automation has been paused because you reached your
                  hourly limit. It will automatically resume at the start of the
                  next hour window.
                </p>
              </div>
            )}
          </div>

          {/* Tier Information */}
          <div
            className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-2 md:p-6`}
          >
            <h3
              className={`text-lg font-semibold ${themeStyles.textPrimary} mb-4`}
            >
              Tier Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(TIER_LIMITS).map(([tier, limit]) => (
                <div
                  key={tier}
                  className={`p-4 rounded-lg border ${
                    userStats.tier === tier
                      ? "border-cyan-500 bg-cyan-500/5"
                      : "border-gray-700 bg-gray-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${themeStyles.textPrimary}`}>
                      {getTierName(tier)}
                    </span>
                    <div
                      className={`w-3 h-3 rounded-full ${getTierColor(tier)}`}
                    />
                  </div>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {limit.toLocaleString()}
                  </p>
                  <span className={`text-xs ${themeStyles.textMuted}`}>
                    calls per hour
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-2 md:p-6 bg-transparent`}
      >
        <h4 className={`text-sm font-medium ${themeStyles.textSecondary} mb-3`}>
          Status Legend
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className={`text-sm ${themeStyles.textPrimary}`}>
              Normal (&lt;70%)
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className={`text-sm ${themeStyles.textPrimary}`}>
              Warning (70-89%)
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className={`text-sm ${themeStyles.textPrimary}`}>
              Critical (≥90%)
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className={`text-sm ${themeStyles.textMuted}`}>
            Last updated: {new Date().toLocaleTimeString()} • Auto-refresh every
            30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
