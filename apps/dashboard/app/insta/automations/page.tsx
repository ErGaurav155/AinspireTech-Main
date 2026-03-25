"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  Zap,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import {
  deleteTemplate,
  getInstaTemplates,
  updateTemplate,
} from "@/lib/services/insta-actions.api";
import { Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

// Types
interface ContentItem {
  text: string;
  link: string;
  buttonTitle?: string;
}

interface TemplateType {
  _id: string;
  name: string;
  userId: string;
  accountId: string;
  content: ContentItem[];
  reply: string[];
  triggers: string[];
  isFollow: boolean;
  priority: number;
  accountUsername: string;
  mediaId: string;
  mediaUrl?: string;
  mediaType?: string;
  isActive: boolean;
  usageCount?: number;
  lastUsed?: string;
  successRate?: number;
  delaySeconds?: number;
  automationType: "comments" | "stories" | "dms" | "live";
  welcomeMessage?: {
    enabled: boolean;
    text: string;
    buttonTitle: string;
  };
  publicReply?: {
    enabled: boolean;
    replies: string[];
    tagType: "none" | "user" | "account";
  };
  askFollow?: {
    enabled: boolean;
    message: string;
    visitProfileBtn: string;
    followingBtn: string;
  };
  askEmail?: {
    enabled: boolean;
    openingMessage: string;
    retryMessage: string;
    sendDmIfNoEmail: boolean;
  };
  followUpDMs?: {
    enabled: boolean;
  };
  delayOption?: "immediate" | "3min" | "5min" | "10min";
}

type SortOption = "newest" | "oldest" | "a-z" | "z-a";

// API Response Types
interface TemplatesResponse {
  success?: boolean;
  templates?: TemplateType[];
  hasMore?: boolean;
  totalCount?: number;
  data?: {
    templates?: TemplateType[];
    hasMore?: boolean;
    totalCount?: number;
  };
}

// Constants
const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  "a-z": "A → Z",
  "z-a": "Z → A",
};

const AUTOMATION_TYPE_LABELS: Record<string, string> = {
  comments: "DM from Comments",
  stories: "DM from Stories",
  dms: "Respond to all DMs",
  live: "DM from Live",
};

const AUTOMATION_ICONS: Record<string, string> = {
  comments: "💬",
  stories: "📖",
  dms: "💬",
  live: "🔴",
};

export default function AutomationsPage() {
  const [templates, setTemplates] = useState<TemplateType[]>([]);
  const [hasMoreTemplates, setHasMoreTemplates] = useState(false);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null,
  );
  const { selectedAccount, isAccLoading, accounts, refreshAccounts } =
    useInstaAccount();
  const [deletingTemplateName, setDeletingTemplateName] = useState<string>("");
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const loadMoreCountRef = useRef(0);
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const { styles, isDark } = useThemeStyles();

  // Page-specific styles (not in central theme)
  const pageStyles = useMemo(() => {
    return {
      sortButton: isDark
        ? "flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/[0.09] backdrop-blur-[12px] text-white/70 hover:bg-white/[0.09] rounded-xl transition-colors"
        : "flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 transition-colors",
      addButton: isDark
        ? "flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-pink-500/20"
        : "flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-pink-200",
      loadMoreButton: (disabled?: boolean) =>
        isDark
          ? `flex items-center gap-2 px-6 py-2.5 bg-white/[0.06] border border-white/[0.09] backdrop-blur-[12px] text-white/70 hover:bg-white/[0.09] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed`
          : `flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`,
      sortMenu: isDark
        ? "absolute right-0 top-12 z-20 bg-white/[0.04] border border-white/[0.08] backdrop-blur-[24px] rounded-2xl shadow-lg py-2 w-48 overflow-hidden"
        : "absolute right-0 top-12 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg shadow-black/5 py-2 w-48 overflow-hidden",
      sortHeader: isDark
        ? "px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wide"
        : "px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide",
      sortOption: (isActive: boolean) =>
        isDark
          ? `w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06] ${
              isActive ? "text-pink-400 font-medium" : "text-white/70"
            }`
          : `w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
              isActive ? "text-pink-500 font-medium" : "text-gray-700"
            }`,
      automationCard: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 hover:border-pink-500/50 hover:shadow-lg transition-all"
        : "bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all",
      automationMedia: isDark
        ? "w-12 h-12 rounded-xl overflow-hidden bg-white/[0.06] flex-shrink-0"
        : "w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0",
      automationTitle: isDark
        ? "font-semibold text-white truncate"
        : "font-semibold text-gray-800 truncate",
      automationType: isDark
        ? "text-xs px-2 py-0.5 bg-white/[0.06] text-white/60 rounded-full flex-shrink-0"
        : "text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0",
      automationMeta: isDark
        ? "text-xs text-white/40"
        : "text-xs text-gray-400",
      automationMetaDivider: isDark
        ? "w-1 h-1 bg-white/20 rounded-full"
        : "w-1 h-1 bg-gray-300 rounded-full",
      statusBadge: (isActive: boolean) =>
        isDark
          ? `flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
              isActive
                ? "bg-green-500/10 text-green-400"
                : "bg-gray-500/10 text-gray-400"
            }`
          : `flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
              isActive
                ? "bg-green-50 text-green-600"
                : "bg-gray-100 text-gray-500"
            }`,
      statusDot: (isActive: boolean) =>
        isDark
          ? `w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-gray-500"}`
          : `w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`,
      toggleSwitch: (isActive: boolean) =>
        isDark
          ? `relative w-10 h-5.5 rounded-full transition-colors ${
              isActive ? "bg-pink-500" : "bg-white/[0.06]"
            }`
          : `relative w-10 h-5.5 rounded-full transition-colors ${
              isActive ? "bg-pink-500" : "bg-gray-200"
            }`,
      toggleKnob: (isActive: boolean) =>
        isDark
          ? `absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
              isActive ? "translate-x-5" : "translate-x-0.5"
            }`
          : `absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
              isActive ? "translate-x-5" : "translate-x-0.5"
            }`,
      actionButton: (color: string) =>
        isDark
          ? `p-2 text-white/40 hover:text-${color}-400 hover:bg-${color}-500/10 rounded-lg transition-colors`
          : `p-2 text-gray-400 hover:text-${color}-600 hover:bg-${color}-50 rounded-lg transition-colors`,
      featureBadge: (color: string) =>
        isDark
          ? `text-xs px-2 py-0.5 bg-${color}-500/10 text-${color}-400 rounded-full`
          : `text-xs px-2 py-0.5 bg-${color}-50 text-${color}-600 rounded-full`,
      featureBadgeWithIcon: (color: string) =>
        isDark
          ? `text-xs px-2 py-0.5 bg-${color}-500/10 text-${color}-400 rounded-full flex items-center gap-1`
          : `text-xs px-2 py-0.5 bg-${color}-50 text-${color}-600 rounded-full flex items-center gap-1`,
      triggerBadge: isDark
        ? "text-xs px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded-full"
        : "text-xs px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full",
      triggerMore: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      emptyTitle: isDark
        ? "text-lg font-semibold text-white mb-2"
        : "text-lg font-semibold text-gray-800 mb-2",
      emptyDesc: isDark
        ? "text-sm text-white/40 mb-6"
        : "text-sm text-gray-500 mb-6",
      emptyButton: isDark
        ? "inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
        : "inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors",
      countText: isDark
        ? "text-sm text-white/40 mb-5"
        : "text-sm text-gray-500 mb-5",
      iconPink: isDark
        ? "bg-pink-500/20 border border-pink-500/30"
        : "bg-pink-100",
      badgeGreen: isDark
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-green-50 text-green-600 border-green-200",
      badgeGray: isDark
        ? "bg-gray-500/10 border border-gray-500/20 text-gray-400"
        : "bg-gray-100 text-gray-500 border-gray-200",
      accountBanner: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 mb-4 flex items-center justify-between"
        : "bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 flex items-center justify-between",
      accountName: isDark
        ? "font-medium text-white"
        : "font-medium text-gray-800",
      accountStats: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      refreshButton: isDark
        ? "text-xs text-pink-400 hover:text-pink-300 transition-colors"
        : "text-xs text-pink-500 hover:text-pink-600 transition-colors",
    };
  }, [isDark]);

  // Fetch templates - only when selectedAccount is available
  const fetchTemplates = useCallback(
    async (reset = false) => {
      // Don't fetch if no userId or no selected account
      if (!userId || !selectedAccount?.instagramId) {
        console.log("Waiting for account selection...");
        return;
      }

      if (reset) {
        loadMoreCountRef.current = 0;
      }

      setIsLoading(true);
      try {
        console.log(
          "Fetching templates for account:",
          selectedAccount?.instagramId,
        );
        const response = (await getInstaTemplates(apiRequest, {
          accountId: selectedAccount?.instagramId,
          filterStatus: "all",
          loadMoreCount: loadMoreCountRef.current,
        })) as TemplatesResponse;

        let templatesList: TemplateType[] = [];
        let hasMore = false;
        let totalCount = 0;

        // Handle different response structures
        if (response?.templates && Array.isArray(response.templates)) {
          templatesList = response.templates;
          hasMore = response.hasMore || false;
          totalCount = response.totalCount || templatesList.length;
        } else if (
          response?.data?.templates &&
          Array.isArray(response.data.templates)
        ) {
          templatesList = response.data.templates;
          hasMore = response.data.hasMore || false;
          totalCount = response.data.totalCount || templatesList.length;
        } else if (Array.isArray(response)) {
          templatesList = response;
          hasMore = false;
          totalCount = templatesList.length;
        }

        if (templatesList.length > 0) {
          const formatted = templatesList.map((t: any) => ({
            ...t,
            content: t.content || [{ text: "", link: "" }],
            reply: t.reply || [],
            triggers: t.triggers || [],
            lastUsed: t.lastUsed
              ? new Date(t.lastUsed).toISOString()
              : new Date().toISOString(),
            successRate: t.successRate || 0,
            delaySeconds: t.delaySeconds || 0,
          }));

          if (reset || loadMoreCountRef.current === 0) {
            setTemplates(formatted);
          } else {
            setTemplates((prev) => [...prev, ...formatted]);
          }

          setHasMoreTemplates(hasMore);
          setTotalTemplates(totalCount);
        } else {
          setTemplates([]);
          setHasMoreTemplates(false);
          setTotalTemplates(0);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        setTemplates([]);
        toast({
          title: "Failed to load automations",
          duration: 3000,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [userId, apiRequest, selectedAccount?.instagramId],
  );

  // Initial load: Wait for accounts to load and then fetch templates
  useEffect(() => {
    if (!userId || !isLoaded) return;

    // Wait until accounts are loaded and we have a selected account
    if (!isAccLoading && selectedAccount?.instagramId && !hasLoadedInitial) {
      console.log("Initial load - account ready:", selectedAccount.instagramId);
      setHasLoadedInitial(true);
      fetchTemplates(true);
    }
  }, [
    userId,
    isLoaded,
    isAccLoading,
    selectedAccount,
    hasLoadedInitial,
    fetchTemplates,
  ]);

  // Refresh when selected account changes (but not on initial load)
  useEffect(() => {
    if (hasLoadedInitial && selectedAccount?.instagramId && !isAccLoading) {
      console.log(
        "Account changed, refreshing templates for:",
        selectedAccount.instagramId,
      );
      fetchTemplates(true);
    }
  }, [
    selectedAccount?.instagramId,
    isAccLoading,
    hasLoadedInitial,
    fetchTemplates,
  ]);

  const loadMore = useCallback(async () => {
    if (
      !userId ||
      !hasMoreTemplates ||
      isLoadingMore ||
      !selectedAccount?.instagramId
    )
      return;

    setIsLoadingMore(true);
    loadMoreCountRef.current += 1;

    try {
      await fetchTemplates(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    userId,
    hasMoreTemplates,
    isLoadingMore,
    selectedAccount?.instagramId,
    fetchTemplates,
  ]);

  const handleToggle = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t._id === templateId);
      if (!template) return;

      const newActive = !template.isActive;

      setTemplates((prev) =>
        prev.map((t) =>
          t._id === templateId ? { ...t, isActive: newActive } : t,
        ),
      );

      try {
        await updateTemplate(apiRequest, templateId, {
          ...template,
          isActive: newActive,
        });
        toast({
          title: newActive ? "Automation activated" : "Automation deactivated",
          duration: 3000,
        });
      } catch {
        setTemplates((prev) =>
          prev.map((t) =>
            t._id === templateId ? { ...t, isActive: !newActive } : t,
          ),
        );
        toast({
          title: "Failed to update",
          duration: 3000,
          variant: "destructive",
        });
      }
    },
    [templates, apiRequest],
  );

  const handleDelete = useCallback(
    async (templateId: string) => {
      try {
        await deleteTemplate(apiRequest, templateId);
        setTemplates((prev) => prev.filter((t) => t._id !== templateId));
        setTotalTemplates((prev) => prev - 1);
        toast({ title: "Automation deleted", duration: 3000 });
        setShowDeleteDialog(false);
        setDeletingTemplateId(null);
      } catch (error) {
        console.error("Error deleting template:", error);
        toast({
          title: "Failed to delete",
          duration: 3000,
          variant: "destructive",
        });
      }
    },
    [apiRequest],
  );

  const displayedTemplates = useMemo(() => {
    let result = templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.accountUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.triggers?.some((tr) =>
          tr?.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );

    switch (sortOption) {
      case "newest":
        result = [...result].sort(
          (a, b) =>
            new Date(b.lastUsed || 0).getTime() -
            new Date(a.lastUsed || 0).getTime(),
        );
        break;
      case "oldest":
        result = [...result].sort(
          (a, b) =>
            new Date(a.lastUsed || 0).getTime() -
            new Date(b.lastUsed || 0).getTime(),
        );
        break;
      case "a-z":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "z-a":
        result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [templates, searchTerm, sortOption]);

  const getAutomationType = useCallback((t: TemplateType) => {
    return AUTOMATION_TYPE_LABELS[t.automationType] || "DM from Comments";
  }, []);

  const getAutomationIcon = useCallback((t: TemplateType) => {
    return AUTOMATION_ICONS[t.automationType] || "💬";
  }, []);

  // Show loading while accounts are being loaded
  if (!isLoaded || isAccLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? "border-pink-400" : "border-pink-500"
          }`}
        />
      </div>
    );
  }

  // Show message if no account is selected
  if (!selectedAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No Instagram account connected
          </p>
          <Link
            href="/insta/accounts/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Connect Instagram Account
          </Link>
        </div>
      </div>
    );
  }

  // Loading state while fetching templates
  if (isLoading && templates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? "border-pink-400" : "border-pink-500"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={
        isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen"
      }
    >
      {isDark && <Orbs />}
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 relative z-10">
        {/* Search + Sort + Add */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`relative flex-1 ${styles.input} rounded-xl`}>
            <div className="relative">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${styles.text.muted}`}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-3 rounded-xl text-sm ${styles.input}`}
              />
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className={pageStyles.sortButton}
            >
              <ArrowUpDown
                className={`h-4 w-4 ${isDark ? "text-white/40" : "text-gray-500"}`}
              />
              Sort
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className={pageStyles.sortMenu}>
                  <p className={pageStyles.sortHeader}>Sort By</p>
                  {(["newest", "oldest", "a-z", "z-a"] as SortOption[]).map(
                    (opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortOption(opt);
                          setShowSortMenu(false);
                        }}
                        className={pageStyles.sortOption(sortOption === opt)}
                      >
                        {SORT_LABELS[opt]}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          <Link href="/insta/automations/add" className={pageStyles.addButton}>
            <Plus className="h-4 w-4" />
            Add Automation
          </Link>
          <button
            onClick={() => refreshAccounts()}
            className={pageStyles.addButton}
          >
            Refresh
          </button>
        </div>

        <p className={pageStyles.countText}>
          Showing {displayedTemplates.length} of {totalTemplates} results
        </p>

        {displayedTemplates.length === 0 && !isLoading && (
          <div className={`${styles.card} rounded-xl `}>
            <div className="p-6 text-center">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${pageStyles.iconPink}`}
              >
                <Zap
                  className={`h-8 w-8 ${isDark ? "text-pink-400" : "text-pink-400"}`}
                />
              </div>
              <h3 className={pageStyles.emptyTitle}>
                {searchTerm
                  ? "No automations match your search"
                  : "No automations yet"}
              </h3>
              <p className={pageStyles.emptyDesc}>
                {searchTerm
                  ? "Try different search terms"
                  : "Create your first automation to start growing on autopilot"}
              </p>
              {!searchTerm && (
                <Link
                  href="/insta/automations/add"
                  className={pageStyles.emptyButton}
                >
                  <Plus className="h-4 w-4" />
                  Add Automation
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {displayedTemplates.map((template) => (
            <div
              key={template._id}
              className={`${pageStyles.automationCard} flex-wrap`}
            >
              <div className="flex flex-wrap flex-row items-center gap-4 w-full">
                <div className={pageStyles.automationMedia}>
                  {template.mediaUrl ? (
                    <Image
                      src={template.mediaUrl}
                      alt={template.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {getAutomationIcon(template)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-1 w-full">
                  <h3 className={pageStyles.automationTitle}>
                    {template.name}
                  </h3>
                  <span className={pageStyles.automationType}>
                    {getAutomationType(template)}
                  </span>
                </div>
                <div className="flex flex-wrap flex-1 w-full">
                  <div className="flex items-center gap-3">
                    <span className={pageStyles.automationMeta}>
                      @{template.accountUsername}
                    </span>
                    {template.triggers?.length > 0 && template.triggers[0] && (
                      <>
                        <span className={pageStyles.automationMetaDivider} />
                        <span className={pageStyles.automationMeta}>
                          {template.triggers.filter(Boolean).length} keywords
                        </span>
                      </>
                    )}
                    <span className={pageStyles.automationMetaDivider} />
                    <span className={pageStyles.automationMeta}>
                      {template.usageCount || 0} uses
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                  <div className={pageStyles.statusBadge(template.isActive)}>
                    <span className={pageStyles.statusDot(template.isActive)} />
                    {template.isActive ? "Active" : "Inactive"}
                  </div>

                  <button
                    onClick={() => handleToggle(template._id)}
                    className={pageStyles.toggleSwitch(template.isActive)}
                    style={{ width: 40, height: 22 }}
                  >
                    <span
                      className={pageStyles.toggleKnob(template.isActive)}
                      style={{
                        width: 18,
                        height: 18,
                        top: 2,
                        left: template.isActive ? 0 : 2,
                        position: "absolute",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>

                  <Link
                    href={`/insta/automations/add/${template.automationType}?id=${template._id}`}
                    className={pageStyles.actionButton("gray")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <>
                    <button
                      onClick={() => {
                        setDeletingTemplateId(template._id);
                        setDeletingTemplateName(template.name);
                        setShowDeleteDialog(true);
                      }}
                      className={pageStyles.actionButton("red")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <ConfirmDialog
                      open={showDeleteDialog}
                      onOpenChange={setShowDeleteDialog}
                      onConfirm={() => {
                        if (deletingTemplateId) {
                          handleDelete(deletingTemplateId);
                        }
                      }}
                      title="Delete Automation"
                      description={`Are you sure you want to delete "${deletingTemplateName}"? This action cannot be undone.`}
                      confirmText="Delete"
                      isDestructive={true}
                      isLoading={isLoading}
                    />
                  </>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06] ">
                {template.welcomeMessage?.enabled && (
                  <span className={pageStyles.featureBadge("blue")}>
                    Welcome Message
                  </span>
                )}
                {template.publicReply?.enabled && (
                  <span className={pageStyles.featureBadge("purple")}>
                    Public Replies
                  </span>
                )}
                {template.askFollow?.enabled && (
                  <span className={pageStyles.featureBadge("orange")}>
                    Follow Gate
                  </span>
                )}
                {template.askEmail?.enabled && (
                  <span className={pageStyles.featureBadgeWithIcon("yellow")}>
                    <span>👑</span> Collect Email
                  </span>
                )}
                {template.delaySeconds && template.delaySeconds > 0 && (
                  <span className={pageStyles.featureBadgeWithIcon("gray")}>
                    <Clock className="h-3 w-3" />
                    {template.delaySeconds}s delay
                  </span>
                )}
                {template.triggers?.filter(Boolean).length > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    {template.triggers
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((t, i) => (
                        <span key={i} className={pageStyles.triggerBadge}>
                          {t}
                        </span>
                      ))}
                    {template.triggers.filter(Boolean).length > 3 && (
                      <span className={pageStyles.triggerMore}>
                        +{template.triggers.filter(Boolean).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasMoreTemplates && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className={pageStyles.loadMoreButton(isLoadingMore)}
            >
              {isLoadingMore ? (
                <div
                  className={
                    isDark
                      ? "w-4 h-4 border-2 border-t-transparent border-pink-400 rounded-full animate-spin"
                      : "w-4 h-4 border-2 border-t-transparent border-pink-500 rounded-full animate-spin"
                  }
                />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {isLoadingMore
                ? "Loading..."
                : `Load More (${totalTemplates - templates.length} more)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
