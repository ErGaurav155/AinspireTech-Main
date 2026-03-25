"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import { getInstaAccount } from "@/lib/services/insta-actions.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstaAccount {
  instagramId: string;
  username: string;
  profilePicture?: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  accountType?: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;
  storyAutomationsEnabled: boolean;
  trackDmUrlEnabled: boolean;
  accountReply: number;
  accountDMSent: number;
  accountFollowCheck: number;
  templatesCount: number;
  lastActivity: string;
  tokenExpiresAt?: string;
  isMetaRateLimited: boolean;
  metaCallsThisHour: number;
  createdAt: string;
  updatedAt: string;
  // Rate limit info merged in
  metaCallsRemaining?: number;
}

interface InstaAccountContextValue {
  /** All accounts for this Clerk user */
  accounts: InstaAccount[];
  /** The currently selected account (null while loading or no accounts) */
  selectedAccount: InstaAccount | null;
  /** Switch the selected account */
  selectAccount: (instagramId: string) => void;
  /** True while the initial fetch is in flight */
  isAccLoading: boolean;
  /** Re-fetch all accounts (call after connect / delete) */
  refreshAccounts: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const InstaAccountContext = createContext<InstaAccountContextValue>({
  accounts: [],
  selectedAccount: null,
  selectAccount: () => {},
  isAccLoading: true,
  refreshAccounts: async () => {},
});

// ─── localStorage key ─────────────────────────────────────────────────────────

const STORAGE_KEY = "rocketreplai_insta_selected_account";

function getStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

// ─── Helper: map raw API item → InstaAccount ─────────────────────────────────

function mapAccount(item: any): InstaAccount {
  const ai = item.accountInfo || item;
  const ig = item.instagramInfo || {};
  const rl = item.rateLimitInfo || {};

  return {
    instagramId: ai.instagramId || ig.id || "",
    username: ig.username || ai.username || "Unknown",
    profilePicture: ig.profile_picture_url || ai.profilePicture,
    followersCount: ig.followers_count ?? ai.followersCount ?? 0,
    followingCount: ig.follows_count ?? ai.followingCount ?? 0,
    mediaCount: ig.media_count ?? ai.mediaCount ?? 0,
    accountType: ig.account_type || ai.accountType || "",
    isActive: typeof ai.isActive === "boolean" ? ai.isActive : true,
    autoReplyEnabled:
      typeof ai.autoReplyEnabled === "boolean" ? ai.autoReplyEnabled : true,
    autoDMEnabled:
      typeof ai.autoDMEnabled === "boolean" ? ai.autoDMEnabled : true,
    followCheckEnabled:
      typeof ai.followCheckEnabled === "boolean" ? ai.followCheckEnabled : true,
    requireFollowForFreeUsers:
      typeof ai.requireFollowForFreeUsers === "boolean"
        ? ai.requireFollowForFreeUsers
        : false,
    storyAutomationsEnabled:
      typeof ai.storyAutomationsEnabled === "boolean"
        ? ai.storyAutomationsEnabled
        : true,
    trackDmUrlEnabled:
      typeof ai.trackDmUrlEnabled === "boolean" ? ai.trackDmUrlEnabled : true,
    accountReply: ai.accountReply ?? 0,
    accountDMSent: ai.accountDMSent ?? 0,
    accountFollowCheck: ai.accountFollowCheck ?? 0,
    templatesCount: ai.templatesCount ?? 0,
    lastActivity: ai.lastActivity || new Date().toISOString(),
    tokenExpiresAt: ai.tokenExpiresAt,
    isMetaRateLimited: rl.isMetaRateLimited ?? ai.isMetaRateLimited ?? false,
    metaCallsThisHour: ai.metaCallsThisHour ?? 0,
    metaCallsRemaining: rl.metaCallsRemaining,
    createdAt: ai.createdAt || new Date().toISOString(),
    updatedAt: ai.updatedAt || new Date().toISOString(),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function InstaAccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const [accounts, setAccounts] = useState<InstaAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAccLoading, setIsAccLoading] = useState(true);

  // ── Fetch all accounts ────────────────────────────────────────────────────

  const refreshAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await getInstaAccount(apiRequest);

      let raw: any[] = [];
      if (response?.accounts && Array.isArray(response.accounts)) {
        raw = response.accounts;
      } else if (
        response?.data?.accounts &&
        Array.isArray(response.data.accounts)
      ) {
        raw = response.data.accounts;
      } else if (Array.isArray(response)) {
        raw = response;
      }

      // Map and sort oldest-first so default is the oldest account
      const mapped: InstaAccount[] = raw
        .map(mapAccount)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      setAccounts(mapped);

      // Determine which account to select
      setSelectedId((prev) => {
        // If already selected and still exists, keep it
        if (prev && mapped.some((a) => a.instagramId === prev)) return prev;

        // Try to restore from localStorage
        const stored = getStoredId();
        if (stored && mapped.some((a) => a.instagramId === stored)) {
          return stored;
        }

        // Default: oldest account (first after sort)
        return mapped[0]?.instagramId ?? null;
      });
    } catch (err) {
      console.error("InstaAccountContext: failed to fetch accounts", err);
    } finally {
      setIsAccLoading(false);
    }
  }, [userId, apiRequest]);

  // Fetch on mount / userId change
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setIsAccLoading(false);
      return;
    }
    refreshAccounts();
  }, [isLoaded, userId, refreshAccounts]);

  // ── Select handler ────────────────────────────────────────────────────────

  const selectAccount = useCallback((instagramId: string) => {
    setSelectedId(instagramId);
    storeId(instagramId);
  }, []);

  // ── Derived selected account ──────────────────────────────────────────────

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.instagramId === selectedId) ?? null,
    [accounts, selectedId],
  );

  const value = useMemo<InstaAccountContextValue>(
    () => ({
      accounts,
      selectedAccount,
      selectAccount,
      isAccLoading,
      refreshAccounts,
    }),
    [accounts, selectedAccount, selectAccount, isAccLoading, refreshAccounts],
  );

  return (
    <InstaAccountContext.Provider value={value}>
      {children}
    </InstaAccountContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInstaAccount() {
  return useContext(InstaAccountContext);
}
