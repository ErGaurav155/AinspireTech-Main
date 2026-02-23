"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Bot,
  Target,
  TrendingUp,
} from "lucide-react";
import defaultImg from "public/assets/img/default-img.jpg";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AccountSelectionDialog } from "@/components/insta/AccountSelectionDialog";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import { Textarea } from "@rocketreplai/ui/components/radix/textarea";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  cancelRazorPaySubscription,
  deleteInstaAccount,
  getDashboardData,
  getReplyLogs,
  getSubscriptioninfo,
  refreshInstagramToken,
  InstagramAccount,
  SubscriptionInfo,
} from "@/lib/services/insta-actions.api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardAccount extends InstagramAccount {
  id: string;
  templatesCount: number;
  repliesCount: number;
  replyLimit: number;
  accountLimit: number;
  totalAccounts: number;
  lastActivity: string;
  engagementRate: number;
  successRate: number;
  avgResponseTime: number;
  tokenExpiresAt: Date;
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
  recentActivity?: any[];
}

interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_PLAN_ACCOUNT_LIMIT = 1;
const CANCELLATION_REASON_PLACEHOLDER = "User requested cancellation";

// ─── Stat Card config ─────────────────────────────────────────────────────────

const STAT_CARD_STYLES = [
  {
    bg: "bg-teal-50",
    border: "border-teal-100",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    valueColor: "text-teal-700",
  },
  {
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    valueColor: "text-rose-700",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-700",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-100",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    valueColor: "text-purple-700",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-100",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    valueColor: "text-orange-700",
  },
] as const;

// ─── Small Components ─────────────────────────────────────────────────────────

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
  const s = STAT_CARD_STYLES[styleIndex % STAT_CARD_STYLES.length];
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
        <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
        <p className={`text-2xl font-bold ${s.valueColor}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {extra && <p className="text-[10px] text-gray-400 mt-0.5">{extra}</p>}
      </div>
    </div>
  );
});

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();

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
      accountLimit: accounts[0]?.accountLimit || 1,
      replyLimit: accounts[0]?.replyLimit || 500,
      engagementRate:
        accounts.length > 0
          ? accounts.reduce((s, a) => s + a.engagementRate, 0) / accounts.length
          : 0,
      successRate:
        accounts.length > 0
          ? accounts.reduce((s, a) => s + a.successRate, 0) / accounts.length
          : 0,
      overallAvgResponseTime:
        accounts.length > 0
          ? accounts.reduce((s, a) => s + a.avgResponseTime, 0) /
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

      const dashboardResponse = await getDashboardData(apiRequest);
      const {
        accounts: dbAccounts,
        totalReplies,
        accountLimit,
        replyLimit,
        totalAccounts,
        totalTemplates,
        activeAccounts,
        successRate,
        engagementRate,
        overallAvgResponseTime,
      } = dashboardResponse;

      if (!dbAccounts?.length) return [];

      const completeAccounts: DashboardAccount[] = dbAccounts.map(
        (dbAccount: any) => ({
          id: dbAccount._id,
          instagramId: dbAccount.instagramId,
          userId: dbAccount.userId,
          username: dbAccount.username,
          accessToken: dbAccount.accessToken,
          isActive: dbAccount.isActive || false,
          autoReplyEnabled: dbAccount.autoReplyEnabled || false,
          autoDMEnabled: dbAccount.autoDMEnabled || false,
          followCheckEnabled: dbAccount.followCheckEnabled || false,
          requireFollowForFreeUsers:
            dbAccount.requireFollowForFreeUsers || false,
          accountReply: dbAccount.accountReply || 0,
          accountFollowCheck: dbAccount.accountFollowCheck || 0,
          accountDMSent: dbAccount.accountDMSent || 0,
          lastActivity: dbAccount.lastActivity || new Date().toISOString(),
          profilePicture: dbAccount.profilePicture || defaultImg.src,
          followersCount: dbAccount.followersCount || 0,
          followingCount: dbAccount.followingCount || 0,
          mediaCount: dbAccount.mediaCount || 0,
          metaCallsThisHour: dbAccount.metaCallsThisHour || 0,
          lastMetaCallAt: dbAccount.lastMetaCallAt || new Date().toISOString(),
          isMetaRateLimited: dbAccount.isMetaRateLimited || false,
          metaRateLimitResetAt: dbAccount.metaRateLimitResetAt,
          createdAt: dbAccount.createdAt,
          updatedAt: dbAccount.updatedAt,
          templatesCount: dbAccount.templatesCount || 0,
          repliesCount: totalReplies || 0,
          replyLimit: replyLimit || 500,
          accountLimit: accountLimit || 1,
          totalAccounts: totalAccounts || 0,
          engagementRate: engagementRate || 0,
          successRate: successRate || 0,
          avgResponseTime: overallAvgResponseTime || 0,
          tier: dbAccount.tier || "free",
        }),
      );

      setUserAccounts(completeAccounts);
      return completeAccounts;
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      setError(err instanceof Error ? err.message : "Failed to load accounts");
      showToast("Failed to load accounts", "error");
      return null;
    }
  }, [userId, router, showToast, apiRequest]);

  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      setIsLoading(true);

      const accountsData = await fetchAccounts();

      if (!accountsData) {
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
      } catch {
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
        const { subscriptions } = await getSubscriptioninfo(apiRequest);
        setSubscriptions(subscriptions || []);
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
    const accountLimit = dashboardData?.accountLimit || 1;
    const currentAccounts = dashboardData?.totalAccounts || 0;

    if (currentAccounts >= accountLimit) {
      setShowAccountLimitDialog(true);
    } else {
      router.push("/insta/accounts/add");
    }
  }, [dashboardData, router]);

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
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">
            Loading your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen max-w-7xl m-auto w-full bg-[#F8F9FC]">
      <div className="p-4 md:p-6 space-y-5 mx-auto">
        {/* ── Automations Not Working Warning ────────────────────────────── */}
        {accountsWithIssues.length > 0 && (
          <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="font-bold text-red-600 text-sm">
                    Your automations are not working!
                  </p>
                </div>
                <p className="text-xs text-gray-500 mb-3 font-medium">
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
                      className="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <X className="h-2.5 w-2.5 text-red-500" />
                      </div>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                className="flex-shrink-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-xs font-bold px-5 shadow-md shadow-pink-200/50 hover:opacity-90 transition-opacity"
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
          <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-2xl p-5 shadow-lg shadow-pink-200/50">
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-4 top-4 w-20 h-20 rounded-full bg-white/10" />
            <button
              onClick={() => setShowPromoBanner(false)}
              className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-col ">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <span className="text-white font-black text-sm">
                    Early Bird Offer
                  </span>
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </div>
                <p className="text-white font-black text-lg">
                  Save 60% on RocketReplai Pro
                </p>
                <p className="text-pink-100 text-xs mt-0.5">
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  {subscriptions[0].chatbotType} Active
                </p>
                <p className="text-xs text-emerald-600">
                  Next billing:{" "}
                  {new Date(subscriptions[0].expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-full px-4"
              >
                <Link href="/insta/pricing">Upgrade</Link>
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInitiation}
                disabled={isCancelling || isProcessingCancellation}
                className="text-xs rounded-full px-4"
              >
                {isCancelling ? "Cancelling…" : "Cancel"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Hero Card ───────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-gray-100">
          {/* Background gradient blob */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-white to-purple-50/60 pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 opacity-50 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 opacity-30 blur-2xl pointer-events-none" />

          <div className="relative z-10 p-5 md:p-10 text-center">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 tracking-tight">
              Your growth game just leveled up{" "}
              <span role="img" aria-label="game">
                🎮
              </span>
            </h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-7 leading-relaxed">
              You&apos;re one step closer to growing your Instagram audience.
              Automate DMs, connect authentically, and watch your followers turn
              into real relationships.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-7">
              <Button
                onClick={handleAddAccountClick}
                className="bg-gradient-to-r from-pink-500 to-pink-300 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-full px-7 py-2.5 shadow-lg shadow-pink-200/60 transition-all hover:shadow-pink-300/70 hover:-translate-y-0.5"
              >
                Create Automation
              </Button>
              <Button
                asChild
                variant="outline"
                className="font-semibold rounded-full px-7 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 gap-2"
              >
                <Link href="/insta/analytics">
                  <PlayCircle className="h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </div>

            {/* New features pills */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-200 rounded-full px-3 py-1">
                <Sparkles className="h-3 w-3 text-pink-500" />
                <span className="text-xs font-semibold text-pink-600">
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
                  className="flex flex-wrap items-center gap-1  md:gap-1.5  text-sm md:text-base bg-white border border-gray-200 rounded-full px-1.5 md:px-3 py-1 text-gray-600 hover:border-pink-200 hover:text-pink-600 transition-colors cursor-pointer"
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
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-pink-400" />
              Growth Overview
            </h2>
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-pink-50"
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
              value={`${dashboardData?.totalReplies ?? 0} / ${dashboardData?.replyLimit ?? 1000}`}
              subtitle={`This month`}
              extra={`Total: ${dashboardData?.totalReplies ?? 0}`}
              styleIndex={1}
            />
            <StatCard
              title="Messages"
              icon={MessageSquare}
              value={`${totalDMSent} / 2000`}
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
              styleIndex={5}
            />
          </div>
        </div>

        {/* ── Messages Sent / Recent Activity ─────────────────────────────── */}
        {dashboardData?.recentActivity &&
          dashboardData.recentActivity.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-pink-400" />
                  <h3 className="text-sm font-bold text-gray-800">
                    Recent Activity
                  </h3>
                </div>
                <Link
                  href="/insta/analytics"
                  className="text-xs text-pink-500 font-semibold flex items-center gap-1 hover:text-pink-600"
                >
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {(dashboardData.recentActivity as RecentActivity[]).map(
                  (activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        <p className="text-sm text-gray-700">
                          {activity.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-400" />
                <h3 className="text-sm font-bold text-gray-800">
                  Connected Accounts
                </h3>
              </div>
              <button
                onClick={handleAddAccountClick}
                className="text-xs text-pink-500 font-semibold flex items-center gap-1 hover:text-pink-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {userAccounts.map((account) => {
                const isTokenExpiring =
                  account.tokenExpiresAt &&
                  new Date(account.tokenExpiresAt) <
                    new Date(Date.now() + 24 * 60 * 60 * 1000);
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Image
                          width={40}
                          height={40}
                          src={
                            hasError.includes(account.id)
                              ? defaultImg.src
                              : account.profilePicture || defaultImg.src
                          }
                          alt={account.username}
                          onError={() => handleImageError(account.id)}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            account.isActive ? "bg-emerald-400" : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          @{account.username}
                        </p>
                        <p className="text-xs text-gray-400">
                          {account.followersCount?.toLocaleString() || 0}{" "}
                          followers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTokenExpiring && userId && (
                        <button
                          onClick={() =>
                            refreshInstagramToken(
                              apiRequest,
                              account.instagramId,
                            )
                          }
                          className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-semibold flex items-center gap-1 hover:bg-amber-100 transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh Token
                        </button>
                      )}
                      <Link
                        href={`/insta/accounts/${account.id}`}
                        className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 font-semibold hover:bg-gray-200 transition-colors"
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-4">
              <Instagram className="h-8 w-8 text-pink-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">
              No accounts connected yet
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Connect your Instagram Business account to start automating
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-pink-500 to-pink-300 text-white rounded-full font-bold px-7 shadow-md shadow-pink-200/50"
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
      <AlertDialog
        open={showAccountLimitDialog}
        onOpenChange={setShowAccountLimitDialog}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Account Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              Your current plan allows {dashboardData?.accountLimit || 1}{" "}
              account(s). Upgrade to Pro Unlimited to connect up to 3 Instagram
              accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => router.push("/insta/pricing")}
              className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
            >
              Upgrade Now
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Cancellation Dialog */}
      <AlertDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? Your plan will
              revert to the Free plan which only allows 1 Instagram account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Keep Plan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedCancellation}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Reason Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-900">
                Cancel Subscription
              </h2>
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Please tell us why you&apos;re leaving
                </label>
                <Textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                  placeholder="Cancellation reason…"
                  disabled={isCancelling}
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs text-gray-600">
                  <strong>Immediate:</strong> Service ends now
                </p>
                <p className="text-xs text-gray-600">
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
                  className="flex-1 rounded-full"
                >
                  {isCancelling ? "Cancelling…" : "Cancel Now"}
                </Button>
                <Button
                  onClick={() => {
                    setCancellationMode("End-of-term");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full"
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
