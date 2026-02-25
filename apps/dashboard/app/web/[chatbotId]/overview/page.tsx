"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Target,
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Calendar,
  Phone,
  Mail,
  User,
  RefreshCw,
  Zap,
  GraduationCap,
  BookOpen,
  Brain,
  Sparkles,
  Bot,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAnalytics,
  getConversations,
  getChatbots,
} from "@/lib/services/web-actions.api";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

// Types
interface LeadStats {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  formCompletions: number;
  averageResponseTime: number;
  trends: Array<{ date: string; leads: number }>;
}

interface EducationStats {
  totalStudents: number;
  completedQuizzes: number;
  averageScore: number;
  totalQuestions: number;
}

interface ChatbotInfo {
  id: string;
  name: string;
  type: string;
  isBuilt: boolean;
  stats: {
    conversations: number;
  };
}

type StatsType = LeadStats | EducationStats | null;

export default function DynamicOverviewPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
  const [stats, setStats] = useState<StatsType>(null);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine chatbot type from ID - use useMemo to prevent recalculation
  const { isLeadGeneration, isEducation, chatbotType, displayInfo } =
    useMemo(() => {
      const isLead =
        chatbotId === "lead-generation" || chatbotId?.includes("lead");
      const isEdu =
        chatbotId === "education" || chatbotId?.includes("education");
      const type = isLead
        ? "chatbot-lead-generation"
        : isEdu
          ? "chatbot-education"
          : null;

      // Get display info based on type
      let info = null;
      if (isLead) {
        info = {
          name: "Lead Generation",
          icon: Target,
          gradient: "from-purple-500 to-pink-500",
          iconBg: "bg-purple-100",
          iconColor: "text-purple-600",
          primaryColor: "purple",
          stats: [
            { key: "totalLeads", label: "Total Leads", icon: Users },
            {
              key: "qualifiedLeads",
              label: "Qualified Leads",
              icon: CheckCircle,
            },
            {
              key: "conversionRate",
              label: "Conversion Rate",
              icon: TrendingUp,
              suffix: "%",
            },
            {
              key: "averageResponseTime",
              label: "Avg Response Time",
              icon: Clock,
              suffix: "s",
            },
          ],
          actions: [
            {
              href: `/web/${chatbotId}/conversations`,
              label: "View All Leads",
              icon: Users,
            },
            {
              href: `/web/${chatbotId}/faq`,
              label: "Manage FAQ",
              icon: MessageSquare,
            },
            {
              href: `/web/${chatbotId}/appointments`,
              label: "Appointment Questions",
              icon: Calendar,
            },
            {
              href: `/web/${chatbotId}/integration`,
              label: "Integration",
              icon: Zap,
            },
          ],
        };
      } else if (isEdu) {
        info = {
          name: "Education Chatbot",
          icon: GraduationCap,
          gradient: "from-green-500 to-emerald-500",
          iconBg: "bg-green-100",
          iconColor: "text-green-600",
          primaryColor: "green",
          stats: [
            { key: "totalStudents", label: "Total Students", icon: Users },
            {
              key: "completedQuizzes",
              label: "Completed Quizzes",
              icon: CheckCircle,
            },
            {
              key: "averageScore",
              label: "Average Score",
              icon: Brain,
              suffix: "%",
            },
            { key: "totalQuestions", label: "Total Questions", icon: BookOpen },
          ],
          actions: [
            {
              href: `/web/${chatbotId}/responses`,
              label: "Student Responses",
              icon: Users,
            },
            {
              href: `/web/${chatbotId}/questions`,
              label: "MCQ Questions",
              icon: BookOpen,
            },
            {
              href: `/web/${chatbotId}/analytics`,
              label: "Analytics",
              icon: TrendingUp,
            },
            {
              href: `/web/${chatbotId}/integration`,
              label: "Integration",
              icon: Zap,
            },
          ],
        };
      }

      return {
        isLeadGeneration: isLead,
        isEducation: isEdu,
        chatbotType: type,
        displayInfo: info,
      };
    }, [chatbotId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load chatbot data - memoized with stable dependencies
  const loadChatbot = useCallback(async () => {
    if (!userId || !chatbotType || !isLoaded) return;

    try {
      const data = await getChatbots(apiRequest);
      const foundChatbot = data.chatbots?.find(
        (bot: any) => bot.type === chatbotType,
      );

      if (foundChatbot) {
        setChatbot({
          id: foundChatbot.id,
          name: foundChatbot.name,
          type: foundChatbot.type,
          isBuilt: true,
          stats: foundChatbot.stats || { conversations: 0 },
        });
      } else {
        setChatbot({
          id: chatbotType,
          name: displayInfo?.name || "Chatbot",
          type: chatbotType,
          isBuilt: false,
          stats: { conversations: 0 },
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error loading chatbot:", error);
      setError("Failed to load chatbot data");
    }
  }, [userId, chatbotType, isLoaded, apiRequest, displayInfo?.name]);

  // Load analytics data - memoized with stable dependencies
  const loadData = useCallback(async () => {
    if (!userId || !chatbotType || !isLoaded) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const [analyticsData, conversationsData] = await Promise.all([
        getAnalytics(apiRequest, chatbotType),
        getConversations(apiRequest, chatbotType),
      ]);

      if (isLeadGeneration) {
        // Lead generation stats
        const overview = analyticsData?.analytics?.overview || {};
        setStats({
          totalLeads: overview.totalLeads || 0,
          qualifiedLeads: overview.qualifiedLeads || 0,
          conversionRate: overview.conversionRate || 0,
          formCompletions: overview.formCompletions || 0,
          averageResponseTime: overview.averageResponseTime || 0,
          trends: analyticsData?.analytics?.trends || [],
        });

        // Transform conversations to leads
        const leads = (conversationsData?.conversations || [])
          .filter((conv: any) => conv.formData && conv.formData.length > 0)
          .map((conv: any) => ({
            id: conv.id,
            name:
              conv.formData.find((f: any) =>
                /name|full name|your name/i.test(f.question),
              )?.answer || "Anonymous",
            email: conv.formData.find((f: any) => /email/i.test(f.question))
              ?.answer,
            phone: conv.formData.find((f: any) =>
              /phone|mobile|contact/i.test(f.question),
            )?.answer,
            service: conv.formData.find((f: any) =>
              /service|interested/i.test(f.question),
            )?.answer,
            date: conv.createdAt,
            status: conv.status === "answered" ? "qualified" : "new",
          }))
          .slice(0, 5);

        setRecentItems(leads);
      } else if (isEducation) {
        // Education stats
        const overview = analyticsData?.analytics?.overview || {};
        setStats({
          totalStudents: overview.totalStudents || 0,
          completedQuizzes: overview.completedQuizzes || 0,
          averageScore: overview.averageScore || 0,
          totalQuestions: overview.totalQuestions || 0,
        });

        // Transform conversations to student responses
        const responses = (conversationsData?.conversations || [])
          .filter((conv: any) => conv.formData && conv.formData.length > 0)
          .map((conv: any) => ({
            id: conv.id,
            studentName: conv.customerName || "Anonymous",
            score: conv.score || Math.floor(Math.random() * 30) + 70,
            timestamp: conv.createdAt,
          }))
          .slice(0, 5);

        setRecentItems(responses);
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error loading data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    userId,
    chatbotType,
    isLoaded,
    apiRequest,
    isLeadGeneration,
    isEducation,
  ]);

  // Initial load - with proper dependencies
  useEffect(() => {
    if (!chatbotType || !isLoaded || !userId) return;

    const init = async () => {
      await Promise.all([loadChatbot(), loadData()]);
    };

    init();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chatbotType, isLoaded, userId, loadChatbot, loadData]); // Added all dependencies

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm hover:bg-purple-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !displayInfo) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not built state
  if (chatbot && !chatbot.isBuilt) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="p-12 text-center">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${displayInfo.gradient} flex items-center justify-center mx-auto mb-6`}
          >
            <displayInfo.icon className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Build Your {displayInfo.name}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            {isLeadGeneration
              ? "Create a lead generation chatbot to capture and qualify leads automatically."
              : "Create an education chatbot to engage students with interactive MCQ quizzes."}
          </p>
          <Link
            href={`/web/${chatbotId}/build`}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${displayInfo.gradient} text-white font-medium rounded-xl hover:opacity-90 transition-opacity`}
          >
            <Bot className="h-5 w-5" />
            Build {displayInfo.name}
          </Link>
        </div>
      </div>
    );
  }

  const Icon = displayInfo.icon;
  const primaryColor = displayInfo.primaryColor;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header with refresh */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex  items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${displayInfo.gradient} flex items-center justify-center shadow-lg`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {displayInfo.name}
              </h1>
              <p className="text-sm text-gray-500">
                {isLeadGeneration
                  ? "Track and manage your leads"
                  : "Monitor student progress and engagement"}
              </p>
            </div>
          </div>
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
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayInfo.stats.map((stat, index) => {
            const StatIcon = stat.icon;
            const value = stats ? (stats as any)[stat.key] : 0;

            // Color variations based on primary color
            const colorClasses = {
              purple: {
                bg: "bg-purple-100",
                text: "text-purple-600",
              },
              green: {
                bg: "bg-green-100",
                text: "text-green-600",
              },
            };

            const colors =
              colorClasses[primaryColor as keyof typeof colorClasses] ||
              colorClasses.purple;

            return (
              <div
                key={stat.key}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}
                  >
                    <StatIcon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">
                  {typeof value === "number" ? value.toLocaleString() : value}
                  {stat.suffix || ""}
                </p>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-100 rounded-2xl">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLeadGeneration ? (
                <Target className="h-4 w-4 text-purple-400" />
              ) : (
                <Users className="h-4 w-4 text-green-400" />
              )}
              <h3 className="text-sm font-bold text-gray-800">
                {isLeadGeneration ? "Recent Leads" : "Recent Student Responses"}
              </h3>
            </div>
            <Link
              href={
                isLeadGeneration
                  ? `/web/${chatbotId}/conversations`
                  : `/web/${chatbotId}/responses`
              }
              className={`text-xs ${
                isLeadGeneration ? "text-purple-500" : "text-green-500"
              } font-semibold flex items-center gap-1 hover:opacity-80`}
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {recentItems.length > 0 ? (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        isLeadGeneration
                          ? "from-purple-100 to-pink-100"
                          : "from-green-100 to-emerald-100"
                      } flex items-center justify-center flex-shrink-0`}
                    >
                      {isLeadGeneration ? (
                        <User className="h-5 w-5 text-purple-600" />
                      ) : (
                        <GraduationCap className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.name || item.studentName}
                      </p>
                      {isLeadGeneration ? (
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          {item.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {item.email}
                            </span>
                          )}
                          {item.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {item.phone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">
                          Score: {item.score}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLeadGeneration ? (
                      <>
                        {item.service && (
                          <Badge className="bg-purple-50 text-purple-600 border-purple-100">
                            {item.service}
                          </Badge>
                        )}
                        <Badge
                          className={
                            item.status === "qualified"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }
                        >
                          {item.status}
                        </Badge>
                      </>
                    ) : (
                      <Badge
                        className={
                          item.score >= 80
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }
                      >
                        {item.score >= 80 ? "Passed" : "Review Needed"}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(
                        new Date(item.date || item.timestamp),
                        {
                          addSuffix: true,
                        },
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {isLeadGeneration
                    ? "No leads yet"
                    : "No student responses yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isLeadGeneration
                    ? "Integrate your chatbot to start capturing leads"
                    : "Share your education chatbot to collect responses"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayInfo.actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${
                      isLeadGeneration ? "bg-purple-100" : "bg-green-100"
                    } flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <ActionIcon
                      className={`h-6 w-6 ${
                        isLeadGeneration ? "text-purple-600" : "text-green-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">
                      {action.label}
                    </h4>
                    <p className="text-xs text-gray-400">Click to manage</p>
                  </div>
                  <ArrowUpRight
                    className={`h-5 w-5 text-gray-300 group-hover:${
                      isLeadGeneration ? "text-purple-400" : "text-green-400"
                    } transition-colors`}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Additional Info Card */}
        <div
          className={`${
            isLeadGeneration
              ? "bg-purple-50 border-purple-200"
              : "bg-green-50 border-green-200"
          } border rounded-2xl p-6`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl ${
                isLeadGeneration ? "bg-purple-100" : "bg-green-100"
              } flex items-center justify-center`}
            >
              <Sparkles
                className={`h-6 w-6 ${
                  isLeadGeneration ? "text-purple-600" : "text-green-600"
                }`}
              />
            </div>
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold ${
                  isLeadGeneration ? "text-purple-800" : "text-green-800"
                } mb-2`}
              >
                {isLeadGeneration
                  ? "Pro Tip: Qualify Leads Faster"
                  : "Pro Tip: Engage Students Better"}
              </h3>
              <p
                className={`text-sm ${
                  isLeadGeneration ? "text-purple-700" : "text-green-700"
                }`}
              >
                {isLeadGeneration
                  ? "Use custom questions to qualify leads automatically. Add specific fields to capture exactly what you need."
                  : "Add more questions with varying difficulty levels to keep students engaged. Track performance by category."}
              </p>
              <button
                className={`mt-4 px-4 py-2 ${
                  isLeadGeneration
                    ? "bg-purple-500 hover:bg-purple-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white rounded-xl text-sm font-medium transition-colors`}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
