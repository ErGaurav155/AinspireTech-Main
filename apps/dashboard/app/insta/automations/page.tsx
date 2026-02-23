"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Instagram,
  MoreHorizontal,
  Edit2,
  Trash2,
  BarChart3,
  MessageSquare,
  ChevronDown,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rocketreplai/ui/components/radix/dropdown-menu";
import {
  deleteTemplate,
  getAllInstagramAccounts,
  getInstaTemplates,
  updateTemplate,
} from "@/lib/services/insta-actions.api";

// Types
interface AccountDataType {
  instagramId: string;
  username: string;
  isActive: boolean;
  autoReplyEnabled?: boolean;
}

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
  const [accounts, setAccounts] = useState<AccountDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadMoreCountRef = useRef(0);
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();

  // Fetch accounts
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const fetchAccounts = async () => {
      try {
        const data = await getAllInstagramAccounts(apiRequest);
        if (data?.accounts && Array.isArray(data.accounts)) {
          setAccounts(
            data.accounts.map((acc: any) => ({
              instagramId: acc.instagramId,
              username: acc.username,
              isActive: acc.isActive || false,
              autoReplyEnabled: acc.autoReplyEnabled || false,
            })),
          );
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
  }, [userId, isLoaded, apiRequest]);

  // Fetch templates
  const fetchTemplates = useCallback(
    async (reset = false) => {
      if (!userId) return;

      if (reset) {
        loadMoreCountRef.current = 0;
      }

      setIsLoading(true);
      try {
        const response = await getInstaTemplates(apiRequest, {
          filterAccount: "all",
          filterStatus: "all",
          loadMoreCount: loadMoreCountRef.current,
        });

        if (response.templates && response.templates.length > 0) {
          const formatted = response.templates.map((t: any) => ({
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

          setHasMoreTemplates(response.hasMore);
          setTotalTemplates(response.totalCount);
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
    [userId, apiRequest],
  );

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchTemplates(true);
    }
  }, [userId, fetchTemplates]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!userId || !hasMoreTemplates || isLoadingMore) return;

    setIsLoadingMore(true);
    loadMoreCountRef.current += 1;

    try {
      await fetchTemplates(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, hasMoreTemplates, isLoadingMore, fetchTemplates]);

  // Toggle template active state
  const handleToggle = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t._id === templateId);
      if (!template) return;

      const newActive = !template.isActive;

      // Optimistic update
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
      } catch {
        // Rollback on error
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

  // Delete template
  const handleDelete = useCallback(
    async (templateId: string) => {
      try {
        await deleteTemplate(apiRequest, templateId);
        setTemplates((prev) => prev.filter((t) => t._id !== templateId));
        setTotalTemplates((prev) => prev - 1);
        toast({ title: "Automation deleted", duration: 3000 });
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

  // Filter and sort templates
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

  // Memoized helpers
  const getAutomationType = useCallback((t: TemplateType) => {
    return AUTOMATION_TYPE_LABELS[t.automationType] || "DM from Comments";
  }, []);

  const getAutomationIcon = useCallback((t: TemplateType) => {
    return AUTOMATION_ICONS[t.automationType] || "💬";
  }, []);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Search + Sort + Add */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative  flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 transition-colors"
            >
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              Sort
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 top-12 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg shadow-black/5 py-2 w-48 overflow-hidden">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Sort By
                  </p>
                  {(["newest", "oldest", "a-z", "z-a"] as SortOption[]).map(
                    (opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortOption(opt);
                          setShowSortMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                          sortOption === opt
                            ? "text-pink-500 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {SORT_LABELS[opt]}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* Add Automation */}
          <Link
            href="/insta/automations/add"
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-pink-200"
          >
            <Plus className="h-4 w-4" />
            Add Automation
          </Link>
        </div>

        {/* Count */}
        <p className="text-sm text-gray-500 mb-5">
          Showing {displayedTemplates.length} of {totalTemplates} results
        </p>

        {/* Empty state */}
        {displayedTemplates.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {searchTerm
                ? "No automations match your search"
                : "No automations yet"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm
                ? "Try different search terms"
                : "Create your first automation to start growing on autopilot"}
            </p>
            {!searchTerm && (
              <Link
                href="/insta/automations/add"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Automation
              </Link>
            )}
          </div>
        )}

        {/* Automation cards */}
        <div className="space-y-3">
          {displayedTemplates.map((template) => (
            <div
              key={template._id}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Media thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
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

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {template.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                      {getAutomationType(template)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>@{template.accountUsername}</span>
                    {template.triggers?.length > 0 && template.triggers[0] && (
                      <span className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        {template.triggers.filter(Boolean).length} keywords
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      {template.usageCount || 0} uses
                    </span>
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Active badge */}
                  <div
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                      template.isActive
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        template.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    {template.isActive ? "Active" : "Inactive"}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(template._id)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${
                      template.isActive ? "bg-pink-500" : "bg-gray-200"
                    }`}
                    style={{ width: 40, height: 22 }}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                        template.isActive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                      style={{
                        width: 18,
                        height: 18,
                        top: 2,
                        left: template.isActive ? 20 : 2,
                        position: "absolute",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>

                  {/* Edit */}
                  <Link
                    href={`/insta/automations/edit/${template._id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border border-gray-100 rounded-2xl shadow-xl max-w-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-800">
                          Delete Automation
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500">
                          Are you sure you want to delete{" "}
                          <strong>{template.name}</strong>? This action cannot
                          be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-gray-200">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template._id)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Features row */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                {template.welcomeMessage?.enabled && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    Welcome Message
                  </span>
                )}
                {template.publicReply?.enabled && (
                  <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                    Public Replies
                  </span>
                )}
                {template.askFollow?.enabled && (
                  <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">
                    Follow Gate
                  </span>
                )}
                {template.askEmail?.enabled && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full flex items-center gap-1">
                    <span>👑</span> Collect Email
                  </span>
                )}
                {template.delaySeconds && template.delaySeconds > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full flex items-center gap-1">
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
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    {template.triggers.filter(Boolean).length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{template.triggers.filter(Boolean).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {hasMoreTemplates && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? (
                <div className="w-4 h-4 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
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
