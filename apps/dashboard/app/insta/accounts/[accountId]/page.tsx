"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
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
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import { Label } from "@rocketreplai/ui/components/radix/label";
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
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import defaultImg from "public/assets/img/default-img.jpg";
import {
  getInstaAccountById,
  updateAccountSettings,
  deleteInstaAccount,
  refreshInstagramToken,
} from "@/lib/services/insta-actions.api";

interface AccountDetails {
  id: string;
  instagramId: string;
  username: string;
  profilePicture: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  accountReply: number;
  accountDMSent: number;
  accountFollowCheck: number;
  lastActivity: string;
  tokenExpiresAt?: string;
  isMetaRateLimited: boolean;
  metaCallsThisHour: number;
  createdAt: string;
  updatedAt: string;
}

export default function AccountDetailsPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [settings, setSettings] = useState({
    isActive: true,
    autoReplyEnabled: true,
    autoDMEnabled: true,
    followCheckEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Theme styles
  const themeStyles = useMemo(() => {
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
      inputBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
    };
  }, [currentTheme]);

  // Fetch account details
  const fetchAccount = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const data = await getInstaAccountById(apiRequest, accountId);

      const acc = data.account;
      setAccount({
        id: acc._id,
        instagramId: acc.instagramId,
        username: acc.username,
        profilePicture: acc.profilePicture || defaultImg.src,
        followersCount: acc.followersCount || 0,
        followingCount: acc.followingCount || 0,
        mediaCount: acc.mediaCount || 0,
        isActive: acc.isActive || false,
        autoReplyEnabled: acc.autoReplyEnabled || false,
        autoDMEnabled: acc.autoDMEnabled || false,
        followCheckEnabled: acc.followCheckEnabled || false,
        accountReply: acc.accountReply || 0,
        accountDMSent: acc.accountDMSent || 0,
        accountFollowCheck: acc.accountFollowCheck || 0,
        lastActivity: acc.lastActivity || new Date().toISOString(),
        tokenExpiresAt: acc.tokenExpiresAt,
        isMetaRateLimited: acc.isMetaRateLimited || false,
        metaCallsThisHour: acc.metaCallsThisHour || 0,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      });

      setSettings({
        isActive: acc.isActive || false,
        autoReplyEnabled: acc.autoReplyEnabled || false,
        autoDMEnabled: acc.autoDMEnabled || false,
        followCheckEnabled: acc.followCheckEnabled || false,
      });
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

    try {
      await refreshInstagramToken(apiRequest, account.instagramId);
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

  const isTokenExpiring =
    account?.tokenExpiresAt &&
    new Date(account.tokenExpiresAt) <
      new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Account not found
          </h2>
          <Link
            href="/insta/accounts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/insta/accounts"
              className="p-2 text-gray-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src={hasError ? defaultImg.src : account.profilePicture}
                alt={account.username}
                width={48}
                height={48}
                onError={() => setHasError(true)}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  @{account.username}
                </h1>
                <p className="text-sm text-gray-400">
                  Instagram Account Settings
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <p className="text-xs text-gray-400">Followers</p>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {account.followersCount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-gray-400">Following</p>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {account.followingCount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-gray-400">Posts</p>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {account.mediaCount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-gray-400">API Calls/Hour</p>
            </div>
            <p
              className={`text-xl font-bold ${
                account.metaCallsThisHour > 150
                  ? "text-red-600"
                  : "text-gray-800"
              }`}
            >
              {account.metaCallsThisHour}
            </p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-4">
            {/* Account Status */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                Account Status
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Account Active
                    </p>
                    <p className="text-xs text-gray-400">
                      Enable/disable all automations
                    </p>
                  </div>
                  <Switch
                    checked={settings.isActive}
                    onCheckedChange={(checked) =>
                      handleSettingChange("isActive", checked)
                    }
                    className="data-[state=checked]:bg-pink-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Comment Automations
                    </p>
                    <p className="text-xs text-gray-400">
                      Auto-reply to comments
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoReplyEnabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoReplyEnabled", checked)
                    }
                    className="data-[state=checked]:bg-pink-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      DM Automations
                    </p>
                    <p className="text-xs text-gray-400">
                      Auto-send direct messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoDMEnabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoDMEnabled", checked)
                    }
                    className="data-[state=checked]:bg-pink-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Follow Checks
                    </p>
                    <p className="text-xs text-gray-400">
                      Check if user follows before DM
                    </p>
                  </div>
                  <Switch
                    checked={settings.followCheckEnabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange("followCheckEnabled", checked)
                    }
                    className="data-[state=checked]:bg-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Token Status */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Token Status</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Token Expiry</span>
                  {account.tokenExpiresAt ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          isTokenExpiring
                            ? "bg-yellow-100 text-yellow-600 border-yellow-200"
                            : "bg-green-100 text-green-600 border-green-200"
                        }
                      >
                        {new Date(account.tokenExpiresAt).toLocaleDateString()}
                      </Badge>
                      {isTokenExpiring && (
                        <button
                          onClick={handleRefreshToken}
                          className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No expiry</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Rate Limit Status
                  </span>
                  <Badge
                    className={
                      account.isMetaRateLimited
                        ? "bg-red-100 text-red-600 border-red-200"
                        : "bg-green-100 text-green-600 border-green-200"
                    }
                  >
                    {account.isMetaRateLimited ? "Limited" : "Normal"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Activity Stats */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Activity</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Replies Sent</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {account.accountReply.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">DMs Sent</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {account.accountDMSent.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Follow Checks</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {account.accountFollowCheck.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Activity</span>
                  <span className="text-sm text-gray-800">
                    {new Date(account.lastActivity).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white border border-red-200 rounded-2xl p-6">
              <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </h3>

              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
              <p className="text-xs text-gray-400 mt-3">
                This will permanently delete this Instagram account and all
                associated data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instagram Account</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Are you sure you want to delete @{account.username}? This will
              permanently remove the account and all associated automations,
              templates, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
