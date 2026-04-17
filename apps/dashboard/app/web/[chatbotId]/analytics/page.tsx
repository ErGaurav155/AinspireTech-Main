// apps/dashboard/app/web/[chatbotId]/analytics/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Target,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowUpRight,
  RefreshCw,
  GraduationCap,
  Bot,
  MessageCircle,
  Calendar,
  ChevronLeft,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingDown,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getAnalytics } from "@/lib/services/web-actions.api";
import { Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Types
interface AnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  leadsGenerated: number;
  qualifiedLeads: number;
  conversionRate: number;
  averageResponseTime: number;
}

interface TrendData {
  date: string;
  timestamp: string;
  conversations: number;
  appointments: number;
  conversionRate: number;
}

interface ResponseTimeData {
  time: string;
  count: number;
}

interface SatisfactionData {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  chatbotType: string;
  period: string;
  userId: string;
  overview: AnalyticsOverview;
  trends: TrendData[];
  responseTime: ResponseTimeData[];
  satisfaction: SatisfactionData[];
  recentConversations: any[];
  timestamp: string;
}

const PERIOD_OPTIONS = [
  { value: "1d", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label, isDark }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={`p-3 rounded-lg shadow-lg border ${
          isDark
            ? "bg-[#1A1A1E] border-white/[0.08]"
            : "bg-white border-gray-200"
        }`}
      >
        <p
          className={`text-xs font-semibold mb-2 ${isDark ? "text-white/70" : "text-gray-600"}`}
        >
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("7d");
  const [activeChartTab, setActiveChartTab] = useState<
    "conversations" | "responses" | "engagement"
  >("conversations");

  // Determine chatbot type
  const { isLeadGeneration, chatbotType, displayInfo } = useMemo(() => {
    const isLead =
      chatbotId === "chatbot-lead-generation" || chatbotId?.includes("lead");
    const isEdu =
      chatbotId === "chatbot-education" || chatbotId?.includes("education");
    const type = isLead
      ? "chatbot-lead-generation"
      : isEdu
        ? "chatbot-education"
        : null;

    let info = null;
    if (isLead) {
      info = {
        name: "Lead Generation",
        icon: Target,
        gradient: "from-purple-500 to-pink-500",
        primaryColor: "#8b5cf6",
      };
    } else if (isEdu) {
      info = {
        name: "Education",
        icon: GraduationCap,
        gradient: "from-green-500 to-emerald-500",
        primaryColor: "#10b981",
      };
    }

    return {
      isLeadGeneration: isLead,
      chatbotType: type,
      displayInfo: info,
    };
  }, [chatbotId]);

  const pc = displayInfo?.primaryColor || "#8b5cf6";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!userId || !chatbotType || !isLoaded) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await getAnalytics(apiRequest, chatbotType, period);
      const analyticsPayload = response?.analytics;
      setAnalyticsData(analyticsPayload || null);
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error loading analytics:", error);
      setError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [userId, chatbotType, isLoaded, apiRequest, period]);

  // Initial load
  useEffect(() => {
    if (!chatbotType || !isLoaded || !userId) return;
    loadAnalytics();
  }, [chatbotType, isLoaded, userId, loadAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    toast({
      title: "Analytics Refreshed",
      description: "Latest data loaded successfully",
      duration: 2000,
    });
  };

  const handleExport = () => {
    if (!analyticsData) return;

    const dataStr = JSON.stringify(analyticsData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${chatbotType}-${period}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Analytics data exported successfully",
      duration: 2000,
    });
  };

  // Get satisfaction icon
  const getSatisfactionIcon = (name: string) => {
    switch (name) {
      case "Excellent":
        return <ThumbsUp className="h-4 w-4" />;
      case "Good":
        return <ThumbsUp className="h-4 w-4" />;
      case "Average":
        return <Minus className="h-4 w-4" />;
      case "Poor":
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Loading state
  if (isLoading || !displayInfo) {
    return <Spinner label="Loading analytics..." />;
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div
          className={`${styles.container} flex items-center justify-center min-h-[60vh]`}
        >
          <div className="text-center">
            <BarChart3
              className={`h-12 w-12 mx-auto mb-4 ${styles.text.muted}`}
            />
            <h3 className={`text-lg font-semibold ${styles.text.primary} mb-2`}>
              Error Loading Analytics
            </h3>
            <p className={`text-sm ${styles.text.secondary} mb-4`}>{error}</p>
            <button
              onClick={handleRefresh}
              className={`px-4 py-2 rounded-xl text-sm bg-gradient-to-r ${displayInfo.gradient} text-white`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overview = analyticsData?.overview || {
    totalConversations: 0,
    totalMessages: 0,
    leadsGenerated: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    averageResponseTime: 0,
  };

  const trends = analyticsData?.trends || [];
  const responseTime = analyticsData?.responseTime || [];
  const satisfaction = analyticsData?.satisfaction || [];

  // Calculate totals for charts
  const totalSatisfaction = satisfaction.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Link
              href={`/web/${chatbotId}`}
              className={`p-2 rounded-xl transition-colors ${
                isDark
                  ? "hover:bg-white/[0.06] text-white/60"
                  : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Analytics Dashboard
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {displayInfo.name} · Detailed performance metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border outline-none cursor-pointer ${
                isDark
                  ? "bg-white/[0.05] border-white/[0.09] text-white/80"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                >
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl border transition-all disabled:opacity-50 ${
                isDark
                  ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleExport}
              className={`p-2 rounded-xl border transition-all ${
                isDark
                  ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="Export Data"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            {
              label: "Total Conversations",
              value: overview.totalConversations,
              icon: MessageCircle,
              color: "#3b82f6",
            },
            {
              label: "Total Messages",
              value: overview.totalMessages,
              icon: Activity,
              color: "#8b5cf6",
            },
            {
              label: "Leads Generated",
              value: overview.leadsGenerated || 0,
              icon: Users,
              color: "#10b981",
            },
            {
              label: "Qualified Leads",
              value: overview.qualifiedLeads || 0,
              icon: CheckCircle,
              color: "#f59e0b",
            },
            {
              label: "Conversion Rate",
              value: `${overview.conversionRate || 0}%`,
              icon: TrendingUp,
              color: "#ef4444",
            },
            {
              label: "Avg Response Time",
              value: `${overview.averageResponseTime || 0}s`,
              icon: Clock,
              color: "#06b6d4",
            },
          ].map((metric) => (
            <div key={metric.label} className={`${styles.card} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${metric.color}18` }}
                >
                  <metric.icon
                    className="h-4 w-4"
                    style={{ color: metric.color }}
                  />
                </div>
              </div>
              <p className={`text-xs ${styles.text.secondary} mb-0.5`}>
                {metric.label}
              </p>
              <p className={`text-xl font-bold ${styles.text.primary}`}>
                {typeof metric.value === "number"
                  ? metric.value.toLocaleString()
                  : metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Trends Chart */}
        <div className={`${styles.card} p-5`}>
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <h3 className={`text-sm font-bold ${styles.text.primary}`}>
              Conversation Trends
            </h3>
            <div className="flex flex-wrap items-center gap-1">
              {[
                { key: "conversations", label: "Conversations", color: pc },
                { key: "responses", label: "Appointments", color: "#10b981" },
                { key: "engagement", label: "Engagement", color: "#f59e0b" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveChartTab(tab.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeChartTab === tab.key
                      ? "text-white"
                      : isDark
                        ? "text-white/50 hover:text-white/70"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={{
                    background:
                      activeChartTab === tab.key ? tab.color : "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient
                  id="colorConversations"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={pc} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={pc} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorEngagement"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              {activeChartTab === "conversations" && (
                <Area
                  type="monotone"
                  dataKey="conversations"
                  stroke={pc}
                  strokeWidth={2}
                  fill="url(#colorConversations)"
                />
              )}
              {activeChartTab === "responses" && (
                <Area
                  type="monotone"
                  dataKey="appointments"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorResponses)"
                />
              )}
              {activeChartTab === "engagement" && (
                <Area
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#colorEngagement)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time & Satisfaction Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Response Time Distribution */}
          <div className={`${styles.card} p-5`}>
            <h3 className={`text-sm font-bold ${styles.text.primary} mb-4`}>
              Response Time Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={responseTime} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                  }
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="time"
                  tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar
                  dataKey="count"
                  fill={pc}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Satisfaction Distribution */}
          <div className={`${styles.card} p-5`}>
            <h3 className={`text-sm font-bold ${styles.text.primary} mb-4`}>
              Satisfaction Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              {totalSatisfaction > 0 ? (
                <RechartsPieChart>
                  <Pie
                    data={satisfaction}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {satisfaction.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                </RechartsPieChart>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className={`text-sm ${styles.text.secondary}`}>
                    No satisfaction data available for this period.
                  </p>
                </div>
              )}
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {satisfaction.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className={`text-xs ${styles.text.secondary}`}>
                    {item.name} (
                    {totalSatisfaction > 0
                      ? ((item.value / totalSatisfaction) * 100).toFixed(1)
                      : "0.0"}
                    %)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className={`${styles.card} overflow-hidden`}>
          <div className={`p-5 border-b ${styles.divider}`}>
            <h3 className={`text-sm font-bold ${styles.text.primary}`}>
              Performance Summary
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isDark
                      ? "bg-white/[0.04] text-white/40"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  <th className="px-5 py-3">Metric</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Total Conversations",
                    value: overview.totalConversations.toLocaleString(),
                    status: "success",
                  },
                  {
                    label: "Total Messages",
                    value: overview.totalMessages.toLocaleString(),
                    status: "success",
                  },
                  {
                    label: "Messages per Conversation",
                    value: (
                      overview.totalMessages /
                      (overview.totalConversations || 1)
                    ).toFixed(1),
                    status: "info",
                  },
                  {
                    label: "Leads Generated",
                    value: (overview.leadsGenerated || 0).toLocaleString(),
                    status: "success",
                  },
                  {
                    label: "Qualified Leads",
                    value: (overview.qualifiedLeads || 0).toLocaleString(),
                    status: "success",
                  },
                  {
                    label: "Qualification Rate",
                    value: `${overview.qualifiedLeads && overview.leadsGenerated ? ((overview.qualifiedLeads / overview.leadsGenerated) * 100).toFixed(1) : 0}%`,
                    status:
                      overview.qualifiedLeads > overview.leadsGenerated * 0.5
                        ? "success"
                        : "warning",
                  },
                  {
                    label: "Conversion Rate",
                    value: `${overview.conversionRate || 0}%`,
                    status:
                      (overview.conversionRate || 0) >= 5
                        ? "success"
                        : "warning",
                  },
                  {
                    label: "Average Response Time",
                    value: `${overview.averageResponseTime || 0} seconds`,
                    status:
                      (overview.averageResponseTime || 0) < 60
                        ? "success"
                        : "warning",
                  },
                ].map((row) => (
                  <tr key={row.label}>
                    <td
                      className={`px-5 py-3 text-sm ${styles.text.secondary}`}
                    >
                      {row.label}
                    </td>
                    <td
                      className={`px-5 py-3 text-sm font-medium text-right ${styles.text.primary}`}
                    >
                      {row.value}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.status === "success"
                            ? isDark
                              ? "bg-green-500/20 text-green-300"
                              : "bg-green-100 text-green-700"
                            : row.status === "warning"
                              ? isDark
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-amber-100 text-amber-700"
                              : isDark
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {row.status === "success"
                          ? "✓ Good"
                          : row.status === "warning"
                            ? "⚠ Needs Attention"
                            : "ℹ Info"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Last Updated */}
        <div className={`text-xs ${styles.text.muted} text-right`}>
          Last updated:{" "}
          {analyticsData?.timestamp
            ? new Date(analyticsData.timestamp).toLocaleString()
            : "N/A"}
        </div>
      </div>
    </div>
  );
}
