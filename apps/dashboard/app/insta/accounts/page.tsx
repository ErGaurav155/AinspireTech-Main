"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Default from "@/public/assets/img/default-img.jpg";

import {
  Plus,
  Instagram,
  Settings,
  Users,
  BarChart3,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Orbs,
  Spinner,
  Switch,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  getInstaAccount,
  refreshInstagramToken,
  updateAccountSettings,
} from "@/lib/services/insta-actions.api";
import { useApi } from "@/lib/useApi";
import { AccountLimitDialog } from "@/components/shared/AccountLimitDialog";

// Types
interface InstagramAccount {
  id: string;
  instagramId: string;
  username: string;
  profilePicture: string;
  followersCount: number;
  mediaCount: number;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  templatesCount: number;
  accountReply: number;
  accountDMSent: number;
  accountFollowCheck: number;
  lastActivity: string;
  tokenExpiresAt?: string;
  isMetaRateLimited: boolean;
  createdAt: string;
}

// Constants
const FREE_PLAN_REPLY_LIMIT = 500;
const FREE_PLAN_ACCOUNT_LIMIT = 1;

export default function AccountsPage() {
  const { userId, isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showAccountLimitDialog, setShowAccountLimitDialog] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState<string | null>(
    null,
  );

  // Helper: Format last activity
  const formatLastActivity = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return "N/A";
    }
  }, []);

  // Helper: Handle image error
  const handleImageError = useCallback((id: string): void => {
    setHasError((prev) => [...prev, id]);
  }, []);

  // Fetch Instagram accounts
  const fetchAccounts = useCallback(async (): Promise<void> => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getInstaAccount(apiRequest);

      if (response?.accounts) {
        const formattedAccounts: InstagramAccount[] = response.accounts.map(
          (acc: any) => ({
            id: acc._id,
            instagramId: acc.instagramId,
            username: acc.username,
            profilePicture: acc.profilePicture || Default,
            followersCount: acc.followersCount || 0,
            mediaCount: acc.mediaCount || 0,
            isActive: acc.isActive || false,
            autoReplyEnabled: acc.autoReplyEnabled || false,
            autoDMEnabled: acc.autoDMEnabled || false,
            followCheckEnabled: acc.followCheckEnabled || false,
            templatesCount: acc.templatesCount || 0,
            accountReply: acc.accountReply || 0,
            accountDMSent: acc.accountDMSent || 0,
            accountFollowCheck: acc.accountFollowCheck || 0,
            lastActivity: acc.lastActivity || new Date().toISOString(),
            tokenExpiresAt: acc.tokenExpiresAt,
            isMetaRateLimited: acc.isMetaRateLimited || false,
            createdAt: acc.createdAt,
          }),
        );

        setAccounts(formattedAccounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, router, apiRequest]);

  // Fetch user subscriptions
  const fetchSubscriptions = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      const userData = await getUserById(apiRequest, userId);
      if (userData) {
        setUserInfo(userData);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    }
  }, [userId, apiRequest]);

  // Initialize component
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const initializeData = async () => {
      await Promise.all([fetchSubscriptions(), fetchAccounts()]);
    };

    initializeData();
  }, [userId, isLoaded, fetchSubscriptions, fetchAccounts]);

  // Handle toggle account status
  const handleToggleAccount = async (
    accountId: string,
    field: string,
    value: boolean,
  ) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;

    setIsUpdatingAccount(accountId);

    // Optimistic UI update
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, [field]: value } : acc,
      ),
    );

    try {
      const settings: any = {};
      settings[field] = value;

      await updateAccountSettings(apiRequest, account.instagramId, settings);

      toast({
        title: "Success",
        description: `Account ${field === "isActive" ? "status" : "setting"} updated successfully`,
        duration: 3000,
      });
    } catch (error) {
      // Revert on error
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, [field]: !value } : acc,
        ),
      );

      toast({
        title: "Error",
        description: "Failed to update account settings",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdatingAccount(null);
    }
  };

  // Handle refresh token
  const handleRefreshToken = async (instagramId: string) => {
    try {
      await refreshInstagramToken(apiRequest, instagramId);
      toast({
        title: "Success",
        description: "Token refreshed successfully",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh token",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle add account click
  const handleAddAccountClick = () => {
    const accountLimit = userInfo?.accountLimit || FREE_PLAN_ACCOUNT_LIMIT;

    if (accounts.length >= accountLimit) {
      setShowAccountLimitDialog(true);
    } else {
      router.push("/insta/accounts/add");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAccounts();
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const activeAccounts = accounts.filter(
      (account) => account.isActive,
    ).length;
    const totalFollowers = accounts.reduce(
      (sum, acc) => sum + acc.followersCount,
      0,
    );
    const totalReplies = accounts.reduce(
      (sum, acc) => sum + acc.accountReply,
      0,
    );
    const totalDMs = accounts.reduce((sum, acc) => sum + acc.accountDMSent, 0);
    const avgEngagement =
      accounts.length > 0
        ? ((totalReplies + totalDMs) / accounts.length / 100).toFixed(1)
        : "0";

    return {
      activeAccounts,
      totalFollowers,
      totalReplies,
      totalDMs,
      avgEngagement,
    };
  }, [accounts]);

  // Get account limits
  const accountLimit = userInfo?.accountLimit || FREE_PLAN_ACCOUNT_LIMIT;
  const replyLimit = userInfo?.replyLimit || FREE_PLAN_REPLY_LIMIT;

  // Loading state
  if (!isLoaded || isLoading) {
    return <Spinner label="Loading accounts..." />;
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className={styles.container}>
          <div className={`rounded-2xl p-6 text-center ${styles.card}`}>
            <AlertCircle
              className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`}
            />
            <h2 className={`text-xl font-bold mb-2 ${styles.text.primary}`}>
              Error Loading Accounts
            </h2>
            <p className={`${isDark ? "text-white/40" : "text-gray-500"} mb-6`}>
              {error}
            </p>
            <Button onClick={fetchAccounts} className={styles.pill}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Page-specific styles (not in central theme)
  const pageStyles = {
    headerIcon: isDark
      ? "w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center opacity-90 shadow-lg shadow-pink-500/20"
      : "w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200/50",
    refreshButton: `flex items-center gap-2 px-4 py-2 text-sm ${
      isDark
        ? "bg-white/[0.06] border border-white/[0.09] backdrop-blur-[12px] text-white/70 hover:bg-white/[0.09] rounded-xl transition-colors"
        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 rounded-xl transition-colors"
    } ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`,
    addButton: `flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-colors`,
    statLabel: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
    statValue: isDark
      ? "text-2xl font-bold text-white"
      : "text-2xl font-bold text-gray-800",
    statSub: isDark
      ? "text-xs text-green-400 mt-1"
      : "text-xs text-green-600 mt-1",
    accountAvatar: (isActive: boolean) =>
      isDark
        ? `absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#1A1A1E] ${isActive ? "bg-emerald-400" : "bg-gray-500"}`
        : `absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${isActive ? "bg-emerald-400" : "bg-gray-300"}`,
    accountName: isDark
      ? "font-semibold text-white"
      : "font-semibold text-gray-800",
    accountStats: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
    accountStatItem: "text-center",
    accountStatValue: isDark
      ? "text-sm font-semibold text-white"
      : "text-sm font-semibold text-gray-800",
    accountStatLabel: isDark
      ? "text-xs text-white/40"
      : "text-xs text-gray-400",
    accountStatDivider: isDark
      ? "w-1 h-1 bg-white/20 rounded-full"
      : "w-1 h-1 bg-gray-300 rounded-full",
    tokenButton: isDark
      ? "p-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
      : "p-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors",
    manageButton: isDark
      ? "p-2 text-white/40 hover:text-pink-400 rounded-lg hover:bg-pink-500/10 transition-colors"
      : "p-2 text-gray-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors",
    emptyButton: isDark
      ? "inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-colors"
      : "inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-colors",
    iconPink: isDark
      ? "bg-pink-500/20 border border-pink-500/30"
      : "bg-pink-100",
    badgeGreen: isDark
      ? "bg-green-500/10 border border-green-500/20 text-green-400"
      : "bg-green-100 text-green-600 border-green-200",
    badgeGray: isDark
      ? "bg-gray-500/10 border border-gray-500/20 text-gray-400"
      : "bg-gray-100 text-gray-600 border-gray-200",
    switchTrack: isDark
      ? "data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white/[0.06]"
      : "data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-gray-200",
    textMuted: isDark ? "text-white/25" : "text-gray-400",
  };

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={pageStyles.headerIcon}>
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${styles.text.primary}`}>
                Instagram Accounts
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                Manage all your connected Instagram accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={pageStyles.refreshButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleAddAccountClick}
              className={pageStyles.addButton}
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${styles.card} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={pageStyles.statLabel}>Total Accounts</p>
              <Instagram
                className={`h-4 w-4 ${isDark ? "text-pink-400" : "text-pink-500"}`}
              />
            </div>
            <p className={pageStyles.statValue}>
              {accounts.length} / {accountLimit}
            </p>
            <p className={pageStyles.statSub}>{stats.activeAccounts} active</p>
          </div>

          <div className={`${styles.card} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={pageStyles.statLabel}>Total Followers</p>
              <Users
                className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-500"}`}
              />
            </div>
            <p className={pageStyles.statValue}>
              {stats.totalFollowers.toLocaleString()}
            </p>
          </div>

          <div className={`${styles.card} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={pageStyles.statLabel}>Auto Replies</p>
              <Zap
                className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}
            >
              {stats.totalReplies} / {replyLimit}
            </p>
          </div>

          <div className={`${styles.card} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={pageStyles.statLabel}>Avg Engagement</p>
              <BarChart3
                className={`h-4 w-4 ${isDark ? "text-green-400" : "text-green-500"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`}
            >
              {stats.avgEngagement}%
            </p>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="space-y-4">
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                isDark={isDark}
                styles={styles}
                pageStyles={pageStyles}
                isUpdating={isUpdatingAccount === account.id}
                hasError={hasError.includes(account.id)}
                onToggleAccount={handleToggleAccount}
                onRefreshToken={handleRefreshToken}
                onImageError={handleImageError}
                formatLastActivity={formatLastActivity}
              />
            ))
          ) : (
            <EmptyAccountsCard
              styles={styles}
              pageStyles={pageStyles}
              isDark={isDark}
              onAddAccount={handleAddAccountClick}
            />
          )}
        </div>
      </div>
      <AccountLimitDialog
        open={showAccountLimitDialog}
        onOpenChange={setShowAccountLimitDialog}
        currentAccounts={accounts.length}
        accountLimit={subscriptions.length === 0 ? 1 : 3}
        dashboardType="insta"
      />
      {/* Account Limit Dialog */}
      {/* <AlertDialog
        open={showAccountLimitDialog}
        onOpenChange={setShowAccountLimitDialog}
      >
        <AlertDialogContent className={styles.dialogContent}>
          <AlertDialogHeader>
            <AlertDialogTitle className={styles.dialogTitle}>
              Account Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className={styles.dialogDesc}>
              You have reached the maximum number of accounts for your current
              plan ({accounts.length}/{accountLimit}). To add more accounts,
              please upgrade your subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={styles.dialogCancel}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => router.push("/insta/pricing")}
              className={styles.button.primary}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </div>
  );
}

// Account Card Component
interface AccountCardProps {
  account: InstagramAccount;
  isDark: boolean;
  styles: ReturnType<typeof useThemeStyles>["styles"];
  pageStyles: any;
  isUpdating: boolean;
  hasError: boolean;
  onToggleAccount: (accountId: string, field: string, value: boolean) => void;
  onRefreshToken: (instagramId: string) => void;
  onImageError: (accountId: string) => void;
  formatLastActivity: (dateString: string) => string;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isDark,
  styles,
  pageStyles,
  isUpdating,
  hasError,
  onToggleAccount,
  onRefreshToken,
  onImageError,
  formatLastActivity,
}) => {
  const isTokenExpiring =
    account.tokenExpiresAt &&
    new Date(account.tokenExpiresAt) <
      new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <div className={`${styles.card} rounded-xl p-4`}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Account Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <Image
              src={hasError ? Default : account.profilePicture}
              alt={account.username}
              width={56}
              height={56}
              onError={() => onImageError(account.id)}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 dark:border-white/[0.08]"
            />
            <span className={pageStyles.accountAvatar(account.isActive)} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className={pageStyles.accountName}>@{account.username}</h3>
              <span
                className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                  account.isActive
                    ? pageStyles.badgeGreen
                    : pageStyles.badgeGray
                }`}
              >
                {account.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={pageStyles.accountStats}>
                {account.followersCount.toLocaleString()} followers
              </span>
              <span className={pageStyles.accountStatDivider} />
              <span className={pageStyles.accountStats}>
                {account.mediaCount} posts
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className={pageStyles.accountStatItem}>
            <p className={pageStyles.accountStatValue}>
              {account.templatesCount}
            </p>
            <p className={pageStyles.accountStatLabel}>Templates</p>
          </div>
          <div className={pageStyles.accountStatItem}>
            <p className={pageStyles.accountStatValue}>
              {account.accountReply}
            </p>
            <p className={pageStyles.accountStatLabel}>Replies</p>
          </div>
          <div className={pageStyles.accountStatItem}>
            <p className={pageStyles.accountStatValue}>
              {account.accountDMSent}
            </p>
            <p className={pageStyles.accountStatLabel}>DMs</p>
          </div>
          <div className={pageStyles.accountStatItem}>
            <p className={pageStyles.accountStatValue}>
              {formatLastActivity(account.lastActivity)}
            </p>
            <p className={pageStyles.accountStatLabel}>Active</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Auto-reply Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={account.autoReplyEnabled}
              onCheckedChange={(checked) =>
                onToggleAccount(account.id, "autoReplyEnabled", checked)
              }
              disabled={isUpdating}
              className={pageStyles.switchTrack}
            />
            <span
              className={`text-xs hidden lg:inline ${pageStyles.textMuted}`}
            >
              Auto-reply
            </span>
          </div>

          {/* Refresh Token Button */}
          {isTokenExpiring && (
            <button
              onClick={() => onRefreshToken(account.instagramId)}
              className={pageStyles.tokenButton}
              title="Refresh token"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {/* Manage Button */}
          <Link
            href={`/insta/accounts/${account.id}`}
            className={pageStyles.manageButton}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

// Empty Accounts Card Component
interface EmptyAccountsCardProps {
  styles: ReturnType<typeof useThemeStyles>["styles"];
  pageStyles: any;
  isDark: boolean;
  onAddAccount: () => void;
}

const EmptyAccountsCard: React.FC<EmptyAccountsCardProps> = ({
  styles,
  pageStyles,
  isDark,
  onAddAccount,
}) => (
  <div className={`${styles.card} rounded-xl p-4`}>
    <div className="p-6 text-center">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${pageStyles.iconPink}`}
      >
        <Instagram
          className={`h-10 w-10 ${isDark ? "text-pink-400" : "text-pink-400"}`}
        />
      </div>
      <h3 className={`text-xl font-bold mb-2 ${styles.text.primary}`}>
        No accounts connected
      </h3>
      <p
        className={`text-sm mb-6 max-w-sm mx-auto ${isDark ? "text-white/40" : "text-gray-500"}`}
      >
        Connect your first Instagram Business account to start automating
        replies
      </p>
      <button onClick={onAddAccount} className={pageStyles.emptyButton}>
        <Plus className="h-4 w-4" />
        Connect Your First Account
      </button>
    </div>
  </div>
);
