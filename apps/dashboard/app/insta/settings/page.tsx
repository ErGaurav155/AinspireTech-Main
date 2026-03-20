"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  getAllInstagramAccounts,
  deleteInstaAccount,
  updateAccountSettings,
} from "@/lib/services/insta-actions.api";
import { Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountDataType {
  instagramId: string;
  username: string;
  isActive: boolean;
  profilePicture?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  accountType?: string;
  tokenExpiresAt?: string;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers?: boolean;
  storyAutomationsEnabled: boolean;
  trackDmUrlEnabled: boolean;
  metaCallsThisHour?: number;
  isMetaRateLimited?: boolean;
}

interface SettingsState {
  isActive: boolean;
  autoReplyEnabled: boolean;
  storyAutomationsEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;
  trackDmUrlEnabled: boolean;
}

interface InstagramAccountResponse {
  success?: boolean;
  accounts?: Array<{
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
      storyAutomationsEnabled?: boolean;
      trackDmUrlEnabled?: boolean;
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
    };
  }>;
  data?: {
    accounts?: any[];
  };
  timestamp?: string;
}

// ─── Helper: extract settings from a raw accountInfo object ──────────────────
//
// Using explicit checks (`=== true` / `=== false`) instead of `??` so we
// never silently fall through to a default when the field exists but is false.

function extractSettings(accountInfo: any): SettingsState {
  return {
    isActive:
      typeof accountInfo.isActive === "boolean" ? accountInfo.isActive : true,
    autoReplyEnabled:
      typeof accountInfo.autoReplyEnabled === "boolean"
        ? accountInfo.autoReplyEnabled
        : true,
    storyAutomationsEnabled:
      typeof accountInfo.storyAutomationsEnabled === "boolean"
        ? accountInfo.storyAutomationsEnabled // ✅ honours false from DB
        : true,
    autoDMEnabled:
      typeof accountInfo.autoDMEnabled === "boolean"
        ? accountInfo.autoDMEnabled
        : true,
    followCheckEnabled:
      typeof accountInfo.followCheckEnabled === "boolean"
        ? accountInfo.followCheckEnabled
        : true,
    requireFollowForFreeUsers:
      typeof accountInfo.requireFollowForFreeUsers === "boolean"
        ? accountInfo.requireFollowForFreeUsers
        : false,
    trackDmUrlEnabled:
      typeof accountInfo.trackDmUrlEnabled === "boolean"
        ? accountInfo.trackDmUrlEnabled // ✅ honours false from DB
        : true,
  };
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle = React.memo(function Toggle({
  checked,
  onChange,
  disabled = false,
  isDark,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative rounded-full transition-colors flex-shrink-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-pink-500" : isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="absolute bg-white rounded-full shadow-sm transition-all"
        style={{ width: 18, height: 18, top: 3, left: checked ? 23 : 3 }}
      />
    </button>
  );
});

// ─── SettingsCard — pure controlled component, zero local state ───────────────

const SettingsCard = React.memo(function SettingsCard({
  title,
  description,
  checked,
  onChange,
  isDark,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
}) {
  const { styles } = useThemeStyles();

  return (
    <div className={styles.card}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className={`text-sm font-semibold mb-1 ${styles.text.primary}`}>
              {title}
            </h3>
            <p className={`text-sm ${styles.text.secondary}`}>{description}</p>
          </div>
          <Toggle checked={checked} onChange={onChange} isDark={isDark} />
        </div>
      </div>
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountDataType | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    isActive: true,
    autoReplyEnabled: true,
    storyAutomationsEnabled: true,
    autoDMEnabled: true,
    followCheckEnabled: true,
    requireFollowForFreeUsers: false,
    trackDmUrlEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();
  const abortControllerRef = useRef<AbortController | null>(null);
  const { styles, isDark } = useThemeStyles();

  const pageStyles = useMemo(
    () => ({
      accountCard: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6"
        : "bg-white border border-gray-100 rounded-2xl p-6",
      accountAvatar:
        "w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden",
      accountName: isDark
        ? "text-base font-semibold text-white"
        : "text-base font-semibold text-gray-800",
      accountUsername: isDark
        ? "text-sm text-white/40"
        : "text-sm text-gray-500",
      accountStats: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      accountStatusDot: (active: boolean) =>
        `w-2 h-2 rounded-full ${
          isDark
            ? active
              ? "bg-green-400"
              : "bg-gray-500"
            : active
              ? "bg-green-500"
              : "bg-gray-400"
        }`,
      accountStatusText: (active: boolean) =>
        `text-sm font-medium ${
          isDark
            ? active
              ? "text-green-400"
              : "text-white/40"
            : active
              ? "text-green-600"
              : "text-gray-500"
        }`,
      reconnectButton: isDark
        ? "flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.09] backdrop-blur-[12px] text-white/70 hover:bg-white/[0.09] rounded-xl text-sm transition-colors"
        : "flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors",
      disableButton: (active: boolean) =>
        `flex items-center gap-2 px-4 py-2 ${
          active
            ? isDark
              ? "bg-gray-800 hover:bg-gray-700"
              : "bg-gray-900 hover:bg-black"
            : isDark
              ? "bg-green-600 hover:bg-green-500"
              : "bg-green-500 hover:bg-green-600"
        } text-white rounded-xl text-sm font-medium transition-colors`,
      emptyCard: isDark
        ? "bg-white/[0.04] flex flex-wrap border border-white/[0.08] rounded-2xl p-5 text-center"
        : "bg-white flex flex-wrap border border-gray-100 rounded-2xl p-5 text-center",
      emptyText: isDark ? "text-white/40 mb-4" : "text-gray-500 mb-4",
      connectButton:
        "inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors",
      settingsHeader: "flex flex-wrap items-center justify-between mb-4",
      saveButton: (disabled?: boolean) =>
        `px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`,
      removeCard: isDark
        ? "bg-red-500/10 border border-red-500/20 rounded-2xl p-6"
        : "bg-red-50 border border-red-200 rounded-2xl p-6",
      removeIcon: isDark ? "text-red-400" : "text-red-500",
      removeTitle: isDark
        ? "text-base font-semibold text-red-400"
        : "text-base font-semibold text-red-700",
      removeText: isDark
        ? "text-sm text-red-400/80 leading-relaxed"
        : "text-sm text-red-600 leading-relaxed",
      statBadge: isDark
        ? "text-xs bg-white/[0.06] px-2 py-1 rounded-full text-white/60"
        : "text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600",
    }),
    [isDark],
  );

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Fetch account ──────────────────────────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    if (!userId || !isLoaded) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const response = (await getAllInstagramAccounts(
        apiRequest,
      )) as InstagramAccountResponse;
      let accountsArray: any[] = [];
      if (response?.accounts && Array.isArray(response.accounts)) {
        accountsArray = response.accounts;
      } else if (
        response?.data?.accounts &&
        Array.isArray(response.data.accounts)
      ) {
        accountsArray = response.data.accounts;
      }

      if (accountsArray.length > 0) {
        const accountData = accountsArray[0];
        const accountInfo = accountData.accountInfo || {};
        const instagramInfo = accountData.instagramInfo || {};

        // Log the raw values so we can verify DB values are coming through
        const formattedAccount: AccountDataType = {
          instagramId: accountInfo.instagramId || instagramInfo.id || "",
          username: instagramInfo.username || accountInfo.username || "Unknown",
          isActive: accountInfo.isActive ?? true,
          profilePicture:
            instagramInfo.profile_picture_url || accountInfo.profilePicture,
          followersCount:
            instagramInfo.followers_count || accountInfo.followersCount || 0,
          followingCount:
            instagramInfo.follows_count || accountInfo.followingCount || 0,
          mediaCount: instagramInfo.media_count || accountInfo.mediaCount || 0,
          accountType: instagramInfo.account_type || "",
          tokenExpiresAt: accountInfo.tokenExpiresAt
            ? new Date(accountInfo.tokenExpiresAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          // ✅ explicit boolean check — never coerces false → true
          autoReplyEnabled:
            typeof accountInfo.autoReplyEnabled === "boolean"
              ? accountInfo.autoReplyEnabled
              : true,
          autoDMEnabled:
            typeof accountInfo.autoDMEnabled === "boolean"
              ? accountInfo.autoDMEnabled
              : true,
          followCheckEnabled:
            typeof accountInfo.followCheckEnabled === "boolean"
              ? accountInfo.followCheckEnabled
              : true,
          requireFollowForFreeUsers:
            typeof accountInfo.requireFollowForFreeUsers === "boolean"
              ? accountInfo.requireFollowForFreeUsers
              : false,
          storyAutomationsEnabled:
            typeof accountInfo.storyAutomationsEnabled === "boolean"
              ? accountInfo.storyAutomationsEnabled
              : true,
          trackDmUrlEnabled:
            typeof accountInfo.trackDmUrlEnabled === "boolean"
              ? accountInfo.trackDmUrlEnabled
              : true,
          metaCallsThisHour: accountInfo.metaCallsThisHour || 0,
          isMetaRateLimited: accountInfo.isMetaRateLimited || false,
        };

        setAccount(formattedAccount);
        // ✅ use extractSettings helper so both paths use identical logic
        setSettings(extractSettings(accountInfo));
      } else {
        setAccount(null);
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error fetching account:", error);
      toast({
        title: "Failed to load account",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [userId, isLoaded, apiRequest]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSettingChange = useCallback(
    (key: keyof SettingsState, value: boolean) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSaveChanges = useCallback(async () => {
    if (!account) return;

    setIsSaving(true);
    try {
      // ✅ The PUT controller returns the full updated document.
      //    Use it directly — don't re-fetch, which risks reading stale/
      //    missing fields from getAllInstagramAccounts.
      const result = await updateAccountSettings(
        apiRequest,
        account.instagramId,
        settings,
      );

      const savedAccount = result?.account || result;

      if (savedAccount && typeof savedAccount === "object") {
        // Update settings from the authoritative saved document
        const savedSettings = extractSettings(savedAccount);
        setSettings(savedSettings);
        setAccount((prev) => (prev ? { ...prev, ...savedSettings } : null));
      } else {
        // Fallback: trust what we sent
        setAccount((prev) => (prev ? { ...prev, ...settings } : null));
      }

      toast({ title: "Settings saved successfully!", duration: 3000 });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Failed to save settings",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
      // Revert to server state on error
      fetchAccount();
    } finally {
      setIsSaving(false);
    }
  }, [account, settings, apiRequest, fetchAccount]);

  const handleReconnect = useCallback(() => {
    router.push("/insta/accounts/add");
  }, [router]);

  const handleToggleAccountStatus = useCallback(async () => {
    if (!account) return;

    const newStatus = !account.isActive;
    // Optimistic update
    setAccount((prev) => (prev ? { ...prev, isActive: newStatus } : null));
    setSettings((prev) => ({ ...prev, isActive: newStatus }));

    try {
      await updateAccountSettings(apiRequest, account.instagramId, {
        ...settings,
        isActive: newStatus,
      });
      toast({
        title: newStatus ? "Account enabled" : "Account disabled",
        duration: 3000,
      });
    } catch (error) {
      // Revert on error
      setAccount((prev) => (prev ? { ...prev, isActive: !newStatus } : null));
      setSettings((prev) => ({ ...prev, isActive: !newStatus }));
      toast({
        title: "Failed to update account status",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [account, settings, apiRequest]);

  const handleRemoveAccount = useCallback(async () => {
    if (!account) return;
    setIsRemoving(true);
    try {
      await deleteInstaAccount(apiRequest, account.instagramId);
      toast({ title: "Account removed successfully", duration: 3000 });
      router.push("/insta");
    } catch (error) {
      console.error("Error removing account:", error);
      toast({
        title: "Failed to remove account",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsRemoving(false);
      setShowDeleteDialog(false);
    }
  }, [account, apiRequest, router]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const accountInitial = useMemo(
    () => account?.username?.[0]?.toUpperCase() || "A",
    [account?.username],
  );

  const accountDisplayName = useMemo(
    () =>
      account?.username
        ? account.username.charAt(0).toUpperCase() + account.username.slice(1)
        : "",
    [account?.username],
  );

  const isTokenExpiringSoon = useMemo(() => {
    if (!account?.tokenExpiresAt || account.tokenExpiresAt === "N/A")
      return false;
    try {
      const daysLeft = Math.ceil(
        (new Date(account.tokenExpiresAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return daysLeft <= 7;
    } catch {
      return false;
    }
  }, [account?.tokenExpiresAt]);

  const settingsCards = useMemo(
    () => [
      {
        key: "isActive" as const,
        title: "Global Automations",
        description:
          "Your account-level automation. If disabled, no automations will work.",
      },
      {
        key: "autoReplyEnabled" as const,
        title: "Comment Automations",
        description:
          "Your account-level comment automation. If disabled, no comment automations will work.",
      },
      {
        key: "storyAutomationsEnabled" as const,
        title: "Story Automations",
        description:
          "Your account-level story automation. If disabled, no story automations will work.",
      },
      {
        key: "autoDMEnabled" as const,
        title: "DM Automations",
        description:
          "Your account-level DM automation. If disabled, no automated direct messages will be sent.",
      },
      {
        key: "followCheckEnabled" as const,
        title: "Follow Checks",
        description:
          "Check if a user follows you before sending automated DMs.",
      },
      {
        key: "requireFollowForFreeUsers" as const,
        title: "Require Follow for Free Users",
        description:
          "Only send automated replies to users who follow your account.",
      },
      {
        key: "trackDmUrlEnabled" as const,
        title: "Track DM URL",
        description:
          "Used to track when a user clicks a link in your DM. If disabled, follow-up DM automation based on link clicks will not work properly.",
      },
    ],
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isLoaded || isLoading) return <Spinner label="Loading settings..." />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Account section */}
        <div>
          <h2 className={`text-lg font-semibold mb-4 ${styles.text.primary}`}>
            Instagram Account
          </h2>

          {account ? (
            <div className={pageStyles.accountCard}>
              <div className="flex flex-wrap flex-col lg:flex-row items-center gap-2 md:gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className={pageStyles.accountAvatar}>
                      {account.profilePicture ? (
                        <Image
                          src={account.profilePicture}
                          alt={account.username}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        accountInitial
                      )}
                    </div>
                    <div>
                      <h3 className={pageStyles.accountName}>
                        {accountDisplayName}
                      </h3>
                      <p className={pageStyles.accountUsername}>
                        @{account.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={pageStyles.statBadge}>
                      {account.followersCount?.toLocaleString() || 0} followers
                    </span>
                    <span className={pageStyles.statBadge}>
                      {account.followingCount?.toLocaleString() || 0} following
                    </span>
                    <span className={pageStyles.statBadge}>
                      {account.mediaCount} posts
                    </span>
                    {account.accountType && (
                      <span className={pageStyles.statBadge}>
                        {account.accountType.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <p className={pageStyles.accountStats}>
                      Token Expires: {account.tokenExpiresAt}
                      {isTokenExpiringSoon && (
                        <span className="ml-2 text-amber-400">
                          (Expiring soon)
                        </span>
                      )}
                    </p>
                    {account.metaCallsThisHour !== undefined && (
                      <p className={pageStyles.accountStats}>
                        API Calls: {account.metaCallsThisHour}/200
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={pageStyles.accountStatusDot(account.isActive)}
                    />
                    <span
                      className={pageStyles.accountStatusText(account.isActive)}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </span>
                    {account.isMetaRateLimited && (
                      <span className="ml-2 text-xs text-red-400">
                        (Rate Limited)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-2 flex-shrink-0">
                  <button
                    onClick={handleReconnect}
                    className={pageStyles.reconnectButton}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reconnect
                  </button>
                  <button
                    onClick={handleToggleAccountStatus}
                    className={pageStyles.disableButton(account.isActive)}
                  >
                    <XCircle className="h-4 w-4" />
                    {account.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={pageStyles.emptyCard}>
              <p className={pageStyles.emptyText}>
                No Instagram account connected
              </p>
              <button
                onClick={handleReconnect}
                className={pageStyles.connectButton}
              >
                <RefreshCw className="h-4 w-4" />
                Connect Instagram Account
              </button>
            </div>
          )}
        </div>

        {/* Settings section */}
        <div>
          <div className={pageStyles.settingsHeader}>
            <h2
              className={`md:text-lg font-semibold mb-4 ${styles.text.primary}`}
            >
              Global Settings
            </h2>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving || !account}
              className={pageStyles.saveButton(isSaving || !account)}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="space-y-4">
            {settingsCards.map((card) => (
              <SettingsCard
                key={card.key}
                title={card.title}
                description={card.description}
                checked={settings[card.key]}
                onChange={(value) => handleSettingChange(card.key, value)}
                isDark={isDark}
              />
            ))}
          </div>
        </div>

        {/* Remove account section */}
        {account && (
          <div className={pageStyles.removeCard}>
            <div className="flex flex-wrap flex-col md:flex-row items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle
                    className={`h-5 w-5 ${pageStyles.removeIcon}`}
                  />
                  <h3 className={pageStyles.removeTitle}>
                    Remove Instagram Account
                  </h3>
                </div>
                <p className={pageStyles.removeText}>
                  This will remove the Instagram account{" "}
                  <span className="font-semibold">@{account.username}</span>{" "}
                  from <span className="font-semibold">RocketReplai</span>. All
                  automations, contacts, messages, analytics, and related data
                  associated with this account will be permanently deleted.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className={`${styles.pill} px-2`}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleRemoveAccount}
          title="Remove Instagram Account"
          description={`Are you absolutely sure? This will permanently delete the account @${account?.username} and all associated data. This action cannot be undone.`}
          confirmText="Remove Account"
          isDestructive={true}
          isLoading={isRemoving}
        />
      </div>
    </div>
  );
}
