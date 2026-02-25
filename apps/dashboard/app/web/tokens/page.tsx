"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  History,
  BarChart3,
  Coins,
  Clock,
  ArrowUpRight,
  Sparkles,
  Shield,
  Crown,
  Target,
  Bot,
  Download,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
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
  BarChart,
  Bar,
} from "recharts";
import { TokenPurchase } from "@/components/web/TokenPurchase";
import {
  getPurchaseHistory,
  getTokenBalance,
  getTokenUsage,
  resetFreeTokens,
} from "@/lib/services/web-actions.api";
import { useApi } from "@/lib/useApi";
import { formatDistanceToNow } from "date-fns";

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

export default function TokenDashboard() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(true);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { apiRequest } = useApi();

  const currentTheme = resolvedTheme || theme || "light";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FC]",
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      cardBgHover: isDark ? "hover:bg-[#252529]" : "hover:bg-gray-50",
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-400" : "text-gray-500",
      mutedText: isDark ? "text-gray-500" : "text-gray-400",
      border: isDark ? "border-gray-800" : "border-gray-100",
      hoverBorder: isDark
        ? "hover:border-purple-500/50"
        : "hover:border-purple-300",
      activeBorder: isDark ? "border-purple-500" : "border-purple-500",
      chartGrid: isDark ? "#2A2A30" : "#E5E7EB",
      chartText: isDark ? "#9CA3AF" : "#6B7280",
      gradientPrimary: "from-purple-500 to-pink-500",
      gradientSecondary: "from-blue-500 to-purple-500",
      gradientGold: "from-amber-500 to-orange-500",
      gradientGreen: "from-green-500 to-emerald-500",
      iconBg: isDark ? "bg-gray-800" : "bg-gray-100",
    };
  }, [currentTheme]);

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

  const COLORS = [
    "#8B5CF6",
    "#EC4899",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#6366F1",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading token dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-12 h-12 p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200/50">
              <Coins className="h-6 w-6  text-white" />
            </div>
            <div>
              <h1 className=" text-xl md:text-2xl font-bold text-gray-800">
                Token Management
              </h1>
              <p className="text-sm text-gray-500">
                Manage your AI chatbot tokens and monitor usage analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/web/pricing"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              View Plans
            </Link>
          </div>
        </div>

        {/* Token Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Available Tokens */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  Available Tokens
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-purple-600 border-purple-200"
              >
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {tokenStats?.availableTokens?.toLocaleString() || 0}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge className="bg-blue-100 text-blue-600 border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Free: {tokenStats?.freeTokensRemaining?.toLocaleString() || 0}
              </Badge>
              <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                <Crown className="h-3 w-3 mr-1" />
                Purchased:{" "}
                {tokenStats?.purchasedTokensRemaining?.toLocaleString() || 0}
              </Badge>
            </div>
          </div>

          {/* Tokens Used */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Tokens Used (30 days)
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {usageData?.totalUsage?.totalTokens?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {usageData?.totalUsage?.count || 0} requests processed
            </p>
          </div>

          {/* Free Tokens Reset */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Free Tokens Reset
                </p>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-800">
              {tokenStats?.nextResetAt
                ? formatDate(tokenStats.nextResetAt)
                : "N/A"}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Used</span>
                <span className="font-medium text-purple-600">
                  {getTokenPercentage().toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
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
          <TabsList className="bg-gray-100 p-1 rounded-xl flex items-center justify-start gap-1 w-full max-w-max overflow-x-auto lg:overflow-hidden ">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 text-xs md:text-base font-light md:font-normal"
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="purchase"
              className="flex items-center gap-2 text-xs md:text-base font-light md:font-normal"
            >
              <CreditCard className="h-4 w-4" />
              Buy Tokens
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className="flex items-center gap-2 text-xs md:text-base font-light md:font-normal"
            >
              <Target className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 text-xs md:text-base font-light md:font-normal"
            >
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Usage Chart */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    Daily Token Usage
                  </h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageData?.dailyUsage || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="_id"
                        stroke="#9CA3AF"
                        tickFormatter={(value) =>
                          new Date(value).getDate().toString()
                        }
                      />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
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
              <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    Usage by Chatbot
                  </h3>
                </div>
                <div className="h-64">
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
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
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
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 mb-1">
                      Low Token Alert
                    </h3>
                    <p className="text-sm text-amber-700 mb-3">
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
                        className="px-4 py-2 border border-amber-300 text-amber-700 rounded-xl text-sm hover:bg-amber-100 transition-colors"
                      >
                        View Plans
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Free Token Reset Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Free Token Management
                    </h3>
                    <p className="text-sm text-gray-500">
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
                  className="border-gray-200 text-gray-600 rounded-xl"
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
            <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5">
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
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Coins className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500">Total Tokens Used</p>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {usageData?.totalUsage?.totalTokens?.toLocaleString() || 0}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500">Total Requests</p>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {usageData?.totalUsage?.count?.toLocaleString() || 0}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-500">Estimated Cost</p>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  ₹{(usageData?.totalUsage?.totalCost || 0).toFixed(2)}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-pink-600" />
                  </div>
                  <p className="text-xs text-gray-500">Avg Tokens/Request</p>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {usageData?.totalUsage?.count
                    ? Math.round(
                        usageData.totalUsage.totalTokens /
                          usageData.totalUsage.count,
                      )
                    : 0}
                </p>
              </div>
            </div>

            {/* Usage Table */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">
                  Detailed Usage Statistics
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Period
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Tokens Used
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Requests
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Avg/Request
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Date Range
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800">
                        Last 30 days
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-purple-600">
                        {usageData?.totalUsage?.totalTokens?.toLocaleString() ||
                          0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {usageData?.totalUsage?.count || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {usageData?.totalUsage?.count
                          ? Math.round(
                              usageData.totalUsage.totalTokens /
                                usageData.totalUsage.count,
                            )
                          : 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
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
            <PurchaseHistory userId={userId!} onSuccess={fetchTokenData} />
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
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading purchase history...</p>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
          <History className="h-8 w-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No purchase history
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Your token purchase records will appear here
        </p>
        <Link
          href="/web/tokens?tab=purchase"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Buy Tokens Now
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Purchase History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Tokens
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Order ID
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchases.map((purchase) => (
              <tr
                key={purchase._id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(purchase.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-purple-600">
                  {purchase.tokensPurchased.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-green-600">
                  ₹{purchase.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                  {purchase.razorpayOrderId?.slice(-8)}
                </td>
                <td className="px-6 py-4">
                  <Badge className="bg-green-100 text-green-600 border-green-200">
                    Completed
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
