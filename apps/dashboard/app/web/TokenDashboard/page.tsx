"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  History,
  BarChart3,
  Download,
  ChartBar,
  Sparkles,
  Coins,
  Clock,
  BarChart,
  ArrowRight,
  ExternalLink,
  Shield,
  Rocket,
  Crown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "@ainspiretech/ui/components/radix/use-toast";
import { BreadcrumbsDefault } from "@ainspiretech/ui/components/shared/breadcrumbs";
import { Button } from "@ainspiretech/ui/components/radix/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ainspiretech/ui/components/radix/card";
import { Badge } from "@ainspiretech/ui/components/radix/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ainspiretech/ui/components/radix/tabs";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TokenPurchase } from "@/components/web/TokenPurchase";
import {
  getPurchaseHistory,
  getTokenBalance,
  getTokenUsage,
  resetFreeTokens,
} from "@/lib/services/web-actions.api";

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
  const [mounted, setMounted] = useState(false);
  const currentTheme = resolvedTheme || theme || "light";

  const [loading, setLoading] = useState(true);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced theme-based styles with hover effects
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark
        ? "bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#1a1a1a]"
        : "bg-gradient-to-br from-gray-50 via-white to-blue-50/30",
      cardBg: isDark
        ? "backdrop-blur-md  bg-transparent"
        : "bg-gradient-to-br from-white to-gray-50 bg-transparent",
      cardBgHover: isDark
        ? "hover:bg-gradient-to-br hover:from-gray-800/70 hover:to-gray-700/50"
        : "hover:bg-gradient-to-br hover:from-white hover:to-gray-100",
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-300" : "text-gray-600",
      mutedText: isDark ? "text-gray-400" : "text-gray-500",
      border: isDark ? "border-white/10" : "border-gray-200",
      hoverBorder: isDark
        ? "hover:border-[#B026FF]/40 hover:shadow-[0_0_20px_rgba(176,38,255,0.15)]"
        : "hover:border-[#B026FF]/60 hover:shadow-[0_0_20px_rgba(176,38,255,0.1)]",
      chartGrid: isDark ? "#374151" : "#e5e7eb",
      chartText: isDark ? "#9ca3af" : "#6b7280",
      gradientPrimary:
        "bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F]",
      gradientPrimaryHover:
        "hover:from-[#00D8E6] hover:via-[#A020F0] hover:to-[#FF1E8F]",
      gradientBlue: "bg-gradient-to-r from-blue-500 to-purple-600",
      gradientBlueHover: "hover:from-blue-600 hover:to-purple-700",
      gradientGreen: "bg-gradient-to-r from-green-500 to-teal-600",
      gradientGreenHover: "hover:from-green-600 hover:to-teal-700",
      gradientPurple: "bg-gradient-to-r from-purple-500 to-pink-600",
      gradientPurpleHover: "hover:from-purple-600 hover:to-pink-700",
      gradientGold: "bg-gradient-to-r from-yellow-500 to-orange-600",
      gradientGoldHover: "hover:from-yellow-600 hover:to-orange-700",
      iconBg: isDark
        ? "bg-gradient-to-br from-white/10 to-white/5"
        : "bg-gradient-to-br from-gray-100 to-gray-200",
      iconBgHover: isDark
        ? "group-hover:from-white/20 group-hover:to-white/10"
        : "group-hover:from-gray-200 group-hover:to-gray-300",
    };
  }, [currentTheme]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  // Hover animations for stats cards
  const statCardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
    hover: {
      y: -6,
      scale: 1.01,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };
  const fetchTokenData = async () => {
    try {
      setLoading(true);

      const [balanceData, usageData] = await Promise.all([
        getTokenBalance(),
        getTokenUsage("month"),
      ]);
      setTokenStats(balanceData);
      setUsageData(usageData);
    } catch (error) {
      console.error("Error fetching token data:", error);
      toast({
        title: "Error",
        description: "Failed to load token data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    fetchTokenData();
  }, [userId, isLoaded, router]);

  const handleRefresh = () => {
    fetchTokenData();
  };

  const handleResetFreeTokens = async () => {
    try {
      await resetFreeTokens();
      toast({
        title: "Success",
        description: "Free tokens have been reset",
      });
      fetchTokenData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset free tokens",
        variant: "destructive",
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
    "#00F0FF",
    "#B026FF",
    "#FF2E9F",
    "#00C49F",
    "#FFBB28",
    "#0088FE",
  ];

  if (!mounted || loading) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto" />
            <div
              className="absolute inset-0 w-12 h-12 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto"
              style={{ animationDelay: "0.1s" }}
            />
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading your dashboard...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`min-h-screen bg-transparent `}
      variants={containerVariants}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <BreadcrumbsDefault />
      <div className="max-w-7xl mx-auto p-4 md:p-8 ">
        {/* Header */}
        <motion.div
          className="flex flex-col  md:flex-row md:items-center justify-between mb-10"
          variants={headerVariants}
        >
          <div>
            <motion.div
              className="flex items-center gap-3 mb-2"
              variants={headerVariants}
            >
              <div
                className={`hidden md:flex p-2 rounded-lg ${themeStyles.gradientPrimary}`}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F] bg-clip-text text-transparent">
                  Token Management
                </h1>
                <p
                  className={`text-lg ${themeStyles.descriptionText} mt-1 font-montserrat`}
                >
                  Manage your AI chatbot tokens and monitor usage analytics
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="flex gap-3 mt-6 md:mt-0"
            variants={headerVariants}
          >
            <Button
              variant="outline"
              onClick={handleRefresh}
              className={`group border ${themeStyles.border} ${themeStyles.hoverBorder} transition-all duration-300`}
            >
              <RefreshCw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
              Refresh
            </Button>
            <Button
              onClick={() => router.push("/web/pricing")}
              className={`group ${themeStyles.gradientBlue} text-white shadow-lg transition-all duration-300 hover:shadow-xl`}
            >
              <CreditCard className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              View Plans
              <ArrowRight className="hidden md:flex ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Token Balance Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
          variants={containerVariants}
        >
          {/* Available Tokens Card */}
          <motion.div variants={statCardVariants}>
            <motion.div whileHover="hover" variants={statCardVariants}>
              <Card
                className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
              >
                {/* Gradient Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="p-2 md:p-4 md:pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                        >
                          <Coins className="h-4 w-4 text-[#00F0FF]" />
                        </div>
                        <p className="text-sm font-medium text-[#00F0FF]">
                          Available Tokens
                        </p>
                      </div>
                      <p className="text-4xl font-bold bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F] bg-clip-text text-transparent mt-2">
                        {tokenStats?.availableTokens?.toLocaleString() || 0}
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        <Badge className=" text-blue-600 dark:text-blue-400 font-montserrat  backdrop-blur-sm bg-opacity-5">
                          <Shield className="h-3 w-3 mr-1 " />
                          Free:{" "}
                          {tokenStats?.freeTokensRemaining?.toLocaleString() ||
                            0}
                        </Badge>
                        <Badge className="text-purple-600 dark:text-purple-400  backdrop-blur-sm font-montserrat">
                          <Crown className="h-3 w-3 mr-1 " />
                          Purchased:{" "}
                          {tokenStats?.purchasedTokensRemaining?.toLocaleString() ||
                            0}
                        </Badge>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div
                        className={`p-2 md:p-3 rounded-xl ${themeStyles.gradientGold} bg-gradient-to-br shadow-lg`}
                      >
                        <Zap className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Tokens Used Card */}
          <motion.div variants={statCardVariants}>
            <motion.div whileHover="hover" variants={statCardVariants}>
              <Card
                className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
              >
                {/* Gradient Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="p-2 md:p-4 md:pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                        >
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Tokens Used (30 days)
                        </p>
                      </div>
                      <p className="text-4xl font-bold bg-gradient-to-r from-green-500 to-teal-600 bg-clip-text text-transparent mt-2 ">
                        {usageData?.totalUsage?.totalTokens?.toLocaleString() ||
                          0}
                      </p>
                      <div className="flex items-center gap-1 mt-4 font-montserrat">
                        <Rocket className="h-4 w-4 text-green-500 mr-1" />
                        <p className={`text-sm ${themeStyles.mutedText}`}>
                          {usageData?.totalUsage?.count || 0} requests processed
                        </p>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ rotate: -10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div
                        className={`p-2 md:p-3 rounded-xl ${themeStyles.gradientGreen} bg-gradient-to-br shadow-lg`}
                      >
                        <TrendingUp className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Free Tokens Reset Card */}
          <motion.div variants={statCardVariants}>
            <motion.div whileHover="hover" variants={statCardVariants}>
              <Card
                className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
              >
                {/* Gradient Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="p-2 md:p-4 md:pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                        >
                          <Clock className="h-4 w-4 text-purple-500" />
                        </div>
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400 ">
                          Free Tokens Reset
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        {tokenStats?.nextResetAt
                          ? formatDate(tokenStats.nextResetAt)
                          : "N/A"}
                      </p>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1 font-montserrat">
                          <span className={themeStyles.descriptionText}>
                            Free tokens used
                          </span>
                          <span className="font-medium bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                            {getTokenPercentage().toFixed(0)}%
                          </span>
                        </div>
                        <div
                          className={`w-full bg-gray-200/50 dark:bg-gray-800/50 rounded-full h-2 overflow-hidden backdrop-blur-sm`}
                        >
                          <motion.div
                            className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 h-full rounded-full shadow-lg"
                            initial={{ width: 0 }}
                            animate={{ width: `${getTokenPercentage()}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div
                        className={`p-2 md:p-3 rounded-xl ${themeStyles.gradientPurple} bg-gradient-to-br shadow-lg`}
                      >
                        <Calendar className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <motion.div variants={headerVariants}>
            <TabsList
              className={`grid grid-cols-2 md:grid-cols-4  w-full max-w-lg ${themeStyles.cardBg} p-1 min-h-max border ${themeStyles.border} backdrop-blur-sm`}
            >
              {[
                { value: "overview", icon: BarChart3, label: "Overview" },
                { value: "purchase", icon: CreditCard, label: "Buy Tokens" },
                { value: "usage", icon: ChartBar, label: "Analytics" },
                { value: "history", icon: History, label: "History" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`group relative flex items-center transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg`}
                >
                  <tab.icon className="h-4 w-4 mr-2 group-data-[state=active]:scale-110 transition-transform" />
                  {tab.label}
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              variants={containerVariants}
            >
              {/* Usage Chart */}
              <motion.div variants={cardVariants}>
                <motion.div whileHover="hover" variants={cardVariants}>
                  <Card
                    className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardHeader className="p-2 md:p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                        >
                          <BarChart className="h-5 w-5 text-blue-500" />
                        </div>
                        <CardTitle className={themeStyles.titleText}>
                          Daily Token Usage
                        </CardTitle>
                      </div>
                      <CardDescription
                        className={`${themeStyles.descriptionText} font-montserrat`}
                      >
                        Token consumption over the last 30 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 md:p-4">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={usageData?.dailyUsage || []}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={themeStyles.chartGrid}
                            />
                            <XAxis
                              dataKey="_id"
                              stroke={themeStyles.chartText}
                              tickFormatter={(value) =>
                                new Date(value).getDate().toString()
                              }
                            />
                            <YAxis stroke={themeStyles.chartText} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor:
                                  currentTheme === "dark" ? "#1f2937" : "white",
                                border: `1px solid ${themeStyles.border}`,
                                borderRadius: "8px",
                                backdropFilter: "blur(10px)",
                                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                              }}
                              formatter={(value) => [
                                `${value} tokens`,
                                "Usage",
                              ]}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="totalTokens"
                              stroke="url(#colorGradient)"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#3b82f6" }}
                              activeDot={{
                                r: 8,
                                fill: "#2563eb",
                                stroke: "#ffffff",
                                strokeWidth: 2,
                              }}
                            />
                            <defs>
                              <linearGradient
                                id="colorGradient"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                              >
                                <stop offset="0%" stopColor="#00F0FF" />
                                <stop offset="50%" stopColor="#B026FF" />
                                <stop offset="100%" stopColor="#FF2E9F" />
                              </linearGradient>
                            </defs>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Chatbot Usage Distribution */}
              <motion.div variants={cardVariants}>
                <motion.div whileHover="hover" variants={cardVariants}>
                  <Card
                    className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardHeader className="p-2 md:p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                        >
                          <ChartBar className="h-5 w-5 text-purple-500" />
                        </div>
                        <CardTitle className={themeStyles.titleText}>
                          Usage by Chatbot
                        </CardTitle>
                      </div>
                      <CardDescription
                        className={`${themeStyles.descriptionText} font-montserrat`}
                      >
                        Token consumption across your chatbots
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 md:p-4">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={usageData?.usageByChatbot || []}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ _id, percent }: any) =>
                                `${_id || "Unknown"}: ${(percent * 100).toFixed(
                                  0,
                                )}%`
                              }
                              outerRadius={80}
                              innerRadius={40}
                              fill="#8884d8"
                              dataKey="totalTokens"
                              paddingAngle={2}
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
                                backgroundColor:
                                  currentTheme === "dark" ? "#1f2937" : "white",
                                border: `1px solid ${themeStyles.border}`,
                                borderRadius: "8px",
                                backdropFilter: "blur(10px)",
                              }}
                              formatter={(value) => [
                                `${value} tokens`,
                                "Usage",
                              ]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Low Token Alert */}
            {tokenStats && tokenStats.availableTokens < 1000 && (
              <motion.div variants={cardVariants}>
                <motion.div
                  animate={{
                    scale: [1, 1.02, 1],
                    boxShadow: [
                      "0 0 20px rgba(245,158,11,0.1)",
                      "0 0 30px rgba(245,158,11,0.2)",
                      "0 0 20px rgba(245,158,11,0.1)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Card
                    className={`border-2 border-yellow-500/50 ${themeStyles.cardBg} backdrop-blur-lg shadow-xl`}
                  >
                    <CardContent className="p-2 md:p-4 pt-6">
                      <div className="flex items-start">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <div className="p-3 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                          </div>
                        </motion.div>
                        <div className="ml-4 flex-1">
                          <h3 className="font-bold text-yellow-800 dark:text-yellow-300 text-lg flex items-center">
                            <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                              Low Token Alert
                            </span>
                            <Badge className="ml-3 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                              Action Required
                            </Badge>
                          </h3>
                          <p className="text-yellow-700 dark:text-yellow-400 mt-2">
                            You have only{" "}
                            <span className="font-bold text-yellow-800 dark:text-yellow-300">
                              {tokenStats.availableTokens.toLocaleString()}
                            </span>{" "}
                            tokens remaining. Consider purchasing more tokens to
                            avoid interruption.
                          </p>
                          <div className="flex gap-3 mt-4">
                            <Button
                              onClick={() => setActiveTab("purchase")}
                              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Buy Tokens Now
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => router.push("/web/pricing")}
                              className="border-yellow-500/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 transition-all"
                            >
                              View Plans
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* Free Token Reset */}
            <motion.div variants={cardVariants}>
              <motion.div whileHover="hover" variants={cardVariants}>
                <Card
                  className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardHeader className="p-2 md:p-4 ">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                      >
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                      </div>
                      <CardTitle className={themeStyles.titleText}>
                        Free Token Management
                      </CardTitle>
                    </div>
                    <CardDescription
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      Your free tokens reset monthly. Next reset:{" "}
                      {tokenStats?.nextResetAt
                        ? formatDate(tokenStats.nextResetAt)
                        : "N/A"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 md:p-4 ">
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className={`font-medium ${themeStyles.titleText}`}>
                            Free Tokens Used
                          </p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
                            {(
                              10000 - (tokenStats?.freeTokensRemaining || 0)
                            ).toLocaleString()}{" "}
                            / 10,000
                          </p>
                          <p
                            className={`text-sm ${themeStyles.mutedText} mt-1 font-montserrat`}
                          >
                            {tokenStats?.freeTokensRemaining?.toLocaleString()}{" "}
                            tokens remaining
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleResetFreeTokens}
                          disabled={
                            new Date(tokenStats?.nextResetAt || 0) > new Date()
                          }
                          className={`group border ${themeStyles.border} ${themeStyles.hoverBorder} transition-all`}
                        >
                          <RefreshCw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                          {new Date(tokenStats?.nextResetAt || 0) > new Date()
                            ? "Reset Available Soon"
                            : "Reset Free Tokens"}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-montserrat">
                          <span className={themeStyles.descriptionText}>
                            Usage Progress
                          </span>
                          <span className="font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                            {getTokenPercentage().toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className={`w-full bg-gray-200/50 dark:bg-gray-800/50 rounded-full h-3 overflow-hidden backdrop-blur-sm`}
                        >
                          <motion.div
                            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full shadow-lg"
                            initial={{ width: 0 }}
                            animate={{ width: `${getTokenPercentage()}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                          {/* Progress glow effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Purchase Tab */}
          <TabsContent value="purchase">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className={`bg-transparent border ${themeStyles.border}`}>
                <CardHeader className="p-2 md:p-4 ">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${themeStyles.gradientBlue}`}
                    >
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className={themeStyles.titleText}>
                        Purchase More Tokens
                      </CardTitle>
                      <CardDescription
                        className={`${themeStyles.descriptionText} text-lg font-montserrat`}
                      >
                        Choose a token pack that fits your needs
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 md:p-4">
                  <TokenPurchase
                    currentBalance={tokenStats?.availableTokens || 0}
                    onSuccess={fetchTokenData}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="usage" className="space-y-8">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={containerVariants}
            >
              {[
                {
                  title: "Total Tokens Used",
                  value: usageData?.totalUsage?.totalTokens,
                  icon: Coins,
                  color: "blue",
                },
                {
                  title: "Total Requests",
                  value: usageData?.totalUsage?.count,
                  icon: BarChart,
                  color: "green",
                },
                {
                  title: "Estimated Cost",
                  value: `₹${(usageData?.totalUsage?.totalCost || 0).toFixed(
                    2,
                  )}`,
                  icon: CreditCard,
                  color: "purple",
                },
                {
                  title: "Avg Tokens/Request",
                  value: usageData?.totalUsage?.count
                    ? Math.round(
                        usageData.totalUsage.totalTokens /
                          usageData.totalUsage.count,
                      )
                    : 0,
                  icon: TrendingUp,
                  color: "pink",
                },
              ].map((stat, index) => {
                const Icon = stat.icon;
                const colorMap: any = {
                  blue: "from-blue-500 to-cyan-600",
                  green: "from-green-500 to-teal-600",
                  purple: "from-purple-500 to-pink-600",
                  pink: "from-pink-500 to-rose-600",
                };

                return (
                  <motion.div key={index} variants={statCardVariants}>
                    <motion.div whileHover="hover" variants={statCardVariants}>
                      <Card
                        className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${
                            colorMap[stat.color]
                          }/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                        />

                        <CardContent className="pt-6 relative z-10 p-3 md:p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-3 rounded-xl bg-gradient-to-br ${
                                colorMap[stat.color]
                              } shadow-lg`}
                            >
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p
                                className={`text-sm ${themeStyles.descriptionText}`}
                              >
                                {stat.title}
                              </p>
                              <p
                                className={`text-2xl font-bold mt-1 ${themeStyles.titleText}`}
                              >
                                {stat.value?.toLocaleString() || 0}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div variants={cardVariants}>
              <motion.div whileHover="hover" variants={cardVariants}>
                <Card
                  className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardHeader className=" p-3 md:p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                      >
                        <ChartBar className="h-5 w-5 text-blue-500" />
                      </div>
                      <CardTitle className={`${themeStyles.titleText} `}>
                        Detailed Usage Statistics
                      </CardTitle>
                    </div>
                    <CardDescription
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      Breakdown of token usage by period
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-4">
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full">
                        <thead>
                          <tr
                            className={`border-b ${themeStyles.border} ${themeStyles.cardBg}`}
                          >
                            <th
                              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
                            >
                              Period
                            </th>
                            <th
                              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
                            >
                              Tokens Used
                            </th>
                            <th
                              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
                            >
                              Requests
                            </th>
                            <th
                              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
                            >
                              Avg/Request
                            </th>
                            <th
                              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
                            >
                              Date Range
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            className={`border-b ${themeStyles.border} hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors font-montserrat`}
                          >
                            <td className="py-4 px-6">Last 30 days</td>
                            <td className="py-4 px-6 font-medium">
                              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {usageData?.totalUsage?.totalTokens?.toLocaleString() ||
                                  0}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {usageData?.totalUsage?.count || 0}
                            </td>
                            <td className="py-4 px-6">
                              {usageData?.totalUsage?.count
                                ? Math.round(
                                    usageData.totalUsage.totalTokens /
                                      usageData.totalUsage.count,
                                  )
                                : 0}
                            </td>
                            <td className="py-4 px-6">
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
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <motion.div variants={cardVariants}>
              <motion.div whileHover="hover" variants={cardVariants}>
                <Card
                  className={`group relative overflow-hidden ${themeStyles.cardBg} border ${themeStyles.border} transition-all duration-300`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardHeader className=" p-3 md:p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconBgHover} transition-all`}
                      >
                        <History className="h-5 w-5 text-blue-500" />
                      </div>
                      <CardTitle className={themeStyles.titleText}>
                        Purchase History
                      </CardTitle>
                    </div>
                    <CardDescription
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      Your token purchase records
                    </CardDescription>
                  </CardHeader>
                  <CardContent className=" p-3 md:p-4">
                    <PurchaseHistory
                      userId={userId!}
                      themeStyles={themeStyles}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}

// Purchase History Component
function PurchaseHistory({
  userId,
  themeStyles,
}: {
  userId: string;
  themeStyles: any;
}) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, [userId]);

  const fetchPurchases = async () => {
    try {
      const result = await getPurchaseHistory();
      setPurchases(result.purchase || []);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto" />
          <div
            className="absolute inset-0 w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto"
            style={{ animationDelay: "0.1s" }}
          />
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Loading purchase history...
        </p>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="relative">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-gray-400 dark:text-gray-600" />
          </div>
          <div className="absolute inset-0 h-16 w-16 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full animate-ping mx-auto mb-4" />
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          No purchase history found
        </p>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-500 mt-2 font-montserrat ">
          Your purchase records will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full">
        <thead>
          <tr
            className={`border-b ${themeStyles.border} ${themeStyles.cardBg}`}
          >
            <th
              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
            >
              Date
            </th>
            <th
              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
            >
              Tokens
            </th>
            <th
              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
            >
              Amount
            </th>
            <th
              className={`text-left py-4 px-6 font-medium ${themeStyles.titleText}`}
            >
              Order ID
            </th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase, index) => (
            <motion.tr
              key={purchase._id}
              className={`group border-b ${themeStyles.border} hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors font-montserrat`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <td className="py-4 px-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 mr-3">
                    <Calendar className="h-4 w-4 text-blue-500" />
                  </div>
                  {new Date(purchase.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td className="py-4 px-6 font-medium">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {purchase.tokensPurchased.toLocaleString()}
                </span>
              </td>
              <td className="py-4 px-6">
                <div className="font-semibold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  ₹{purchase.amount.toLocaleString()}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-lg inline-block">
                  {purchase.razorpayOrderId?.slice(-8)}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
