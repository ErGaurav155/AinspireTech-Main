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
  AlertTriangle,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAnalytics,
  getConversations,
  getChatbots,
} from "@/lib/services/web-actions.api";
import { formatDistanceToNow } from "date-fns";
import { Orbs, Spinner, useThemeStyles } from "@rocketreplai/ui";

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
  const { styles, isDark } = useThemeStyles();

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
  }, [chatbotType, isLoaded, userId, loadChatbot, loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Error state
  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FA]"}`}
      >
        <div className="text-center">
          <div
            className={`w-16 h-16 rounded-full ${isDark ? "bg-red-500/20 border border-red-500/30" : "bg-red-100"} flex items-center justify-center mx-auto mb-4`}
          >
            <Bot
              className={`h-8 w-8 ${isDark ? "text-red-400" : "text-red-500"}`}
            />
          </div>
          <h3 className={`text-lg font-semibold ${styles.text.primary} mb-2`}>
            Error Loading Dashboard
          </h3>
          <p className={`text-sm ${styles.text.secondary} mb-4`}>{error}</p>
          <button
            onClick={handleRefresh}
            className={`px-4 py-2 rounded-xl text-sm ${isDark ? "bg-purple-500/80 hover:bg-purple-500 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !displayInfo) {
    return <Spinner label="Loading dashboard..." />;
  }

  // Not built state
  if (chatbot && !chatbot.isBuilt) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="p-12 text-center">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${displayInfo.gradient} flex items-center justify-center mx-auto mb-6 ${isDark ? "opacity-90" : ""}`}
          >
            <displayInfo.icon className="h-10 w-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build Your {displayInfo.name}
          </h2>
          <p
            className={`text-sm ${styles.text.secondary} max-w-md mx-auto mb-8`}
          >
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
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header with refresh */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${displayInfo.gradient} flex items-center justify-center ${isDark ? "opacity-90" : ""} shadow-lg`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${styles.text.primary}`}>
                {displayInfo.name}
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {isLeadGeneration
                  ? "Track and manage your leads"
                  : "Monitor student progress and engagement"}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${styles.pill} disabled:opacity-50`}
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

            return (
              <div key={stat.key} className={`${styles.card} p-5`}>
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl ${styles.icon[primaryColor as keyof typeof styles.icon] || styles.icon.purple} flex items-center justify-center`}
                  >
                    <StatIcon
                      className={
                        isDark
                          ? `text-${primaryColor}-400`
                          : `text-${primaryColor}-600`
                      }
                    />
                  </div>
                </div>
                <p className={`text-xs ${styles.text.secondary} mb-1`}>
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {typeof value === "number" ? value.toLocaleString() : value}
                  {stat.suffix || ""}
                </p>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className={`${styles.card} overflow-hidden`}>
          <div
            className={`p-5 border-b ${styles.divider} flex items-center justify-between`}
          >
            <div className="flex items-center gap-2">
              {isLeadGeneration ? (
                <Target
                  className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                />
              ) : (
                <Users
                  className={`h-4 w-4 ${isDark ? "text-green-400" : "text-green-500"}`}
                />
              )}
              <h3 className={`text-sm font-bold ${styles.text.primary}`}>
                {isLeadGeneration ? "Recent Leads" : "Recent Student Responses"}
              </h3>
            </div>
            <Link
              href={
                isLeadGeneration
                  ? `/web/${chatbotId}/conversations`
                  : `/web/${chatbotId}/responses`
              }
              className={`text-xs font-semibold flex items-center gap-1 hover:opacity-80 ${isDark ? `text-${primaryColor}-400` : `text-${primaryColor}-500`}`}
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className={`divide-y ${styles.divider}`}>
            {recentItems.length > 0 ? (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors ${styles.divider}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${isLeadGeneration ? "from-purple-100 to-pink-100" : "from-green-100 to-emerald-100"} ${isDark ? "opacity-90" : ""} flex items-center justify-center flex-shrink-0`}
                    >
                      {isLeadGeneration ? (
                        <User
                          className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                        />
                      ) : (
                        <GraduationCap
                          className={`h-5 w-5 ${isDark ? "text-green-400" : "text-green-600"}`}
                        />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        {item.name || item.studentName}
                      </p>
                      {isLeadGeneration ? (
                        <div
                          className={`flex items-center gap-3 mt-1 text-xs ${styles.text.secondary}`}
                        >
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
                        <p className={`text-xs ${styles.text.secondary}`}>
                          Score: {item.score}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLeadGeneration ? (
                      <>
                        {item.service && (
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
                          >
                            {item.service}
                          </span>
                        )}
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                            item.status === "qualified"
                              ? styles.badge.green
                              : styles.badge.blue
                          }`}
                        >
                          {item.status}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                          item.score >= 80
                            ? styles.badge.green
                            : styles.badge.purple
                        }`}
                      >
                        {item.score >= 80 ? "Passed" : "Review Needed"}
                      </span>
                    )}
                    <span className={`text-xs ${styles.text.muted}`}>
                      {formatDistanceToNow(
                        new Date(item.date || item.timestamp),
                        { addSuffix: true },
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Users
                  className={`h-8 w-8 mx-auto mb-3 ${styles.text.muted}`}
                />
                <p className={`text-sm ${styles.text.muted}`}>
                  {isLeadGeneration
                    ? "No leads yet"
                    : "No student responses yet"}
                </p>
                <p className={`text-xs mt-1 ${styles.text.muted}`}>
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
                className={`${styles.card} p-5 hover:border-${primaryColor}-200 hover:shadow-sm transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${styles.icon[primaryColor as keyof typeof styles.icon] || styles.icon.purple} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <ActionIcon
                      className={
                        isDark
                          ? `text-${primaryColor}-400`
                          : `text-${primaryColor}-600`
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${styles.text.primary} mb-1`}>
                      {action.label}
                    </h4>
                    <p className={`text-xs ${styles.text.muted}`}>
                      Click to manage
                    </p>
                  </div>
                  <ArrowUpRight
                    className={`h-5 w-5 transition-colors ${isDark ? "text-white/20 group-hover:text-${primaryColor}-400" : "text-gray-300 group-hover:text-${primaryColor}-400"}`}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Additional Info Card */}
        <div
          className={`${isDark ? `bg-${primaryColor}-500/10 border border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border border-${primaryColor}-200`} rounded-2xl p-6`}
        >
          <div className="flex items-start gap-4">
            <div
              className={` hidden md:inline-flex w-12 h-12 rounded-xl ${isDark ? `bg-${primaryColor}-500/20 border border-${primaryColor}-500/30` : `bg-${primaryColor}-100`} flex items-center justify-center`}
            >
              <Sparkles
                className={
                  isDark
                    ? `text-${primaryColor}-400`
                    : `text-${primaryColor}-600`
                }
              />
            </div>
            <div className="flex-1">
              <h3
                className={` text-lg font-semibold ${isDark ? `text-${primaryColor}-400` : `text-${primaryColor}-800`} mb-2`}
              >
                {isLeadGeneration
                  ? "Pro Tip: Qualify Leads Faster"
                  : "Pro Tip: Engage Students Better"}
              </h3>
              <p
                className={`text-sm ${isDark ? `text-${primaryColor}-400/80` : `text-${primaryColor}-700`}`}
              >
                {isLeadGeneration
                  ? "Use custom questions to qualify leads automatically. Add specific fields to capture exactly what you need."
                  : "Add more questions with varying difficulty levels to keep students engaged. Track performance by category."}
              </p>
              <button
                className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isDark
                    ? `bg-${primaryColor}-500/80 hover:bg-${primaryColor}-500 text-white`
                    : `bg-${primaryColor}-500 hover:bg-${primaryColor}-600 text-white`
                }`}
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
