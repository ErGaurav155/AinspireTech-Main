"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  Zap,
  User,
  Shield,
  PlayCircle,
  PauseCircle,
  Instagram,
  Globe,
  Server,
  Database,
  Layers,
} from "lucide-react";
import { TIER_INFO, TierType } from "@rocketreplai/shared";
import { useApi } from "@/lib/useApi";
import {
  getUserRateLimitStats,
  getWindowStats,
  getAppRateLimitStats,
} from "@/lib/services/admin-actions.api";
import { useThemeStyles } from "@rocketreplai/ui";
// ─── Types ────────────────────────────────────────────────────────────────────

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
type TabId = "global" | "user";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function barColor(pct: number, isDark: boolean) {
  if (pct >= 90) return isDark ? "#f87171" : "#ef4444";
  if (pct >= 70) return isDark ? "#fbbf24" : "#f59e0b";
  return isDark ? "#34d399" : "#22c55e";
}

function statusText(pct: number) {
  return pct >= 90 ? "Critical" : pct >= 70 ? "Warning" : "Normal";
}

function StatusIcon({ pct, isDark }: { pct: number; isDark: boolean }) {
  const colorClass =
    pct >= 90
      ? isDark
        ? "text-red-400"
        : "text-red-500"
      : pct >= 70
        ? isDark
          ? "text-yellow-400"
          : "text-yellow-500"
        : isDark
          ? "text-green-400"
          : "text-green-500";

  if (pct >= 90) return <XCircle className={`h-5 w-5 ${colorClass}`} />;
  if (pct >= 70) return <Clock className={`h-5 w-5 ${colorClass}`} />;
  return <CheckCircle className={`h-5 w-5 ${colorClass}`} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct, isDark }: { pct: number; isDark: boolean }) {
  return (
    <div
      className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(pct, 100)}%`,
          backgroundColor: barColor(pct, isDark),
        }}
      />
    </div>
  );
}

function ProgressRow({
  label,
  current,
  limit,
  pct,
  isDark,
}: {
  label: string;
  current: number;
  limit: number;
  pct: number;
  isDark: boolean;
}) {
  const { styles } = useThemeStyles();
  return (
    <div className={`rounded-2xl p-5 ${styles.card}`}>
      <div className="flex justify-between items-center mb-3 relative z-10">
        <span className={`text-sm font-medium ${styles.text.primary}`}>
          {label}
        </span>
        <span className={`text-sm font-medium ${styles.text.primary}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="relative z-10">
        <ProgressBar pct={pct} isDark={isDark} />
        <div className="flex justify-between mt-2">
          <span className={`text-xs ${styles.text.muted}`}>0%</span>
          <span
            className={`text-xs font-medium`}
            style={{ color: barColor(pct, isDark) }}
          >
            {pct.toFixed(1)}%
          </span>
          <span className={`text-xs ${styles.text.muted}`}>100%</span>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "orange" | "green" | "purple" | "yellow" | "blue";
}) {
  const { styles, isDark } = useThemeStyles();

  const getColorClasses = (color: string) => {
    switch (color) {
      case "orange":
        return {
          block: isDark
            ? "bg-orange-500/10 border border-orange-500/20"
            : "bg-orange-50 border border-orange-200",
          icon: isDark
            ? "bg-orange-500/20 border border-orange-500/30"
            : "bg-orange-100",
          text: isDark ? "text-orange-400" : "text-orange-600",
        };
      case "green":
        return {
          block: isDark
            ? "bg-green-500/10 border border-green-500/20"
            : "bg-green-50 border border-green-200",
          icon: isDark
            ? "bg-green-500/20 border border-green-500/30"
            : "bg-green-100",
          text: isDark ? "text-green-400" : "text-green-600",
        };
      case "purple":
        return {
          block: isDark
            ? "bg-purple-500/10 border border-purple-500/20"
            : "bg-purple-50 border border-purple-200",
          icon: isDark
            ? "bg-purple-500/20 border border-purple-500/30"
            : "bg-purple-100",
          text: isDark ? "text-purple-400" : "text-purple-600",
        };
      case "yellow":
        return {
          block: isDark
            ? "bg-yellow-500/10 border border-yellow-500/20"
            : "bg-yellow-50 border border-yellow-200",
          icon: isDark
            ? "bg-yellow-500/20 border border-yellow-500/30"
            : "bg-yellow-100",
          text: isDark ? "text-yellow-400" : "text-yellow-600",
        };
      case "blue":
        return {
          block: isDark
            ? "bg-blue-500/10 border border-blue-500/20"
            : "bg-blue-50 border border-blue-200",
          icon: isDark
            ? "bg-blue-500/20 border border-blue-500/30"
            : "bg-blue-100",
          text: isDark ? "text-blue-400" : "text-blue-600",
        };
      default:
        return {
          block: "",
          icon: "",
          text: "",
        };
    }
  };

  const classes = getColorClasses(color);

  return (
    <div className={`rounded-xl p-4 ${classes.block}`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes.icon}`}
        >
          <span className={classes.text}>{icon}</span>
        </div>
        <div>
          <p className={`text-xs mb-1 ${classes.text}`}>{label}</p>
          <p className={`text-xl font-bold ${styles.text.primary}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function InnerCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { styles } = useThemeStyles();
  return (
    <div className={`rounded-xl p-4 ${styles.innerCard}`}>
      <h4
        className={`text-sm font-medium mb-3 flex items-center gap-2 ${styles.text.primary}`}
      >
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string | number }) {
  const { styles } = useThemeStyles();
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${styles.text.muted}`}>{label}</span>
      <span className={`text-sm font-medium ${styles.text.primary}`}>
        {value}
      </span>
    </div>
  );
}

function TierBlock({
  title,
  data,
}: {
  title: string;
  data: {
    count: number;
    totalCalls: number;
    averageCallsPerUser: number;
    limit: number;
  };
}) {
  const { styles } = useThemeStyles();
  return (
    <div className={`rounded-xl p-4 ${styles.innerCard}`}>
      <h4 className={`text-sm font-medium mb-3 ${styles.text.primary}`}>
        {title}
      </h4>
      <div className="space-y-2">
        <KVRow label="Users" value={data.count} />
        <KVRow label="Total Calls" value={data.totalCalls.toLocaleString()} />
        <KVRow
          label="Avg Calls/User"
          value={data.averageCallsPerUser.toFixed(1)}
        />
        <KVRow label="Limit/User" value={data.limit} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RateLimitDashboard({ clerkId }: { clerkId?: string }) {
  const { styles, isDark } = useThemeStyles();
  const { resolvedTheme } = useTheme(); // still needed for initial load? but we have isDark

  const [userStats, setUserStats] = useState<UserRateLimitStats | null>(null);
  const [appLimit, setAppLimit] = useState<AppRateLimitStats | null>(null);
  const [windowStats, setWindowStats] = useState<WindowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("global");
  const { apiRequest } = useApi();

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
      if (clerkId) setUserStats(await getUserRateLimitStats(apiRequest));
    } catch {
      setError("Failed to load rate limit statistics");
    } finally {
      setLoading(false);
    }
  }, [clerkId, apiRequest]);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 300_000);
    return () => clearInterval(id);
  }, [loadStats]);

  const globalPct = windowStats?.global?.usagePercentage ?? 0;

  // ─── States ───────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw
            className={`h-7 w-7 animate-spin ${isDark ? "text-blue-400" : "text-blue-500"}`}
          />
          <p className={`text-sm ${styles.text.secondary}`}>
            Loading rate limit data…
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-12">
        <AlertTriangle
          className={`h-8 w-8 mx-auto mb-3 ${isDark ? "text-red-400" : "text-red-500"}`}
        />
        <p className={`text-sm mb-3 ${styles.text.secondary}`}>{error}</p>
        <button
          onClick={loadStats}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );

  if (!windowStats || !appLimit)
    return (
      <div className="text-center py-12">
        <p className={`text-sm ${styles.text.muted}`}>No data available</p>
      </div>
    );

  // ─── Main render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className={`text-lg font-semibold ${styles.text.primary}`}>
            Instagram API Rate Limits
          </h3>
          <p className={`text-sm mt-1 ${styles.text.secondary}`}>
            Window: {windowStats.window} &nbsp;•&nbsp;
            <span
              className={
                windowStats.isCurrentWindow
                  ? isDark
                    ? "text-green-400"
                    : "text-green-600"
                  : styles.text.muted
              }
            >
              {windowStats.isCurrentWindow ? "Active" : "Previous"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <StatusIcon pct={globalPct} isDark={isDark} />
            <span className={`text-sm font-medium ${styles.text.primary}`}>
              Status: {statusText(globalPct)}
            </span>
          </div>
          <button
            onClick={loadStats}
            className={`p-2 transition-colors ${styles.pill}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs — only shown when clerkId provided */}
      {clerkId && (
        <div
          className={`border-b ${isDark ? "border-white/10" : "border-gray-100"}`}
        >
          <div className="flex gap-4">
            {(
              [
                ["global", "Global Stats"],
                ["user", "My Usage"],
              ] as [TabId, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === id
                    ? isDark
                      ? "border-blue-400 text-blue-400"
                      : "border-orange-500 text-orange-600"
                    : isDark
                      ? "border-transparent text-white/30 hover:text-white/60"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {id === "global" ? (
                  <Globe className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Global Stats ───────────────────────────────────────────── */}
      {activeTab === "global" && (
        <>
          {/* Global progress */}
          <ProgressRow
            label="Global API Calls Usage"
            current={windowStats.global.totalCalls}
            limit={appLimit.limit}
            pct={globalPct}
            isDark={isDark}
          />

          {/* Top 3 stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBlock
              label="Total Calls"
              value={windowStats.global.totalCalls.toLocaleString()}
              icon={<Zap className="h-5 w-5" />}
              color="orange"
            />
            <StatBlock
              label="Accounts Processed"
              value={windowStats.global.accountsProcessed.toLocaleString()}
              icon={<Instagram className="h-5 w-5" />}
              color="green"
            />
            <StatBlock
              label="Queued Items"
              value={windowStats.queue.queuedItems.toLocaleString()}
              icon={<Database className="h-5 w-5" />}
              color="purple"
            />
          </div>

          {/* Queue detail cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InnerCard
              title="Queue by Action Type"
              icon={
                <Layers
                  className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                />
              }
            >
              <div className="space-y-2">
                {windowStats.queue.byType?.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={`text-sm capitalize ${styles.text.secondary}`}
                    >
                      {item._id.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-lg ${styles.innerCard} ${styles.text.secondary}`}
                    >
                      {item.count} items
                    </span>
                  </div>
                ))}
                {(!windowStats.queue.byType ||
                  windowStats.queue.byType.length === 0) && (
                  <p
                    className={`text-sm text-center py-2 ${styles.text.muted}`}
                  >
                    No queued items
                  </p>
                )}
              </div>
            </InnerCard>

            <InnerCard
              title="Queue Statistics"
              icon={
                <Server
                  className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-600"}`}
                />
              }
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Processing",
                    val: windowStats.queue.processing,
                    cls: isDark ? "text-blue-400" : "text-blue-600",
                  },
                  {
                    label: "Pending",
                    val: windowStats.queue.pending,
                    cls: isDark ? "text-yellow-400" : "text-yellow-500",
                  },
                  {
                    label: "Completed",
                    val: windowStats.queue.completed,
                    cls: isDark ? "text-green-400" : "text-green-600",
                  },
                  {
                    label: "Failed",
                    val: windowStats.queue.failed,
                    cls: isDark ? "text-red-400" : "text-red-600",
                  },
                ].map(({ label, val, cls }) => (
                  <div key={label}>
                    <p className={`text-xs ${styles.text.muted}`}>{label}</p>
                    <p className={`text-lg font-semibold ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>
            </InnerCard>
          </div>

          {/* Note */}
          <div
            className={`rounded-xl p-4 ${isDark ? "bg-blue-500/10 border border-blue-500/20 text-blue-300/80" : "bg-blue-50 border border-blue-200 text-blue-700"}`}
          >
            <p className="text-sm">
              <span className="font-semibold">Note:</span>{" "}
              {windowStats.queue.note}
            </p>
          </div>

          {/* User stats */}
          <InnerCard
            title="User Statistics"
            icon={
              <Users
                className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-600"}`}
              />
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ["Total Users", windowStats.users.totalUsers.toLocaleString()],
                ["Total Calls", windowStats.users.totalCalls.toLocaleString()],
                [
                  "Avg Calls/User",
                  windowStats.users.averageCallsPerUser.toFixed(1),
                ],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <p className={`text-xs ${styles.text.muted}`}>{label}</p>
                  <p className={`text-xl font-bold ${styles.text.primary}`}>
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </InnerCard>

          {/* Tier breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TierBlock title="Free Tier" data={windowStats.users.byTier.free} />
            <TierBlock title="Pro Tier" data={windowStats.users.byTier.pro} />
          </div>
        </>
      )}

      {/* ── User Stats ─────────────────────────────────────────────── */}
      {activeTab === "user" && userStats && (
        <div className="space-y-4">
          {/* User progress */}
          <ProgressRow
            label="Your API Calls"
            current={userStats.callsMade}
            limit={userStats.tierLimit}
            pct={userStats.usagePercentage}
            isDark={isDark}
          />

          {/* 4 stat blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBlock
              label="Calls Made"
              value={userStats.callsMade.toLocaleString()}
              icon={<Zap className="h-4 w-4" />}
              color="orange"
            />
            <StatBlock
              label="Remaining"
              value={userStats.remainingCalls.toLocaleString()}
              icon={<CheckCircle className="h-4 w-4" />}
              color="green"
            />
            <StatBlock
              label="Queued"
              value={userStats.queuedItems.toLocaleString()}
              icon={<Database className="h-4 w-4" />}
              color="yellow"
            />
            {/* Status block */}
            <div
              className={`rounded-xl p-4 ${
                windowStats.global.isAutomationPaused
                  ? isDark
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-red-50 border border-red-200"
                  : isDark
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-green-50 border border-green-200"
              }`}
            >
              <p className={`text-xs mb-2 ${styles.text.muted}`}>Automation</p>
              <div className="flex items-center gap-1.5">
                {windowStats.global.isAutomationPaused ? (
                  <>
                    <PauseCircle
                      className={`h-4 w-4 ${isDark ? "text-red-400" : "text-red-500"}`}
                    />
                    <span
                      className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-500"}`}
                    >
                      Paused
                    </span>
                  </>
                ) : (
                  <>
                    <PlayCircle
                      className={`h-4 w-4 ${isDark ? "text-green-400" : "text-green-500"}`}
                    />
                    <span
                      className={`text-sm font-semibold ${isDark ? "text-green-400" : "text-green-500"}`}
                    >
                      Active
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tier info */}
          <div className={`rounded-xl p-4 ${styles.innerCard}`}>
            <div className="flex items-center gap-2 mb-1">
              <Shield
                className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
              <span className={`text-sm font-medium ${styles.text.primary}`}>
                Tier:{" "}
                {TIER_INFO[userStats.tier as TierType]?.name ?? userStats.tier}
              </span>
            </div>
            <p className={`text-xs ${styles.text.muted}`}>
              Next reset: {new Date(userStats.nextReset).toLocaleString()}
            </p>
          </div>

          {/* Paused warning */}
          {windowStats.global.isAutomationPaused && (
            <div
              className={`rounded-xl p-4 flex items-start gap-3 ${
                isDark
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isDark ? "text-red-400" : "text-red-500"}`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-500"}`}
                >
                  Automation Paused
                </p>
                <p className={`text-xs mt-1 ${styles.text.secondary}`}>
                  Hourly limit reached. Automation will resume automatically at
                  the start of the next window.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className={`pt-4 border-t ${isDark ? "border-white/10" : "border-gray-100"}`}
      >
        <p className={`text-xs ${styles.text.muted}`}>
          Last updated: {new Date().toLocaleTimeString()} &nbsp;•&nbsp;
          Auto-refresh every 5 minutes
        </p>
      </div>
    </div>
  );
}
