"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Instagram,
  Settings,
  Users,
  BarChart3,
  Zap,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Crown,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
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
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import defaultImg from "public/assets/img/default-img.jpg";
import { getUserById } from "@/lib/services/user-actions.api";
import {
  getInstaAccount,
  refreshInstagramToken,
  updateAccountSettings,
} from "@/lib/services/insta-actions.api";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";

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

// Theme styles interface
interface ThemeStyles {
  containerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  alertBg: string;
  buttonOutlineBorder: string;
  buttonOutlineText: string;
}

// Constants
const FREE_PLAN_REPLY_LIMIT = 500;
const FREE_PLAN_ACCOUNT_LIMIT = 1;

export default function AccountsPage() {
  // Hooks
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();
  const isMounted = useRef(true);

  // State
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

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Theme-based styles
  const themeStyles = useMemo((): ThemeStyles => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FC]",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-500",
      textMuted: isDark ? "text-gray-500" : "text-gray-400",
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      cardBorder: isDark ? "border-gray-800" : "border-gray-100",
      badgeBg: isDark ? "bg-gray-800" : "bg-gray-100",
      alertBg: isDark ? "bg-red-900/20" : "bg-red-50",
      buttonOutlineBorder: isDark ? "border-gray-700" : "border-gray-200",
      buttonOutlineText: isDark ? "text-gray-300" : "text-gray-600",
    };
  }, [currentTheme]);

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

      if (!isMounted.current) return;

      if (response?.accounts) {
        const formattedAccounts: InstagramAccount[] = response.accounts.map(
          (acc: any) => ({
            id: acc._id,
            instagramId: acc.instagramId,
            username: acc.username,
            profilePicture: acc.profilePicture || defaultImg.src,
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
      if (!isMounted.current) return;
      console.error("Failed to fetch accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts",
      );
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [userId, router, apiRequest]);

  // Fetch user subscriptions
  const fetchSubscriptions = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      const userData = await getUserById(apiRequest, userId);
      if (userData && isMounted.current) {
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
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading accounts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`min-h-screen ${themeStyles.containerBg} flex items-center justify-center`}
      >
        <Card
          className={`max-w-md ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
        >
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Error Loading Accounts
            </h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button
              onClick={fetchAccounts}
              className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/insta/dashboard"
            className="text-gray-400 hover:text-gray-600"
          >
            Dashboard
          </Link>
          <span className="text-gray-300">›</span>
          <span className="font-medium text-gray-800">Accounts</span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200/50">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Instagram Accounts
              </h1>
              <p className="text-sm text-gray-500">
                Manage all your connected Instagram accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleAddAccountClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Total Accounts</p>
              <Instagram className="h-4 w-4 text-pink-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {accounts.length} / {accountLimit}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {stats.activeAccounts} active
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Total Followers</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {stats.totalFollowers.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Auto Replies</p>
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {stats.totalReplies} / {replyLimit}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Avg Engagement</p>
              <BarChart3 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">
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
                themeStyles={themeStyles}
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
              themeStyles={themeStyles}
              currentTheme={currentTheme}
              onAddAccount={handleAddAccountClick}
            />
          )}
        </div>
      </div>

      {/* Account Limit Dialog */}
      <AlertDialog
        open={showAccountLimitDialog}
        onOpenChange={setShowAccountLimitDialog}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Account Limit Reached</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              You have reached the maximum number of accounts for your current
              plan ({accounts.length}/{accountLimit}). To add more accounts,
              please upgrade your subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              onClick={() => router.push("/insta/pricing")}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Account Card Component
interface AccountCardProps {
  account: InstagramAccount;
  themeStyles: ThemeStyles;
  isUpdating: boolean;
  hasError: boolean;
  onToggleAccount: (accountId: string, field: string, value: boolean) => void;
  onRefreshToken: (instagramId: string) => void;
  onImageError: (accountId: string) => void;
  formatLastActivity: (dateString: string) => string;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  themeStyles,
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
    <div
      className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-5 hover:border-pink-200 transition-all`}
    >
      <div className="flex flex-col md:flex-row gap-4">
        {/* Account Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <Image
              src={hasError ? defaultImg.src : account.profilePicture}
              alt={account.username}
              width={56}
              height={56}
              onError={() => onImageError(account.id)}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                account.isActive ? "bg-emerald-400" : "bg-gray-300"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-800">
                @{account.username}
              </h3>
              <Badge
                className={
                  account.isActive
                    ? "bg-green-100 text-green-600 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }
              >
                {account.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{account.followersCount.toLocaleString()} followers</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{account.mediaCount} posts</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {account.templatesCount}
            </p>
            <p className="text-xs text-gray-400">Templates</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {account.accountReply}
            </p>
            <p className="text-xs text-gray-400">Replies</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {account.accountDMSent}
            </p>
            <p className="text-xs text-gray-400">DMs</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {formatLastActivity(account.lastActivity)}
            </p>
            <p className="text-xs text-gray-400">Active</p>
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
              className="data-[state=checked]:bg-pink-500"
            />
            <span className="text-xs text-gray-500 hidden lg:inline">
              Auto-reply
            </span>
          </div>

          {/* Refresh Token Button */}
          {isTokenExpiring && (
            <button
              onClick={() => onRefreshToken(account.instagramId)}
              className="p-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              title="Refresh token"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {/* Manage Button */}
          <Link
            href={`/insta/accounts/${account.id}`}
            className="p-2 text-gray-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
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
  themeStyles: ThemeStyles;
  currentTheme: string;
  onAddAccount: () => void;
}

const EmptyAccountsCard: React.FC<EmptyAccountsCardProps> = ({
  themeStyles,
  currentTheme,
  onAddAccount,
}) => (
  <div
    className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-12 text-center`}
  >
    <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-4">
      <Instagram className="h-10 w-10 text-pink-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-2">
      No accounts connected
    </h3>
    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
      Connect your first Instagram Business account to start automating replies
    </p>
    <button
      onClick={onAddAccount}
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-colors"
    >
      <Plus className="h-4 w-4" />
      Connect Your First Account
    </button>
  </div>
);
