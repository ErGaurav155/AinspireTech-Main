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
  Loader2,
  Clock,
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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { useRouter } from "next/navigation";
import { AccountSelectionDialog } from "@/components/insta/AccountSelectionDialog";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  cancelRazorPaySubscription,
  deleteInstaAccount,
  getInstaAccount,
  getReplyLogs,
  getSubscriptioninfo,
  refreshInstagramToken,
} from "@/lib/services/insta-actions.api";

import {
  Button,
  Orbs,
  Spinner,
  Textarea,
  useThemeStyles,
} from "@rocketreplai/ui";

import { AccountLimitDialog } from "@/components/shared/AccountLimitDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstagramAccountType {
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
}

interface DashboardAccount extends InstagramAccountType {
  id: string;
  repliesCount: number;
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
const FREE_PLAN_REPLY_LIMIT = 200;
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
}

const StatCard = React.memo(function StatCard({
  title,
  icon: Icon,
  value,
  subtitle,
  extra,
  styleIndex,
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
      className={`${s.bg} border ${s.border} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}
    >
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
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

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
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] =
    useState<boolean>(false);
  const [showCancelAccountDialog, setShowCancelAccountDialog] =
    useState<boolean>(false);

  // Cancellation state
  const [selectedSubscriptionId, setSelectedSubscriptionId] =
    useState<string>("");
  const [cancellationMode, setCancellationMode] = useState<
    "Immediate" | "End-of-term"
  >("End-of-term");
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isProcessingCancellation, setIsProcessingCancellation] =
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
      accountLimit: accounts[0]?.accountLimit || FREE_PLAN_ACCOUNT_LIMIT,
      replyLimit: accounts[0]?.replyLimit || FREE_PLAN_REPLY_LIMIT,
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

  const handleImageError = useCallback((id: string): void => {
    setHasError((prev) => [...prev, id]);
  }, []);

  // ── Data fetchers ─────────────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async (): Promise<
    DashboardAccount[] | null
  > => {
    if (!userId) {
      router.push("/sign-in");
      return null;
    }

    try {
      setError(null);

      // Use getInstaAccount which returns all accounts
      const response = await getInstaAccount(apiRequest);
      console.log("Dashboard - Raw Accounts Response:", response);

      let accountsArray: any[] = [];

      // Handle different response structures
      if (response?.accounts && Array.isArray(response.accounts)) {
        accountsArray = response.accounts;
      } else if (
        response?.data?.accounts &&
        Array.isArray(response.data.accounts)
      ) {
        accountsArray = response.data.accounts;
      } else if (Array.isArray(response)) {
        accountsArray = response;
      }

      if (!accountsArray.length) {
        return [];
      }

      // Get subscription info to determine limits
      const subscriptionInfo =
        subscriptions.length > 0 ? subscriptions[0] : null;
      const accountLimit = subscriptionInfo
        ? PRO_PLAN_ACCOUNT_LIMIT
        : FREE_PLAN_ACCOUNT_LIMIT;
      const replyLimit = subscriptionInfo ? "unlimited" : FREE_PLAN_REPLY_LIMIT;

      const completeAccounts: DashboardAccount[] = accountsArray.map(
        (item: any) => {
          // Handle both nested and direct structures
          const accountInfo = item.accountInfo || item;
          const instagramInfo = item.instagramInfo || {};

          return {
            id: accountInfo._id || accountInfo.id || "",
            _id: accountInfo._id || accountInfo.id || "",
            instagramId: accountInfo.instagramId || instagramInfo.id || "",
            userId: accountInfo.userId || userId,
            username:
              instagramInfo.username || accountInfo.username || "Unknown",
            accessToken: accountInfo.accessToken || "",
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
            accountReply: accountInfo.accountReply || 0,
            accountFollowCheck: accountInfo.accountFollowCheck || 0,
            accountDMSent: accountInfo.accountDMSent || 0,
            lastActivity: accountInfo.lastActivity || new Date().toISOString(),
            profilePicture:
              instagramInfo.profile_picture_url ||
              accountInfo.profilePicture ||
              Default,
            followersCount:
              instagramInfo.followers_count || accountInfo.followersCount || 0,
            followingCount:
              instagramInfo.follows_count || accountInfo.followingCount || 0,
            mediaCount:
              instagramInfo.media_count || accountInfo.mediaCount || 0,
            metaCallsThisHour: accountInfo.metaCallsThisHour || 0,
            lastMetaCallAt:
              accountInfo.lastMetaCallAt || new Date().toISOString(),
            isMetaRateLimited: accountInfo.isMetaRateLimited || false,
            metaRateLimitResetAt: accountInfo.metaRateLimitResetAt,
            tokenExpiresAt: accountInfo.tokenExpiresAt,
            createdAt: accountInfo.createdAt,
            updatedAt: accountInfo.updatedAt,
            templatesCount: accountInfo.templatesCount || 0,
            repliesCount: accountInfo.accountReply || 0,
            replyLimit: typeof replyLimit === "number" ? replyLimit : 999999,
            accountLimit: accountLimit,
            totalAccounts: accountsArray.length,
            engagementRate: 85 + Math.floor(Math.random() * 10), // Placeholder - replace with actual
            successRate: 90 + Math.floor(Math.random() * 8), // Placeholder - replace with actual
            avgResponseTime: Math.floor(Math.random() * 30) + 5, // Placeholder - replace with actual
            tier: subscriptionInfo ? "pro" : "free",
          };
        },
      );

      console.log("Dashboard - Formatted Accounts:", completeAccounts);
      setUserAccounts(completeAccounts);
      return completeAccounts;
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      setError(err instanceof Error ? err.message : "Failed to load accounts");
      showToast("Failed to load accounts", "error");
      return null;
    }
  }, [userId, router, showToast, apiRequest, subscriptions]);

  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      setIsLoading(true);

      const accountsData = await fetchAccounts();

      if (!accountsData || accountsData.length === 0) {
        setDashboardData(null);
        return;
      }

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
  }, [fetchAccounts, transformAccountsToDashboardData, showToast, apiRequest]);

  const fetchSubscriptions = useCallback(async () => {
    if (!userId) return;

    try {
      const userData = await getUserById(apiRequest, userId);
      if (userData) {
        const { subscriptions: subs } = await getSubscriptioninfo(apiRequest);
        setSubscriptions(subs || []);
        setUserInfo(userData);
      }
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
        await Promise.all([fetchSubscriptions(), fetchDashboardData()]);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    init();
    isInitialMount.current = false;
  }, [isLoaded, fetchSubscriptions, fetchDashboardData]);

  // ── Action handlers ───────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    isFetching.current = false;
    await fetchDashboardData();
  }, [isRefreshing, fetchDashboardData]);

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

  const handleCancelInitiation = useCallback(() => {
    if (subscriptions.length > 0) {
      setSelectedSubscriptionId(subscriptions[0].subscriptionId);
      setShowCancelConfirmDialog(true);
    }
  }, [subscriptions]);

  const handleConfirmedCancellation = useCallback(async () => {
    setShowCancelConfirmDialog(false);
    if (userAccounts.length > FREE_PLAN_ACCOUNT_LIMIT) {
      setShowCancelAccountDialog(true);
    } else {
      setShowCancelDialog(true);
    }
  }, [userAccounts.length]);

  const handleCancelAccountDeletion = useCallback(
    async (selectedAccountIds: string[]) => {
      setIsProcessingCancellation(true);
      setShowCancelAccountDialog(false);

      try {
        // Delete accounts in parallel
        await Promise.all(
          selectedAccountIds.map((accountId) =>
            deleteInstaAccount(apiRequest, accountId),
          ),
        );

        showToast("Accounts deleted successfully", "success");

        // Update local state
        setUserAccounts((prev) =>
          prev.filter((a) => !selectedAccountIds.includes(a.id)),
        );

        await fetchDashboardData();
        setShowCancelDialog(true);
      } catch (err) {
        console.error("Error deleting accounts:", err);
        showToast("Failed to delete accounts", "error");
      } finally {
        setIsProcessingCancellation(false);
      }
    },
    [apiRequest, showToast, fetchDashboardData],
  );

  const handleCancelSubscription = useCallback(async () => {
    if (!selectedSubscriptionId) {
      showToast("No subscription selected", "error");
      return;
    }

    setIsCancelling(true);

    try {
      const result = await cancelRazorPaySubscription(apiRequest, {
        subscriptionId: selectedSubscriptionId,
        subscriptionType: "insta",
        reason: cancellationReason || CANCELLATION_REASON_PLACEHOLDER,
        mode: cancellationMode,
      });

      if (result.success) {
        showToast("Subscription cancelled successfully", "success");
        setSubscriptions([]);
        await fetchDashboardData();
      } else {
        showToast(result.message || "Failed to cancel subscription", "error");
      }
    } catch (err) {
      console.error("Error cancelling subscription:", err);
      showToast("Failed to cancel subscription", "error");
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
      setCancellationReason("");
    }
  }, [
    selectedSubscriptionId,
    cancellationReason,
    cancellationMode,
    apiRequest,
    showToast,
    fetchDashboardData,
  ]);

  const handleRefreshToken = useCallback(
    async (instagramId: string) => {
      try {
        await refreshInstagramToken(apiRequest, instagramId);
        showToast("Token refreshed successfully", "success");
        await fetchDashboardData();
      } catch (err) {
        console.error("Error refreshing token:", err);
        showToast("Failed to refresh token", "error");
      }
    },
    [apiRequest, showToast, fetchDashboardData],
  );

  // ── Derived values for stat cards ─────────────────────────────────────────────

  const totalAccountReply = useMemo(
    () => userAccounts.reduce((s, a) => s + (a.accountReply || 0), 0),
    [userAccounts],
  );

  const totalDMSent = useMemo(
    () => userAccounts.reduce((s, a) => s + (a.accountDMSent || 0), 0),
    [userAccounts],
  );

  const totalFollowChecks = useMemo(
    () => userAccounts.reduce((s, a) => s + (a.accountFollowCheck || 0), 0),
    [userAccounts],
  );

  // Accounts with issues (inactive or token expired)
  const accountsWithIssues = useMemo(
    () =>
      userAccounts.filter(
        (a) =>
          !a.isActive ||
          a.isMetaRateLimited ||
          (a.tokenExpiresAt && new Date(a.tokenExpiresAt) < new Date()),
      ),
    [userAccounts],
  );

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (isLoading || !isLoaded) {
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
        {accountsWithIssues.length > 0 && (
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
                  {accountsWithIssues.map((a) => `@${a.username}`).join(", ")}
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
        {subscriptions.length === 0 && showPromoBanner && (
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

        {/* ── Active Subscription Banner ──────────────────────────────────── */}
        {subscriptions.length > 0 && (
          <div
            className={`rounded-2xl p-4 flex items-center justify-between gap-4 ${
              isDark
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-green-50 border border-green-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full ${
                  isDark ? "bg-green-500/20" : "bg-green-100"
                } flex items-center justify-center`}
              >
                <CheckCircle
                  className={`h-5 w-5 ${
                    isDark ? "text-green-400" : "text-green-600"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-sm font-bold ${
                    isDark ? "text-green-400" : "text-green-700"
                  }`}
                >
                  {subscriptions[0]?.chatbotType || "Pro"} Active
                </p>
                <p
                  className={`text-xs ${
                    isDark ? "text-green-400/80" : "text-green-600"
                  }`}
                >
                  Next billing:{" "}
                  {subscriptions[0]?.expiresAt
                    ? new Date(subscriptions[0].expiresAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                className={`text-xs rounded-full px-4 ${
                  isDark
                    ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                    : "border-green-300 text-green-700 hover:bg-green-100"
                }`}
              >
                <Link href="/insta/pricing">Upgrade</Link>
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInitiation}
                disabled={isCancelling || isProcessingCancellation}
                className={`text-xs rounded-full px-4 ${
                  isDark
                    ? "bg-red-500/80 hover:bg-red-500 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {isCancelling ? "Cancelling…" : "Cancel"}
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
                <Link href="/insta/overview">
                  <PlayCircle className="h-4 w-4" />
                  View Dashboard
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
              value={`${dashboardData?.totalReplies ?? 0} / ${dashboardData?.replyLimit === 999999 ? "∞" : (dashboardData?.replyLimit ?? 1000)}`}
              subtitle={`This month`}
              extra={`Total: ${dashboardData?.totalReplies ?? 0}`}
              styleIndex={1}
            />
            <StatCard
              title="Messages"
              icon={MessageSquare}
              value={`${totalDMSent} / ${dashboardData?.replyLimit === 999999 ? "∞" : 2000}`}
              subtitle="This month"
              extra="Total: 0  (Deleted automations excluded)"
              styleIndex={2}
            />
            <StatCard
              title="Public Replies"
              icon={MessageCircle}
              value={totalAccountReply}
              styleIndex={3}
            />
            <StatCard
              title="Welcome Messages"
              icon={Send}
              value={totalDMSent}
              styleIndex={4}
            />
            <StatCard
              title="Follow Requests"
              icon={UserCheck}
              value={totalFollowChecks}
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
                <Link
                  href="/insta/analytics"
                  className={`text-xs ${
                    isDark
                      ? "bg-pink-500/10 border border-pink-500/20 text-pink-400"
                      : "bg-pink-100 text-pink-600 border-pink-200"
                  } font-semibold flex items-center gap-1 hover:opacity-80 rounded-md px-3 py-1`}
                >
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
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
              className={`p-5 border-b ${styles.divider} flex items-center justify-between`}
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
                    className={`flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors border-b border-white/[0.06] ${
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
                          followers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
        accountLimit={subscriptions.length === 0 ? 1 : 3}
        dashboardType="insta"
      />

      {/* Confirm Cancellation Dialog */}
      <ConfirmDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
        onConfirm={handleConfirmedCancellation}
        title="Confirm Cancellation"
        description="Are you sure you want to cancel your subscription? Your plan will revert to the Free plan which only allows 1 Instagram account."
        confirmText="Continue"
        isDestructive={true}
        isLoading={isCancelling}
      />

      {/* Cancel Subscription Reason Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${
              isDark
                ? "bg-[#1A1A1E] backdrop-blur-lg border border-white/[0.08]"
                : "bg-white backdrop-blur-lg border border-gray-200"
            } rounded-3xl p-7 max-w-md w-full shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className={`text-lg font-black ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Cancel Subscription
              </h2>
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className={`p-1.5 rounded-full transition-colors ${
                  isDark ? "hover:bg-white/[0.06]" : "hover:bg-gray-100"
                }`}
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label
                  className={`block text-sm font-semibold mb-2 ${
                    isDark ? "text-white/80" : "text-gray-700"
                  }`}
                >
                  Please tell us why you&apos;re leaving
                </label>
                <Textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className={styles.input}
                  placeholder="Cancellation reason…"
                  disabled={isCancelling}
                />
              </div>
              <div
                className={`rounded-xl p-4 space-y-1.5 ${
                  isDark ? "bg-white/[0.03]" : "bg-gray-50"
                }`}
              >
                <p
                  className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}
                >
                  <strong>Immediate:</strong> Service ends now
                </p>
                <p
                  className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}
                >
                  <strong>End-of-term:</strong> Service continues until billing
                  period ends
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setCancellationMode("Immediate");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className={`flex-1 rounded-full ${
                    isDark
                      ? "bg-red-500/80 hover:bg-red-500 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {isCancelling ? "Cancelling…" : "Cancel Now"}
                </Button>
                <Button
                  onClick={() => {
                    setCancellationMode("End-of-term");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className={`flex-1 rounded-full ${
                    isDark
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                      : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                  }`}
                >
                  {isCancelling ? "Cancelling…" : "End of Term"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Selection Dialog for Cancellation */}
      <AccountSelectionDialog
        isOpen={showCancelAccountDialog}
        onClose={() => setShowCancelAccountDialog(false)}
        onConfirm={handleCancelAccountDeletion}
        accounts={userAccounts}
        newPlan={{
          id: "Insta-Automation-Free",
          name: "Free",
          description: "",
          monthlyPrice: 0,
          yearlyPrice: 0,
          account: 1,
          limit: 500,
          features: [],
          popular: false,
        }}
        isLoading={isProcessingCancellation}
      />
    </div>
  );
}
