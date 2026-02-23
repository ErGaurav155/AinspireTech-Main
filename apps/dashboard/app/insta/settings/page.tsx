"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { RefreshCw, XCircle, AlertTriangle } from "lucide-react";
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative rounded-full transition-colors flex-shrink-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-pink-500" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="absolute bg-white rounded-full shadow-sm transition-all"
        style={{
          width: 18,
          height: 18,
          top: 3,
          left: checked ? 23 : 3,
          transition: "left 0.2s",
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
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Toggle checked={checked} onChange={onChange} />
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

  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();

  // Refs to prevent memory leaks
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
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

      // Only update if component is still mounted
      if (!isMounted.current) return;

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
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 mx-auto space-y-6">
        {/* Instagram Account Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Instagram Account
          </h2>

          {account ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                {/* Profile Picture */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
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
                  <h3 className="text-base font-semibold text-gray-800">
                    {accountDisplayName}
                  </h3>
                  <p className="text-sm text-gray-500">@{account.username}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-gray-400">
                      Media Count: {account.mediaCount}
                    </p>
                    <p className="text-xs text-gray-400">
                      Token Expires: {account.tokenExpiresAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${account.isActive ? "bg-green-500" : "bg-gray-400"}`}
                    />
                    <span
                      className={`text-sm font-medium ${account.isActive ? "text-green-600" : "text-gray-500"}`}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleReconnect}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reconnect
                  </button>
                  <button
                    onClick={handleDisable}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Disable
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <p className="text-gray-500 mb-4">
                No Instagram account connected
              </p>
              <button
                onClick={handleReconnect}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Connect Instagram Account
              </button>
            </div>
          )}
        </div>

        {/* Global Settings Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Global Settings
            </h2>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
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
              />
            ))}
          </div>
        </div>

        {/* Remove Account Section */}
        {account && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-base font-semibold text-red-700">
                    Remove Instagram Account
                  </h3>
                </div>
                <p className="text-sm text-red-600 leading-relaxed">
                  This will remove the Instagram account{" "}
                  <span className="font-semibold">@{account.username}</span>{" "}
                  from <span className="font-semibold">Hypello</span>. All
                  automations, contacts, messages, analytics, and related data
                  associated with this account will be permanently deleted.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex-shrink-0 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">
                    Remove
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white border border-gray-100 rounded-2xl shadow-xl max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-800">
                      Remove Instagram Account
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-500">
                      Are you absolutely sure? This will permanently delete the
                      account <strong>@{account.username}</strong> and all
                      associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl border-gray-200">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveAccount}
                      disabled={isRemoving}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                    >
                      {isRemoving ? "Removing..." : "Remove Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
