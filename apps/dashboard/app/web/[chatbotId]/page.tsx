"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Trash2,
  Loader2,
  ExternalLink,
  MessageCircle,
  Code2,
  Settings,
  Coins,
  Globe,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAnalytics,
  getConversations,
  getChatbots,
  deleteChatbot,
  getTokenBalance,
} from "@/lib/services/web-actions.api";
import { formatDistanceToNow } from "date-fns";
import { Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

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
  websiteUrl?: string;
  settings?: {
    primaryColor?: string;
    welcomeMessage?: string;
    position?: string;
  };
  stats: {
    conversations: number;
  };
  createdAt?: string;
}

type StatsType = LeadStats | EducationStats | null;

const CDN_URL =
  process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.rocketreplai.com";

export default function DynamicOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
  const [stats, setStats] = useState<StatsType>(null);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [tokenBalance, setTokenBalance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine chatbot type from ID - use useMemo to prevent recalculation
  const { isLeadGeneration, isEducation, chatbotType, displayInfo } =
    useMemo(() => {
      const isLead =
        chatbotId === "chatbot-lead-generation" || chatbotId?.includes("lead");
      const isEdu =
        chatbotId === "chatbot-education" || chatbotId?.includes("education");
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
              href: `/web/${chatbotId}/faq`,
              label: "FAQ Questions",
              icon: BookOpen,
            },
            {
              href: `/web/${chatbotId}/settings`,
              label: "Settings",
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
          id: foundChatbot.id || foundChatbot._id,
          name: foundChatbot.name,
          type: foundChatbot.type,
          isBuilt: true,
          websiteUrl: foundChatbot.websiteUrl,
          settings: foundChatbot.settings,
          stats: foundChatbot.stats || { conversations: 0 },
          createdAt: foundChatbot.createdAt,
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

      const [analyticsData, conversationsData, tokenData] = await Promise.all([
        getAnalytics(apiRequest, chatbotType),
        getConversations(apiRequest, chatbotType),
        getTokenBalance(apiRequest).catch(() => null),
      ]);

      if (tokenData) {
        setTokenBalance(tokenData);
      }

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
    if (
      chatbotId !== "chatbot-lead-generation" &&
      chatbotId !== "chatbot-education"
    ) {
      router.push("/web");
      return;
    }
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
    await Promise.all([loadChatbot(), loadData()]);
    setIsRefreshing(false);
    toast({
      title: "Dashboard Refreshed",
      description: "Latest data loaded successfully",
      duration: 2000,
    });
  };

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!chatbot) return;
    setIsDeleting(true);
    try {
      await deleteChatbot(apiRequest, chatbot.type);
      toast({
        title: "Chatbot deleted",
        description: "You can now create a new chatbot of this type",
        duration: 3000,
      });
      setShowDeleteConfirm(false);
      setChatbot(null);
      // Redirect to web page after deletion
      router.push("/web");
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
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
            href={`/web/${chatbotId}/create`}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${displayInfo.gradient} text-white font-medium rounded-xl hover:opacity-90 transition-opacity`}
          >
            <Bot className="h-5 w-5" />
            Build {displayInfo.name}
          </Link>
        </div>
      </div>
    );
  }

  if (
    chatbotId !== "chatbot-lead-generation" &&
    chatbotId !== "chatbot-education"
  ) {
    return null;
  }

  const Icon = displayInfo.icon;
  const primaryColor = displayInfo.primaryColor;
  const pc =
    chatbot?.settings?.primaryColor ||
    (isLeadGeneration ? "#8b5cf6" : "#10b981");
  const landingUrl =
    userId && chatbot?.isBuilt ? `${CDN_URL}/${userId}/${chatbotType}` : "";

  // Quick links configuration
  const quickLinks = [
    {
      label: "Conversations",
      desc: isLeadGeneration
        ? "View leads and bookings"
        : "View student responses",
      href: `/web/${chatbotType}/conversations`,
      icon: <MessageCircle className="h-5 w-5" />,
      color: pc,
    },
    {
      label: "FAQ",
      desc: "Knowledge base articles",
      href: `/web/${chatbotType}/faq`,
      icon: <MessageSquare className="h-5 w-5" />,
      color: "#1a56db",
    },
    ...(isLeadGeneration
      ? [
          {
            label: "Appointments",
            desc: "Booking form questions",
            href: `/web/${chatbotType}/appointments`,
            icon: <Calendar className="h-5 w-5" />,
            color: "#f59e0b",
          },
        ]
      : []),
    {
      label: "Integration",
      desc: "Embed code & landing URL",
      href: `/web/${chatbotType}/integration`,
      icon: <Code2 className="h-5 w-5" />,
      color: "#0891b2",
    },
    {
      label: "Settings",
      desc: "Name, colour, welcome msg",
      href: `/web/${chatbotType}/settings`,
      icon: <Settings className="h-5 w-5" />,
      color: "#6b7280",
    },
  ];

  const availableTokens =
    (tokenBalance?.freeTokens || 0) + (tokenBalance?.purchasedTokens || 0);

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Hero Header */}
        <div
          className={`rounded-3xl overflow-hidden bg-gradient-to-br ${displayInfo.gradient} p-6 relative`}
        >
          <div
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
            style={{ background: "rgba(255,255,255,0.5)" }}
          />
          <div
            className="absolute right-4 bottom-0 w-20 h-20 rounded-full opacity-10"
            style={{ background: "rgba(255,255,255,0.7)" }}
          />

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center border border-white/30">
                {isLeadGeneration ? (
                  <Bot className="h-7 w-7 text-white" />
                ) : (
                  <GraduationCap className="h-7 w-7 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-white font-bold text-xl leading-tight">
                  {chatbot?.name || displayInfo.name}
                </h1>
                <p className="text-white/70 text-sm mt-0.5">
                  {displayInfo.name}
                </p>
                {chatbot?.websiteUrl && (
                  <a
                    href={chatbot.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/60 text-xs mt-0.5 hover:text-white/90 transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    {chatbot.websiteUrl}
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/30">
                {chatbot?.isBuilt ? "✓ Active" : "Inactive"}
              </span>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50"
                title="Refresh dashboard"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-white/20 text-white rounded-xl hover:bg-red-500/80 transition-colors"
                title="Delete chatbot"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Settings Button */}
              <Link
                href={`/web/${chatbotType}/settings`}
                className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Token Balance Row */}
        <div
          className={`${styles.card} p-4 rounded-2xl flex flex-wrap items-center gap-3`}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${pc}18` }}
          >
            <Coins className="h-4 w-4" style={{ color: pc }} />
          </div>
          <div className="flex-1">
            <p
              className={`text-xs font-semibold ${styles.text.secondary} mb-0.5`}
            >
              Token Balance
            </p>
            <p
              className={`text-sm text-nowrap font-bold ${styles.text.primary}`}
            >
              {availableTokens.toLocaleString()} tokens available
            </p>
          </div>
          <Link
            href="/web/tokens"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all`}
            style={{ background: pc, color: "#fff" }}
          >
            Buy More
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className={`${styles.card} overflow-x-auto`}>
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
                  : `/web/${chatbotId}/faq`
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
                  key={item.id + item.timestamp}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors ${styles.divider} gap-2`}
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
                    <span
                      className={`text-xs text-nowrap ${styles.text.muted}`}
                    >
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
        {/* Landing Page URL */}
        {chatbot?.isBuilt && landingUrl && (
          <div
            className={`${styles.card} p-4 rounded-2xl flex flex-wrap items-center gap-3`}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${pc}18` }}
            >
              <Globe className="h-4 w-4" style={{ color: pc }} />
            </div>

            {/* TEXT SECTION (IMPORTANT FIX) */}
            <div className="flex flex-col min-w-0 w-1/2">
              <p
                className={`text-xs text-nowrap font-semibold ${styles.text.secondary} mb-0.5`}
              >
                Shareable Landing Page
              </p>

              <p
                className={`text-xs font-mono truncate ${
                  isDark ? "text-white/60" : "text-gray-600"
                }`}
                title={landingUrl} // 👈 tooltip on hover
              >
                {landingUrl}
              </p>
            </div>

            {/* BUTTONS */}
            {/* <div className="flex items-center gap-1 flex-shrink-0"> */}
            <Link
              href={landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isDark
                  ? "bg-white/[0.07] text-white/80 hover:bg-white/[0.12]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Link>

            <Link
              href={`/web/${chatbotType}/integration`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: pc, color: "#fff" }}
            >
              <Code2 className="h-3.5 w-3.5" />
              Get Embed Code
            </Link>
            {/* </div> */}
          </div>
        )}
        {/* Quick Links Grid */}
        <div>
          <h2
            className={`text-sm font-semibold ${styles.text.secondary} mb-3 uppercase tracking-wide`}
          >
            Manage
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-wrap items-start gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-md ${
                  isDark
                    ? "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${link.color}18`, color: link.color }}
                >
                  {link.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${styles.text.primary}`}>
                    {link.label}
                  </p>
                  <p className={`text-xs ${styles.text.secondary} mt-0.5`}>
                    {link.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title={`Delete "${chatbot?.name || "Chatbot"}"?`}
        description="This will permanently remove all conversations, FAQ questions, and settings. This action cannot be undone."
        confirmText="Yes, delete permanently"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
