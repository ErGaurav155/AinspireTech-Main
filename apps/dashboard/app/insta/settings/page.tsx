"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { RefreshCw, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import {
  getAllInstagramAccounts,
  deleteInstaAccount,
  updateAccountSettings,
} from "@/lib/services/insta-actions.api";

import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";
import { Spinner } from "@/components/shared/Spinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountDataType {
  instagramId: string;
  username: string;
  isActive: boolean;
  profilePicture?: string;
  followersCount?: number;
  mediaCount?: number;
  tokenExpiresAt?: string;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  storyAutomationsEnabled: boolean;
  trackDmUrlEnabled: boolean;
}

interface SettingsState {
  isActive: boolean; // Global Automations
  autoReplyEnabled: boolean; // Comment Automations
  storyAutomationsEnabled: boolean; // Story Automations
  autoDMEnabled: boolean; // DM Automations
  trackDmUrlEnabled: boolean; // Track DM URL
}

// ─── Toggle Component (memoized) ─────────────────────────────────────────────

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
        style={{
          width: 18,
          height: 18,
          top: 3,
          left: checked ? 23 : 3,
        }}
      />
    </button>
  );
});

// ─── Settings Card Component (memoized) ──────────────────────────────────────

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

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountDataType | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    isActive: true,
    autoReplyEnabled: true,
    storyAutomationsEnabled: true,
    autoDMEnabled: true,
    trackDmUrlEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { userId, isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { apiRequest } = useApi();
  const abortControllerRef = useRef<AbortController | null>(null);

  const { styles, isDark } = useThemeStyles();

  // Page‑specific styles (not in central theme)
  const pageStyles = useMemo(
    () => ({
      accountCard: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6"
        : "bg-white border border-gray-100 rounded-2xl p-6",
      accountAvatar: isDark
        ? "w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden"
        : "w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden",
      accountName: isDark
        ? "text-base font-semibold text-white"
        : "text-base font-semibold text-gray-800",
      accountUsername: isDark
        ? "text-sm text-white/40"
        : "text-sm text-gray-500",
      accountStats: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      accountStatusDot: (isActive: boolean) =>
        isDark
          ? `w-2 h-2 rounded-full ${isActive ? "bg-green-400" : "bg-gray-500"}`
          : `w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`,
      accountStatusText: (isActive: boolean) =>
        isDark
          ? `text-sm font-medium ${isActive ? "text-green-400" : "text-white/40"}`
          : `text-sm font-medium ${isActive ? "text-green-600" : "text-gray-500"}`,
      reconnectButton: isDark
        ? "flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.09] backdrop-blur-[12px] text-white/70 hover:bg-white/[0.09] rounded-xl text-sm transition-colors"
        : "flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors",
      disableButton: isDark
        ? "flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
        : "flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-colors",
      emptyCard: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 text-center"
        : "bg-white border border-gray-100 rounded-2xl p-8 text-center",
      emptyText: isDark ? "text-white/40 mb-4" : "text-gray-500 mb-4",
      connectButton: isDark
        ? "inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
        : "inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors",
      settingsHeader: "flex items-center justify-between mb-4",
      saveButton: (disabled?: boolean) =>
        isDark
          ? `px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`
          : `px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors ${
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
      removeButton: isDark
        ? "flex-shrink-0 px-6 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
        : "flex-shrink-0 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors",
      dialogAction: (disabled?: boolean) =>
        isDark
          ? `bg-red-500/80 hover:bg-red-500 text-white rounded-xl ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`
          : `bg-red-500 hover:bg-red-600 text-white rounded-xl ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`,
    }),
    [isDark],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized fetch function
  const fetchAccount = useCallback(async () => {
    if (!userId || !isLoaded) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const data = await getAllInstagramAccounts(apiRequest);
      if (data?.accounts && data.accounts.length > 0) {
        const activeAccount =
          data.accounts.find((a: any) => a.isActive) || data.accounts[0];

        const formattedAccount: AccountDataType = {
          instagramId: activeAccount.instagramId,
          username: activeAccount.username,
          isActive: activeAccount.isActive || false,
          profilePicture: activeAccount.profilePicture,
          followersCount: activeAccount.followersCount,
          mediaCount: activeAccount.mediaCount || 0,
          tokenExpiresAt: activeAccount.tokenExpiresAt
            ? new Date(activeAccount.tokenExpiresAt).toLocaleDateString(
                "en-US",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              )
            : "18 Apr 2026",
          autoReplyEnabled: activeAccount.autoReplyEnabled ?? true,
          autoDMEnabled: activeAccount.autoDMEnabled ?? true,
          followCheckEnabled: activeAccount.followCheckEnabled ?? true,
          storyAutomationsEnabled:
            activeAccount.storyAutomationsEnabled ?? true,
          trackDmUrlEnabled: activeAccount.trackDmUrlEnabled ?? true,
        };

        setAccount(formattedAccount);

        // Update settings from account
        setSettings({
          isActive: activeAccount.isActive ?? true,
          autoReplyEnabled: activeAccount.autoReplyEnabled ?? true,
          storyAutomationsEnabled:
            activeAccount.storyAutomationsEnabled ?? true,
          autoDMEnabled: activeAccount.autoDMEnabled ?? true,
          trackDmUrlEnabled: activeAccount.trackDmUrlEnabled ?? true,
        });
      } else {
        setAccount(null);
      }
    } catch (error: any) {
      // Don't show error if request was aborted
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

  // Fetch account data
  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // Memoized handlers
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
      await updateAccountSettings(apiRequest, account.instagramId, settings);
      toast({
        title: "Settings saved successfully!",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [account, settings, apiRequest]);

  const handleReconnect = useCallback(() => {
    // Redirect to Instagram OAuth flow
    window.location.href = "/api/instagram/connect";
  }, []);

  const handleDisable = useCallback(async () => {
    if (!account) return;

    try {
      await updateAccountSettings(apiRequest, account.instagramId, {
        ...settings,
        isActive: false,
      });

      setAccount((prev) => (prev ? { ...prev, isActive: false } : null));
      setSettings((prev) => ({ ...prev, isActive: false }));
      toast({
        title: "Account disabled",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Failed to disable account",
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
      toast({
        title: "Account removed successfully",
        duration: 3000,
      });
      router.push("/insta/dashboard");
    } catch (error) {
      toast({
        title: "Failed to remove account",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsRemoving(false);
    }
  }, [account, apiRequest, router]);

  // Memoized derived values
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

  // Memoized settings cards configuration
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
        key: "trackDmUrlEnabled" as const,
        title: "Track DM URL",
        description:
          "Used to track when a user clicks a link in your DM. If disabled, follow-up DM automation based on link clicks will not work properly.",
      },
    ],
    [],
  );

  if (!isLoaded || isLoading) {
    return <Spinner />;
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Instagram Account Section */}
        <div>
          <h2 className={`text-lg font-semibold mb-4 ${styles.text.primary}`}>
            Instagram Account
          </h2>

          {account ? (
            <div className={pageStyles.accountCard}>
              <div className="flex items-center gap-4">
                {/* Profile Picture */}
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

                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={pageStyles.accountName}>
                    {accountDisplayName}
                  </h3>
                  <p className={pageStyles.accountUsername}>
                    @{account.username}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className={pageStyles.accountStats}>
                      Media Count: {account.mediaCount}
                    </p>
                    <p className={pageStyles.accountStats}>
                      Token Expires: {account.tokenExpiresAt}
                    </p>
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
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleReconnect}
                    className={pageStyles.reconnectButton}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reconnect
                  </button>
                  <button
                    onClick={handleDisable}
                    className={pageStyles.disableButton}
                  >
                    <XCircle className="h-4 w-4" />
                    Disable
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

        {/* Global Settings Section */}
        <div>
          <div className={pageStyles.settingsHeader}>
            <h2 className={`text-lg font-semibold mb-4 ${styles.text.primary}`}>
              Global Settings
            </h2>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={pageStyles.saveButton(isSaving)}
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

        {/* Remove Account Section */}
        {account && (
          <div className={pageStyles.removeCard}>
            <div className="flex items-start gap-4">
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
              <>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className={styles.pill}
                >
                  Remove
                </button>

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
              </>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
