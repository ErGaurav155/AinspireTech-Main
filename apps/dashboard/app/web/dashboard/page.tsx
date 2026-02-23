"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getChatbots, getTokenBalance } from "@/lib/services/web-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";

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
  const isMounted = useRef(true);

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

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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

      if (!isMounted.current) return;

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
      if (!isMounted.current) return;
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data");
      toast({
        title: "Failed to load dashboard",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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
        return "/web/chatbot-lead-generation/overview";
      case "chatbot-education":
        return "/web/chatbot-education/overview";
      default:
        return "/web/dashboard";
    }
  };

  const getBuildRoute = (type: string) => {
    switch (type) {
      case "chatbot-lead-generation":
        return "/web/chatbot-lead-generation/build";
      case "chatbot-education":
        return "/web/chatbot-education/build";
      default:
        return "/web/dashboard";
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bot className="h-10 w-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Sign in to Continue
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access your chatbot dashboard.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-2xl">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">
            Error loading dashboard
          </p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800">Dashboard</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-600">Overview</span>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Hero Card */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-white to-pink-50/60 pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 opacity-50 blur-3xl pointer-events-none" />

          <div className="relative z-10 p-4 md:p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-purple-500" />
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">
                Welcome to AI Chatbots
              </h1>
            </div>
            <p className="text-gray-500 text-sm max-w-2xl mb-6 leading-relaxed">
              Build intelligent chatbots for lead generation and education.
              Automate conversations, capture leads, and engage with your
              audience 24/7.
            </p>

            {/* Token Balance */}
            <div className="inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1 sm:gap-2 bg-amber-50 border border-amber-200 rounded-full px-2 sm:px-4 py-2">
              <span className="flex items-center gap-1 text-xs md:text-sm font-medium text-amber-700">
                <Coins className="h-4 w-4 text-amber-500" />
                {tokenBalance.toLocaleString()} tokens available
              </span>
              <Link
                href="/web/tokens"
                className="text-xs font-medium sm:font-semibold text-amber-600 hover:text-amber-700 text-nowrap"
              >
                Buy more →
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                <Bot className="h-[18px] w-[18px] text-purple-600" />
              </div>
              <Badge variant="outline" className="text-xs">
                +{totalStats.activeChatbots}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-1">Active Chatbots</p>
            <p className="text-2xl font-bold text-gray-800">
              {totalStats.activeChatbots} / {chatbots.length}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-[18px] w-[18px] text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Total Conversations</p>
            <p className="text-2xl font-bold text-gray-800">
              {totalStats.totalConversations.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-[18px] w-[18px] text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Satisfaction Rate</p>
            <p className="text-2xl font-bold text-gray-800">
              {totalStats.satisfactionRate}%
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Coins className="h-[18px] w-[18px] text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Tokens Used</p>
            <p className="text-2xl font-bold text-gray-800">
              {totalStats.totalTokensUsed.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Chatbots Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
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
                <div
                  key={chatbot.id}
                  className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-gray-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    {chatbot.isBuilt ? (
                      <Badge className="bg-green-100 text-green-600 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-gray-400 border-gray-200"
                      >
                        Not Built
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {chatbot.name}
                  </h3>

                  <p className="text-sm text-gray-500 mb-4">
                    {chatbot.description}
                  </p>

                  {chatbot.isBuilt ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {chatbot.conversations} conversations
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 capitalize">
                            {chatbot.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={route}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Open Dashboard
                        </Link>
                        <Link
                          href={`/web/${chatbot.type.split("-")[2]}/settings`}
                          className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-purple-600 hover:border-purple-200 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        href={buildRoute}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
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
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/web/tokens"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Coins className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Buy Tokens</p>
                <p className="text-xs text-gray-400">Add more tokens</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-amber-500 ml-auto transition-colors" />
            </Link>

            <Link
              href="/web/analytics"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Analytics</p>
                <p className="text-xs text-gray-400">View detailed reports</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-purple-500 ml-auto transition-colors" />
            </Link>

            <Link
              href="/web/refer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Refer & Earn
                </p>
                <p className="text-xs text-gray-400">Get free tokens</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-pink-500 ml-auto transition-colors" />
            </Link>

            <Link
              href="/web/settings"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Settings</p>
                <p className="text-xs text-gray-400">Configure preferences</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 ml-auto transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
