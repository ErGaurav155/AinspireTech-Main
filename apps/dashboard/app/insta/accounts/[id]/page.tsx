"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Users,
  MessageSquare,
  BarChart3,
  Zap,
  FolderSync as Sync,
  X,
  RefreshCw,
  Search,
  Filter,
  ImageIcon,
  VideoIcon,
  Link as LinkIcon,
  ChevronDown,
  Shield,
  Cpu,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
} from "lucide-react";

import defaultImg from "public/assets/img/default-img.jpg";
import { useApi } from "@/lib/useApi";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@clerk/nextjs";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { formatResponseTimeSmart, isCacheValid } from "@rocketreplai/shared";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Label } from "@rocketreplai/ui/components/radix/label";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rocketreplai/ui/components/radix/dialog";
import { Input } from "@rocketreplai/ui/components/radix/input";
import { Textarea } from "@rocketreplai/ui/components/radix/textarea";
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
import { Progress } from "@rocketreplai/ui/components/radix/progress";
import {
  createInstaTemplate,
  deleteInstaAccount,
  deleteTemplate,
  getDashboardData,
  getInstagramUser,
  getInstaMedia,
  getInstaTemplates,
  getReplyLogs,
  getSubscriptioninfo,
  refreshInstagramToken,
  updateTemplate,
  getRateLimitStats,
  getAppLimitStatus,
  UserTierInfo,
  AppLimitStatus,
  updateAccountSettings,
} from "@/lib/services/insta-actions.api";

const ACCOUNTS_CACHE_KEY = "instagramAccountDetails";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const TIER_LIMITS = {
  free: 100,
  pro: 999999,
} as const;

interface MediaItem {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  timestamp: string;
  caption?: string;
  likes?: number;
  comments?: number;
}

interface ContentItem {
  text: string;
  link?: string;
}

interface InstagramAccount {
  id: string;
  instagramId: string;
  userId: string;
  username: string;
  accessToken: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;
  accountReply: number;
  accountFollowCheck: number;
  accountDMSent: number;
  lastActivity: string;
  profilePicture: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  metaCallsThisHour: number;
  lastMetaCallAt: string;
  isMetaRateLimited: boolean;
  metaRateLimitResetAt?: string;
  createdAt: string;
  updatedAt: string;

  // Additional fields for display
  displayName: string;
  templatesCount: number;
  replyLimit: number;
  accountLimit: number;
  totalAccounts: number;
  engagementRate: number;
  successRate: number;
  avgResponseTime: number;
  tier?: "free" | "pro";
  callsMade?: number;
  callsRemaining?: number;
  isTokenExpiring?: boolean;
}

export default function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadMoreCount, setLoadMoreCount] = useState(0);
  const [hasMoreTemplates, setHasMoreTemplates] = useState(false);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [rateLimitStats, setRateLimitStats] = useState<UserTierInfo | null>(
    null,
  );
  const [appLimitStatus, setAppLimitStatus] = useState<AppLimitStatus | null>(
    null,
  );

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [imgSrc, setImgSrc] = useState<string>(defaultImg.src);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadMoreCountRef = useRef(0);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-transparent" : "bg-gray-50",
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      cardBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      cardHoverBorder: isDark
        ? "hover:border-[#258b94]/40"
        : "hover:border-[#258b94]/60",
      badgeBg: isDark ? "bg-[#0a0a0a]" : "bg-white",
      inputBg: isDark ? "bg-white/5" : "bg-white",
      inputBorder: isDark ? "border-white/20" : "border-gray-300",
      inputText: isDark ? "text-white" : "text-n-5",
      textCount: isDark ? "text-white" : "text-n-5",
      buttonOutlineBorder: isDark ? "border-white/20" : "border-gray-300",
      buttonOutlineText: isDark ? "text-gray-300" : "text-n-5",
      alertBg: isDark ? "bg-[#6d1717]/5" : "bg-red-50/80",
      dialogBg: isDark ? "bg-[#0a0a0a]/95" : "bg-white/95",
    };
  }, [currentTheme]);

  // New state for template functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountMedia, setSelectedAccountMedia] = useState<MediaItem[]>(
    [],
  );
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isTemplateCreating, setIsTemplateCreating] = useState(false);
  const [isUpdateTemplate, setIsUpdateTemplate] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const { userId, isLoaded } = useAuth();

  // Updated newTemplate state to handle content as objects
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: [
      { text: "This Is the link you want,Click the button below.", link: "" },
    ],
    openDm:
      "Hey there! I'm so happy you're here, thanks so much for your interest 😊 Click below and I'll send you the link in just a sec ✨",
    reply: [
      "Thanks! Please see DMs.",
      "Sent you a message! Check it out!",
      "Nice! Check your DMs!",
    ],
    triggers: ["Price", "Link", "Product"],
    isFollow: false,
    priority: 5,
    accountUsername: account?.username || "",
    mediaId: "",
    mediaUrl: "",
  });

  // Helper: Get cached data
  const getCachedData = <T,>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  };

  // Helper: Set cached data
  const setCachedData = <T,>(key: string, data: T): void => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Failed to cache data:", error);
    }
  };

  // Helper: Check if token is expiring
  const checkTokenExpiry = (accountData: any): boolean => {
    if (!accountData.tokenExpiresAt) return false;
    const expiryDate = new Date(accountData.tokenExpiresAt);
    const now = new Date();
    const hoursUntilExpiry =
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24; // Expiring in less than 24 hours
  };

  // Helper: Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Fetch rate limit statistics
  const fetchRateLimitStats =
    useCallback(async (): Promise<UserTierInfo | null> => {
      if (!userId) return null;

      try {
        const stats = await getRateLimitStats(apiRequest);
        setRateLimitStats(stats);
        return stats;
      } catch (error) {
        console.error("Failed to fetch rate limit stats:", error);
        return null;
      }
    }, [userId, apiRequest]);

  // Fetch app limit status
  const fetchAppLimitStatus =
    useCallback(async (): Promise<AppLimitStatus | null> => {
      try {
        const status = await getAppLimitStatus(apiRequest);
        setAppLimitStatus(status);
        return status;
      } catch (error) {
        console.error("Failed to fetch app limit status:", error);
        return null;
      }
    }, [apiRequest]);

  const fetchAccountMedia = useCallback(
    async (accountId: string, username: string) => {
      if (!userId) return;

      setIsLoadingMedia(true);
      try {
        const data = await getInstaMedia(apiRequest, accountId);
        if (data.media && Array.isArray(data.media) && data.media.length > 0) {
          setSelectedAccountMedia(data.media);
        } else {
          setSelectedAccountMedia([]);
          toast({
            title: "No media found",
            description: `No posts or reels found for @${username}`,
            duration: 3000,
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error("Error fetching media:", error);
        setSelectedAccountMedia([]);
        toast({
          title: "Error fetching media",
          description: error.message || "Please try again later",
          duration: 3000,
          variant: "destructive",
        });
      } finally {
        setIsLoadingMedia(false);
      }
    },
    [userId, apiRequest],
  );

  const handleToggleTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((t: any) => t._id === templateId);
      if (!template) return;

      const newActiveState = !template.isActive;

      try {
        const response = await updateTemplate(apiRequest, templateId, {
          ...template,
          isActive: newActiveState,
        });

        // Optimistically update UI
        setTemplates((prev) =>
          prev.map((t: any) =>
            t._id === templateId ? { ...t, isActive: newActiveState } : t,
          ),
        );
        toast({
          title: "Template updated",
          description: "Template status changed successfully",
          duration: 3000,
          variant: "default",
        });
      } catch (error) {
        console.error("Error updating template:", error);

        toast({
          title: "Error updating template",
          description: "Please try again",
          duration: 3000,
          variant: "destructive",
        });
      }
    },
    [templates, apiRequest],
  );

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        const response = await deleteTemplate(apiRequest, templateId);

        // Just remove the deleted template without resetting
        setTemplates((prev) =>
          prev.filter((template: any) => template._id !== templateId),
        );
        toast({
          title: "Template deleted",
          description: "Template has been removed successfully",
          duration: 3000,
          variant: "default",
        });
      } catch (error) {
        console.error("Error deleting template:", error);
        toast({
          title: "Error deleting template",
          description: "Please try again",
          duration: 3000,
          variant: "destructive",
        });
      }
    },
    [apiRequest],
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!id || !account) return;

    setIsDeleting(true);
    try {
      const response = await deleteInstaAccount(apiRequest, id);

      // Clear cache
      localStorage.removeItem(ACCOUNTS_CACHE_KEY);

      toast({
        title: "Account deleted successfully!",
        duration: 3000,
        variant: "default",
      });
      router.push("/insta/dashboard");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Account deletion failed!",
        description: error.message || "Please try again",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [id, router, account, apiRequest]);

  // Updated fetchTemplates function with loadMoreCount
  const fetchTemplates = useCallback(
    async (accountId: string, reset = false) => {
      if (!userId || !accountId) return;

      if (reset) {
        loadMoreCountRef.current = 0;
        setLoadMoreCount(0);
      }

      try {
        const response = await getInstaTemplates(apiRequest, {
          accountId: accountId,
          loadMoreCount: loadMoreCountRef.current,
        });

        if (response.templates && response.templates.length > 0) {
          const formattedTemplates = response.templates.map(
            (template: any) => ({
              ...template,
              lastUsed: template.lastUsed
                ? new Date(template.lastUsed).toISOString()
                : new Date().toISOString(),
              successRate: template.successRate || 0,
            }),
          );

          if (reset || loadMoreCountRef.current === 0) {
            setTemplates(formattedTemplates);
          } else {
            setTemplates((prev) => [...prev, ...formattedTemplates]);
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
        setHasMoreTemplates(false);
        setTotalTemplates(0);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, apiRequest],
  );

  // Load more templates function
  const loadMoreTemplates = useCallback(async () => {
    if (!account?.instagramId) return;

    setIsLoadingMore(true);
    const nextLoadCount = loadMoreCountRef.current + 1;

    try {
      // Update ref first
      loadMoreCountRef.current = nextLoadCount;

      await fetchTemplates(account.instagramId, false);

      // Update state for UI display
      setLoadMoreCount(nextLoadCount);
    } catch (error) {
      console.error("Error loading more templates:", error);
      toast({
        title: "Failed to load more templates",
        description: "Please try again",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [account?.instagramId, fetchTemplates]);

  const fetchAccount = useCallback(
    async (accountId: string) => {
      if (!userId) {
        router.push("/sign-in");
        return null;
      }
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const cacheKey = `${ACCOUNTS_CACHE_KEY}_${accountId}`;
        const cachedData = getCachedData<InstagramAccount>(cacheKey);
        if (cachedData) {
          setAccount(cachedData);
          setIsStale(!isCacheValid());
          await fetchTemplates(cachedData.instagramId, true);
          setIsLoading(false);
          return cachedData;
        }

        // Fetch from API
        const accountsResponse = await getDashboardData(apiRequest);

        const {
          accounts: dbAccounts,
          totalReplies,
          accountLimit,
          replyLimit,
          totalAccounts,
          totalTemplates,
          activeAccounts,
          successRate,
          engagementRate,
          overallAvgResponseTime,
        } = accountsResponse;

        if (!dbAccounts?.length || !Array.isArray(dbAccounts)) {
          return null;
        }

        // Find the specific account
        const dbAccount = dbAccounts.find((acc: any) => acc._id === accountId);
        if (!dbAccount) {
          throw new Error("Account not found");
        }

        // Get rate limit stats
        const rateStats = await fetchRateLimitStats();

        // Get Instagram data for display
        let instaData = null;
        try {
          instaData = await getInstagramUser(dbAccount.accessToken, [
            "username",
            "user_id",
            "followers_count",
            "media_count",
            "profile_picture_url",
          ]);
        } catch (instaError) {
          console.warn(
            `Could not fetch Instagram data for ${dbAccount.username}:`,
            instaError,
          );
        }

        // Find account usage from rate limit stats
        const accountUsage = rateStats?.accountUsage?.find(
          (usage) => usage.instagramAccountId === dbAccount.instagramId,
        );

        // Check token expiry
        const isTokenExpiring = checkTokenExpiry(dbAccount);

        const accountData: InstagramAccount = {
          id: dbAccount._id,
          instagramId: dbAccount.instagramId,
          userId: dbAccount.userId,
          username: dbAccount.username,
          accessToken: dbAccount.accessToken,
          isActive: dbAccount.isActive || false,
          autoReplyEnabled: dbAccount.autoReplyEnabled || false,
          autoDMEnabled: dbAccount.autoDMEnabled || false,
          followCheckEnabled: dbAccount.followCheckEnabled || false,
          requireFollowForFreeUsers:
            dbAccount.requireFollowForFreeUsers || false,
          accountReply: dbAccount.accountReply || 0,
          accountFollowCheck: dbAccount.accountFollowCheck || 0,
          accountDMSent: dbAccount.accountDMSent || 0,
          lastActivity: dbAccount.lastActivity || new Date().toISOString(),
          profilePicture:
            instaData?.profile_picture_url ||
            dbAccount.profilePicture ||
            defaultImg.src,
          followersCount:
            instaData?.followers_count || dbAccount.followersCount || 0,
          followingCount: dbAccount.followingCount || 0,
          mediaCount: instaData?.media_count || dbAccount.mediaCount || 0,
          metaCallsThisHour: dbAccount.metaCallsThisHour || 0,
          lastMetaCallAt: dbAccount.lastMetaCallAt || new Date().toISOString(),
          isMetaRateLimited: dbAccount.isMetaRateLimited || false,
          metaRateLimitResetAt: dbAccount.metaRateLimitResetAt,
          createdAt: dbAccount.createdAt,
          updatedAt: dbAccount.updatedAt,

          // Additional fields for display
          displayName:
            dbAccount.displayName || dbAccount.username || "Instagram Account",
          templatesCount: dbAccount.templatesCount || 0,
          replyLimit: replyLimit || 500,
          accountLimit: accountLimit || 1,
          totalAccounts: totalAccounts || 0,
          engagementRate: engagementRate || 0,
          successRate: successRate || 0,
          avgResponseTime: overallAvgResponseTime || 0,
          tier: rateStats?.tier || "free",
          callsMade: accountUsage?.callsMade || 0,
          callsRemaining: rateStats
            ? Math.max(0, rateStats.tierLimit - (accountUsage?.callsMade || 0))
            : TIER_LIMITS.free,
          isTokenExpiring,
        };

        setAccount(accountData);
        setCachedData(cacheKey, accountData);

        setIsStale(!isCacheValid());
        await fetchTemplates(accountData.instagramId, true);

        return accountData;
      } catch (error) {
        console.error("Failed to fetch account:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load account",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, router, fetchTemplates, fetchRateLimitStats, apiRequest],
  );

  const fetchAccountData = useCallback(async () => {
    if (!id) return;

    try {
      const accountData = await fetchAccount(id);
      if (!accountData) return;

      // Fetch additional data
      await Promise.all([fetchRateLimitStats(), fetchAppLimitStatus()]);
    } catch (error) {
      console.error("Error fetching account data:", error);
      setAccount(null);
    }
  }, [fetchAccount, id, fetchRateLimitStats, fetchAppLimitStatus]);

  useEffect(() => {
    if (!isLoaded) {
      return; // Wait for auth to load
    }
    if (!id || !userId) {
      router.push("/sign-in");
      return;
    }
    fetchAccountData();
  }, [userId, router, id, fetchAccountData, isLoaded]);

  useEffect(() => {
    const fetchData = async () => {
      if (userId) {
        try {
          const subs = await getSubscriptioninfo(apiRequest);
          if (subs.subscriptions && subs.subscriptions.length > 0) {
            setCanFollow(true);
          } else {
            setCanFollow(false);
          }
        } catch (error) {
          console.error("Error fetching subscription info:", error);
          setCanFollow(false);
        }

        if (account?.instagramId) {
          fetchTemplates(account.instagramId, true);
        }
      }
    };
    fetchData();
  }, [userId, fetchTemplates, account?.instagramId, apiRequest]);

  // Update search effect
  useEffect(() => {
    if (account?.instagramId) {
      fetchTemplates(account.instagramId, true);
    }
  }, [fetchTemplates, account?.instagramId]);

  const handleToggleAccount = useCallback(async () => {
    if (!account?.id) return;

    const newActiveState = !account.isActive;

    try {
      await updateAccountSettings(apiRequest, account?.instagramId, {
        isActive: newActiveState,
      });
      // Optimistically update UI
      setAccount({ ...account, isActive: newActiveState });

      // Update cache
      const cacheKey = `${ACCOUNTS_CACHE_KEY}_${account.id}`;
      const cachedData = getCachedData<InstagramAccount>(cacheKey);
      if (cachedData) {
        setCachedData(cacheKey, { ...cachedData, isActive: newActiveState });
      }

      toast({
        title: "Account updated",
        description: `Auto-replies ${newActiveState ? "enabled" : "disabled"}`,
        duration: 3000,
        variant: "default",
      });
    } catch (error) {
      // Revert on error
      setAccount({ ...account, isActive: !newActiveState });
      console.error("Error updating account:", error);
      toast({
        title: "Failed to update account",
        description: "Please try again",
        duration: 3000,
        variant: "destructive",
      });
    }
  }, [account, apiRequest]);

  const handleCreateTemplate = useCallback(async () => {
    if (!userId || !account?.instagramId) return;

    try {
      setIsTemplateCreating(true);
      if (!newTemplate.mediaId) {
        toast({
          title: "Media required",
          description: "Please select a post or reel for this template",
          duration: 3000,
          variant: "destructive",
        });
        return;
      }

      const result = await createInstaTemplate(
        apiRequest,
        account?.instagramId,
        account?.username,
        {
          ...newTemplate,
          isFollow: newTemplate.isFollow,
        },
      );

      if (result) {
        // DON'T reset templates, just add the new one to the beginning
        setTemplates((prev) => [result.template, ...prev]);
        setIsCreateDialogOpen(false);

        toast({
          title: "Template created successfully",
          duration: 3000,
          variant: "default",
        });
        setNewTemplate({
          name: "",
          openDm: "",
          content: [{ text: "", link: "" }],
          isFollow: false,
          reply: [""],
          triggers: [""],
          priority: 5,
          accountUsername: account.username,
          mediaId: "",
          mediaUrl: "",
        });
        setSelectedMedia(null);
        setSelectedAccountMedia([]);
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Network error",
        description: "Could not connect to server",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setIsTemplateCreating(false);
    }
  }, [userId, account, newTemplate, apiRequest]);

  const handleEditClick = useCallback(
    async (template: any) => {
      setEditingTemplate(template);
      setIsCreateDialogOpen(true);

      // If editing, fetch media for the account
      if (account?.instagramId && account?.username) {
        await fetchAccountMedia(account.instagramId, account.username);
      }
      setSelectedMedia(template.mediaId || null);
    },
    [account, fetchAccountMedia],
  );

  const handleUpdateTemplate = useCallback(
    async (template: any) => {
      if (!template?._id) return;

      try {
        setIsUpdateTemplate(true);
        const templateId = template._id;
        const response = await updateTemplate(apiRequest, templateId, {
          ...template,
          isFollow: canFollow ? template.isFollow : false,
        });
        if (response) {
          // Update the specific template without resetting everything
          setTemplates((prev) =>
            prev.map((t: any) => (t._id === response._id ? response : t)),
          );
          setIsCreateDialogOpen(false);
          setEditingTemplate(null);
          toast({
            title: "Template updated successfully",
            duration: 3000,
            variant: "default",
          });
        } else {
          toast({
            title: "Failed to update template",
            duration: 3000,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error updating template:", error);
        toast({
          title: "Failed to update template",
          duration: 3000,
          variant: "destructive",
        });
      } finally {
        setIsUpdateTemplate(false);
      }
    },
    [canFollow, apiRequest],
  );

  const formatLastActivity = useCallback((dateString: string) => {
    if (!dateString) return "Never";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else {
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
      }
    } catch (error) {
      return "Invalid date";
    }
  }, []);

  const formatLastUsed = useCallback((dateString: string) => {
    if (!dateString) return "Never used";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Never used";

      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 60) {
        return `${diffInMinutes || 0}m ago`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60) || 0}h ago`;
      } else {
        return `${Math.floor(diffInMinutes / 1440) || 0}d ago`;
      }
    } catch (error) {
      return "Never used";
    }
  }, []);

  const getCategoryColor = useCallback((category: string) => {
    const colors = {
      greeting: "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30",
      sales: "bg-[#B026FF]/20 text-[#B026FF] border-[#B026FF]/30",
      content: "bg-[#FF2E9F]/20 text-[#FF2E9F] border-[#FF2E9F]/30",
      engagement: "bg-green-500/20 text-green-400 border-green-400/30",
      support: "bg-orange-500/20 text-orange-400 border-orange-400/30",
    };
    return (
      colors[category as keyof typeof colors] ||
      "bg-gray-500/20 text-gray-400 border-gray-400/30"
    );
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      localStorage.removeItem(`${ACCOUNTS_CACHE_KEY}_${id}`);
      await fetchAccount(id);
      toast({
        title: "Data refreshed",
        description: "Account data has been refreshed",
        duration: 3000,
        variant: "default",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh account data",
        duration: 3000,
        variant: "destructive",
      });
    }
  }, [fetchAccount, id]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template: any) => {
      const matchesSearch =
        template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.content?.some((c: ContentItem) =>
          c.text?.toLowerCase().includes(searchTerm.toLowerCase()),
        ) ||
        template.triggers?.some((trigger: any) =>
          trigger?.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      return matchesSearch;
    });
  }, [templates, searchTerm]);

  // Render rate limit status badge
  const renderRateLimitStatus = () => {
    if (!rateLimitStats) return null;

    const { tier, callsMade, tierLimit, usagePercentage, remainingCalls } =
      rateLimitStats;

    if (tier === "pro") {
      return (
        <Badge className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 text-purple-300 border-purple-500/30">
          <Shield className="mr-1 h-3 w-3" />
          Pro Unlimited
        </Badge>
      );
    }

    if (usagePercentage >= 90) {
      return (
        <Badge className="bg-red-900/20 text-red-300 border-red-500/30">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {remainingCalls} calls left
        </Badge>
      );
    } else if (usagePercentage >= 70) {
      return (
        <Badge className="bg-yellow-900/20 text-yellow-300 border-yellow-500/30">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {remainingCalls} calls left
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-900/20 text-green-300 border-green-500/30">
        <CheckCircle className="mr-1 h-3 w-3" />
        {remainingCalls} calls left
      </Badge>
    );
  };

  // Render app limit status
  const renderAppLimitStatus = () => {
    if (!appLimitStatus) return null;

    const { reached, current, limit, percentage } = appLimitStatus;

    if (reached) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/10 border border-red-500/30 mb-4">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-300">
              App Limit Reached
            </p>
            <p className="text-xs text-red-400">
              Global limit: {current.toLocaleString()}/{limit.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }

    if (percentage >= 80) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-900/10 border border-yellow-500/30 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-300">High Usage</p>
            <p className="text-xs text-yellow-400">
              {percentage.toFixed(1)}% of app limit used
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/10 border border-green-500/30 mb-4">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <div>
          <p className="text-sm font-medium text-green-300">System Normal</p>
          <p className="text-xs text-green-400">
            {percentage.toFixed(1)}% of app limit used
          </p>
        </div>
      </div>
    );
  };

  // Render rate limit progress
  const renderRateLimitProgress = () => {
    if (!rateLimitStats) return null;

    const { tier, callsMade, tierLimit, usagePercentage, nextReset } =
      rateLimitStats;

    if (tier === "pro") {
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span
              className={`text-sm font-medium ${themeStyles.textSecondary}`}
            >
              <Zap className="inline mr-1 h-3 w-3" />
              Pro Unlimited
            </span>
            <span className={`text-sm ${themeStyles.textMuted}`}>
              No limits
            </span>
          </div>
          <Progress value={0} className="h-2 bg-green-900/20" />
          <p className={`text-xs ${themeStyles.textMuted}`}>
            You have unlimited API calls with Pro tier
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${themeStyles.textSecondary}`}>
            <Clock className="inline mr-1 h-3 w-3" />
            Rate Limit Usage ({callsMade}/{tierLimit})
          </span>
          <span className={`text-sm ${themeStyles.textMuted}`}>
            {usagePercentage.toFixed(1)}%
          </span>
        </div>
        <Progress
          value={usagePercentage}
          className={`h-2 ${
            usagePercentage >= 90
              ? "bg-red-900/20"
              : usagePercentage >= 70
                ? "bg-yellow-900/20"
                : "bg-green-900/20"
          }`}
        />
        <div className="flex justify-between text-xs">
          <span className={themeStyles.textMuted}>
            Resets: {formatDate(new Date(nextReset))}
          </span>
          <span className={themeStyles.textMuted}>
            {rateLimitStats.remainingCalls} calls remaining
          </span>
        </div>
      </div>
    );
  };

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchAccountData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Account Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The requested Instagram account could not be found.
          </p>
          <Button asChild>
            <Link href="/insta/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate Meta API usage percentage
  const metaCallsPercentage = account.metaCallsThisHour
    ? Math.min((account.metaCallsThisHour / 200) * 100, 100)
    : 0;

  // Get account usage from rate limit stats
  const accountUsage = rateLimitStats?.accountUsage?.find(
    (usage) => usage.instagramAccountId === account.instagramId,
  );

  return (
    <div
      className={`min-h-screen ${themeStyles.containerBg} ${themeStyles.textPrimary}`}
    >
      <BreadcrumbsDefault />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={themeStyles.textPrimary}
          >
            <Link href="/insta/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* System Status Alert */}
        {appLimitStatus && renderAppLimitStatus()}

        {/* Account Header */}
        <Card
          className={`mb-8 overflow-hidden hover:-translate-y-1 transition-all shadow hover:shadow-[#FF2E9F] ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
        >
          <CardContent className="pt-6 group hover:shadow-xl duration-300 bg-gradient-to-br from-[#FF2E9F]/20 to-[#FF2E9F]/5 border-[#FF2E9F]/10 hover:border-[#FF2E9F]/20 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-3 md:gap-0 items-center justify-between">
              <div className="flex-[60%] flex flex-col md:flex-row gap-5 items-center">
                <div className="relative">
                  <Image
                    width={100}
                    height={100}
                    src={
                      hasError
                        ? defaultImg
                        : account?.profilePicture || defaultImg
                    }
                    alt={account.displayName || "Instagram Account"}
                    onError={handleError}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                  <div
                    className={`absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-2 ${
                      account.isActive ? "bg-[#00F0FF]" : "bg-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-start w-full gap-1 md:gap-3">
                    <h1
                      className={`text-2xl md:text-4xl font-bold gradient-text-main ${themeStyles.textPrimary}`}
                    >
                      @{account?.username || "unknown"}
                    </h1>
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {renderRateLimitStatus()}
                  </div>
                  <p className={`text-xl ${themeStyles.textSecondary} mb-2`}>
                    {account.displayName || "Instagram User"}
                  </p>
                  <div
                    className={`flex items-center gap-2 md:gap-6 text-n-5 ${themeStyles.textCount}`}
                  >
                    <span>
                      {account.followersCount?.toLocaleString() || 0} followers
                    </span>
                    <span>{account.mediaCount || 0} posts</span>
                    <span>{account.engagementRate || 0}% engagement</span>
                  </div>
                </div>
              </div>
              <div className="flex-[35%] flex flex-col items-center justify-center w-full gap-3">
                <div className="">
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="account-toggle"
                      className={themeStyles.textSecondary}
                    >
                      Auto-replies
                    </Label>
                    <Switch
                      id="account-toggle"
                      checked={account.isActive}
                      onCheckedChange={handleToggleAccount}
                    />

                    {account.isTokenExpiring && userId && (
                      <Button
                        onClick={() =>
                          refreshInstagramToken(apiRequest, account.instagramId)
                        }
                        variant="outline"
                        size="sm"
                        className={`${themeStyles.buttonOutlineBorder} p-2 bg-gradient-to-r from-[#0ce05d]/80 to-[#054e29] text-black hover:bg-white/10`}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Token
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => refresh()}
                      variant="outline"
                      size="sm"
                      className={`${themeStyles.buttonOutlineBorder} p-2 bg-gradient-to-r from-[#0ce05d]/80 to-[#0baf5d]/80  hover:bg-white/10`}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Data
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Limit and Meta API Usage */}
            {rateLimitStats && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className={`font-semibold ${themeStyles.textPrimary}`}>
                      <Activity className="inline mr-2 h-4 w-4" />
                      Rate Limit Analytics
                    </h3>
                    {renderRateLimitProgress()}
                  </div>

                  <div className="space-y-4">
                    <h3 className={`font-semibold ${themeStyles.textPrimary}`}>
                      <Cpu className="inline mr-2 h-4 w-4" />
                      Meta API Usage
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={themeStyles.textSecondary}>
                          Calls this hour
                        </span>
                        <span className={themeStyles.textMuted}>
                          {account.metaCallsThisHour || 0}/200
                        </span>
                      </div>
                      <Progress
                        value={metaCallsPercentage}
                        className={`h-2 ${
                          metaCallsPercentage >= 90
                            ? "bg-red-900/20"
                            : metaCallsPercentage >= 70
                              ? "bg-yellow-900/20"
                              : "bg-green-900/20"
                        }`}
                      />
                      {account.isMetaRateLimited && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Rate limited
                          {account.metaRateLimitResetAt && (
                            <span className="text-gray-500">
                              (resets{" "}
                              {formatLastActivity(account.metaRateLimitResetAt)}
                              )
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList
            className={`${themeStyles.cardBg} ${themeStyles.cardBorder} min-h-max flex flex-wrap items-center justify-start max-w-max gap-1 md:gap-3 w-full grid-cols-4 border-[0.5px] `}
          >
            <TabsTrigger
              className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00F0FF] data-[state=active]:to-[#B026FF]"
              value="analytics"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00F0FF] data-[state=active]:to-[#B026FF]"
              value="templates"
            >
              Templates
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00F0FF] data-[state=active]:to-[#B026FF]"
              value="settings"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex flex-wrap gap-3 md:gap-0 justify-between items-center">
              <div>
                <h2 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  Reply Templates
                </h2>
                <p
                  className={`${themeStyles.textSecondary} text-lg font-medium font-montserrat`}
                >
                  Create and manage automated reply templates for this account
                </p>
              </div>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (!open) {
                    setEditingTemplate(null);
                    setSelectedAccountMedia([]);
                    setSelectedMedia(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingTemplate(null);
                      if (account?.instagramId && account?.username) {
                        fetchAccountMedia(
                          account.instagramId,
                          account.username,
                        );
                      }
                    }}
                    className="btn-gradient-cyan hover:opacity-90 hover:shadow-cyan-500 shadow-lg transition-opacity"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className={`sm:max-w-[800px] bg-gradient-to-br border-[#B026FF]/20 hover:border-[#B026FF]/40 backdrop-blur-md border max-h-[95vh] overflow-y-auto ${themeStyles.dialogBg}`}
                >
                  <DialogHeader>
                    <DialogTitle className={themeStyles.textPrimary}>
                      {editingTemplate
                        ? "Edit Template"
                        : "Create New Template"}
                    </DialogTitle>
                    <DialogDescription
                      className={`${themeStyles.textSecondary} font-montserrat text-base font-medium`}
                    >
                      {editingTemplate
                        ? "Update your automated replies and triggers"
                        : "Set up automated replies for specific Instagram posts or reels"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className={themeStyles.textSecondary}
                        >
                          Template Name
                        </Label>
                        {editingTemplate ? (
                          <div
                            className={`px-3 py-2 ${themeStyles.inputBg} ${themeStyles.inputBorder} rounded-md ${themeStyles.textMuted} font-montserrat`}
                          >
                            {editingTemplate.name}
                          </div>
                        ) : (
                          <Input
                            id="name"
                            value={newTemplate.name}
                            onChange={(e) =>
                              setNewTemplate({
                                ...newTemplate,
                                name: e.target.value,
                                accountUsername: account.username,
                              })
                            }
                            placeholder="e.g., Welcome Message"
                            className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText}`}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="account"
                          className={themeStyles.textSecondary}
                        >
                          Account
                        </Label>
                        <div
                          className={`px-3 py-2 ${themeStyles.inputBg} ${themeStyles.inputBorder} rounded-md ${themeStyles.textMuted} font-montserrat`}
                        >
                          {account.username}
                        </div>
                      </div>
                    </div>

                    {/* Media Selection */}
                    {!editingTemplate && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className={themeStyles.textSecondary}>
                            Select Post or Reel
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (account?.instagramId && account?.username) {
                                fetchAccountMedia(
                                  account.instagramId,
                                  account.username,
                                );
                              }
                            }}
                            className="text-cyan-300 border-cyan-300 hover:bg-cyan-300/10"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                          </Button>
                        </div>
                        {isLoadingMedia ? (
                          <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F0FF]"></div>
                          </div>
                        ) : selectedAccountMedia.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-max overflow-y-auto no-scrollbar p-2">
                            {selectedAccountMedia.map((media) => (
                              <div
                                key={media.id}
                                className={`relative cursor-pointer rounded-md overflow-hidden border-2 ${
                                  selectedMedia === media.id
                                    ? "border-[#00F0FF]"
                                    : `${themeStyles.inputBorder}`
                                } transition-all`}
                                onClick={() => {
                                  setSelectedMedia(media.id);
                                  setNewTemplate({
                                    ...newTemplate,
                                    mediaId: media.id,
                                    mediaUrl: media.media_url,
                                  });
                                }}
                              >
                                <Image
                                  src={
                                    media?.media_url
                                      ? media?.media_url
                                      : defaultImg
                                  }
                                  alt="Post"
                                  height={128}
                                  width={128}
                                  className="w-full h-52 object-cover"
                                />

                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs truncate text-white">
                                  {media.caption
                                    ? media.caption.substring(0, 30) +
                                      (media.caption.length > 30 ? "..." : "")
                                    : "No caption"}
                                </div>
                                <div className="absolute top-1 right-1 bg-black/70 text-white rounded-full px-1 text-xs">
                                  {media.media_type === "VIDEO"
                                    ? "Reel"
                                    : "Post"}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className={`text-center py-8 ${themeStyles.textMuted} font-montserrat`}
                          >
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No posts or reels found for this account</p>
                            <p className="text-sm mt-2">
                              Make sure your Instagram account is connected to a
                              RocketReplai.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {/*Multi-Comment Reply Section*/}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className={themeStyles.textSecondary}>
                          reply to their comments under the post
                        </Label>
                        {(!editingTemplate ||
                          (editingTemplate.reply &&
                            editingTemplate.reply.length < 3)) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (editingTemplate) {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  reply: [...(editingTemplate.reply || []), ""],
                                });
                              } else {
                                setNewTemplate({
                                  ...newTemplate,
                                  reply: [...(newTemplate.reply || []), ""],
                                });
                              }
                            }}
                            className="text-cyan-300 border-cyan-300 hover:bg-cyan-300/10"
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add Reply
                          </Button>
                        )}
                      </div>

                      {(editingTemplate
                        ? editingTemplate.reply
                        : newTemplate.reply
                      )?.map((reply: any, index: number) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between">
                            <Label
                              htmlFor={`Dm reply-${index}`}
                              className={themeStyles.textSecondary}
                            >
                              Reply {index + 1}
                            </Label>
                            {(editingTemplate
                              ? editingTemplate.reply
                              : newTemplate.reply
                            )?.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updatedReply = editingTemplate
                                    ? [...editingTemplate.reply]
                                    : [...newTemplate.reply];
                                  updatedReply.splice(index, 1);

                                  if (editingTemplate) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      reply: updatedReply,
                                    });
                                  } else {
                                    setNewTemplate({
                                      ...newTemplate,
                                      reply: updatedReply,
                                    });
                                  }
                                }}
                                className="text-red-500 bg-red-100 hover:bg-red-500/10 h-6 w-6"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            )}
                          </div>

                          <Input
                            id={`reply-${index}`}
                            value={reply}
                            onChange={(e) => {
                              const updatedReply = editingTemplate
                                ? [...editingTemplate.reply]
                                : [...newTemplate.reply];

                              updatedReply[index] = e.target.value;

                              if (editingTemplate) {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  reply: updatedReply,
                                });
                              } else {
                                setNewTemplate({
                                  ...newTemplate,
                                  reply: updatedReply,
                                });
                              }
                            }}
                            placeholder="Eg.Sent you a message! Check it out!"
                            className={` ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Multi-DmReply Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className={themeStyles.textSecondary}>
                          Get reply in Direct Dm{" "}
                        </Label>
                        {(!editingTemplate ||
                          (editingTemplate.content &&
                            editingTemplate.content.length < 3)) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (editingTemplate) {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  content: [
                                    ...(editingTemplate.content || []),
                                    { text: "", link: "" },
                                  ],
                                });
                              } else {
                                setNewTemplate({
                                  ...newTemplate,
                                  content: [
                                    ...(newTemplate.content || []),
                                    { text: "", link: "" },
                                  ],
                                });
                              }
                            }}
                            className="text-cyan-300 border-cyan-300 hover:bg-cyan-300/10"
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add Reply
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="priority"
                          className={themeStyles.textSecondary}
                        >
                          An opening DM
                        </Label>
                        <Textarea
                          id="openDm"
                          value={
                            editingTemplate
                              ? editingTemplate.openDm || ""
                              : newTemplate.openDm || ""
                          }
                          onChange={(e) => {
                            if (editingTemplate) {
                              setEditingTemplate({
                                ...editingTemplate,
                                openDm: e.target.value,
                              });
                            } else {
                              setNewTemplate({
                                ...newTemplate,
                                openDm: e.target.value,
                              });
                            }
                          }}
                          placeholder="Hey there! I'm so happy you're here, thanks so much for your interest 😊 Click below and I'll send you the link in just a sec ✨"
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                        />
                      </div>
                      {(editingTemplate
                        ? editingTemplate.content
                        : newTemplate.content
                      )?.map((contentItem: ContentItem, index: number) => (
                        <div
                          key={index}
                          className={`space-y-2 p-3 border ${themeStyles.inputBorder} rounded-lg`}
                        >
                          <div className="flex justify-between">
                            <Label
                              htmlFor={`content-${index}`}
                              className={themeStyles.textSecondary}
                            >
                              Sent Dm {index + 1}
                            </Label>
                            {(editingTemplate
                              ? editingTemplate.content
                              : newTemplate.content
                            )?.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updatedContent = editingTemplate
                                    ? [...editingTemplate.content]
                                    : [...newTemplate.content];
                                  updatedContent.splice(index, 1);

                                  if (editingTemplate) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      content: updatedContent,
                                    });
                                  } else {
                                    setNewTemplate({
                                      ...newTemplate,
                                      content: updatedContent,
                                    });
                                  }
                                }}
                                className="text-red-500 bg-red-100 hover:bg-red-500/10 h-6 w-6"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            )}
                          </div>

                          <Textarea
                            id={`content-text-${index}`}
                            value={contentItem.text}
                            onChange={(e) => {
                              const updatedContent = editingTemplate
                                ? [...editingTemplate.content]
                                : [...newTemplate.content];

                              updatedContent[index] = {
                                ...updatedContent[index],
                                text: e.target.value,
                              };

                              if (editingTemplate) {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  content: updatedContent,
                                });
                              } else {
                                setNewTemplate({
                                  ...newTemplate,
                                  content: updatedContent,
                                });
                              }
                            }}
                            placeholder="This Is the link you want,Click the button below."
                            className={`min-h-[80px] ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                          />

                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-gray-400" />
                            <Input
                              id={`content-link-${index}`}
                              value={contentItem.link || ""}
                              onChange={(e) => {
                                const updatedContent = editingTemplate
                                  ? [...editingTemplate.content]
                                  : [...newTemplate.content];

                                updatedContent[index] = {
                                  ...updatedContent[index],
                                  link: e.target.value,
                                };

                                if (editingTemplate) {
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    content: updatedContent,
                                  });
                                } else {
                                  setNewTemplate({
                                    ...newTemplate,
                                    content: updatedContent,
                                  });
                                }
                              }}
                              placeholder="Eg.www.productLink.com"
                              className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className={` flex items-center justify-between gap-8 p-3 border rounded-md ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                    >
                      <p> a DM asking to follow you before they get the link</p>
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`px-2 py-1 rounded-sm text-xs ${
                            canFollow
                              ? "bg-blue-700 text-white"
                              : "bg-gray-300 text-gray-600"
                          }`}
                        >
                          {canFollow ? "Available" : "Pro Feature"}
                        </div>
                        <Switch
                          disabled={!canFollow}
                          checked={
                            editingTemplate
                              ? editingTemplate.isFollow
                              : newTemplate.isFollow
                          }
                          onCheckedChange={() => {
                            if (editingTemplate) {
                              setEditingTemplate({
                                ...editingTemplate,
                                isFollow: !editingTemplate.isFollow,
                              });
                            } else {
                              setNewTemplate({
                                ...newTemplate,
                                isFollow: !newTemplate.isFollow,
                              });
                            }
                          }}
                          className="self-start  data-[state=checked]:bg-[#00F0FF]"
                        />
                      </div>
                    </div>
                    {/* Triggers Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label
                          htmlFor="triggers"
                          className={themeStyles.textSecondary}
                        >
                          Set triggers (up to 3)
                        </Label>
                        {(!editingTemplate ||
                          (editingTemplate.triggers &&
                            editingTemplate.triggers.length < 3)) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (editingTemplate) {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  triggers: [
                                    ...(editingTemplate.triggers || []),
                                    "",
                                  ],
                                });
                              } else {
                                setNewTemplate({
                                  ...newTemplate,
                                  triggers: [
                                    ...(newTemplate.triggers || []),
                                    "",
                                  ],
                                });
                              }
                            }}
                            className="text-cyan-300 border-cyan-300 hover:bg-cyan-300/10"
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add Trigger
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-start gap-5 w-full">
                        {(editingTemplate
                          ? editingTemplate.triggers
                          : newTemplate.triggers
                        )?.map((trigger: any, index: number) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between">
                              <Label
                                htmlFor={`trigger-${index}`}
                                className={themeStyles.textSecondary}
                              >
                                Trigger {index + 1}
                              </Label>
                              {(editingTemplate
                                ? editingTemplate.triggers
                                : newTemplate.triggers
                              )?.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const updatedTriggers = editingTemplate
                                      ? [...editingTemplate.triggers]
                                      : [...newTemplate.triggers];
                                    updatedTriggers.splice(index, 1);

                                    if (editingTemplate) {
                                      setEditingTemplate({
                                        ...editingTemplate,
                                        triggers: updatedTriggers,
                                      });
                                    } else {
                                      setNewTemplate({
                                        ...newTemplate,
                                        triggers: updatedTriggers,
                                      });
                                    }
                                  }}
                                  className="text-red-500 bg-red-100 hover:bg-red-500/10 h-6 w-6"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              )}
                            </div>

                            <Input
                              id={`trigger-${index}`}
                              value={trigger}
                              onChange={(e) => {
                                const updatedTriggers = editingTemplate
                                  ? [...editingTemplate.triggers]
                                  : [...newTemplate.triggers];

                                updatedTriggers[index] = e.target.value;

                                if (editingTemplate) {
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    triggers: updatedTriggers,
                                  });
                                } else {
                                  setNewTemplate({
                                    ...newTemplate,
                                    triggers: updatedTriggers,
                                  });
                                }
                              }}
                              placeholder="Enter trigger keyword Like Link,Product,etc."
                              className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="priority"
                        className={themeStyles.textSecondary}
                      >
                        Priority (1-10)
                      </Label>
                      <Input
                        id="priority"
                        type="number"
                        min="1"
                        max="10"
                        value={
                          editingTemplate
                            ? editingTemplate.priority || 5
                            : newTemplate.priority || 5
                        }
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (editingTemplate) {
                            setEditingTemplate({
                              ...editingTemplate,
                              priority: isNaN(value)
                                ? 5
                                : Math.min(Math.max(value, 1), 10),
                            });
                          } else {
                            setNewTemplate({
                              ...newTemplate,
                              priority: isNaN(value)
                                ? 5
                                : Math.min(Math.max(value, 1), 10),
                            });
                          }
                        }}
                        className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingTemplate(null);
                        setSelectedAccountMedia([]);
                        setSelectedMedia(null);
                      }}
                      className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText}`}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        editingTemplate
                          ? handleUpdateTemplate(editingTemplate)
                          : handleCreateTemplate()
                      }
                      className="btn-gradient-cyan"
                      disabled={
                        isTemplateCreating ||
                        isUpdateTemplate ||
                        (editingTemplate
                          ? !editingTemplate.name ||
                            !editingTemplate.accountUsername ||
                            !editingTemplate.mediaId ||
                            editingTemplate.reply.length === 0 ||
                            editingTemplate.reply.some(
                              (r: any) => r.trim() === "",
                            ) ||
                            editingTemplate.triggers.length === 0 ||
                            editingTemplate.triggers.some(
                              (t: any) => t.trim() === "",
                            ) ||
                            editingTemplate.content.length === 0 ||
                            editingTemplate.content.some(
                              (c: ContentItem) =>
                                c.text.trim() === "" || c.link!.trim() === "",
                            )
                          : !newTemplate.name ||
                            !newTemplate.mediaId ||
                            !newTemplate.accountUsername ||
                            newTemplate.reply.length === 0 ||
                            newTemplate.reply.some((r) => r.trim() === "") ||
                            newTemplate.triggers.length === 0 ||
                            newTemplate.triggers.some((t) => t.trim() === "") ||
                            newTemplate.content.length === 0 ||
                            newTemplate.content.some(
                              (c: ContentItem) =>
                                c.text.trim() === "" || c.link!.trim() === "",
                            ))
                      }
                    >
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates, content, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText}`}
                />
              </div>
            </div>

            {/* Templates Count */}
            <div className="mb-6">
              <p className={themeStyles.textMuted}>
                Showing {templates.length} of {totalTemplates} templates
              </p>
            </div>
            <div className="grid gap-6">
              {filteredTemplates.map((template: any) => (
                <Card
                  key={template._id}
                  className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-br ${
                    template.isActive
                      ? "from-[#B026FF]/20 to-[#B026FF]/5 border-[#B026FF]/20 hover:border-[#B026FF]/40"
                      : "from-[#00F0FF]/10 to-[#00F0FF]/5 border-[#00F0FF]/20 hover:border-[#00F0FF]/40"
                  } ${themeStyles.cardBg} backdrop-blur-sm ${
                    themeStyles.cardBorder
                  }`}
                >
                  <CardHeader className="p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle
                            className={`text-base font-normal ${themeStyles.textPrimary}`}
                          >
                            {template.name}
                          </CardTitle>
                          {template.mediaType && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30">
                              {template.mediaType === "VIDEO" ? "Reel" : "Post"}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                          >
                            Priority {template.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={() => {
                            handleToggleTemplate(template._id);
                          }}
                          className="data-[state=checked]:bg-[#00F0FF]"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${themeStyles.textMuted} hover:${themeStyles.textPrimary}`}
                          onClick={() => handleEditClick(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#FF2E9F] hover:text-[#FF2E9F]/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            className={`${themeStyles.dialogBg} ${themeStyles.inputBorder}`}
                          >
                            <AlertDialogHeader>
                              <AlertDialogTitle
                                className={themeStyles.textPrimary}
                              >
                                Delete Template
                              </AlertDialogTitle>
                              <AlertDialogDescription
                                className={themeStyles.textSecondary}
                              >
                                Are you sure you want to delete {template.name}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                className={`${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteTemplate(template._id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col items-start p-2 w-full">
                    <div className="flex flex-col md:flex-row-reverse items-start justify-between gap-3 w-full">
                      {template.mediaUrl && (
                        <div className="w-full flex-1">
                          <p
                            className={`text-sm ${themeStyles.textMuted} mb-2`}
                          >
                            Linked Media:
                          </p>
                          <div
                            className={`relative w-40 h-40 rounded-md overflow-hidden border ${themeStyles.inputBorder} mb-2`}
                          >
                            <Image
                              src={template?.mediaUrl || defaultImg}
                              alt="Linked media"
                              height={160}
                              width={160}
                              className="w-full h-full object-cover"
                            />
                            {template.mediaType === "VIDEO" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <VideoIcon className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${themeStyles.textMuted} mb-2`}>
                          reply to their comments:
                        </p>
                        <div className="flex flex-wrap items-center justify-start w-full gap-2">
                          {template.reply.map((reply: any, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className={`${themeStyles.inputBg} p-3 rounded-md ${themeStyles.textMuted} text-wrap text-base font-light font-montserrat`}
                            >
                              {reply}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="w-full">
                          <p
                            className={`text-sm ${themeStyles.textMuted} mb-2`}
                          >
                            An opening DM
                          </p>
                          <div className="flex flex-col gap-2">
                            <Badge
                              variant="outline"
                              className={`flex flex-col items-start justify-center ${themeStyles.textMuted} ${themeStyles.inputBg} p-3 rounded-md mb-1`}
                            >
                              <p className="text-base font-light font-montserrat">
                                {template.openDm}
                              </p>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="w-full">
                          <p
                            className={`text-sm ${themeStyles.textMuted} mb-2`}
                          >
                            Reply send in Dm:
                          </p>
                          <div className="flex flex-col gap-2">
                            {template.content.map(
                              (contentItem: ContentItem, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className={`flex flex-col items-start justify-center ${themeStyles.textMuted} ${themeStyles.inputBg} p-3 rounded-md mb-1`}
                                >
                                  <p className="text-base font-light font-montserrat">
                                    {contentItem.text}
                                  </p>

                                  {contentItem.link && (
                                    <div className="flex items-center gap-1 text-xs text-blue-400">
                                      <LinkIcon className="h-3 w-3" />
                                      <a
                                        href={contentItem.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline truncate"
                                      >
                                        {contentItem.link.length > 30
                                          ? contentItem.link.slice(0, 30) +
                                            "..."
                                          : contentItem.link}
                                      </a>
                                    </div>
                                  )}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="pb-2 w-full">
                          <p
                            className={`text-sm ${themeStyles.textMuted} mb-2`}
                          >
                            Trigger Keywords:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.triggers.map(
                              (trigger: any, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className={`text-base font-light font-montserrat ${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                                >
                                  {trigger}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="pb-2 w-full">
                          <p
                            className={`text-sm ${themeStyles.textMuted} mb-2`}
                          >
                            Content For:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.isFollow ? (
                              <Badge
                                variant="outline"
                                className={`text-base font-light font-montserrat ${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                              >
                                Followers Only
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className={`text-base font-light font-montserrat ${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                              >
                                Everyone
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 w-full">
                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {template?.usageCount || 0} uses
                        </div>
                        <div>
                          Last used: {formatLastUsed(template.lastUsed) || 1}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More Button */}
              {hasMoreTemplates && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={loadMoreTemplates}
                    disabled={isLoadingMore}
                    className="btn-gradient-cyan px-8 py-3"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Load More ({totalTemplates - templates.length} more)
                      </div>
                    )}
                  </Button>
                </div>
              )}

              {templates.length === 0 && (
                <Card
                  className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                >
                  <CardContent className="text-center py-12">
                    <div
                      className={`mx-auto w-24 h-24 ${
                        theme === "dark" ? "bg-white/5" : "bg-gray-100"
                      } rounded-full flex items-center justify-center mb-4`}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3
                      className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}
                    >
                      No templates yet
                    </h3>
                    <p className={`${themeStyles.textMuted} mb-4`}>
                      Create your first reply template to start automating
                      responses
                    </p>
                    <Button
                      onClick={() => {
                        setIsCreateDialogOpen(true);
                        if (account?.instagramId && account?.username) {
                          fetchAccountMedia(
                            account.instagramId,
                            account.username,
                          );
                        }
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card
              className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-[#3a8477]/10 to-[#1f918b]/5 border-[#177474]/15 hover:bg-[#177474]/10 ${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
            >
              <CardHeader className="p-3">
                <CardTitle className={themeStyles.textPrimary}>
                  Performance Analytics
                </CardTitle>
                <CardDescription
                  className={`font-montserrat text-base ${themeStyles.textSecondary}`}
                >
                  Track the performance of your auto-replies for this account
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card
                    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle
                        className={`text-sm font-medium ${themeStyles.textSecondary}`}
                      >
                        Templates
                      </CardTitle>
                      <MessageSquare className="h-4 w-4 text-[#00F0FF]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-[#FF2E9F]">
                        {account.templatesCount || 0}
                      </div>
                      <p
                        className={`text-xs ${themeStyles.textMuted} font-montserrat`}
                      >
                        Active reply templates
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle
                        className={`text-sm font-medium ${themeStyles.textSecondary}`}
                      >
                        Replies Sent
                      </CardTitle>
                      <Zap className="h-4 w-4 text-[#B026FF]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {account.accountReply || 0}
                      </div>
                      <p
                        className={`text-xs ${themeStyles.textMuted} font-montserrat`}
                      >
                        Total automated replies
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle
                        className={`text-sm font-medium ${themeStyles.textSecondary}`}
                      >
                        Response Time
                      </CardTitle>
                      <BarChart3 className="h-4 w-4 text-[#FF2E9F]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {account?.avgResponseTime
                          ? formatResponseTimeSmart(account.avgResponseTime)
                          : 0}{" "}
                      </div>
                      <p
                        className={`text-xs ${themeStyles.textMuted} font-montserrat`}
                      >
                        Average response time
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle
                        className={`text-sm font-medium ${themeStyles.textSecondary}`}
                      >
                        Engagement
                      </CardTitle>
                      <Users className="h-4 w-4 text-[#00F0FF]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {account.engagementRate || 0}%
                      </div>
                      <p
                        className={`text-xs ${themeStyles.textMuted} font-montserrat`}
                      >
                        Engagement rate
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Rate Limit and API Usage */}
                {rateLimitStats && (
                  <div className="mb-8">
                    <h3
                      className={`text-xl font-bold mb-4 ${themeStyles.textPrimary}`}
                    >
                      <Activity className="inline mr-2 h-5 w-5" />
                      Rate Limit & API Usage
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card
                        className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                      >
                        <CardHeader>
                          <CardTitle
                            className={`text-lg ${themeStyles.textPrimary}`}
                          >
                            <Shield className="inline mr-2 h-5 w-5" />
                            Rate Limit Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent>{renderRateLimitProgress()}</CardContent>
                      </Card>

                      <Card
                        className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                      >
                        <CardHeader>
                          <CardTitle
                            className={`text-lg ${themeStyles.textPrimary}`}
                          >
                            <Cpu className="inline mr-2 h-5 w-5" />
                            Meta API Usage
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className={themeStyles.textSecondary}>
                                  Calls this hour
                                </span>
                                <span className={themeStyles.textMuted}>
                                  {account.metaCallsThisHour || 0}/200
                                </span>
                              </div>
                              <Progress
                                value={metaCallsPercentage}
                                className={`h-2 ${
                                  metaCallsPercentage >= 90
                                    ? "bg-red-900/20"
                                    : metaCallsPercentage >= 70
                                      ? "bg-yellow-900/20"
                                      : "bg-green-900/20"
                                }`}
                              />
                            </div>

                            {accountUsage && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className={themeStyles.textSecondary}>
                                    Account-specific usage
                                  </span>
                                  <span className={themeStyles.textMuted}>
                                    {accountUsage.callsMade || 0}/
                                    {account.tier === "pro"
                                      ? "∞"
                                      : TIER_LIMITS.free}
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    account.tier === "pro"
                                      ? 0
                                      : ((accountUsage.callsMade || 0) /
                                          TIER_LIMITS.free) *
                                        100
                                  }
                                  className={`h-2 ${
                                    account.tier === "pro"
                                      ? "bg-green-900/20"
                                      : ((accountUsage.callsMade || 0) /
                                            TIER_LIMITS.free) *
                                            100 >=
                                          90
                                        ? "bg-red-900/20"
                                        : ((accountUsage.callsMade || 0) /
                                              TIER_LIMITS.free) *
                                              100 >=
                                            70
                                          ? "bg-yellow-900/20"
                                          : "bg-green-900/20"
                                  }`}
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Account Management */}
                <div className="grid lg:grid-cols-2 gap-8 mb-8">
                  <Card
                    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                  >
                    <CardHeader className="p-3">
                      <CardTitle
                        className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
                      >
                        <Settings className="h-5 w-5 text-[#00F0FF]" />
                        Account Settings
                      </CardTitle>
                      <CardDescription
                        className={`${themeStyles.textSecondary} font-montserrat text-base`}
                      >
                        Manage your Instagram account settings and automation
                        preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4
                            className={`font-medium ${themeStyles.textPrimary}`}
                          >
                            Auto-Reply System
                          </h4>
                          <p
                            className={`text-base ${themeStyles.textSecondary} font-montserrat`}
                          >
                            Automatically respond to comments using templates
                          </p>
                        </div>
                        <Switch
                          checked={account.isActive}
                          onCheckedChange={handleToggleAccount}
                          className="data-[state=checked]:bg-[#00F0FF]"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={themeStyles.textSecondary}>
                            Template Usage
                          </span>
                          <span className={themeStyles.textMuted}>
                            {account.templatesCount || 0} templates
                          </span>
                        </div>
                        <Progress
                          value={(account.templatesCount / 20) * 100}
                          className="h-2 bg-white/10"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={themeStyles.textSecondary}>
                            Response Time
                          </span>
                          <span className={themeStyles.textMuted}>
                            {account?.avgResponseTime
                              ? formatResponseTimeSmart(account.avgResponseTime)
                              : "0s"}
                          </span>
                        </div>
                        <Progress value={85} className="h-2 bg-white/10" />
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className={themeStyles.textSecondary}>
                            Last Activity
                          </span>
                          <span className={themeStyles.textMuted}>
                            {formatLastActivity(account.lastActivity) ||
                              "Never"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span className={themeStyles.textSecondary}>
                            Account Created
                          </span>
                          <span className={themeStyles.textMuted}>
                            {formatLastActivity(account.createdAt)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`card-hover ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
                  >
                    <CardHeader className="p-3">
                      <CardTitle
                        className={`flex items-center gap-2 ${themeStyles.textPrimary}`}
                      >
                        <BarChart3 className="h-5 w-5 text-[#B026FF]" />
                        Performance Metrics
                      </CardTitle>
                      <CardDescription
                        className={`${themeStyles.textSecondary} font-montserrat text-base`}
                      >
                        Track your accounts automation performance and
                        engagement
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`text-center p-4 ${themeStyles.inputBg} rounded-lg`}
                        >
                          <div className="text-2xl font-bold text-[#00F0FF] mb-1">
                            {account.templatesCount || 0}
                          </div>
                          <div className={`text-xs ${themeStyles.textMuted}`}>
                            Active Templates
                          </div>
                        </div>
                        <div
                          className={`text-center p-4 ${themeStyles.inputBg} rounded-lg`}
                        >
                          <div className="text-2xl font-bold text-[#B026FF] mb-1">
                            {account.accountReply || 0}
                          </div>
                          <div className={`text-xs ${themeStyles.textMuted}`}>
                            Total Replies
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className={themeStyles.textSecondary}>
                              Success Rate
                            </span>
                            <span className={themeStyles.textMuted}>
                              {account.successRate || 0}%
                            </span>
                          </div>
                          <Progress
                            value={account.successRate || 0}
                            className="h-2 bg-white/10"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className={themeStyles.textSecondary}>
                              Engagement Rate
                            </span>
                            <span className={themeStyles.textMuted}>
                              {account.engagementRate || 0}%
                            </span>
                          </div>
                          <Progress
                            value={account.engagementRate || 0}
                            className="h-2 bg-white/10"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h4
                          className={`font-medium mb-3 ${themeStyles.textPrimary}`}
                        >
                          Quick Actions
                        </h4>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full sm:w-1/2 bg-[#FF2E9F]/40 hover:bg-[#FF2E9F]/50 ${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                            onClick={() => setIsCreateDialogOpen(true)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Create Template
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full sm:w-1/2 bg-[#B026FF]/40 ${themeStyles.inputBorder} ${themeStyles.textMuted} hover:bg-[#B026FF]/50`}
                            onClick={() => refresh()}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Data
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card
              className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-[#d61a1a]/10 to-[#d61a1a]/5 border-[#d61a1a]/15 hover:bg-[#d61a1a]/10 ${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
            >
              <CardHeader className="p-3">
                <CardTitle className={themeStyles.textPrimary}>
                  Account Settings
                </CardTitle>
                <CardDescription
                  className={`font-montserrat text-base ${themeStyles.textSecondary}`}
                >
                  Configure how auto-replies work for this Instagram account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={themeStyles.textPrimary}>
                      Enable Auto-Replies
                    </Label>
                    <p
                      className={`text-base ${themeStyles.textSecondary} font-montserrat`}
                    >
                      Turn on/off automated replies for this account
                    </p>
                  </div>
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={handleToggleAccount}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={themeStyles.textPrimary}>
                      Auto DM Replies
                    </Label>
                    <p
                      className={`text-base ${themeStyles.textSecondary} font-montserrat`}
                    >
                      Send automated DMs to commenters
                    </p>
                  </div>
                  <Switch
                    checked={account.autoDMEnabled}
                    onCheckedChange={async () => {
                      try {
                        await updateAccountSettings(
                          apiRequest,
                          account?.instagramId,
                          {
                            autoDMEnabled: !account.autoDMEnabled,
                          },
                        );
                        setAccount({
                          ...account,
                          autoDMEnabled: !account.autoDMEnabled,
                        });
                        toast({
                          title: "Settings updated",
                          description: "Auto DM replies updated successfully",
                          duration: 3000,
                          variant: "default",
                        });
                      } catch (error) {
                        console.error(
                          "Error updating auto DM settings:",
                          error,
                        );
                        toast({
                          title: "Failed to update settings",
                          description: "Please try again",
                          duration: 3000,
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={themeStyles.textPrimary}>
                      Follow Verification
                    </Label>
                    <p
                      className={`text-base ${themeStyles.textSecondary} font-montserrat`}
                    >
                      Verify if users follow before sending links
                    </p>
                  </div>
                  <Switch
                    checked={account.followCheckEnabled}
                    onCheckedChange={async () => {
                      try {
                        // await updateInstaAccount(account.instagramId, {
                        //   followCheckEnabled: !account.followCheckEnabled,
                        // });
                        await updateAccountSettings(
                          apiRequest,
                          account.instagramId,
                          {
                            followCheckEnabled: !account.followCheckEnabled,
                          },
                        );
                        setAccount({
                          ...account,
                          followCheckEnabled: !account.followCheckEnabled,
                        });
                        toast({
                          title: "Settings updated",
                          description:
                            "Follow verification updated successfully",
                          duration: 3000,
                          variant: "default",
                        });
                      } catch (error) {
                        console.error(
                          "Error updating follow check settings:",
                          error,
                        );
                        toast({
                          title: "Failed to update settings",
                          description: "Please try again",
                          duration: 3000,
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="pt-4 border-t border-dashed">
                  <div className="flex flex-col space-y-4">
                    <Label className="text-destructive">Danger Zone</Label>
                    <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
                      <div className="flex items-center justify-center gap-3">
                        <p className="font-medium">Delete Account</p>
                        <p
                          className={`text-base ${themeStyles.textSecondary} font-montserrat`}
                        >
                          Permanently delete this Instagram account
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent
            className={`${themeStyles.alertBg} backdrop-blur-md`}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className={themeStyles.textPrimary}>
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription
                className={`font-montserrat ${themeStyles.textSecondary}`}
              >
                This action cannot be undone. This will permanently delete the
                Instagram account data from our database and all associated
                templates.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
