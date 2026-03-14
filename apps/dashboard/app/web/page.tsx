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
import { getChatbots, getTokenBalance } from "@/lib/services/web-actions.api";
import {
  GateScreen,
  Orbs,
  Spinner,
  StatCard,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
interface ChatbotOverview {
  id: string;
  type: string;
  name: string;
  isBuilt: boolean;
  conversations: number;
  lastActive: string;
  status: "active" | "inactive" | "building";
  description?: string;
}

export default function WebDashboardPage() {
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [chatbots, setChatbots] = useState<ChatbotOverview[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalStats, setTotalStats] = useState({
    totalConversations: 0,
    activeChatbots: 0,
    totalTokensUsed: 0,
    satisfactionRate: 98,
  });

  const loadDashboard = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch chatbots and token balance
      const [chatbotsData, tokenData] = await Promise.all([
        getChatbots(apiRequest),
        getTokenBalance(apiRequest),
      ]);

      setTokenBalance(tokenData?.availableTokens || 0);

      // Transform chatbot data
      const chatbotList: ChatbotOverview[] = [];

      if (chatbotsData?.chatbots) {
        chatbotsData.chatbots.forEach((bot: any) => {
          chatbotList.push({
            id: bot.id,
            type: bot.type,
            name: bot.name,
            isBuilt: true,
            conversations: bot.stats?.conversations || 0,
            lastActive: bot.stats?.lastActive || new Date().toISOString(),
            status: bot.isActive ? "active" : "inactive",
            description: getChatbotDescription(bot.type),
          });
        });
      }

      // Add placeholders for not built chatbots
      const requiredTypes = [
        { type: "chatbot-lead-generation", name: "Lead Generation" },
        { type: "chatbot-education", name: "Education" },
      ];

      requiredTypes.forEach(({ type, name }) => {
        if (!chatbotList.some((bot) => bot.type === type)) {
          chatbotList.push({
            id: type,
            type,
            name,
            isBuilt: false,
            conversations: 0,
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
      const total = chatbotList.reduce(
        (acc, bot) => ({
          totalConversations: acc.totalConversations + bot.conversations,
          activeChatbots:
            acc.activeChatbots + (bot.status === "active" ? 1 : 0),
        }),
        { totalConversations: 0, activeChatbots: 0 },
      );

      setTotalStats((prev) => ({
        ...prev,
        ...total,
        totalTokensUsed: tokenData?.usedTokens || 0,
      }));
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data");
      toast({
        title: "Failed to load dashboard",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    if (isLoaded && userId) {
      loadDashboard();
    }
  }, [isLoaded, userId, loadDashboard]);

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
        return "/web/chatbot-lead-generation/build";
      case "chatbot-education":
        return "/web/chatbot-education/build";
      default:
        return "/web";
    }
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
          Try Again
        </button>
      </GateScreen>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Hero Card */}
        <div className={`${styles.card} p-4 md:p-8 lg:p-10`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles
                className={`h-6 w-6 ${isDark ? "text-purple-400" : "text-purple-500"}`}
              />
              <h1
                className={`text-2xl md:text-3xl font-black ${styles.text.primary}`}
              >
                Welcome to AI Chatbots
              </h1>
            </div>
            <p
              className={`${styles.text.secondary} text-sm max-w-2xl mb-6 leading-relaxed`}
            >
              Build intelligent chatbots for lead generation and education.
              Automate conversations, capture leads, and engage with your
              audience 24/7.
            </p>

            {/* Token Balance */}
            <div
              className={`inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1 sm:gap-2 rounded-full px-2 sm:px-4 py-2 ${styles.badge.amber}`}
            >
              <span
                className={`flex items-center gap-1 text-xs md:text-sm font-medium ${styles.text.primary}`}
              >
                <Coins className="h-4 w-4 text-amber-500" />
                {tokenBalance.toLocaleString()} tokens available
              </span>
              <Link
                href="/web/tokens"
                className={`text-xs font-medium sm:font-semibold ${styles.text.primary} hover:opacity-80 text-nowrap`}
              >
                Buy more →
              </Link>
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
            label="Satisfaction Rate"
            icon={<TrendingUp className="h-5 w-5 text-green-400" />}
            value={`${totalStats.satisfactionRate}%`}
          />

          <StatCard
            iconBg={styles.icon.amber}
            label="Tokens Used"
            icon={<Coins className="h-5 w-5 text-amber-400" />}
            value={totalStats.totalTokensUsed.toLocaleString()}
          />
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.green}`}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Active
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
                      <div
                        className={`flex items-center gap-4 text-sm ${styles.text.secondary}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4" />
                          <span>{chatbot.conversations} conversations</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span className="capitalize">{chatbot.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={route}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity ${styles.pill}`}
                        >
                          <PlayCircle className="h-4 w-4" />
                          Open Dashboard
                        </Link>
                        <Link
                          href={`/web/${chatbot.type.split("-")[2]}/settings`}
                          className={`p-2.5 rounded-xl transition-colors ${styles.pill}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        href={buildRoute}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity ${styles.pill}`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/web/tokens"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${styles.innerCard} ${styles.rowHover}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${styles.icon.amber}`}
              >
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  Buy Tokens
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Add more tokens
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 ml-auto transition-colors ${styles.text.muted} group-hover:text-amber-500`}
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
              <div>
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  Refer & Earn
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Get free tokens
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 ml-auto transition-colors ${styles.text.muted} group-hover:text-pink-500`}
              />
            </Link>

            <Link
              href="/web/settings"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${styles.innerCard} ${styles.rowHover}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${styles.icon.blue}`}
              >
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className={`text-sm font-medium ${styles.text.primary}`}>
                  Settings
                </p>
                <p className={`text-xs ${styles.text.muted}`}>
                  Configure preferences
                </p>
              </div>
              <ArrowUpRight
                className={`h-4 w-4 ml-auto transition-colors ${styles.text.muted} group-hover:text-blue-500`}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
