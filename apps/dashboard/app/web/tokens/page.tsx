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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch token data
  const fetchTokenData = useCallback(async () => {
    if (!userId) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);

      const [balanceData, usageData] = await Promise.all([
        getTokenBalance(apiRequest),
        getTokenUsage(apiRequest, "month"),
      ]);
      setTokenStats(balanceData);
      setUsageData(usageData);
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error fetching token data:", error);
      toast({
        title: "Error",
        description: "Failed to load token data",
        variant: "destructive",
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
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getTokenPercentage = () => {
    if (!tokenStats) return 0;
    const totalFree = 10000;
    const usedFree = totalFree - tokenStats.freeTokensRemaining;
    return (usedFree / totalFree) * 100;
  };
  const TAB_LABELS: Record<
    ActiveTab,
    { label: string; icon: React.ElementType }
  > = {
    overview: {
      label: "Overview",
      icon: BarChart3,
    },
    purchase: {
      label: `Buy Tokens`,
      icon: CreditCard,
    },
    usage: {
      label: `Analytics`,
      icon: Target,
    },
    history: {
      label: "History",
      icon: History,
    },
  };
  if (loading) {
    return <Spinner label="Loading token dashboard…" />;
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon.purple}`}
            >
              <Coins className="h-6 w-6 text-purple-400" />
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
              className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/web/pricing"
              className={`flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity ${styles.pill}`}
            >
              <CreditCard className="h-4 w-4" />
              View Plans
            </Link>
          </div>
        </div>

        {/* Token Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Available Tokens */}
          <StatCard
            iconBg={styles.icon.purple}
            label="Available Tokens"
            icon={<Coins className="h-5 w-5 text-purple-400" />}
            value={tokenStats?.availableTokens?.toLocaleString() || 0}
            badge={
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
              >
                <Zap className="h-3 w-3" />
                Active
              </span>
            }
            sub={
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.blue}`}
                >
                  <Shield className="h-3 w-3" />
                  Free: {tokenStats?.freeTokensRemaining?.toLocaleString() || 0}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
                >
                  <Crown className="h-3 w-3" />
                  Purchased:{" "}
                  {tokenStats?.purchasedTokensRemaining?.toLocaleString() || 0}
                </span>
              </div>
            }
          />

          {/* Tokens Used */}
          <StatCard
            iconBg={styles.icon.green}
            label="Tokens Used (30 days)"
            icon={<TrendingUp className="h-5 w-5 text-green-400" />}
            value={usageData?.totalUsage?.totalTokens?.toLocaleString() || 0}
            sub={
              <p className={`text-xs mt-2 ${styles.text.muted}`}>
                {usageData?.totalUsage?.count || 0} requests processed
              </p>
            }
          />

          {/* Free Tokens Reset */}
          <div className={`${styles.card} p-5`}>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon.amber}`}
              >
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className={`text-xs ${styles.text.secondary}`}>
                  Free Tokens Reset
                </p>
              </div>
            </div>
            <p
              className={`text-lg font-semibold relative z-10 ${styles.text.primary}`}
            >
              {tokenStats?.nextResetAt
                ? formatDate(tokenStats.nextResetAt)
                : "N/A"}
            </p>
            <div className="mt-3 relative z-10">
              <div className="flex justify-between text-xs mb-1">
                <span className={styles.text.muted}>Used</span>
                <span className="font-medium text-purple-400">
                  {getTokenPercentage().toFixed(0)}%
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${getTokenPercentage()}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
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
                        ? styles.tab.active
                        : styles.tab.inactive
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        activeTab === tab ? "text-blue-500" : "text-gray-400"
                      }`}
                    />
                    {TAB_LABELS[tab].label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Usage Chart */}
              <div className={`${styles.card} p-5`}>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.icon.purple}`}
                  >
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                  </div>
                  <h3 className={`font-semibold ${styles.text.primary}`}>
                    Daily Token Usage
                  </h3>
                </div>
                <div className="h-64 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageData?.dailyUsage || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#2A2A30" : "#E5E7EB"}
                      />
                      <XAxis
                        dataKey="_id"
                        stroke={isDark ? "#9CA3AF" : "#6B7280"}
                        tickFormatter={(value) =>
                          new Date(value).getDate().toString()
                        }
                      />
                      <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1A1A1E" : "white",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.08)"
                            : "1px solid #E5E7EB",
                          borderRadius: "8px",
                          padding: "8px 12px",
                        }}
                        formatter={(value) => [`${value} tokens`, "Usage"]}
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
                </div>
              </div>

              {/* Usage by Chatbot */}
              <div className={`${styles.card} p-5`}>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.icon.pink}`}
                  >
                    <Bot className="h-4 w-4 text-pink-400" />
                  </div>
                  <h3 className={`font-semibold ${styles.text.primary}`}>
                    Usage by Chatbot
                  </h3>
                </div>
                <div className="h-64 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usageData?.usageByChatbot || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="totalTokens"
                      >
                        {(usageData?.usageByChatbot || []).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ),
                        )}
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
                        formatter={(value) => [`${value} tokens`, "Usage"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Low Token Alert */}
            {tokenStats && tokenStats.availableTokens < 1000 && (
              <div
                className={`${styles.card} p-4 md:p-5 ${styles.icon.amber} border-0`}
              >
                <div className="flex items-start gap-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${styles.icon.amber}`}
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${styles.text.primary}`}>
                      Low Token Alert
                    </h3>
                    <p className={`text-sm mb-3 ${styles.text.secondary}`}>
                      You have only{" "}
                      {tokenStats.availableTokens.toLocaleString()} tokens
                      remaining. Consider purchasing more tokens to avoid
                      interruption.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setActiveTab("purchase")}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Tokens Now
                      </Button>
                      <Link
                        href="/web/pricing"
                        className={`px-4 py-2 text-sm rounded-xl transition-colors ${styles.pill}`}
                      >
                        View Plans
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Free Token Reset Card */}
            <div className={`${styles.card} p-5`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon.blue}`}
                  >
                    <RefreshCw className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${styles.text.primary}`}>
                      Free Token Management
                    </h3>
                    <p className={`text-sm ${styles.text.secondary}`}>
                      Your free tokens reset monthly. Next reset:{" "}
                      {tokenStats?.nextResetAt
                        ? formatDate(tokenStats.nextResetAt)
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleResetFreeTokens}
                  disabled={new Date(tokenStats?.nextResetAt || 0) > new Date()}
                  className={styles.pill}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {new Date(tokenStats?.nextResetAt || 0) > new Date()
                    ? "Reset Available Soon"
                    : "Reset Free Tokens"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Purchase Tab */}
          <TabsContent value="purchase">
            <div className={`rounded-2xl`}>
              <TokenPurchase
                currentBalance={tokenStats?.availableTokens || 0}
                onSuccess={fetchTokenData}
              />
            </div>
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                iconBg={styles.icon.blue}
                label="Total Tokens Used"
                icon={<Coins className="h-4 w-4 text-blue-400" />}
                value={
                  usageData?.totalUsage?.totalTokens?.toLocaleString() || 0
                }
              />

              <StatCard
                iconBg={styles.icon.green}
                label="Total Requests"
                icon={<BarChart3 className="h-4 w-4 text-green-400" />}
                value={usageData?.totalUsage?.count?.toLocaleString() || 0}
              />

              <StatCard
                iconBg={styles.icon.purple}
                label="Estimated Cost"
                icon={<CreditCard className="h-4 w-4 text-purple-400" />}
                value={`₹${(usageData?.totalUsage?.totalCost || 0).toFixed(2)}`}
              />

              <StatCard
                iconBg={styles.icon.pink}
                label="Avg Tokens/Request"
                icon={<TrendingUp className="h-4 w-4 text-pink-400" />}
                value={
                  usageData?.totalUsage?.count
                    ? Math.round(
                        usageData.totalUsage.totalTokens /
                          usageData.totalUsage.count,
                      )
                    : 0
                }
              />
            </div>

            <h3 className={`font-semibold ${styles.text.primary}`}>
              Detailed Usage Statistics
            </h3>
            {/* Usage Table */}
            <div className={`${styles.card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${styles.tableHead} ${styles.divider}`}>
                    <tr>
                      <th className={styles.tableHead}>Period</th>
                      <th className={styles.tableHead}>Tokens Used</th>
                      <th className={styles.tableHead}>Requests</th>
                      <th className={styles.tableHead}>Avg/Request</th>
                      <th className={styles.tableHead}>Date Range</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${styles.divider}`}>
                    <tr className={styles.rowHover}>
                      <td className={styles.tableCell}>Last 30 days</td>
                      <td
                        className={`px-6 py-4 text-sm font-medium text-purple-400`}
                      >
                        {usageData?.totalUsage?.totalTokens?.toLocaleString() ||
                          0}
                      </td>
                      <td className={styles.tableCell}>
                        {usageData?.totalUsage?.count || 0}
                      </td>
                      <td className={styles.tableCell}>
                        {usageData?.totalUsage?.count
                          ? Math.round(
                              usageData.totalUsage.totalTokens /
                                usageData.totalUsage.count,
                            )
                          : 0}
                      </td>
                      <td className={styles.tableCell}>
                        {usageData?.startDate
                          ? formatDate(usageData.startDate)
                          : ""}{" "}
                        -{" "}
                        {usageData?.endDate
                          ? formatDate(usageData.endDate)
                          : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className={`${styles.card} overflow-hidden`}>
              <PurchaseHistory userId={userId!} onSuccess={fetchTokenData} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
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
      setPurchases(result.purchase || []);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchPurchases();
  }, [userId, fetchPurchases]);

  if (loading) {
    return (
      <div className={`${styles.card} p-12 text-center`}>
        <div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto mb-3" />
        <p className={`text-sm ${styles.text.secondary}`}>
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
        // description="Your token purchase records will appear here"
        // action={
        //   <Link
        //     href="/web/tokens?tab=purchase"
        //     className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity ${styles.pill}`}
        //   >
        //     <CreditCard className="h-4 w-4" />
        //     Buy Tokens Now
        //   </Link>
        // }
      />
    );
  }

  return (
    <div className={`${styles.card} overflow-hidden`}>
      <div className={`p-5 border-b ${styles.divider}`}>
        <h3 className={`font-semibold ${styles.text.primary}`}>
          Purchase History
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.tableHead}>Date</th>
              <th className={styles.tableHead}>Tokens</th>
              <th className={styles.tableHead}>Amount</th>
              <th className={styles.tableHead}>Order ID</th>
              <th className={styles.tableHead}>Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${styles.divider}`}>
            {purchases.map((purchase) => (
              <tr key={purchase._id} className={styles.rowHover}>
                <td className={styles.tableCell}>
                  {new Date(purchase.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-purple-400">
                  {purchase.tokensPurchased.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-green-400">
                  ₹{purchase.amount.toLocaleString()}
                </td>
                <td className={styles.tableCell}>
                  {purchase.razorpayOrderId?.slice(-8)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.blue}`}
                  >
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
