"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image, { StaticImageData } from "next/image";
import Default from "@/public/assets/img/default-img.jpg";

import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Instagram,
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Camera,
  Heart,
  MessageCircle,
  Zap,
  Trash2,
  Shield,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Button, Orbs, Switch, toast, useThemeStyles } from "@rocketreplai/ui";

import {
  getInstaAccountById,
  updateAccountSettings,
  deleteInstaAccount,
  refreshInstagramToken,
} from "@/lib/services/insta-actions.api";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// Types
interface AccountDetails {
  instagramId: string;
  username: string;
  profilePicture: string | StaticImageData;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  accountType?: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers?: boolean;
  accountReply: number;
  accountDMSent: number;
  accountFollowCheck: number;
  lastActivity: string;
  tokenExpiresAt?: string;
  isMetaRateLimited: boolean;
  metaCallsThisHour: number;
  metaCallsRemaining?: number;
  metaRateLimitResetAt?: string;
  templatesCount: number;
  createdAt: string;
  updatedAt: string;
  _id?: string;
  userId?: string;
}

// API Response Types - Updated to match actual response
interface AccountDetailsResponse {
  success: boolean;
  accountInfo: {
    _id: string;
    instagramId: string;
    userId: string;
    username: string;
    profilePicture?: string;
    followersCount: number;
    followingCount: number;
    mediaCount: number;
    isActive: boolean;
    autoReplyEnabled: boolean;
    autoDMEnabled: boolean;
    followCheckEnabled: boolean;
    requireFollowForFreeUsers: boolean;
    metaCallsThisHour: number;
    isMetaRateLimited: boolean;
    tokenExpiresAt?: string;
    createdAt: string;
    updatedAt: string;
    templatesCount: number;
    accountReply: number;
    accountDMSent: number;
    accountFollowCheck: number;
    lastActivity: string;
  };
  instagramInfo: {
    account_type: string;
    followers_count: number;
    follows_count: number;
    id: string;
    media_count: number;
    username: string;
    profile_picture_url?: string;
  };
  rateLimitInfo: {
    isMetaRateLimited: boolean;
    metaCallsRemaining: number;
    metaCallsUsed: number;
    metaRateLimitResetAt?: string;
  };
  timestamp: string;
}

export default function AccountDetailsPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [instagramInfo, setInstagramInfo] = useState<any>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [settings, setSettings] = useState({
    isActive: true,
    autoReplyEnabled: true,
    autoDMEnabled: true,
    followCheckEnabled: true,
    requireFollowForFreeUsers: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // Page-specific styles (not in central theme)
  const pageStyles = useMemo(() => {
    return {
      backButton: isDark
        ? "p-2 text-white/40 hover:text-pink-400 rounded-lg hover:bg-pink-500/10 transition-colors"
        : "p-2 text-gray-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors",
      headerAvatar: isDark
        ? "w-12 h-12 rounded-full object-cover border-2 border-white/[0.08]"
        : "w-12 h-12 rounded-full object-cover border-2 border-gray-100",
      headerTitle: isDark
        ? "text-2xl font-bold text-white"
        : "text-2xl font-bold text-gray-800",
      headerSub: isDark ? "text-sm text-white/40" : "text-sm text-gray-400",
      saveButton: (disabled?: boolean) =>
        isDark
          ? `bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
          : `bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      statCard: isDark
        ? "bg-white/[0.06] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[24px] backdrop-saturate-[180%] crystal-card shimmer-card relative overflow-hidden rounded-xl p-4"
        : "bg-white border border-gray-100 shadow-sm hover:border-cyan-200 hover:shadow-md transition-all rounded-xl p-4",
      statIcon: (color: string) =>
        isDark ? `h-4 w-4 text-${color}-400` : `h-4 w-4 text-${color}-500`,
      statLabel: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      statValue: isDark
        ? "text-xl font-bold text-white"
        : "text-xl font-bold text-gray-800",
      statWarning: isDark
        ? "text-xl font-bold text-red-400"
        : "text-xl font-bold text-red-600",

      sectionTitle: isDark
        ? "font-semibold text-white mb-4"
        : "font-semibold text-gray-800 mb-4",
      switchTrack: isDark
        ? "data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white/[0.06]"
        : "data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-gray-200",
      settingLabel: isDark
        ? "text-sm font-medium text-white/80"
        : "text-sm font-medium text-gray-700",
      settingDesc: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      tokenStatus: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6"
        : "bg-white border border-gray-100 rounded-2xl p-6",
      tokenRow: "flex items-center justify-between",
      tokenLabel: isDark ? "text-sm text-white/60" : "text-sm text-gray-600",
      tokenRefresh: isDark
        ? "p-1.5 text-amber-400 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors"
        : "p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors",
      badgeGreen: isDark
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-green-100 text-green-600 border-green-200",
      badgeYellow: isDark
        ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
        : "bg-yellow-100 text-yellow-600 border-yellow-200",
      badgeRed: isDark
        ? "bg-red-500/10 border border-red-500/20 text-red-400"
        : "bg-red-100 text-red-600 border-red-200",
      activitySection: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6"
        : "bg-white border border-gray-100 rounded-2xl p-6",
      activityRow: "flex justify-between",
      activityLabel: isDark ? "text-sm text-white/60" : "text-sm text-gray-600",
      activityValue: isDark
        ? "text-sm font-semibold text-white"
        : "text-sm font-semibold text-gray-800",
      dangerZone: isDark
        ? "bg-white/[0.04] border border-red-500/30 rounded-2xl p-6"
        : "bg-white border border-red-200 rounded-2xl p-6",
      dangerTitle: isDark ? "text-red-400" : "text-red-600",
      dangerButton: isDark
        ? "w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
        : "w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors",
      dangerText: isDark
        ? "text-xs text-white/40 mt-3"
        : "text-xs text-gray-400 mt-3",
      notFoundContainer: isDark
        ? "min-h-screen flex items-center justify-center bg-[#0F0F11]"
        : "min-h-screen flex items-center justify-center bg-[#F8F9FA]",
      notFoundIcon: isDark
        ? "h-12 w-12 text-red-400 mx-auto mb-4"
        : "h-12 w-12 text-red-500 mx-auto mb-4",
      notFoundTitle: isDark
        ? "text-xl font-bold text-white mb-2"
        : "text-xl font-bold text-gray-800 mb-2",
      notFoundButton: isDark
        ? "inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl"
        : "inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl",
      loadingContainer: isDark
        ? "min-h-screen flex items-center justify-center bg-[#0F0F11]"
        : "min-h-screen flex items-center justify-center bg-[#F8F9FA]",
      loadingSpinner: isDark
        ? "w-8 h-8 border-3 border-pink-200 border-t-pink-400 rounded-full animate-spin"
        : "w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin",
      loadingText: isDark ? "text-sm text-white/40" : "text-sm text-gray-400",
    };
  }, [isDark]);

  // Fetch account details
  const fetchAccount = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      console.log("Fetching account with ID:", accountId);

      const response = await getInstaAccountById(apiRequest, accountId);
      console.log("===== RAW ACCOUNT DETAILS RESPONSE =====");
      console.log("Response:", JSON.stringify(response, null, 2));
      console.log("Response type:", typeof response);
      console.log("Response keys:", Object.keys(response || {}));
      console.log("========================================");

      // Handle different response structures
      if (response) {
        // Case 1: Response has accountInfo, instagramInfo, rateLimitInfo directly (from your log)
        if (
          response.accountInfo &&
          response.instagramInfo &&
          response.rateLimitInfo
        ) {
          console.log(
            "Case 1: Response has direct accountInfo, instagramInfo, rateLimitInfo",
          );

          const accountInfo = response.accountInfo;
          const instaInfo = response.instagramInfo;
          const rateInfo = response.rateLimitInfo;

          setInstagramInfo(instaInfo);
          setRateLimitInfo(rateInfo);

          setAccount({
            _id: accountInfo._id,
            userId: accountInfo.userId,
            instagramId: accountInfo.instagramId,
            username: instaInfo.username || accountInfo.username || "Unknown",
            profilePicture:
              instaInfo.profile_picture_url ||
              accountInfo.profilePicture ||
              Default,
            followersCount:
              instaInfo.followers_count || accountInfo.followersCount || 0,
            followingCount:
              instaInfo.follows_count || accountInfo.followingCount || 0,
            mediaCount: instaInfo.media_count || accountInfo.mediaCount || 0,
            accountType: instaInfo.account_type || "",
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
            metaCallsThisHour: accountInfo.metaCallsThisHour || 0,
            isMetaRateLimited: accountInfo.isMetaRateLimited || false,
            tokenExpiresAt: accountInfo.tokenExpiresAt,
            createdAt: accountInfo.createdAt,
            updatedAt: accountInfo.updatedAt,
            templatesCount: accountInfo.templatesCount || 0,
            accountReply: accountInfo.accountReply || 0,
            accountDMSent: accountInfo.accountDMSent || 0,
            accountFollowCheck: accountInfo.accountFollowCheck || 0,
            lastActivity: accountInfo.lastActivity || new Date().toISOString(),
          });

          setSettings({
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
          });
        }
        // Case 2: Response has data property with nested structure
        else if (
          response.data &&
          response.data.accountInfo &&
          response.data.instagramInfo
        ) {
          console.log(
            "Case 2: Response has data.accountInfo and data.instagramInfo",
          );

          const accountInfo = response.data.accountInfo;
          const instaInfo = response.data.instagramInfo;
          const rateInfo = response.data.rateLimitInfo;

          setInstagramInfo(instaInfo);
          setRateLimitInfo(rateInfo);

          setAccount({
            _id: accountInfo._id,
            userId: accountInfo.userId,
            instagramId: accountInfo.instagramId,
            username: instaInfo.username || accountInfo.username || "Unknown",
            profilePicture:
              instaInfo.profile_picture_url ||
              accountInfo.profilePicture ||
              Default,
            followersCount:
              instaInfo.followers_count || accountInfo.followersCount || 0,
            followingCount:
              instaInfo.follows_count || accountInfo.followingCount || 0,
            mediaCount: instaInfo.media_count || accountInfo.mediaCount || 0,
            accountType: instaInfo.account_type || "",
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
            metaCallsThisHour: accountInfo.metaCallsThisHour || 0,
            isMetaRateLimited: accountInfo.isMetaRateLimited || false,
            tokenExpiresAt: accountInfo.tokenExpiresAt,
            createdAt: accountInfo.createdAt,
            updatedAt: accountInfo.updatedAt,
            templatesCount: accountInfo.templatesCount || 0,
            accountReply: accountInfo.accountReply || 0,
            accountDMSent: accountInfo.accountDMSent || 0,
            accountFollowCheck: accountInfo.accountFollowCheck || 0,
            lastActivity: accountInfo.lastActivity || new Date().toISOString(),
          });

          setSettings({
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
          });
        }
        // Case 3: Response is the account object itself
        else if (response._id || response.instagramId) {
          console.log("Case 3: Response is the account object itself");

          const accountInfo = response;

          setAccount({
            _id: accountInfo._id,
            userId: accountInfo.userId,
            instagramId: accountInfo.instagramId,
            username: accountInfo.username || "Unknown",
            profilePicture: accountInfo.profilePicture || Default,
            followersCount: accountInfo.followersCount || 0,
            followingCount: accountInfo.followingCount || 0,
            mediaCount: accountInfo.mediaCount || 0,
            accountType: accountInfo.accountType || "",
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
            metaCallsThisHour: accountInfo.metaCallsThisHour || 0,
            isMetaRateLimited: accountInfo.isMetaRateLimited || false,
            tokenExpiresAt: accountInfo.tokenExpiresAt,
            createdAt: accountInfo.createdAt,
            updatedAt: accountInfo.updatedAt,
            templatesCount: accountInfo.templatesCount || 0,
            accountReply: accountInfo.accountReply || 0,
            accountDMSent: accountInfo.accountDMSent || 0,
            accountFollowCheck: accountInfo.accountFollowCheck || 0,
            lastActivity: accountInfo.lastActivity || new Date().toISOString(),
          });

          setSettings({
            isActive: accountInfo.isActive || false,
            autoReplyEnabled: accountInfo.autoReplyEnabled || false,
            autoDMEnabled: accountInfo.autoDMEnabled || false,
            followCheckEnabled: accountInfo.followCheckEnabled || false,
            requireFollowForFreeUsers:
              accountInfo.requireFollowForFreeUsers || false,
          });
        } else {
          console.log("Unknown response structure:", response);
          toast({
            title: "Error",
            description: "Unexpected API response structure",
            variant: "destructive",
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching account:", error);
      toast({
        title: "Error",
        description: "Failed to load account details",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, accountId, apiRequest]);

  useEffect(() => {
    if (isLoaded && userId) {
      fetchAccount();
    }
  }, [isLoaded, userId, fetchAccount]);

  // Handle setting change
  const handleSettingChange = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!account) return;

    setIsSaving(true);
    try {
      await updateAccountSettings(apiRequest, account.instagramId, settings);

      setAccount((prev) => (prev ? { ...prev, ...settings } : null));

      toast({
        title: "Success",
        description: "Account settings updated successfully",
        duration: 3000,
      });

      // Refresh account data to get updated settings
      await fetchAccount();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!account) return;

    try {
      await deleteInstaAccount(apiRequest, account.instagramId);

      toast({
        title: "Success",
        description: "Account deleted successfully",
        duration: 3000,
      });

      router.push("/insta/accounts");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle refresh token
  const handleRefreshToken = async () => {
    if (!account) return;

    setIsRefreshingToken(true);
    try {
      await refreshInstagramToken(apiRequest, account.instagramId);
      toast({
        title: "Success",
        description: "Token refreshed successfully",
        duration: 3000,
      });

      // Refresh account data to get updated token expiry
      await fetchAccount();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh token",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const isTokenExpiring =
    account?.tokenExpiresAt &&
    new Date(account.tokenExpiresAt) <
      new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!isLoaded || isLoading) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="flex flex-col items-center gap-3">
          <div className={pageStyles.loadingSpinner} />
          <p className={pageStyles.loadingText}>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className={pageStyles.notFoundContainer}>
        <div className="text-center">
          <AlertTriangle className={pageStyles.notFoundIcon} />
          <h2 className={pageStyles.notFoundTitle}>Account not found</h2>
          <Link href="/insta/accounts" className={pageStyles.notFoundButton}>
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-3">
            <Link href="/insta/accounts" className={pageStyles.backButton}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src={hasError ? Default : account.profilePicture}
                alt={account.username}
                width={48}
                height={48}
                onError={() => setHasError(true)}
                className={pageStyles.headerAvatar}
              />
              <div>
                <h1 className={pageStyles.headerTitle}>@{account.username}</h1>
                <p className={pageStyles.headerSub}>
                  {account.accountType
                    ? account.accountType.replace("_", " ")
                    : "Instagram"}{" "}
                  Account
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={pageStyles.saveButton(isSaving)}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={pageStyles.statCard}>
            <div className="flex items-center gap-2 mb-2">
              <Heart className={pageStyles.statIcon("pink")} />
              <p className={pageStyles.statLabel}>Followers</p>
            </div>
            <p className={pageStyles.statValue}>
              {account.followersCount.toLocaleString()}
            </p>
          </div>
          <div className={pageStyles.statCard}>
            <div className="flex items-center gap-2 mb-2">
              <Users className={pageStyles.statIcon("blue")} />
              <p className={pageStyles.statLabel}>Following</p>
            </div>
            <p className={pageStyles.statValue}>
              {account.followingCount.toLocaleString()}
            </p>
          </div>
          <div className={pageStyles.statCard}>
            <div className="flex items-center gap-2 mb-2">
              <Camera className={pageStyles.statIcon("purple")} />
              <p className={pageStyles.statLabel}>Posts</p>
            </div>
            <p className={pageStyles.statValue}>
              {account.mediaCount.toLocaleString()}
            </p>
          </div>
          <div className={pageStyles.statCard}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={pageStyles.statIcon("yellow")} />
              <p className={pageStyles.statLabel}>API Calls/Hour</p>
            </div>
            <p
              className={
                account.metaCallsThisHour > 150
                  ? pageStyles.statWarning
                  : pageStyles.statValue
              }
            >
              {account.metaCallsThisHour} / 200
            </p>
            {rateLimitInfo && (
              <p className={pageStyles.statLabel}>
                {rateLimitInfo.metaCallsRemaining} remaining
              </p>
            )}
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-4">
            {/* Account Status */}
            <div className={pageStyles.statCard}>
              <h3 className={pageStyles.sectionTitle}>Account Status</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={pageStyles.settingLabel}>Account Active</p>
                    <p className={pageStyles.settingDesc}>
                      Enable/disable all automations
                    </p>
                  </div>
                  <Switch
                    checked={settings.isActive}
                    onCheckedChange={(checked) =>
                      handleSettingChange("isActive", checked)
                    }
                    className={pageStyles.switchTrack}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={pageStyles.settingLabel}>
                      Comment Automations
                    </p>
                    <p className={pageStyles.settingDesc}>
                      Auto-reply to comments
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoReplyEnabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoReplyEnabled", checked)
                    }
                    className={pageStyles.switchTrack}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={pageStyles.settingLabel}>DM Automations</p>
                    <p className={pageStyles.settingDesc}>
                      Auto-send direct messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoDMEnabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoDMEnabled", checked)
                    }
                    className={pageStyles.switchTrack}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={pageStyles.settingLabel}>Follow Checks</p>
                    <p className={pageStyles.settingDesc}>
                      Check if user follows before DM
                    </p>
                  </div>
                  <Switch
                    checked={settings.followCheckEnabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange("followCheckEnabled", checked)
                    }
                    className={pageStyles.switchTrack}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={pageStyles.settingLabel}>
                      Require Follow for Free Users
                    </p>
                    <p className={pageStyles.settingDesc}>
                      Only reply to users who follow you
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireFollowForFreeUsers}
                    onCheckedChange={(checked) =>
                      handleSettingChange("requireFollowForFreeUsers", checked)
                    }
                    className={pageStyles.switchTrack}
                  />
                </div>
              </div>
            </div>

            {/* Token Status */}
            <div className={pageStyles.statCard}>
              <h3 className={pageStyles.sectionTitle}>Token Status</h3>

              <div className="space-y-3">
                <div className={pageStyles.tokenRow}>
                  <span className={pageStyles.tokenLabel}>Token Expiry</span>
                  {account.tokenExpiresAt ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isTokenExpiring
                            ? pageStyles.badgeYellow
                            : pageStyles.badgeGreen
                        }`}
                      >
                        {new Date(account.tokenExpiresAt).toLocaleDateString()}
                      </span>
                      {isTokenExpiring && (
                        <button
                          onClick={handleRefreshToken}
                          disabled={isRefreshingToken}
                          className={pageStyles.tokenRefresh}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${isRefreshingToken ? "animate-spin" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className={pageStyles.tokenLabel}>No expiry</span>
                  )}
                </div>

                <div className={pageStyles.tokenRow}>
                  <span className={pageStyles.tokenLabel}>
                    Rate Limit Status
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                      account.isMetaRateLimited
                        ? pageStyles.badgeRed
                        : pageStyles.badgeGreen
                    }`}
                  >
                    {account.isMetaRateLimited ? "Limited" : "Normal"}
                  </span>
                </div>

                {rateLimitInfo?.metaRateLimitResetAt &&
                  account.isMetaRateLimited && (
                    <div className={pageStyles.tokenRow}>
                      <span className={pageStyles.tokenLabel}>Reset At</span>
                      <span className={pageStyles.tokenLabel}>
                        {new Date(
                          rateLimitInfo.metaRateLimitResetAt,
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Templates Count */}
            <div className={pageStyles.statCard}>
              <h3 className={pageStyles.sectionTitle}>Templates</h3>
              <div className="text-center py-4">
                <p className={pageStyles.statValue}>{account.templatesCount}</p>
                <p className={pageStyles.statLabel}>Active Templates</p>
              </div>
            </div>

            {/* Activity Stats */}
            <div className={pageStyles.statCard}>
              <h3 className={pageStyles.sectionTitle}>Activity</h3>

              <div className="space-y-3">
                <div className={pageStyles.activityRow}>
                  <span className={pageStyles.activityLabel}>Replies Sent</span>
                  <span className={pageStyles.activityValue}>
                    {account.accountReply.toLocaleString()}
                  </span>
                </div>
                <div className={pageStyles.activityRow}>
                  <span className={pageStyles.activityLabel}>DMs Sent</span>
                  <span className={pageStyles.activityValue}>
                    {account.accountDMSent.toLocaleString()}
                  </span>
                </div>
                <div className={pageStyles.activityRow}>
                  <span className={pageStyles.activityLabel}>
                    Follow Checks
                  </span>
                  <span className={pageStyles.activityValue}>
                    {account.accountFollowCheck.toLocaleString()}
                  </span>
                </div>
                <div className={pageStyles.activityRow}>
                  <span className={pageStyles.activityLabel}>
                    Last Activity
                  </span>
                  <span className={pageStyles.activityValue}>
                    {new Date(account.lastActivity).toLocaleDateString()}
                  </span>
                </div>
                <div className={pageStyles.activityRow}>
                  <span className={pageStyles.activityLabel}>
                    Connected Since
                  </span>
                  <span className={pageStyles.activityValue}>
                    {new Date(account.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className={`${pageStyles.dangerZone} ${pageStyles.statCard}`}>
              <h3
                className={`font-semibold mb-4 flex items-center gap-2 ${pageStyles.dangerTitle}`}
              >
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </h3>

              <button
                onClick={() => setShowDeleteDialog(true)}
                className={pageStyles.dangerButton}
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
              <p className={pageStyles.dangerText}>
                This will permanently delete this Instagram account and all
                associated data including templates and automations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
        title="Delete Instagram Account"
        description={`Are you sure you want to delete @${account.username}? This will permanently remove the account and all associated automations, templates, and data. This action cannot be undone.`}
        confirmText="Delete Permanently"
        isDestructive={true}
      />
    </div>
  );
}
