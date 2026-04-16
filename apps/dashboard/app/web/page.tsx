// apps/dashboard/app/web/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Bot,
  Target,
  MessageCircle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Plus,
  Zap,
  Users,
  MessageSquare,
  Clock,
  TrendingUp,
  CheckCircle,
  Coins,
  ArrowUpRight,
  BarChart3,
  Settings,
  PlayCircle,
  AlertCircle,
  Loader2,
  Shield,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getChatbots,
  getTokenBalance,
  getTokenUsage,
  getConversations,
} from "@/lib/services/web-actions.api";
import {
  GateScreen,
  Orbs,
  Spinner,
  StatCard,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { formatDistanceToNow } from "date-fns";

interface ChatbotOverview {
  id: string;
  type: string;
  name: string;
  isBuilt: boolean;
  conversations: number;
  totalMessages: number;
  lastActive: string;
  status: "active" | "inactive" | "building";
  description?: string;
  analytics?: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    satisfactionScore: number;
  };
}

interface TokenStats {
  availableTokens: number;
  freeTokensRemaining: number;
  purchasedTokensRemaining: number;
  totalTokensUsed: number;
  freeTokens: number;
  purchasedTokens: number;
  usedFreeTokens: number;
  usedPurchasedTokens: number;
  nextResetAt: string;
}

export default function WebDashboardPage() {
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [chatbots, setChatbots] = useState<ChatbotOverview[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalStats, setTotalStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    activeChatbots: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
  });

  const loadDashboard = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [chatbotsData, tokenBalanceRes, tokenUsageRes] = await Promise.all([
        getChatbots(apiRequest),
        getTokenBalance(apiRequest),
        getTokenUsage(apiRequest, "month").catch(() => null),
      ]);

      // Process token data
      const tokenBalance = tokenBalanceRes?.data || tokenBalanceRes || {};
      const tokenUsage = tokenUsageRes?.data || tokenUsageRes || {};

      const processedTokenStats: TokenStats = {
        availableTokens: tokenBalance.availableTokens || 0,
        freeTokensRemaining: tokenBalance.freeTokensRemaining || 0,
        purchasedTokensRemaining: tokenBalance.purchasedTokensRemaining || 0,
        totalTokensUsed:
          tokenBalance.totalTokensUsed ||
          tokenUsage?.totalUsage?.totalTokens ||
          0,
        freeTokens: tokenBalance.freeTokens || 10000,
        purchasedTokens: tokenBalance.purchasedTokens || 0,
        usedFreeTokens: tokenBalance.usedFreeTokens || 0,
        usedPurchasedTokens: tokenBalance.usedPurchasedTokens || 0,
        nextResetAt:
          tokenBalance.nextResetAt ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setTokenStats(processedTokenStats);

      // Transform chatbot data
      const chatbotList: ChatbotOverview[] = [];
      let totalConvs = 0;
      let totalMsgs = 0;
      let totalResponseTime = 0;
      let chatbotCount = 0;

      if (chatbotsData?.chatbots?.length) {
        for (const bot of chatbotsData.chatbots) {
          // Fetch conversations for each chatbot to get accurate stats
          let conversations = [];
          let totalConvCount = 0;
          let totalMsgCount = 0;
          try {
            const convRes = await getConversations(
              apiRequest,
              bot.type,
              1000,
              0,
            ); // Get more conversations

            conversations = convRes?.conversations || [];
            totalConvCount = conversations.length;
            totalMsgCount = conversations.reduce(
              (sum: any, conv: any) =>
                sum + (conv.totalMessages || conv.messages?.length || 0),
              0,
            );
          } catch (err) {
            console.warn(`Failed to fetch conversations for ${bot.type}:`, err);
          }

          const convCount = totalConvCount;
          const msgCount = totalMsgCount;
          const analytics = bot.analytics || {};

          totalConvs += convCount;
          totalMsgs += msgCount;
          if (analytics.averageResponseTime) {
            totalResponseTime += analytics.averageResponseTime;
            chatbotCount++;
          }

          chatbotList.push({
            id: bot._id || bot.id,
            type: bot.type,
            name: bot.name || getChatbotName(bot.type),
            isBuilt: true,
            conversations: convCount,
            totalMessages: msgCount,
            lastActive:
              bot.updatedAt || bot.createdAt || new Date().toISOString(),
            status: bot.isActive ? "active" : "inactive",
            description: getChatbotDescription(bot.type),
            analytics: {
              totalConversations: convCount,
              totalMessages: msgCount,
              averageResponseTime: analytics.averageResponseTime || 0,
              satisfactionScore: analytics.satisfactionScore || 0,
            },
          });
        }
      }

      // Add placeholders for not built chatbots
      const requiredTypes = [
        { type: "chatbot-lead-generation", name: "Lead Generation" },
        { type: "chatbot-education", name: "Education (MCQ)" },
      ];

      requiredTypes.forEach(({ type, name }) => {
        if (!chatbotList.some((bot) => bot.type === type)) {
          chatbotList.push({
            id: type,
            type,
            name,
            isBuilt: false,
            conversations: 0,
            totalMessages: 0,
            lastActive: new Date().toISOString(),
            status: "inactive",
            description: getChatbotDescription(type),
          });
        }
      });

      // Sort: built chatbots first, then alphabetically
      chatbotList.sort((a, b) => {
        if (a.isBuilt === b.isBuilt) {
          return a.name.localeCompare(b.name);
        }
        return a.isBuilt ? -1 : 1;
      });

      setChatbots(chatbotList);

      // Calculate total stats
      const activeChatbots = chatbotList.filter(
        (bot) => bot.isBuilt && bot.status === "active",
      ).length;

      setTotalStats({
        totalConversations: totalConvs,
        totalMessages: totalMsgs,
        activeChatbots,
        totalTokensUsed: processedTokenStats.totalTokensUsed,
        averageResponseTime:
          chatbotCount > 0 ? Math.round(totalResponseTime / chatbotCount) : 0,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data");
      toast({
        title: "Failed to load dashboard",
        description: "Please try refreshing the page",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    if (isLoaded && userId) {
      loadDashboard();
    }
  }, [isLoaded, userId, loadDashboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboard();
  };

  const getChatbotIcon = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return Target;
      case "chatbot-education":
        return GraduationCap;
      default:
        return Bot;
    }
  };

  const getChatbotGradient = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return "from-purple-500 to-pink-500";
      case "chatbot-education":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getChatbotName = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return "Lead Generation";
      case "chatbot-education":
        return "Education (MCQ)";
      default:
        return "Chatbot";
    }
  };

  const getChatbotDescription = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return "Capture and qualify leads automatically with AI-powered conversations";
      case "chatbot-education":
        return "Create interactive MCQ quizzes and track student progress";
      default:
        return "AI-powered chatbot for your business";
    }
  };

  const getChatbotRoute = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return "/web/chatbot-lead-generation";
      case "chatbot-education":
        return "/web/chatbot-education";
      default:
        return "/web";
    }
  };

  const getBuildRoute = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return "/web/chatbot-lead-generation/create";
      case "chatbot-education":
        return "/web/chatbot-education/create";
      default:
        return "/web";
    }
  };

  const formatLastActive = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "Never";
    }
  };

  const getTokenPercentage = () => {
    if (!tokenStats) return 0;
    const totalFree = tokenStats.freeTokens || 10000;
    const usedFree = tokenStats.usedFreeTokens || 0;
    return Math.min(100, Math.max(0, (usedFree / totalFree) * 100));
  };

  if (!isLoaded) {
    return <Spinner label="Loading..." />;
  }

  if (!userId) {
    return (
      <GateScreen
        icon={<Bot className="h-8 w-8 text-purple-400" />}
        title="Sign in to Continue"
        body="Please sign in to access your chatbot dashboard."
      >
        <Link href="/sign-in" className={styles.pill}>
          Sign In <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (isLoading) {
    return <Spinner label="Loading your dashboard…" />;
  }

  if (error) {
    return (
      <GateScreen
        icon={<AlertCircle className="h-8 w-8 text-red-400" />}
        title="Error loading dashboard"
        body={error}
      >
        <button onClick={loadDashboard} className={styles.pill}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </GateScreen>
    );
  }

  const availableTokens = tokenStats?.availableTokens || 0;
  const isLowTokens = availableTokens < 1000;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Hero Card */}
        <div
          className={`${styles.card} p-4 md:p-8 lg:p-10 relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Sparkles
                  className={`h-6 w-6 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                />
                <h1
                  className={`text-2xl md:text-3xl font-black ${styles.text.primary}`}
                >
                  AI Chatbot Dashboard
                </h1>
              </div>
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
                Refresh
              </button>
            </div>
            <p
              className={`${styles.text.secondary} text-sm max-w-2xl mt-3 mb-6 leading-relaxed`}
            >
              Build intelligent chatbots for lead generation and education.
              Automate conversations, capture leads, and engage with your
              audience 24/7.
            </p>

            {/* Token Balance Bar */}
            <div className="flex flex-wrap items-center gap-4">
              <div
                className={`inline-flex items-center gap-3 rounded-full px-4 py-2 ${
                  isLowTokens ? styles.badge.amber : styles.badge.purple
                }`}
              >
                <Coins
                  className={`h-4 w-4 ${isLowTokens ? "text-amber-500" : "text-purple-400"}`}
                />
                <span className={`text-sm font-medium ${styles.text.primary}`}>
                  {availableTokens.toLocaleString()} tokens available
                </span>
                <Link
                  href="/web/tokens"
                  className={`text-xs font-semibold ${styles.text.primary} hover:opacity-80`}
                >
                  Buy more →
                </Link>
              </div>

              {/* Token Usage Progress */}
              <div className="flex items-center gap-2">
                <span className={`text-xs ${styles.text.muted}`}>
                  Free tokens used:{" "}
                  {tokenStats?.usedFreeTokens?.toLocaleString() || 0} /{" "}
                  {tokenStats?.freeTokens?.toLocaleString() || 10000}
                </span>
                <div
                  className={`w-32 h-2 rounded-full ${isDark ? "bg-white/[0.08]" : "bg-gray-200"}`}
                >
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${getTokenPercentage()}%` }}
                  />
                </div>
              </div>

              {isLowTokens && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                  <AlertTriangle className="h-3 w-3" />
                  Low token balance
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            iconBg={styles.icon.purple}
            label="Active Chatbots"
            icon={<Bot className="h-5 w-5 text-purple-400" />}
            value={`${totalStats.activeChatbots} / ${chatbots.length}`}
          />

          <StatCard
            iconBg={styles.icon.blue}
            label="Total Conversations"
            icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
            value={totalStats.totalConversations.toLocaleString()}
          />

          <StatCard
            iconBg={styles.icon.green}
            label="Total Messages"
            icon={<MessageCircle className="h-5 w-5 text-green-400" />}
            value={totalStats.totalMessages.toLocaleString()}
          />

          <StatCard
            iconBg={styles.icon.amber}
            label="Tokens Used (30d)"
            icon={<Coins className="h-5 w-5 text-amber-400" />}
            value={totalStats.totalTokensUsed.toLocaleString()}
          />
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${styles.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className={`text-xs ${styles.text.secondary}`}>
                Avg Response Time
              </span>
            </div>
            <p className={`text-xl font-bold ${styles.text.primary}`}>
              {totalStats.averageResponseTime}s
            </p>
          </div>

          <div className={`${styles.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <span className={`text-xs ${styles.text.secondary}`}>
                Free Tokens Left
              </span>
            </div>
            <p className={`text-xl font-bold ${styles.text.primary}`}>
              {tokenStats?.freeTokensRemaining?.toLocaleString() || 0}
            </p>
          </div>

          <div className={`${styles.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span className={`text-xs ${styles.text.secondary}`}>
                Next Reset
              </span>
            </div>
            <p className={`text-sm font-medium ${styles.text.primary}`}>
              {tokenStats?.nextResetAt
                ? new Date(tokenStats.nextResetAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Chatbots Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`text-base font-bold flex items-center gap-2 ${styles.text.primary}`}
            >
              <Bot className="h-4 w-4 text-purple-400" />
              Your Chatbots
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chatbots.map((chatbot) => {
              const Icon = getChatbotIcon(chatbot.type);
              const gradient = getChatbotGradient(chatbot.type);
              const route = getChatbotRoute(chatbot.type);
              const buildRoute = getBuildRoute(chatbot.type);

              return (
                <div key={chatbot.type} className={`${styles.card} p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    {chatbot.isBuilt ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          chatbot.status === "active"
                            ? styles.badge.green
                            : styles.badge.gray
                        }`}
                      >
                        <CheckCircle className="h-3 w-3" />
                        {chatbot.status === "active" ? "Active" : "Inactive"}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.gray}`}
                      >
                        Not Built
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-xl font-bold mb-2 ${styles.text.primary}`}
                  >
                    {chatbot.name}
                  </h3>

                  <p className={`text-sm mb-4 ${styles.text.secondary}`}>
                    {chatbot.description}
                  </p>

                  {chatbot.isBuilt ? (
                    <div className="space-y-4">
                      {/* Stats Row */}
                      <div className="flex flex-wrap gap-3">
                        <div className={`${styles.innerCard} p-3 rounded-lg`}>
                          <p className={`text-xs ${styles.text.muted}`}>
                            Conversations
                          </p>
                          <p
                            className={`text-lg font-bold ${styles.text.primary}`}
                          >
                            {chatbot.conversations.toLocaleString()}
                          </p>
                        </div>
                        <div className={`${styles.innerCard} p-3 rounded-lg`}>
                          <p className={`text-xs ${styles.text.muted}`}>
                            Messages
                          </p>
                          <p
                            className={`text-lg font-bold ${styles.text.primary}`}
                          >
                            {chatbot.totalMessages.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Last Active */}
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-3.5 w-3.5 ${styles.text.muted}`} />
                        <span className={`text-xs ${styles.text.muted}`}>
                          Last active {formatLastActive(chatbot.lastActive)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <Link
                          href={route}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}
                        >
                          <PlayCircle className="h-4 w-4" />
                          Open Dashboard
                        </Link>
                        <Link
                          href={`/web/${chatbot.type}/settings`}
                          className={`p-2.5 rounded-xl transition-colors ${
                            isDark
                              ? "hover:bg-white/[0.06] text-white/70"
                              : "hover:bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        href={buildRoute}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}
                      >
                        <Plus className="h-4 w-4" />
                        Build Now
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`${styles.card} p-5`}>
          <h3 className={`text-base font-semibold mb-4 ${styles.text.primary}`}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/web/tokens"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${styles.innerCard} ${styles.rowHover}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${styles.icon.amber}`}
              >
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  Buy Tokens
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Add more tokens to your account
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 transition-colors ${styles.text.muted} group-hover:text-amber-500`}
              />
            </Link>

            <Link
              href="/web/tokens?tab=usage"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${styles.innerCard} ${styles.rowHover}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${styles.icon.blue}`}
              >
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  View Analytics
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Track token usage and stats
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 transition-colors ${styles.text.muted} group-hover:text-blue-500`}
              />
            </Link>

            <Link
              href="/web/refer"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${styles.innerCard} ${styles.rowHover}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${styles.icon.pink}`}
              >
                <Users className="h-5 w-5 text-pink-500" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  Refer & Earn
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Get free tokens by referring
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 transition-colors ${styles.text.muted} group-hover:text-pink-500`}
              />
            </Link>

            <Link
              href="/web/settings"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${styles.innerCard} ${styles.rowHover}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${styles.icon.purple}`}
              >
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  Settings
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Configure preferences
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 transition-colors ${styles.text.muted} group-hover:text-purple-500`}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
