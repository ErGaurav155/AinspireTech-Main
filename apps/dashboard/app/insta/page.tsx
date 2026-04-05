"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Default from "@/public/assets/img/default-img.jpg";

import {
  Plus,
  Instagram,
  MessageSquare,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  X,
  Users,
  Send,
  UserCheck,
  MessageCircle,
  Timer,
  PlayCircle,
  ChevronRight,
  Sparkles,
  Lock,
  Crown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import { useRouter } from "next/navigation";
import {
  deleteInstaAccount,
  getReplyLogs,
  getSubscriptioninfo,
  refreshInstagramToken,
} from "@/lib/services/insta-actions.api";

import { Button, Orbs, Spinner, useThemeStyles } from "@rocketreplai/ui";

import { AccountLimitDialog } from "@/components/shared/AccountLimitDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardAccount {
  id: string;
  _id: string;
  instagramId: string;
  userId: string;
  username: string;
  accessToken: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;
  accountReply: number;
  accountFollowCheck: number;
  accountDMSent: number;
  lastActivity: string;
  profilePicture?: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  metaCallsThisHour: number;
  lastMetaCallAt: string;
  isMetaRateLimited: boolean;
  metaRateLimitResetAt?: string;
  tokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  templatesCount: number;
  repliesCount: number;
  leadsCount: number;
  replyLimit: number;
  accountLimit: number;
  totalAccounts: number;
  engagementRate: number;
  successRate: number;
  avgResponseTime: number;
  tier?: "free" | "pro";
}

interface DashboardData {
  totalAccounts: number;
  activeAccounts: number;
  totalTemplates: number;
  totalReplies: number;
  totalLeads: number;
  totalDMSent: number;
  totalFollowChecks: number;
  accountLimit: number;
  replyLimit: number;
  engagementRate: number;
  successRate: number;
  overallAvgResponseTime: number;
  accounts: DashboardAccount[];
  recentActivity?: RecentActivity[];
}

interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
}

interface SubscriptionInfo {
  subscriptionId: string;
  chatbotType: string;
  status: string;
  expiresAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_PLAN_ACCOUNT_LIMIT = 1;
const PRO_PLAN_ACCOUNT_LIMIT = 3;
const CANCELLATION_REASON_PLACEHOLDER = "User requested cancellation";

// ─── Stat Card Component ─────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  icon: React.ElementType;
  value: string | number;
  subtitle?: string;
  extra?: string;
  styleIndex: number;
  isLocked?: boolean;
  lockedMessage?: string;
  onClick?: () => void;
}

const StatCard = React.memo(function StatCard({
  title,
  icon: Icon,
  value,
  subtitle,
  extra,
  styleIndex,
  isLocked = false,
  lockedMessage = "Upgrade to Pro",
  onClick,
}: StatCardProps) {
  const { styles, isDark } = useThemeStyles();
  const colors = [
    {
      bg: isDark ? "bg-teal-500/10" : "bg-teal-50",
      border: isDark ? "border-teal-500/20" : "border-teal-100",
      iconBg: isDark ? "bg-teal-500/20" : "bg-teal-100",
      iconColor: isDark ? "text-teal-400" : "text-teal-600",
      valueColor: isDark ? "text-teal-400" : "text-teal-700",
    },
    {
      bg: isDark ? "bg-blue-500/10" : "bg-blue-50",
      border: isDark ? "border-blue-500/20" : "border-blue-100",
      iconBg: isDark ? "bg-blue-500/20" : "bg-blue-100",
      iconColor: isDark ? "text-blue-400" : "text-blue-600",
      valueColor: isDark ? "text-blue-400" : "text-blue-700",
    },
    {
      bg: isDark ? "bg-green-500/10" : "bg-green-50",
      border: isDark ? "border-green-500/20" : "border-green-100",
      iconBg: isDark ? "bg-green-500/20" : "bg-green-100",
      iconColor: isDark ? "text-green-400" : "text-green-600",
      valueColor: isDark ? "text-green-400" : "text-green-700",
    },
    {
      bg: isDark ? "bg-purple-500/10" : "bg-purple-50",
      border: isDark ? "border-purple-500/20" : "border-purple-100",
      iconBg: isDark ? "bg-purple-500/20" : "bg-purple-100",
      iconColor: isDark ? "text-purple-400" : "text-purple-600",
      valueColor: isDark ? "text-purple-400" : "text-purple-700",
    },
    {
      bg: isDark ? "bg-orange-500/10" : "bg-orange-50",
      border: isDark ? "border-orange-500/20" : "border-orange-100",
      iconBg: isDark ? "bg-orange-500/20" : "bg-orange-100",
      iconColor: isDark ? "text-orange-400" : "text-orange-600",
      valueColor: isDark ? "text-orange-400" : "text-orange-700",
    },
  ];
  const s = colors[styleIndex % colors.length];

  return (
    <div
      onClick={onClick}
      className={`${s.bg} border ${s.border} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow relative overflow-hidden ${onClick ? "cursor-pointer" : ""}`}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-0 flex items-center justify-center z-10 rounded-2xl">
          <div className="text-center">
            <Lock className="h-8 w-8 text-white mx-auto mb-2" />
            <p className="text-white text-xs font-semibold">{lockedMessage}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div
          className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center`}
        >
          <Icon className={`h-[18px] w-[18px] ${s.iconColor}`} />
        </div>
      </div>
      <div>
        <p className={`text-xs font-medium ${styles.text.muted} mb-1`}>
          {title}
        </p>
        <p className={`text-2xl font-bold ${s.valueColor}`}>{value}</p>
        {subtitle && (
          <p className={`text-xs ${styles.text.muted} mt-0.5`}>{subtitle}</p>
        )}
        {extra && (
          <p className={`text-[10px] ${styles.text.muted} mt-0.5`}>{extra}</p>
        )}
      </div>
    </div>
  );
});

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // Use context to get accounts
  const {
    accounts: contextAccounts,
    isAccLoading,
    refreshAccounts,
  } = useInstaAccount();

  // Refs
  const isInitialMount = useRef(true);
  const isFetching = useRef(false);

  // Core state
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<string[]>([]);
  const [userAccounts, setUserAccounts] = useState<DashboardAccount[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Banner state
  const [showPromoBanner, setShowPromoBanner] = useState(true);

  // Dialog states
  const [showAccountLimitDialog, setShowAccountLimitDialog] =
    useState<boolean>(false);
  const [showCancelAccountDialog, setShowCancelAccountDialog] =
    useState<boolean>(false);
  const [isProcessingDeletion, setIsProcessingDeletion] =
    useState<boolean>(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info" = "success",
    ) => {
      if (type === "success") toast.success(message);
      else if (type === "error") toast.error(message);
      else if (type === "warning") toast.warning(message);
      else toast.info(message);
    },
    [],
  );

  const formatTimestamp = useCallback((timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return "Just now";
    }
  }, []);

  const transformAccountsToDashboardData = useCallback(
    (accounts: DashboardAccount[]): DashboardData => ({
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.isActive).length,
      totalTemplates: accounts.reduce((s, a) => s + a.templatesCount, 0),
      totalReplies: accounts.reduce((s, a) => s + (a.accountReply || 0), 0),
      totalLeads: accounts.reduce((s, a) => s + (a.leadsCount || 0), 0),
      totalDMSent: accounts.reduce((s, a) => s + (a.accountDMSent || 0), 0),
      totalFollowChecks: accounts.reduce(
        (s, a) => s + (a.accountFollowCheck || 0),
        0,
      ),
      accountLimit: accounts[0]?.accountLimit || FREE_PLAN_ACCOUNT_LIMIT,
      replyLimit: accounts[0]?.replyLimit || 0,
      engagementRate:
        accounts.length > 0
          ? accounts.reduce((s, a) => s + (a.engagementRate || 0), 0) /
            accounts.length
          : 0,
      successRate:
        accounts.length > 0
          ? accounts.reduce((s, a) => s + (a.successRate || 0), 0) /
            accounts.length
          : 0,
      overallAvgResponseTime:
        accounts.length > 0
          ? accounts.reduce((s, a) => s + (a.avgResponseTime || 0), 0) /
            accounts.length
          : 0,
      accounts,
    }),
    [],
  );

  const transformContextAccountsToDashboard = useCallback(
    (accounts: any[]): DashboardAccount[] => {
      // Get subscription info to determine limits
      const isPro = subscriptions.length > 0;
      const accountLimit = isPro
        ? PRO_PLAN_ACCOUNT_LIMIT
        : FREE_PLAN_ACCOUNT_LIMIT;

      return accounts.map((acc) => ({
        id: acc._id || acc.instagramId,
        _id: acc._id || acc.instagramId,
        instagramId: acc.instagramId,
        userId: acc.userId,
        username: acc.username,
        accessToken: "", // Not needed for display
        isActive: acc.isActive ?? true,
        autoReplyEnabled: acc.autoReplyEnabled ?? true,
        autoDMEnabled: acc.autoDMEnabled ?? true,
        followCheckEnabled: acc.followCheckEnabled ?? true,
        requireFollowForFreeUsers: acc.requireFollowForFreeUsers ?? false,
        accountReply: acc.accountReply || 0,
        accountFollowCheck: acc.accountFollowCheck || 0,
        accountDMSent: acc.accountDMSent || 0,
        lastActivity: acc.lastActivity || new Date().toISOString(),
        profilePicture: acc.profilePicture || Default,
        followersCount: acc.followersCount || 0,
        followingCount: acc.followingCount || 0,
        mediaCount: acc.mediaCount || 0,
        metaCallsThisHour: acc.metaCallsThisHour || 0,
        lastMetaCallAt: acc.lastMetaCallAt || new Date().toISOString(),
        isMetaRateLimited: acc.isMetaRateLimited || false,
        metaRateLimitResetAt: acc.metaRateLimitResetAt,
        tokenExpiresAt: acc.tokenExpiresAt,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        templatesCount: acc.templatesCount || 0,
        repliesCount: acc.accountReply || 0,
        leadsCount: acc.leadsCount || 0,
        replyLimit: isPro ? Infinity : 0,
        accountLimit: accountLimit,
        totalAccounts: accounts.length,
        engagementRate: 85 + Math.floor(Math.random() * 10), // Placeholder
        successRate: 90 + Math.floor(Math.random() * 8), // Placeholder
        avgResponseTime: Math.floor(Math.random() * 30) + 5, // Placeholder
        tier: isPro ? "pro" : "free",
      }));
    },
    [subscriptions],
  );

  const handleImageError = useCallback((id: string): void => {
    setHasError((prev) => [...prev, id]);
  }, []);

  // ── Data fetchers ─────────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      setIsLoading(true);

      if (!contextAccounts || contextAccounts.length === 0) {
        setDashboardData(null);
        setUserAccounts([]);
        return;
      }

      const accountsData = transformContextAccountsToDashboard(contextAccounts);

      if (!accountsData || accountsData.length === 0) {
        setDashboardData(null);
        setUserAccounts([]);
        return;
      }

      setUserAccounts(accountsData);
      const dashboardStats = transformAccountsToDashboardData(accountsData);

      // Fetch reply logs separately (don't block dashboard load)
      try {
        const { logs: replyLogs } = await getReplyLogs(apiRequest, 10);
        dashboardStats.recentActivity = replyLogs?.length
          ? replyLogs.slice(0, 5).map((log: any) => ({
              id: log._id,
              message: log.success
                ? `Replied to comment from @${log.commenterUsername}`
                : `Failed to reply to comment: ${log.errorMessage || "Unknown error"}`,
              timestamp: log.createdAt,
            }))
          : [];
      } catch (err) {
        console.error("Failed to fetch reply logs:", err);
        dashboardStats.recentActivity = [];
      }

      setDashboardData(dashboardStats);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
      showToast("Failed to load dashboard data", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetching.current = false;
    }
  }, [
    contextAccounts,
    transformContextAccountsToDashboard,
    transformAccountsToDashboardData,
    showToast,
    apiRequest,
  ]);

  const fetchSubscriptions = useCallback(async () => {
    if (!userId) return;

    try {
      const { subscriptions: subs } = await getSubscriptioninfo(apiRequest);
      setSubscriptions(subs || []);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      showToast("Failed to load subscription information", "error");
    }
  }, [userId, showToast, apiRequest]);

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoaded || !isInitialMount.current) return;

    const init = async () => {
      try {
        await fetchSubscriptions();
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    init();
    isInitialMount.current = false;
  }, [isLoaded, fetchSubscriptions]);

  // Update dashboard when context accounts change
  useEffect(() => {
    if (!isAccLoading && contextAccounts) {
      fetchDashboardData();
    }
  }, [contextAccounts, isAccLoading, fetchDashboardData]);

  // ── Action handlers ───────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    isFetching.current = false;
    await refreshAccounts();
    await fetchDashboardData();
  }, [isRefreshing, refreshAccounts, fetchDashboardData]);

  const handleAddAccountClick = useCallback(() => {
    const accountLimit =
      subscriptions.length > 0
        ? PRO_PLAN_ACCOUNT_LIMIT
        : FREE_PLAN_ACCOUNT_LIMIT;
    const currentAccounts = userAccounts.length;

    if (currentAccounts >= accountLimit) {
      setShowAccountLimitDialog(true);
    } else {
      router.push("/insta/accounts/add");
    }
  }, [userAccounts.length, subscriptions.length, router]);

  const handleDeleteAccount = useCallback(
    async (accountId: string) => {
      setIsProcessingDeletion(true);

      try {
        await deleteInstaAccount(apiRequest, accountId);
        showToast("Account deleted successfully", "success");
        await refreshAccounts();
        await fetchDashboardData();
      } catch (err) {
        console.error("Error deleting account:", err);
        showToast("Failed to delete account", "error");
      } finally {
        setIsProcessingDeletion(false);
        setShowCancelAccountDialog(false);
      }
    },
    [apiRequest, showToast, refreshAccounts, fetchDashboardData],
  );

  const handleRefreshToken = useCallback(
    async (instagramId: string) => {
      try {
        await refreshInstagramToken(apiRequest, instagramId);
        showToast("Token refreshed successfully", "success");
        await refreshAccounts();
      } catch (err) {
        console.error("Error refreshing token:", err);
        showToast("Failed to refresh token", "error");
      }
    },
    [apiRequest, showToast, refreshAccounts],
  );

  // ── Derived values for stat cards ─────────────────────────────────────────────

  const isPro = subscriptions.length > 0;

  // Contacts: Show locked for free users, show count with ∞ for pro
  const contactDisplay = isPro
    ? `${dashboardData?.totalLeads ?? 0} / ∞`
    : "0 / ∞";

  // DMs: Show only count for free, count with ∞ for pro
  const dmDisplay = isPro
    ? `${dashboardData?.totalDMSent ?? 0} / ∞`
    : `${dashboardData?.totalDMSent ?? 0}`;

  // ── Loading state ─────────────────────────────────────────────────────────────

  if ((isLoading && !dashboardData) || !isLoaded || isAccLoading) {
    return <Spinner label="Loading your dashboard…" />;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={
        isDark
          ? "min-h-screen max-w-7xl m-auto w-full relative overflow-hidden"
          : "min-h-screen max-w-7xl m-auto w-full"
      }
    >
      {isDark && <Orbs />}
      <div className="p-4 md:p-6 space-y-5 mx-auto relative z-10">
        {/* ── Automations Not Working Warning ────────────────────────────── */}
        {userAccounts.filter(
          (a) =>
            !a.isActive ||
            a.isMetaRateLimited ||
            (a.tokenExpiresAt && new Date(a.tokenExpiresAt) < new Date()),
        ).length > 0 && (
          <div
            className={`rounded-2xl p-5 ${
              isDark
                ? "bg-white/[0.04] border border-red-500/30"
                : "bg-white border border-red-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle
                    className={`h-5 w-5 flex-shrink-0 ${
                      isDark ? "text-red-400" : "text-red-600"
                    }`}
                  />
                  <p
                    className={`font-bold text-sm ${
                      isDark ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    Your automations are not working!
                  </p>
                </div>
                <p
                  className={`text-xs mb-3 font-medium ${
                    isDark ? "text-white/40" : "text-gray-500"
                  }`}
                >
                  Refresh Permissions for{" "}
                  {userAccounts
                    .filter(
                      (a) =>
                        !a.isActive ||
                        a.isMetaRateLimited ||
                        (a.tokenExpiresAt &&
                          new Date(a.tokenExpiresAt) < new Date()),
                    )
                    .map((a) => `@${a.username}`)
                    .join(", ")}
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Incomplete Permission given",
                    "Your token expired",
                    "You removed us from Instagram Permissions by mistake",
                  ].map((issue) => (
                    <li
                      key={issue}
                      className={`flex items-center gap-2 text-xs ${
                        isDark ? "text-white/40" : "text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full ${
                          isDark
                            ? "bg-red-500/10 border border-red-500/20"
                            : "bg-red-100 border border-red-200"
                        } flex items-center justify-center flex-shrink-0`}
                      >
                        <X className="h-2.5 w-2.5 text-red-400" />
                      </div>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                className={`bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-xs font-bold px-5 shadow-md ${
                  isDark ? "shadow-pink-500/20" : "shadow-pink-200/50"
                } hover:opacity-90 transition-opacity`}
              >
                <Link href="/insta/accounts/add">
                  <Instagram className="h-3.5 w-3.5 mr-1.5" />
                  Reconnect Instagram
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ── Promo / Early Bird Banner (no subscription) ─────────────────── */}
        {!isPro && showPromoBanner && (
          <div
            className={`relative overflow-hidden bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-2xl p-5 shadow-lg ${
              isDark ? "shadow-pink-500/30" : "shadow-pink-200/50"
            }`}
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-4 top-4 w-20 h-20 rounded-full bg-white/10" />
            <button
              onClick={() => setShowPromoBanner(false)}
              className={`absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors`}
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-col ">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <span className={`font-black text-sm text-white`}>
                    Early Bird Offer
                  </span>
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </div>
                <p className={`font-black text-lg text-white`}>
                  Save 60% on RocketReplai Pro
                </p>
                <p className={`text-xs mt-0.5 text-white opacity-80`}>
                  Don&apos;t miss out! Unlock unlimited growth — offer ends soon
                  👇
                </p>
              </div>
              <Button
                asChild
                className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm px-5 py-2.5 rounded-xl shadow-md transition-colors"
              >
                <Link href="/insta/pricing">Upgrade Now</Link>
              </Button>
            </div>
          </div>
        )}

        {/* ── Hero Card ───────────────────────────────────────────────────── */}
        <div
          className={`relative overflow-hidden rounded-3xl shadow-sm border ${
            isDark
              ? "glass-card border-white/[0.08]"
              : "bg-white border-gray-100"
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              isDark
                ? "from-pink-500/5 via-transparent to-purple-500/5"
                : "from-pink-50/80 via-white to-purple-50/60"
            } pointer-events-none`}
          />
          <div
            className={`absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-gradient-to-br ${
              isDark
                ? "from-pink-500/10 to-rose-500/10"
                : "from-pink-100 to-rose-100"
            } opacity-50 blur-3xl pointer-events-none`}
          />
          <div
            className={`absolute -left-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${
              isDark
                ? "from-purple-500/10 to-indigo-500/10"
                : "from-purple-100 to-indigo-100"
            } opacity-30 blur-2xl pointer-events-none`}
          />

          <div className="relative z-10 p-5 md:p-10 text-center">
            <h1
              className={`text-2xl md:text-3xl font-black mb-3 tracking-tight ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Your growth game just leveled up{" "}
              <span role="img" aria-label="game">
                🎮
              </span>
            </h1>
            <p
              className={`text-sm max-w-md mx-auto mb-7 leading-relaxed ${
                isDark ? "text-white/40" : "text-gray-500"
              }`}
            >
              You&apos;re one step closer to growing your Instagram audience.
              Automate DMs, connect authentically, and watch your followers turn
              into real relationships.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-7">
              <Button
                onClick={handleAddAccountClick}
                className={`bg-gradient-to-r from-pink-500 to-pink-300 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-full px-7 py-2.5 shadow-lg ${
                  isDark
                    ? "shadow-pink-500/30 hover:shadow-pink-500/40"
                    : "shadow-pink-200/60 hover:shadow-pink-300/70"
                } transition-all hover:-translate-y-0.5`}
              >
                Create Automation
              </Button>
              <Button
                asChild
                variant="outline"
                className={`font-semibold rounded-full px-7 py-2.5 gap-2 ${
                  isDark
                    ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Link href="/insta/accounts">
                  <PlayCircle className="h-4 w-4" />
                  View Accounts
                </Link>
              </Button>
            </div>

            {/* New features pills */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${
                  isDark
                    ? "bg-pink-500/10 border border-pink-500/20"
                    : "bg-pink-50 border border-pink-200"
                }`}
              >
                <Sparkles
                  className={`h-3 w-3 ${
                    isDark ? "text-pink-400" : "text-pink-600"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    isDark ? "text-pink-400" : "text-pink-600"
                  }`}
                >
                  New features
                </span>
              </div>
              {[
                { icon: MessageSquare, label: "Collect Email" },
                { icon: Timer, label: "Reply Delay" },
                { icon: Users, label: "Follow-Up Flow" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className={`flex flex-wrap items-center gap-1 md:gap-1.5 text-sm md:text-base rounded-full px-1.5 md:px-3 py-1 transition-colors cursor-pointer ${
                    isDark
                      ? "bg-white/[0.03] border border-white/[0.08] text-white/60 hover:border-pink-500/50 hover:text-pink-400"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-pink-200 hover:text-pink-600"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Growth Overview ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`text-base font-bold flex items-center gap-2 ${
                isDark ? "text-white" : "text-gray-800"
              }`}
            >
              <Activity className={`h-4 w-4 text-pink-400`} />
              Growth Overview
            </h2>
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                isDark
                  ? "text-white/40 hover:text-pink-400  hover:bg-white/[0.06]"
                  : "text-gray-500 hover:text-pink-500 hover:bg-pink-50"
              } ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Automations"
              icon={Zap}
              value={dashboardData?.totalTemplates ?? 0}
              styleIndex={0}
            />
            <StatCard
              title="Contacts"
              icon={Users}
              value={contactDisplay}
              subtitle={`Collected this month`}
              styleIndex={1}
              isLocked={!isPro}
              lockedMessage="Upgrade to Pro"
              onClick={() => !isPro && router.push("/insta/pricing")}
            />
            <StatCard
              title="DMs"
              icon={MessageSquare}
              value={dmDisplay}
              subtitle="Sent this month"
              styleIndex={2}
            />
            <StatCard
              title="Public Replies"
              icon={MessageCircle}
              value={dashboardData?.totalReplies ?? 0}
              subtitle="Sent this month"
              styleIndex={3}
            />

            <StatCard
              title="Follow Requests"
              icon={UserCheck}
              value={dashboardData?.totalFollowChecks ?? 0}
              subtitle="Sent this month"
              styleIndex={0}
            />
          </div>
        </div>

        {/* ── Messages Sent / Recent Activity ─────────────────────────────── */}
        {dashboardData?.recentActivity &&
          dashboardData.recentActivity.length > 0 && (
            <div className={`rounded-2xl border ${styles.card}`}>
              <div
                className={`p-5 border-b ${styles.divider} flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <Activity className={`h-4 w-4 text-pink-400`} />
                  <h3 className={`text-sm font-bold ${styles.text.primary}`}>
                    Recent Activity
                  </h3>
                </div>
              </div>
              <div className={`divide-y ${styles.divider}`}>
                {(dashboardData.recentActivity as RecentActivity[]).map(
                  (activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-center justify-between px-5 py-3.5 ${
                        isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center flex-shrink-0`}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        <p className={`text-sm ${styles.text.secondary}`}>
                          {activity.message}
                        </p>
                      </div>
                      <span
                        className={`text-xs ${styles.text.muted} flex-shrink-0 ml-4`}
                      >
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

        {/* ── Connected Accounts List ─────────────────────────────────────── */}
        {userAccounts.length > 0 && (
          <div className={`rounded-2xl border ${styles.card}`}>
            <div
              className={`p-5 border-b ${styles.divider} flex flex-wrap items-center justify-between gap-1`}
            >
              <div className="flex items-center gap-2">
                <Instagram className={`h-4 w-4 text-pink-400`} />
                <h3 className={`text-sm font-bold ${styles.text.primary}`}>
                  Connected Accounts
                </h3>
              </div>
              <button
                onClick={handleAddAccountClick}
                className={`text-xs ${
                  isDark
                    ? "bg-pink-500/10 border border-pink-500/20 text-pink-400"
                    : "bg-pink-100 text-pink-600 border-pink-200"
                } font-semibold flex items-center gap-1 hover:opacity-80 p-1 rounded-md`}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </button>
            </div>
            <div className={`divide-y ${styles.divider}`}>
              {userAccounts.map((account) => {
                const isTokenExpiring =
                  account.tokenExpiresAt &&
                  new Date(account.tokenExpiresAt) <
                    new Date(Date.now() + 24 * 60 * 60 * 1000);
                return (
                  <div
                    key={account.id}
                    className={`flex  items-center justify-between px-5  py-4 hover:bg-white/[0.03] transition-colors border-b border-white/[0.06] ${
                      isDark ? "" : "border-gray-50 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Image
                          width={40}
                          height={40}
                          src={
                            hasError.includes(account.id)
                              ? Default
                              : account.profilePicture || Default
                          }
                          alt={account.username}
                          onError={() => handleImageError(account.id)}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 dark:border-white/[0.08]"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                            isDark ? "border-[#1A1A1E]" : "border-white"
                          } ${
                            account.isActive
                              ? "bg-green-400"
                              : isDark
                                ? "bg-gray-500"
                                : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold ${styles.text.primary}`}
                        >
                          @{account.username}
                        </p>
                        <p
                          className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}
                        >
                          {account.followersCount?.toLocaleString() || 0}{" "}
                          followers • {account.leadsCount || 0} leads
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {isTokenExpiring && userId && (
                        <button
                          onClick={() =>
                            handleRefreshToken(account.instagramId)
                          }
                          className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1 transition-colors ${
                            isDark
                              ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
                              : "text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh Token
                        </button>
                      )}
                      <Link
                        href={`/insta/accounts/${account.instagramId}`}
                        className={`text-xs px-4 py-1.5 rounded-full font-semibold transition-colors ${
                          isDark
                            ? "text-white/60 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.09]"
                            : "text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => {
                          setShowCancelAccountDialog(true);
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                          isDark
                            ? "text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                            : "text-red-600 bg-red-50 border border-red-200 hover:bg-red-100"
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── No Accounts Empty State ─────────────────────────────────────── */}
        {userAccounts.length === 0 && !isLoading && (
          <div
            className={`rounded-2xl border ${styles.card} p-5 md:p-10 text-center`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDark
                  ? "bg-pink-500/20 border border-pink-500/30"
                  : "bg-pink-100"
              }`}
            >
              <Instagram className={`h-8 w-8 text-pink-400`} />
            </div>
            <h3 className={`text-base font-bold ${styles.text.primary} mb-2`}>
              No accounts connected yet
            </h3>
            <p
              className={`text-sm ${isDark ? "text-white/40" : "text-gray-500"} mb-5`}
            >
              Connect your Instagram Business account to start automating
            </p>
            <Button
              asChild
              className={`bg-gradient-to-r from-pink-500 to-pink-300 text-white rounded-full font-bold px-7 shadow-md ${
                isDark ? "shadow-pink-500/20" : "shadow-pink-200/50"
              }`}
            >
              <Link href="/insta/accounts/add">
                <Plus className="h-4 w-4 mr-2" />
                Connect Your Account
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS — for user actions
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Account Limit Dialog */}
      <AccountLimitDialog
        open={showAccountLimitDialog}
        onOpenChange={setShowAccountLimitDialog}
        currentAccounts={userAccounts.length}
        accountLimit={isPro ? PRO_PLAN_ACCOUNT_LIMIT : FREE_PLAN_ACCOUNT_LIMIT}
        dashboardType="insta"
      />

      {/* Delete Account Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelAccountDialog}
        onOpenChange={setShowCancelAccountDialog}
        onConfirm={() => {
          if (userAccounts.length > 0) {
            handleDeleteAccount(userAccounts[0]?.instagramId);
          }
        }}
        title="Delete Account"
        description="Are you sure you want to delete this Instagram account? All associated automations and data will be permanently removed."
        confirmText="Delete"
        isDestructive={true}
        isLoading={isProcessingDeletion}
      />
    </div>
  );
}
