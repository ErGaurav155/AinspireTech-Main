// apps/dashboard/app/web/tokens/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  History,
  BarChart3,
  Coins,
  Clock,
  Shield,
  Crown,
  Target,
  Bot,
} from "lucide-react";
import {
  Button,
  EmptyState,
  Orbs,
  Spinner,
  StatCard,
  Tabs,
  TabsContent,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TokenPurchase } from "@/components/web/TokenPurchase";
import {
  getPurchaseHistory,
  getTokenBalance,
  getTokenUsage,
  resetFreeTokens,
} from "@/lib/services/web-actions.api";
import { useApi } from "@/lib/useApi";

interface TokenStats {
  availableTokens: number;
  freeTokensRemaining: number;
  purchasedTokensRemaining: number;
  totalTokensUsed: number;
  nextResetAt: string;
  freeTokens?: number;
  purchasedTokens?: number;
  usedFreeTokens?: number;
  usedPurchasedTokens?: number;
}

interface UsageData {
  period: string;
  startDate: string;
  endDate: string;
  usageByChatbot: Array<{ _id: string; totalTokens: number; count: number }>;
  dailyUsage: Array<{ _id: string; totalTokens: number; count: number }>;
  totalUsage: { totalTokens: number; totalCost: number; count: number };
  currentBalance: {
    total: number;
    free: number;
    purchased: number;
  };
}

const COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#6366F1",
];

// Generate mock daily data for empty states
function generateMockDailyData() {
  const data = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    data.push({
      _id: dateStr,
      totalTokens: Math.floor(Math.random() * 500) + 100,
      count: Math.floor(Math.random() * 10) + 1,
    });
  }
  return data;
}

// Generate mock chatbot usage data
function generateMockChatbotData() {
  return [
    { _id: "Lead Generation", totalTokens: 12450, count: 45, totalCost: 0 },
    { _id: "Education (MCQ)", totalTokens: 8320, count: 32, totalCost: 0 },
  ];
}

export default function TokenDashboard() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const { styles, isDark } = useThemeStyles();

  const [loading, setLoading] = useState(true);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { apiRequest } = useApi();
  type ActiveTab = "overview" | "purchase" | "usage" | "history";
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchTokenData = useCallback(async () => {
    if (!userId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);

      const [balanceRes, usageRes] = await Promise.all([
        getTokenBalance(apiRequest),
        getTokenUsage(apiRequest, "month"),
      ]);

      // Extract data from response - handle nested structures
      const balanceData = balanceRes?.data || balanceRes || {};
      const usagePayload = usageRes || {};
      const usageByChatbotRaw =
        usagePayload.usageByChatbot ||
        usagePayload.data?.usageByChatbot ||
        usagePayload.usage?.usageByChatbot ||
        [];
      const dailyUsageRaw =
        usagePayload.dailyUsage ||
        usagePayload.data?.dailyUsage ||
        usagePayload.usage?.dailyUsage ||
        [];
      const totalUsageRaw =
        usagePayload.totalUsage ||
        usagePayload.data?.totalUsage ||
        usagePayload.usage?.totalUsage;
      const currentBalanceRaw =
        usagePayload.currentBalance ||
        usagePayload.data?.currentBalance ||
        usagePayload.usage?.currentBalance;

      // Ensure balance data has all required fields
      const processedBalance: TokenStats = {
        availableTokens: balanceData.availableTokens || 0,
        freeTokensRemaining: balanceData.freeTokensRemaining || 0,
        purchasedTokensRemaining: balanceData.purchasedTokensRemaining || 0,
        totalTokensUsed: balanceData.totalTokensUsed || 0,
        nextResetAt:
          balanceData.nextResetAt ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        freeTokens: balanceData.freeTokens || 10000,
        purchasedTokens: balanceData.purchasedTokens || 0,
        usedFreeTokens: balanceData.usedFreeTokens || 0,
        usedPurchasedTokens: balanceData.usedPurchasedTokens || 0,
      };

      setTokenStats(processedBalance);

      const processedDailyUsage = dailyUsageRaw.map((item: any) => ({
        _id: item._id,
        totalTokens: item.totalTokens || 0,
        count: item.count || 0,
      }));

      const processedUsageByChatbot = usageByChatbotRaw.map((item: any) => ({
        _id: formatChatbotName(item._id),
        totalTokens: item.totalTokens || 0,
        count: item.count || 0,
        totalCost: item.totalCost || 0,
      }));

      const computedTotalUsage = totalUsageRaw || {
        totalTokens: processedDailyUsage.reduce(
          (sum: any, row: any) => sum + (row.totalTokens || 0),
          0,
        ),
        totalCost: 0,
        count: processedDailyUsage.reduce(
          (sum: any, row: any) => sum + (row.count || 0),
          0,
        ),
      };

      const processedUsage: UsageData = {
        period: usagePayload.period || "month",
        startDate:
          usagePayload.startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: usagePayload.endDate || new Date().toISOString(),
        usageByChatbot: processedUsageByChatbot,
        dailyUsage: processedDailyUsage,
        totalUsage: {
          totalTokens:
            computedTotalUsage.totalTokens ||
            processedBalance.totalTokensUsed ||
            0,
          totalCost: computedTotalUsage.totalCost || 0,
          count: computedTotalUsage.count || 0,
        },
        currentBalance: {
          total: currentBalanceRaw?.total ?? processedBalance.availableTokens,
          free: currentBalanceRaw?.free ?? processedBalance.freeTokensRemaining,
          purchased:
            currentBalanceRaw?.purchased ??
            processedBalance.purchasedTokensRemaining,
        },
      };

      setUsageData(processedUsage);

      // Debug logging
      console.log("Token data processed:", {
        balance: processedBalance,
        usage: processedUsage,
        dailyUsageLength: processedUsage.dailyUsage.length,
        chatbotUsageLength: processedUsage.usageByChatbot.length,
      });
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error fetching token data:", error);

      // Set mock data on error
      setTokenStats({
        availableTokens: 9402,
        freeTokensRemaining: 9402,
        purchasedTokensRemaining: 0,
        totalTokensUsed: 598,
        nextResetAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        freeTokens: 10000,
        purchasedTokens: 0,
        usedFreeTokens: 598,
        usedPurchasedTokens: 0,
      });

      setUsageData({
        period: "month",
        startDate: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: new Date().toISOString(),
        usageByChatbot: generateMockChatbotData(),
        dailyUsage: generateMockDailyData(),
        totalUsage: { totalTokens: 598, totalCost: 0, count: 12 },
        currentBalance: { total: 9402, free: 9402, purchased: 0 },
      });

      toast({
        title: "Notice",
        description: "Showing estimated usage data",
        duration: 3000,
      });
    } finally {
      setIsRefreshing(false);
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    fetchTokenData();
  }, [userId, isLoaded, router, fetchTokenData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTokenData();
  };

  const handleResetFreeTokens = async () => {
    try {
      await resetFreeTokens(apiRequest);
      toast({
        title: "Success",
        description: "Free tokens have been reset",
        duration: 3000,
      });
      fetchTokenData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset free tokens",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getTokenPercentage = () => {
    if (!tokenStats) return 0;
    const totalFree = tokenStats.freeTokens || 10000;
    const usedFree = tokenStats.usedFreeTokens || 0;
    return Math.min(100, Math.max(0, (usedFree / totalFree) * 100));
  };

  const TAB_LABELS: Record<
    ActiveTab,
    { label: string; icon: React.ElementType }
  > = {
    overview: { label: "Overview", icon: BarChart3 },
    purchase: { label: "Buy Tokens", icon: CreditCard },
    usage: { label: "Analytics", icon: Target },
    history: { label: "History", icon: History },
  };

  if (loading) {
    return <Spinner label="Loading token dashboard…" />;
  }

  const dailyUsageData = usageData?.dailyUsage
    ? [...usageData.dailyUsage].sort((a: any, b: any) =>
        a._id.localeCompare(b._id),
      )
    : generateMockDailyData().sort((a: any, b: any) =>
        a._id.localeCompare(b._id),
      );
  const chatbotUsageData =
    usageData?.usageByChatbot || generateMockChatbotData();

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1
                className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
              >
                Token Management
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Manage your AI chatbot tokens and monitor usage analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl border transition-all ${
                isDark
                  ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/web/pricing"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              <CreditCard className="h-4 w-4" />
              View Plans
            </Link>
          </div>
        </div>

        {/* Token Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Available Tokens */}
          <div className={`${styles.card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-purple-400" />
                </div>
                <p className={`text-xs ${styles.text.secondary}`}>
                  Available Tokens
                </p>
              </div>
              <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </span>
            </div>
            <p className={`text-2xl font-bold ${styles.text.primary}`}>
              {tokenStats?.availableTokens?.toLocaleString() || 0}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400">
                <Shield className="h-3 w-3" />
                Free: {tokenStats?.freeTokensRemaining?.toLocaleString() || 0}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400">
                <Crown className="h-3 w-3" />
                Purchased:{" "}
                {tokenStats?.purchasedTokensRemaining?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Tokens Used */}
          <div className={`${styles.card} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <p className={`text-xs ${styles.text.secondary}`}>
                Tokens Used (30 days)
              </p>
            </div>
            <p className={`text-2xl font-bold ${styles.text.primary}`}>
              {(
                usageData?.totalUsage?.totalTokens ||
                tokenStats?.totalTokensUsed ||
                0
              ).toLocaleString()}
            </p>
            <p className={`text-xs mt-2 ${styles.text.muted}`}>
              {usageData?.totalUsage?.count || 0} requests processed
            </p>
          </div>

          {/* Free Tokens Reset */}
          <div className={`${styles.card} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <p className={`text-xs ${styles.text.secondary}`}>
                Free Tokens Reset
              </p>
            </div>
            <p className={`text-lg font-semibold ${styles.text.primary}`}>
              {formatDate(tokenStats?.nextResetAt || "")}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className={styles.text.muted}>Used</span>
                <span className="font-medium text-purple-400">
                  {getTokenPercentage().toFixed(0)}%
                </span>
              </div>
              <div
                className={`h-2 rounded-full ${isDark ? "bg-white/[0.08]" : "bg-gray-200"}`}
              >
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${getTokenPercentage()}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className={`border-b ${styles.divider}`}>
            <nav className="flex gap-6 overflow-x-auto">
              {(Object.keys(TAB_LABELS) as ActiveTab[]).map((tab) => {
                const Icon = TAB_LABELS[tab].icon;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? "border-purple-500 text-purple-500"
                        : `border-transparent ${styles.text.muted} hover:text-purple-400`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {TAB_LABELS[tab].label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Usage Chart */}
                <div className={`${styles.card} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                    </div>
                    <h3 className={`font-semibold ${styles.text.primary}`}>
                      Daily Token Usage
                    </h3>
                  </div>
                  <div className="h-64">
                    {dailyUsageData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyUsageData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={isDark ? "#2A2A30" : "#E5E7EB"}
                          />
                          <XAxis
                            dataKey="_id"
                            stroke={isDark ? "#9CA3AF" : "#6B7280"}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => {
                              if (!value) return "";
                              try {
                                const date = new Date(value);
                                return `${date.getDate()}/${date.getMonth() + 1}`;
                              } catch {
                                return value;
                              }
                            }}
                          />
                          <YAxis
                            stroke={isDark ? "#9CA3AF" : "#6B7280"}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? "#1A1A1E" : "white",
                              border: isDark
                                ? "1px solid rgba(255,255,255,0.08)"
                                : "1px solid #E5E7EB",
                              borderRadius: "8px",
                              padding: "8px 12px",
                            }}
                            formatter={(value: any) => [
                              `${value?.toLocaleString() || 0} tokens`,
                              "Usage",
                            ]}
                            labelFormatter={(label) => {
                              try {
                                return new Date(label).toLocaleDateString();
                              } catch {
                                return label;
                              }
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="totalTokens"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#8B5CF6" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className={`text-sm ${styles.text.muted}`}>
                          No daily usage data available
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Usage by Chatbot */}
                <div className={`${styles.card} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-pink-400" />
                    </div>
                    <h3 className={`font-semibold ${styles.text.primary}`}>
                      Usage by Chatbot
                    </h3>
                  </div>
                  <div className="h-64">
                    {chatbotUsageData.length > 0 &&
                    chatbotUsageData.some((item) => item.totalTokens > 0) ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chatbotUsageData.filter(
                                (item) => item.totalTokens > 0,
                              )}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="totalTokens"
                              label={({ name, value }: any) => {
                                if (!value || value === 0) return "";
                                return `${name}: ${value.toLocaleString()}`;
                              }}
                              labelLine={{
                                stroke: isDark ? "#6B7280" : "#9CA3AF",
                              }}
                            >
                              {chatbotUsageData
                                .filter((item) => item.totalTokens > 0)
                                .map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                            </Pie>

                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDark ? "#1A1A1E" : "white",
                                border: isDark
                                  ? "1px solid rgba(255,255,255,0.08)"
                                  : "1px solid #E5E7EB",
                                borderRadius: "8px",
                                padding: "8px 12px",
                              }}
                              formatter={(value: any) => [
                                `${value?.toLocaleString() || 0} tokens`,
                                "Usage",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                          {chatbotUsageData
                            .filter((item) => item.totalTokens > 0)
                            .map((item, index) => (
                              <div
                                key={item._id}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background: COLORS[index % COLORS.length],
                                  }}
                                />
                                <span
                                  className={`text-xs ${styles.text.secondary}`}
                                >
                                  {item._id} (
                                  {item.totalTokens.toLocaleString()})
                                </span>
                              </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className={`text-sm ${styles.text.muted}`}>
                          No chatbot usage data available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Low Token Alert */}
              {tokenStats && tokenStats.availableTokens < 1000 && (
                <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-semibold mb-1 ${styles.text.primary}`}
                      >
                        Low Token Alert
                      </h3>
                      <p className={`text-sm mb-3 ${styles.text.secondary}`}>
                        You have only{" "}
                        {tokenStats.availableTokens.toLocaleString()} tokens
                        remaining. Consider purchasing more tokens to avoid
                        interruption.
                      </p>
                      <Button
                        onClick={() => setActiveTab("purchase")}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Tokens Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Free Token Reset Card */}
              <div className={`${styles.card} p-5`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${styles.text.primary}`}>
                        Free Token Management
                      </h3>
                      <p className={`text-sm ${styles.text.secondary}`}>
                        Your free tokens reset monthly. Next reset:{" "}
                        {formatDate(tokenStats?.nextResetAt || "")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleResetFreeTokens}
                    disabled={
                      tokenStats?.nextResetAt
                        ? new Date(tokenStats.nextResetAt) > new Date()
                        : true
                    }
                    className={`rounded-xl ${
                      isDark
                        ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {tokenStats?.nextResetAt &&
                    new Date(tokenStats.nextResetAt) > new Date()
                      ? "Reset Available Soon"
                      : "Reset Free Tokens"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Tab */}
          {activeTab === "purchase" && (
            <div className="rounded-2xl">
              <TokenPurchase
                currentBalance={tokenStats?.availableTokens || 0}
                onSuccess={fetchTokenData}
              />
            </div>
          )}

          {/* Usage Analytics Tab */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${styles.card} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className={`text-xs ${styles.text.secondary}`}>
                      Total Tokens Used
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${styles.text.primary}`}>
                    {(usageData?.totalUsage?.totalTokens || 0).toLocaleString()}
                  </p>
                </div>

                <div className={`${styles.card} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-green-400" />
                    </div>
                    <p className={`text-xs ${styles.text.secondary}`}>
                      Total Requests
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${styles.text.primary}`}>
                    {(usageData?.totalUsage?.count || 0).toLocaleString()}
                  </p>
                </div>

                <div className={`${styles.card} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-purple-400" />
                    </div>
                    <p className={`text-xs ${styles.text.secondary}`}>
                      Estimated Cost
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${styles.text.primary}`}>
                    ₹{(usageData?.totalUsage?.totalCost || 0).toFixed(2)}
                  </p>
                </div>

                <div className={`${styles.card} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-pink-400" />
                    </div>
                    <p className={`text-xs ${styles.text.secondary}`}>
                      Avg Tokens/Request
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${styles.text.primary}`}>
                    {usageData?.totalUsage?.count
                      ? Math.round(
                          usageData.totalUsage.totalTokens /
                            usageData.totalUsage.count,
                        )
                      : 0}
                  </p>
                </div>
              </div>

              <h3 className={`font-semibold ${styles.text.primary}`}>
                Detailed Usage Statistics
              </h3>

              <div className={`${styles.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isDark
                          ? "bg-white/[0.04] text-white/40"
                          : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      <tr>
                        <th className="px-6 py-3 text-left">Period</th>
                        <th className="px-6 py-3 text-left">Tokens Used</th>
                        <th className="px-6 py-3 text-left">Requests</th>
                        <th className="px-6 py-3 text-left">Avg/Request</th>
                        <th className="px-6 py-3 text-left">Date Range</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${styles.divider}`}>
                      <tr
                        className={
                          isDark
                            ? "hover:bg-white/[0.03]"
                            : "hover:bg-gray-50/80"
                        }
                      >
                        <td className="px-6 py-4 text-sm">Last 30 days</td>
                        <td className="px-6 py-4 text-sm font-medium text-purple-400">
                          {(
                            usageData?.totalUsage?.totalTokens || 0
                          ).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {usageData?.totalUsage?.count || 0}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {usageData?.totalUsage?.count
                            ? Math.round(
                                usageData.totalUsage.totalTokens /
                                  usageData.totalUsage.count,
                              )
                            : 0}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {formatDate(usageData?.startDate || "")} -{" "}
                          {formatDate(usageData?.endDate || "")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className={`${styles.card} overflow-hidden`}>
              <PurchaseHistory userId={userId!} onSuccess={fetchTokenData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to format chatbot names
function formatChatbotName(chatbotId: string): string {
  const nameMap: Record<string, string> = {
    "chatbot-lead-generation": "Lead Generation",
    "chatbot-education": "Education (MCQ)",
    unknown: "Unknown",
  };
  return nameMap[chatbotId] || chatbotId;
}

// Purchase History Component
function PurchaseHistory({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess?: () => void;
}) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const fetchPurchases = useCallback(async () => {
    try {
      const result = await getPurchaseHistory(apiRequest);
      console.log("Purchase history result:", result);
      const purchaseData = result?.data?.purchase || result?.purchase || [];
      setPurchases(purchaseData);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchPurchases();
  }, [userId, fetchPurchases]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto mb-3" />
        <p className={`text-sm ${styles.text.muted}`}>
          Loading purchase history...
        </p>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-8 w-8" />}
        label="No purchase history"
      />
    );
  }

  return (
    <div>
      <div className={`p-5 border-b ${styles.divider}`}>
        <h3 className={`font-semibold ${styles.text.primary}`}>
          Purchase History
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            className={`text-xs font-semibold uppercase tracking-wide ${
              isDark
                ? "bg-white/[0.04] text-white/40"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Tokens</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Order ID</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${styles.divider}`}>
            {purchases.map((purchase) => (
              <tr
                key={purchase._id || purchase.id}
                className={
                  isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50/80"
                }
              >
                <td className="px-6 py-4 text-sm">
                  {purchase.createdAt
                    ? new Date(purchase.createdAt).toLocaleDateString()
                    : "N/A"}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-purple-400">
                  {(purchase.tokensPurchased || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-green-400">
                  ₹{(purchase.amount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {purchase.razorpayOrderId?.slice(-8) || "N/A"}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400">
                    Completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
