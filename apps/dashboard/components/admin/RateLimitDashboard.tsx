"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Instagram,
  Globe,
  Server,
  Cpu,
  Database,
  Layers,
} from "lucide-react";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  TIER_INFO,
  TIER_LIMITS,
  TierType,
  META_API_LIMIT_PER_ACCOUNT,
} from "@rocketreplai/shared";

import { useApi } from "@/lib/useApi";
import {
  getUserRateLimitStats,
  getWindowStats,
  getAppRateLimitStats,
} from "@/lib/services/admin-actions.api";

interface ThemeStyles {
  containerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}

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

export default function RateLimitDashboard({ clerkId }: { clerkId?: string }) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const [userStats, setUserStats] = useState<UserRateLimitStats | null>(null);
  const [appLimit, setAppLimit] = useState<AppRateLimitStats | null>(null);
  const [windowStats, setWindowStats] = useState<WindowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"global" | "user">("global");
  const { apiRequest } = useApi();

  // Theme-based styles
  const themeStyles = useMemo((): ThemeStyles => {
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
    };
  }, [currentTheme]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [windowData, appLimitData] = await Promise.all([
        getWindowStats(apiRequest),
        getAppRateLimitStats(apiRequest),
      ]);

      setWindowStats(windowData);
      setAppLimit(appLimitData);

      if (clerkId) {
        const userData = await getUserRateLimitStats(apiRequest);
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
    const interval = setInterval(loadStats, 300000);
    return () => clearInterval(interval);
  }, [clerkId, loadStats]);

  // Calculate percentage used
  const globalUsagePercentage = windowStats?.global?.usagePercentage || 0;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading rate limit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-3">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  if (!windowStats || !appLimit) {
    return (
      <div className="text-center py-12">
        <Activity className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Instagram API Rate Limits
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Current window: {windowStats.window} •{" "}
            {windowStats.isCurrentWindow ? "Active" : "Previous"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(globalUsagePercentage)}
            <span className="text-sm font-medium text-gray-700">
              Status: {getStatusText(globalUsagePercentage)}
            </span>
          </div>
          <button
            onClick={loadStats}
            className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      {clerkId && (
        <div className="flex gap-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab("global")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "global"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Globe className="h-4 w-4 inline mr-2" />
            Global Stats
          </button>
          <button
            onClick={() => setActiveTab("user")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "user"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            My Usage
          </button>
        </div>
      )}

      {/* Global Stats */}
      {activeTab === "global" && (
        <>
          {/* Global Usage Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">
                Global API Calls Usage
              </span>
              <span className="text-sm font-medium text-gray-700">
                {windowStats.global.totalCalls.toLocaleString()} /{" "}
                {appLimit.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor(globalUsagePercentage)} transition-all duration-500`}
                style={{ width: `${globalUsagePercentage}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-orange-600">Total Calls</p>
                  <p className="text-xl font-bold text-orange-800">
                    {windowStats.global.totalCalls.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600">Accounts Processed</p>
                  <p className="text-xl font-bold text-green-800">
                    {windowStats.global.accountsProcessed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-purple-600">Queued Items</p>
                  <p className="text-xl font-bold text-purple-800">
                    {windowStats.queue.queuedItems.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                Queue by Action Type
              </h4>
              <div className="space-y-2">
                {windowStats.queue.byType?.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600 capitalize">
                      {item._id.replace(/_/g, " ")}
                    </span>
                    <Badge className="bg-gray-200 text-gray-700">
                      {item.count} items
                    </Badge>
                  </div>
                ))}
                {(!windowStats.queue.byType ||
                  windowStats.queue.byType.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No queued items
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                Queue Statistics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Processing</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {windowStats.queue.processing}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {windowStats.queue.pending}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Completed</p>
                  <p className="text-lg font-semibold text-green-600">
                    {windowStats.queue.completed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Failed</p>
                  <p className="text-lg font-semibold text-red-600">
                    {windowStats.queue.failed}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Note:</span>{" "}
              {windowStats.queue.note}
            </p>
          </div>

          {/* User Statistics */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              User Statistics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Total Users</p>
                <p className="text-xl font-bold text-gray-800">
                  {windowStats.users.totalUsers.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Calls</p>
                <p className="text-xl font-bold text-gray-800">
                  {windowStats.users.totalCalls.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg Calls/User</p>
                <p className="text-xl font-bold text-gray-800">
                  {windowStats.users.averageCallsPerUser.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* Tier Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Tier */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Free Tier
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Users</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.free.count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Total Calls</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.free.totalCalls.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Avg Calls/User</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.free.averageCallsPerUser.toFixed(
                      1,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Limit/User</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.free.limit}
                  </span>
                </div>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Pro Tier
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Users</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.pro.count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Total Calls</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.pro.totalCalls.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Avg Calls/User</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.pro.averageCallsPerUser.toFixed(
                      1,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Limit/User</span>
                  <span className="text-sm font-medium text-gray-800">
                    {windowStats.users.byTier.pro.limit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Stats */}
      {activeTab === "user" && userStats && (
        <div className="space-y-4">
          {/* User Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Your API Calls</span>
              <span className="text-sm font-medium text-gray-700">
                {userStats.callsMade.toLocaleString()} /{" "}
                {userStats.tierLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor(userStats.usagePercentage)} transition-all`}
                style={{
                  width: `${Math.min(userStats.usagePercentage, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* User Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-600 mb-1">Calls Made</p>
              <p className="text-lg font-bold text-orange-800">
                {userStats.callsMade.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600 mb-1">Remaining</p>
              <p className="text-lg font-bold text-green-800">
                {userStats.remainingCalls.toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-600 mb-1">Queued</p>
              <p className="text-lg font-bold text-yellow-800">
                {userStats.queuedItems.toLocaleString()}
              </p>
            </div>
            <div
              className={`${
                windowStats.global.isAutomationPaused
                  ? "bg-red-50 border-red-200"
                  : "bg-green-50 border-green-200"
              } rounded-lg p-3`}
            >
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <div className="flex items-center gap-1">
                {windowStats.global.isAutomationPaused ? (
                  <>
                    <PauseCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">
                      Paused
                    </span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      Active
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tier Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">
                Your Tier: {getTierName(userStats.tier)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Next reset: {new Date(userStats.nextReset).toLocaleString()}
            </p>
          </div>

          {/* Automation Paused Message */}
          {windowStats.global.isAutomationPaused && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Automation Paused
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Your automation has been paused because you reached your
                    hourly limit. It will automatically resume at the start of
                    the next hour window.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Last updated: {new Date().toLocaleTimeString()} • Auto-refresh every
          30 seconds
        </p>
      </div>
    </div>
  );
}
