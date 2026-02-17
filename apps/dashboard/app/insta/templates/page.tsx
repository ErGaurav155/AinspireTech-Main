"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  MessageSquare,
  Edit2,
  Trash2,
  BarChart3,
  Search,
  Filter,
  Instagram,
  X,
  ImageIcon,
  VideoIcon,
  RefreshCw,
  Link as LinkIcon,
  ChevronDown,
  Settings,
  Clock,
  Zap,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rocketreplai/ui/components/radix/dialog";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Label } from "@rocketreplai/ui/components/radix/label";
import { Input } from "@rocketreplai/ui/components/radix/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rocketreplai/ui/components/radix/select";
import { Textarea } from "@rocketreplai/ui/components/radix/textarea";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@rocketreplai/ui/components/radix/card";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
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
  createInstaTemplate,
  deleteTemplate,
  getAllInstagramAccounts,
  getInstaMedia,
  getInstaTemplates,
  getSubscriptioninfo,
  updateTemplate,
  getUserTier,
  getUserTierInfo,
} from "@/lib/services/insta-actions.api";

interface AccountDataType {
  instagramId: string;
  username: string;
  isActive: boolean;
  autoReplyEnabled?: boolean;
}

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

  // New fields based on updated models
  settingsByTier?: {
    free: {
      requireFollow: boolean;
      skipFollowCheck: boolean;
      directLink: boolean;
    };
    pro: {
      requireFollow: boolean;
      useAdvancedFlow: boolean;
      maxRetries: number;
    };
  };
}

interface UserTierInfo {
  tier: "free" | "pro";
  tierLimit: number;
  callsMade: number;
  remainingCalls: number;
  usagePercentage: number;
  nextReset: Date;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateType[]>([]);
  const [loadMoreCount, setLoadMoreCount] = useState(0);
  const [hasMoreTemplates, setHasMoreTemplates] = useState(false);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingTemplate, setEditingTemplate] = useState<TemplateType | null>(
    null,
  );
  const [accounts, setAccounts] = useState<AccountDataType[]>([]);
  const [selectedAccountMedia, setSelectedAccountMedia] = useState<MediaItem[]>(
    [],
  );
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isTemplateCreating, setIsTemplateCreating] = useState(false);
  const [isUpdateTemplate, setIsUpdateTemplate] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userTier, setUserTier] = useState<UserTierInfo | null>(null);
  const [advancedSettings, setAdvancedSettings] = useState({
    free: {
      requireFollow: false,
      skipFollowCheck: true,
      directLink: true,
    },
    pro: {
      requireFollow: true,
      useAdvancedFlow: true,
      maxRetries: 3,
    },
  });

  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const loadMoreCountRef = useRef(0);
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
      badgeBg: isDark ? "bg-[#0a0a0a]" : "bg-white",
      alertBg: isDark ? "bg-[#6d1717]/5" : "bg-red-50/80",
      buttonOutlineBorder: isDark ? "border-white/20" : "border-gray-300",
      buttonOutlineText: isDark ? "text-gray-300" : "text-n-6",
      dialogBg: isDark ? "bg-[#0a0a0a]/95" : "bg-white/95",
      inputBg: isDark ? "bg-white/5" : "bg-white",
      inputBorder: isDark ? "border-white/20" : "border-gray-300",
      inputText: isDark ? "text-white" : "text-n-5",
    };
  }, [currentTheme]);

  // Template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: [
      {
        text: "Thanks for your interest! Click below to get instant access.",
        link: "",
        buttonTitle: "Get Access",
      },
    ] as ContentItem[],
    reply: [
      "Thanks! Please check your DMs for the link.",
      "Awesome! I've sent you the details in DMs.",
      "Perfect! Check your messages for the access link.",
    ],
    triggers: ["", "", ""],
    isFollow: false,
    priority: 5,
    accountUsername: "",
    mediaId: "",
    mediaUrl: "",
    delaySeconds: 0,
  });

  // Fetch user tier info
  const fetchUserTier = useCallback(async () => {
    if (!userId) return;

    try {
      const tierInfo = await getUserTierInfo(apiRequest);
      setUserTier(tierInfo);
    } catch (error) {
      console.error("Error fetching user tier:", error);
    }
  }, [userId, apiRequest]);

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!isLoaded) return;
      if (!userId) {
        router.push("/sign-in");
        return;
      }
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
        } else {
          setAccounts([]);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setAccounts([]);
        toast({
          title: "Network error",
          description: "Could not connect to server",
          duration: 3000,
          variant: "destructive",
        });
      }
    };
    fetchAccounts();
  }, [router, userId, isLoaded, apiRequest]);

  // Fetch templates
  const fetchTemplates = useCallback(
    async (reset = false) => {
      if (!userId) return;

      if (reset) {
        loadMoreCountRef.current = 0;
        setLoadMoreCount(0);
      }

      setIsLoading(true);
      try {
        const response = await getInstaTemplates(apiRequest, {
          filterAccount: filterAccount,
          filterStatus: filterStatus,
          loadMoreCount: loadMoreCountRef.current,
        });

        if (response.templates && response.templates.length > 0) {
          const formattedTemplates = response.templates.map(
            (template: any) => ({
              ...template,
              content: template.content || [{ text: "", link: "" }],
              reply: template.reply || [],
              triggers: template.triggers || [],
              lastUsed: template.lastUsed
                ? new Date(template.lastUsed).toISOString()
                : new Date().toISOString(),
              successRate: template.successRate || 0,
              delaySeconds: template.delaySeconds || 0,
              settingsByTier: template.settingsByTier || {
                free: {
                  requireFollow: false,
                  skipFollowCheck: true,
                  directLink: true,
                },
                pro: {
                  requireFollow: true,
                  useAdvancedFlow: true,
                  maxRetries: 3,
                },
              },
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
        toast({
          title: "Failed to load templates",
          description: "Please try again",
          duration: 3000,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [filterAccount, filterStatus, userId, apiRequest],
  );

  // Load initial templates and user tier info
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch user tier info
        await fetchUserTier();

        // Fetch templates
        await fetchTemplates(true);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Failed to load data",
          description: "Please refresh the page",
          duration: 3000,
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [userId, fetchTemplates, fetchUserTier]);

  // Reload templates when filters change
  useEffect(() => {
    if (userId) {
      fetchTemplates(true);
    }
  }, [filterAccount, filterStatus, fetchTemplates, userId]);

  // Load more templates
  const loadMoreTemplates = useCallback(async () => {
    if (!userId || !hasMoreTemplates || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextLoadCount = loadMoreCountRef.current + 1;

    try {
      loadMoreCountRef.current = nextLoadCount;
      await fetchTemplates(false);
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
  }, [userId, hasMoreTemplates, isLoadingMore, fetchTemplates]);

  // Fetch account media
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
      } catch (error) {
        console.error("Error fetching media:", error);
        setSelectedAccountMedia([]);
        toast({
          title: "Failed to fetch media",
          description:
            error instanceof Error ? error.message : "Please try again later",
          duration: 3000,
          variant: "destructive",
        });
      } finally {
        setIsLoadingMedia(false);
      }
    },
    [userId, apiRequest],
  );

  // Handle account change
  const handleAccountChange = useCallback(
    (username: string) => {
      setNewTemplate((prev) => ({
        ...prev,
        accountUsername: username,
        mediaId: "",
        mediaUrl: "",
      }));
      setSelectedMedia(null);

      const account = accounts.find((acc) => acc.username === username);
      if (account && account.instagramId && account.isActive) {
        fetchAccountMedia(account.instagramId, username);
      } else {
        setSelectedAccountMedia([]);
        if (account && !account.isActive) {
          toast({
            title: "Account inactive",
            description: "This Instagram account is not active",
            duration: 3000,
            variant: "destructive",
          });
        }
      }
    },
    [accounts, fetchAccountMedia],
  );

  // Handle edit click
  const handleEditClick = useCallback(
    (template: TemplateType) => {
      setEditingTemplate(template);
      setIsCreateDialogOpen(true);

      // Set advanced settings from template
      if (template.settingsByTier) {
        setAdvancedSettings(template.settingsByTier);
      }

      // Fetch media for the account
      const account = accounts.find(
        (acc) => acc.username === template.accountUsername,
      );
      if (account && account.instagramId) {
        fetchAccountMedia(account.instagramId, account.username);
        setSelectedMedia(template.mediaId || null);
      }

      // Update newTemplate with editing template data
      setNewTemplate({
        name: template.name,
        content: template.content,
        reply: template.reply,
        triggers: template.triggers,
        isFollow: template.isFollow,
        priority: template.priority,
        accountUsername: template.accountUsername,
        mediaId: template.mediaId,
        mediaUrl: template.mediaUrl || "",
        delaySeconds: template.delaySeconds || 0,
      });
    },
    [accounts, fetchAccountMedia],
  );

  // Handle update template
  const handleUpdateTemplate = useCallback(
    async (template: TemplateType) => {
      if (!template?._id) return;

      setIsUpdateTemplate(true);
      try {
        const templateId = template._id;
        const updated = await updateTemplate(apiRequest, templateId, {
          ...template,
          isFollow: template.isFollow,
          settingsByTier: advancedSettings,
          delaySeconds: newTemplate.delaySeconds,
        });
        setTemplates((prev) =>
          prev.map((t) =>
            t._id === updated._id
              ? {
                  ...updated,
                  settingsByTier: advancedSettings,
                  delaySeconds: newTemplate.delaySeconds,
                }
              : t,
          ),
        );
        setIsCreateDialogOpen(false);
        setEditingTemplate(null);
        setAdvancedSettings({
          free: {
            requireFollow: false,
            skipFollowCheck: true,
            directLink: true,
          },
          pro: {
            requireFollow: true,
            useAdvancedFlow: true,
            maxRetries: 3,
          },
        });
        toast({
          title: "Template updated successfully",
          duration: 3000,
          variant: "default",
        });
      } catch (error) {
        console.error("Error updating template:", error);
        toast({
          title: "Failed to update template",
          description:
            error instanceof Error ? error.message : "Please try again",
          duration: 3000,
          variant: "destructive",
        });
      } finally {
        setIsUpdateTemplate(false);
      }
    },
    [advancedSettings, newTemplate.delaySeconds, apiRequest],
  );

  // Handle toggle template
  const handleToggleTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t._id === templateId);
      if (!template) return;

      const newActiveState = !template.isActive;

      // Optimistically update UI
      setTemplates((prev) =>
        prev.map((t) =>
          t._id === templateId ? { ...t, isActive: newActiveState } : t,
        ),
      );

      try {
        await updateTemplate(apiRequest, templateId, {
          ...template,
          isActive: newActiveState,
        });
        toast({
          title: "Template updated",
          description: `Template ${newActiveState ? "activated" : "deactivated"}`,
          duration: 3000,
          variant: "default",
        });
      } catch (error) {
        // Revert on error
        setTemplates((prev) =>
          prev.map((t) =>
            t._id === templateId ? { ...t, isActive: !newActiveState } : t,
          ),
        );
        console.error("Error updating template:", error);
        toast({
          title: "Failed to update template",
          description: "Please try again",
          duration: 3000,
          variant: "destructive",
        });
      }
    },
    [templates, apiRequest],
  );

  // Handle delete template
  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await deleteTemplate(apiRequest, templateId);

        // Remove from state
        setTemplates((prev) => prev.filter((t) => t._id !== templateId));
        setTotalTemplates((prev) => prev - 1);

        toast({
          title: "Template deleted",
          description: "Template has been removed",
          duration: 3000,
          variant: "default",
        });
      } catch (error) {
        console.error("Error deleting template:", error);
        toast({
          title: "Failed to delete template",
          description:
            error instanceof Error ? error.message : "Please try again",
          duration: 3000,
          variant: "destructive",
        });
      }
    },
    [apiRequest],
  );

  // Handle create template
  const handleCreateTemplate = useCallback(async () => {
    if (!userId) return;

    setIsTemplateCreating(true);
    try {
      const selectedAccount = accounts.find(
        (acc) => acc.username === newTemplate.accountUsername,
      );
      if (!selectedAccount) {
        toast({
          title: "Account not found",
          description: "Please select a valid Instagram account",
          duration: 3000,
          variant: "destructive",
        });
        return;
      }

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
        selectedAccount.instagramId,
        selectedAccount.username,
        {
          ...newTemplate,
          settingsByTier: advancedSettings,
          isFollow: newTemplate.isFollow,
        },
      );

      // Add new template to state
      const newTemplateWithSettings = {
        ...result.template,
        settingsByTier: advancedSettings,
        delaySeconds: newTemplate.delaySeconds,
      };
      setTemplates((prev) => [newTemplateWithSettings, ...prev]);
      setTotalTemplates((prev) => prev + 1);
      setIsCreateDialogOpen(false);

      toast({
        title: "Template created successfully",
        description: `Template "${newTemplate.name}" is now active`,
        duration: 3000,
        variant: "default",
      });

      // Reset form
      setNewTemplate({
        name: "",
        content: [
          {
            text: "Thanks for your interest! Click below to get instant access.",
            link: "",
            buttonTitle: "Get Access",
          },
        ],
        reply: [
          "Thanks! Please check your DMs for the link.",
          "Awesome! I've sent you the details in DMs.",
          "Perfect! Check your messages for the access link.",
        ],
        triggers: ["", "", ""],
        isFollow: false,
        priority: 5,
        accountUsername: "",
        mediaId: "",
        mediaUrl: "",
        delaySeconds: 0,
      });
      setSelectedMedia(null);
      setSelectedAccountMedia([]);
      setAdvancedSettings({
        free: {
          requireFollow: false,
          skipFollowCheck: true,
          directLink: true,
        },
        pro: {
          requireFollow: true,
          useAdvancedFlow: true,
          maxRetries: 3,
        },
      });
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Failed to create template",
        description:
          error instanceof Error ? error.message : "Please try again",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setIsTemplateCreating(false);
    }
  }, [userId, accounts, newTemplate, advancedSettings, apiRequest]);

  // Format last used time
  const formatLastUsed = useCallback((dateString?: string) => {
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

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.content?.some((c: ContentItem) =>
          c.text?.toLowerCase().includes(searchTerm.toLowerCase()),
        ) ||
        template.triggers?.some((trigger: string) =>
          trigger?.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      return matchesSearch;
    });
  }, [templates, searchTerm]);

  // Get active account count
  const activeAccounts = useMemo(() => {
    return accounts.filter((acc) => acc.isActive).length;
  }, [accounts]);

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${themeStyles.textPrimary} ${themeStyles.containerBg}`}
    >
      <BreadcrumbsDefault />
      <div className="container mx-auto p-2 md:px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 lg:gap-0 mb-8">
          <div>
            <div
              className={`inline-flex items-center ${
                currentTheme === "dark"
                  ? "bg-blue-100/10 text-blue-400 border-blue-400/30"
                  : "bg-blue-100 text-blue-600 border-blue-300"
              } border rounded-full px-4 py-1 mb-4`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Template Management</span>
            </div>
            <h1
              className={`text-4xl font-bold mb-2 gradient-text-main ${themeStyles.textPrimary}`}
            >
              Reply Templates
            </h1>
            <p
              className={`${themeStyles.textSecondary} text-lg font-light font-montserrat`}
            >
              Create and manage automated reply templates for your Instagram
              posts and reels
            </p>
          </div>

          {/* User Tier Info */}
          {userTier && (
            <div
              className={`p-3 rounded-lg border ${themeStyles.cardBorder} ${themeStyles.cardBg}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    userTier.tier === "pro"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500"
                  }`}
                >
                  {userTier.tier === "pro" ? (
                    <Zap className="h-4 w-4 text-white" />
                  ) : (
                    <Users className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium capitalize ${themeStyles.textPrimary}`}
                    >
                      {userTier.tier} Tier
                    </span>
                    <Badge
                      variant={userTier.tier === "pro" ? "default" : "outline"}
                    >
                      {userTier.tier === "pro"
                        ? "Unlimited"
                        : `${userTier.tierLimit}/hour`}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    Used: {userTier.callsMade} calls (
                    {userTier.usagePercentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Template Button */}
          {accounts.length === 0 ? (
            <Button className="btn-gradient-cyan" asChild>
              <Link href="/insta/accounts/add">
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Link>
            </Button>
          ) : activeAccounts === 0 ? (
            <Button className="btn-gradient-cyan" asChild>
              <Link href="/insta/accounts">
                <Plus className="mr-2 h-4 w-4" />
                Activate Account
              </Link>
            </Button>
          ) : (
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  setEditingTemplate(null);
                  setSelectedAccountMedia([]);
                  setSelectedMedia(null);
                  setAdvancedSettings({
                    free: {
                      requireFollow: false,
                      skipFollowCheck: true,
                      directLink: true,
                    },
                    pro: {
                      requireFollow: true,
                      useAdvancedFlow: true,
                      maxRetries: 3,
                    },
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="btn-gradient-cyan hover:opacity-90 hover:shadow-cyan-500 shadow-lg transition-opacity">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent
                className={`sm:max-w-[900px] bg-gradient-to-br border-[#B026FF]/20 hover:border-[#B026FF]/40 backdrop-blur-md border max-h-[95vh] overflow-y-auto ${themeStyles.dialogBg}`}
              >
                <DialogHeader>
                  <DialogTitle className={themeStyles.textPrimary}>
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                  <DialogDescription
                    className={`${themeStyles.textMuted} text-lg font-montserrat`}
                  >
                    {editingTemplate
                      ? "Update your automated replies and triggers"
                      : "Set up automated replies for specific Instagram posts or reels"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className={themeStyles.textSecondary}
                      >
                        Template Name *
                      </Label>
                      <Input
                        id="name"
                        value={newTemplate.name}
                        onChange={(e) =>
                          setNewTemplate({
                            ...newTemplate,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g., Welcome Message"
                        className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="account"
                        className={themeStyles.textSecondary}
                      >
                        Account *
                      </Label>
                      <Select
                        value={newTemplate.accountUsername}
                        onValueChange={handleAccountChange}
                      >
                        <SelectTrigger
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                        >
                          <SelectValue placeholder="Choose account" />
                        </SelectTrigger>
                        <SelectContent
                          className={`block font-montserrat ${themeStyles.dialogBg}`}
                        >
                          {accounts
                            .filter((acc) => acc.isActive)
                            .map((account) => (
                              <SelectItem
                                key={account.instagramId}
                                value={account.username}
                              >
                                <div className="flex items-center gap-2">
                                  <span>@{account.username}</span>
                                  {account.autoReplyEnabled ? (
                                    <Badge className="h-2 w-2 rounded-full bg-green-500" />
                                  ) : (
                                    <Badge className="h-2 w-2 rounded-full bg-gray-500" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Media Selection */}
                  {newTemplate.accountUsername && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className={themeStyles.textSecondary}>
                          Select Post or Reel *
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const account = accounts.find(
                              (acc) =>
                                acc.username === newTemplate.accountUsername,
                            );
                            if (account) {
                              fetchAccountMedia(
                                account.instagramId,
                                account.username,
                              );
                            }
                          }}
                          className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText} hover:bg-cyan-300/10`}
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2">
                          {selectedAccountMedia.map((media) => (
                            <div
                              key={media.id}
                              className={`relative cursor-pointer rounded-md overflow-hidden border-2 ${
                                selectedMedia === media.id
                                  ? "border-[#00F0FF] ring-2 ring-[#00F0FF]/20"
                                  : themeStyles.inputBorder
                              } transition-all hover:scale-[1.02]`}
                              onClick={() => {
                                setSelectedMedia(media.id);
                                setNewTemplate({
                                  ...newTemplate,
                                  mediaId: media.id,
                                  mediaUrl: media.media_url,
                                });
                              }}
                            >
                              <div className="relative h-32 w-full">
                                <Image
                                  src={media.media_url}
                                  alt="Post"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-2 text-xs truncate">
                                {media.caption
                                  ? media.caption.substring(0, 30) +
                                    (media.caption.length > 30 ? "..." : "")
                                  : "No caption"}
                              </div>
                              <div className="absolute top-2 right-2 bg-black/70 text-white rounded-full px-2 py-1 text-xs">
                                {media.media_type === "VIDEO" ? "Reel" : "Post"}
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
                            Make sure your Instagram account has public posts or
                            reels
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Comment Reply Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className={themeStyles.textSecondary}>
                        Comment Replies (Randomly Selected) *
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewTemplate({
                            ...newTemplate,
                            reply: [...newTemplate.reply, ""],
                          });
                        }}
                        className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText} hover:bg-cyan-300/10`}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Reply
                      </Button>
                    </div>

                    {newTemplate.reply.map((reply: string, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <Label
                            htmlFor={`reply-${index}`}
                            className={themeStyles.textSecondary}
                          >
                            Reply {index + 1}
                          </Label>
                          {newTemplate.reply.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updatedReply = [...newTemplate.reply];
                                updatedReply.splice(index, 1);
                                setNewTemplate({
                                  ...newTemplate,
                                  reply: updatedReply,
                                });
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
                            const updatedReply = [...newTemplate.reply];
                            updatedReply[index] = e.target.value;
                            setNewTemplate({
                              ...newTemplate,
                              reply: updatedReply,
                            });
                          }}
                          placeholder="Eg. Nice! Check your DMs!"
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                          required={index === 0}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Multi-DM Reply Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className={themeStyles.textSecondary}>
                        DM Replies (Randomly Selected) *
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewTemplate({
                            ...newTemplate,
                            content: [
                              ...newTemplate.content,
                              { text: "", link: "", buttonTitle: "Get Access" },
                            ],
                          });
                        }}
                        className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText} hover:bg-cyan-300/10 font-montserrat`}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Reply
                      </Button>
                    </div>

                    {newTemplate.content.map(
                      (content: ContentItem, index: number) => (
                        <div
                          key={index}
                          className="space-y-3 p-4 border rounded-lg"
                        >
                          <div className="flex justify-between">
                            <Label
                              htmlFor={`content-${index}`}
                              className={themeStyles.textSecondary}
                            >
                              DM Reply {index + 1}
                            </Label>
                            {newTemplate.content.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updatedContent = [
                                    ...newTemplate.content,
                                  ];
                                  updatedContent.splice(index, 1);
                                  setNewTemplate({
                                    ...newTemplate,
                                    content: updatedContent,
                                  });
                                }}
                                className="text-red-500 bg-red-100 hover:bg-red-500/10 h-6 w-6"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                          <Textarea
                            id={`content-text-${index}`}
                            value={content.text}
                            onChange={(e) => {
                              const updatedContent = [...newTemplate.content];
                              updatedContent[index] = {
                                ...updatedContent[index],
                                text: e.target.value,
                              };
                              setNewTemplate({
                                ...newTemplate,
                                content: updatedContent,
                              });
                            }}
                            placeholder="This Is the link you want, Click the button below."
                            className={`min-h-[80px] ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                            required
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor={`content-link-${index}`}
                                className={`text-sm ${themeStyles.textSecondary}`}
                              >
                                Link *
                              </Label>
                              <div className="flex items-center">
                                <LinkIcon className="h-4 w-4 mr-2 text-gray-400" />
                                <Input
                                  id={`content-link-${index}`}
                                  value={content.link || ""}
                                  onChange={(e) => {
                                    const updatedContent = [
                                      ...newTemplate.content,
                                    ];
                                    updatedContent[index] = {
                                      ...updatedContent[index],
                                      link: e.target.value,
                                    };
                                    setNewTemplate({
                                      ...newTemplate,
                                      content: updatedContent,
                                    });
                                  }}
                                  placeholder="https://www.yourlink.com"
                                  className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor={`content-button-${index}`}
                                className={`text-sm ${themeStyles.textSecondary}`}
                              >
                                Button Title
                              </Label>
                              <Input
                                id={`content-button-${index}`}
                                value={content.buttonTitle || "Get Access"}
                                onChange={(e) => {
                                  const updatedContent = [
                                    ...newTemplate.content,
                                  ];
                                  updatedContent[index] = {
                                    ...updatedContent[index],
                                    buttonTitle: e.target.value,
                                  };
                                  setNewTemplate({
                                    ...newTemplate,
                                    content: updatedContent,
                                  });
                                }}
                                placeholder="Get Access"
                                className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                              />
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {/* Triggers Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label
                        htmlFor="triggers"
                        className={themeStyles.textSecondary}
                      >
                        Trigger Keywords (Optional)
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (newTemplate.triggers.length < 5) {
                            setNewTemplate({
                              ...newTemplate,
                              triggers: [...newTemplate.triggers, ""],
                            });
                          }
                        }}
                        className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText} hover:bg-cyan-300/10`}
                        disabled={newTemplate.triggers.length >= 5}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Trigger
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {newTemplate.triggers.map(
                        (trigger: string, index: number) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between">
                              <Label
                                htmlFor={`trigger-${index}`}
                                className="text-xs"
                              >
                                Trigger {index + 1}
                              </Label>
                              {newTemplate.triggers.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const updatedTriggers = [
                                      ...newTemplate.triggers,
                                    ];
                                    updatedTriggers.splice(index, 1);
                                    setNewTemplate({
                                      ...newTemplate,
                                      triggers: updatedTriggers,
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700 h-4 w-4"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <Input
                              id={`trigger-${index}`}
                              value={trigger}
                              onChange={(e) => {
                                const updatedTriggers = [
                                  ...newTemplate.triggers,
                                ];
                                updatedTriggers[index] =
                                  e.target.value.toLowerCase();
                                setNewTemplate({
                                  ...newTemplate,
                                  triggers: updatedTriggers,
                                });
                              }}
                              placeholder="e.g., price, link"
                              className={`text-sm ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                            />
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <h3 className={`font-medium ${themeStyles.textPrimary}`}>
                        Advanced Settings
                      </h3>
                    </div>

                    {/* Delay Setting */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="delay"
                          className={themeStyles.textSecondary}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            DM Delay (seconds)
                          </div>
                        </Label>
                        <Input
                          id="delay"
                          type="number"
                          min="0"
                          max="300"
                          value={newTemplate.delaySeconds}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setNewTemplate({
                              ...newTemplate,
                              delaySeconds: Math.min(Math.max(value, 0), 300),
                            });
                          }}
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                        />
                        <p className={`text-xs ${themeStyles.textMuted}`}>
                          Delay before sending DM (0-300 seconds)
                        </p>
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
                          value={newTemplate.priority}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setNewTemplate({
                              ...newTemplate,
                              priority: isNaN(value)
                                ? 5
                                : Math.min(Math.max(value, 1), 10),
                            });
                          }}
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} font-montserrat`}
                        />
                        <p className={`text-xs ${themeStyles.textMuted}`}>
                          Higher priority templates are checked first
                        </p>
                      </div>
                    </div>

                    {/* Tier-based Settings */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <Label className={themeStyles.textSecondary}>
                        Tier-based Settings
                      </Label>

                      {/* Free Tier Settings */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span
                            className={`font-medium ${themeStyles.textSecondary}`}
                          >
                            Free Tier Settings
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="free-direct-link"
                              className="text-sm"
                            >
                              Direct Link (No Follow Check)
                            </Label>
                            <Switch
                              id="free-direct-link"
                              checked={advancedSettings.free.directLink}
                              onCheckedChange={(checked) =>
                                setAdvancedSettings({
                                  ...advancedSettings,
                                  free: {
                                    ...advancedSettings.free,
                                    directLink: checked,
                                  },
                                })
                              }
                              className="data-[state=checked]:bg-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="free-skip-follow"
                              className="text-sm"
                            >
                              Skip Follow Check
                            </Label>
                            <Switch
                              id="free-skip-follow"
                              checked={advancedSettings.free.skipFollowCheck}
                              onCheckedChange={(checked) =>
                                setAdvancedSettings({
                                  ...advancedSettings,
                                  free: {
                                    ...advancedSettings.free,
                                    skipFollowCheck: checked,
                                  },
                                })
                              }
                              className="data-[state=checked]:bg-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pro Tier Settings */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          <span
                            className={`font-medium ${themeStyles.textSecondary}`}
                          >
                            Pro Tier Settings
                          </span>
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                            Pro
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="pro-require-follow"
                              className="text-sm"
                            >
                              Require Follow
                            </Label>
                            <Switch
                              id="pro-require-follow"
                              checked={advancedSettings.pro.requireFollow}
                              onCheckedChange={(checked) =>
                                setAdvancedSettings({
                                  ...advancedSettings,
                                  pro: {
                                    ...advancedSettings.pro,
                                    requireFollow: checked,
                                  },
                                })
                              }
                              className="data-[state=checked]:bg-purple-500"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="pro-advanced-flow"
                              className="text-sm"
                            >
                              Advanced Flow
                            </Label>
                            <Switch
                              id="pro-advanced-flow"
                              checked={advancedSettings.pro.useAdvancedFlow}
                              onCheckedChange={(checked) =>
                                setAdvancedSettings({
                                  ...advancedSettings,
                                  pro: {
                                    ...advancedSettings.pro,
                                    useAdvancedFlow: checked,
                                  },
                                })
                              }
                              className="data-[state=checked]:bg-purple-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="max-retries" className="text-sm">
                            Max Retries
                          </Label>
                          <Input
                            id="max-retries"
                            type="number"
                            min="1"
                            max="10"
                            value={advancedSettings.pro.maxRetries}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 3;
                              setAdvancedSettings({
                                ...advancedSettings,
                                pro: {
                                  ...advancedSettings.pro,
                                  maxRetries: Math.min(Math.max(value, 1), 10),
                                },
                              });
                            }}
                            className={`text-sm ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t">
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
                        ? handleUpdateTemplate({
                            ...editingTemplate,
                            ...newTemplate,
                            settingsByTier: advancedSettings,
                          })
                        : handleCreateTemplate()
                    }
                    className="btn-gradient-cyan"
                    disabled={
                      isTemplateCreating ||
                      isUpdateTemplate ||
                      !newTemplate.name ||
                      !newTemplate.accountUsername ||
                      !newTemplate.mediaId ||
                      newTemplate.reply.length === 0 ||
                      newTemplate.reply.some((r: string) => r.trim() === "") ||
                      newTemplate.content.length === 0 ||
                      newTemplate.content.some(
                        (c: ContentItem) =>
                          c.text.trim() === "" || c.link?.trim() === "",
                      )
                    }
                  >
                    {isTemplateCreating || isUpdateTemplate ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingTemplate ? "Updating..." : "Creating..."}
                      </div>
                    ) : editingTemplate ? (
                      "Update Template"
                    ) : (
                      "Create Template"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${themeStyles.textMuted}`}>
                    Total Templates
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {totalTemplates}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${themeStyles.textMuted}`}>
                    Active Templates
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {templates.filter((t) => t.isActive).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <Zap className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${themeStyles.textMuted}`}>
                    Active Accounts
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {activeAccounts}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Instagram className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeStyles.textMuted}`}
            />
            <Input
              placeholder="Search templates, content, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText} text-base font-light font-montserrat`}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger
                className={`w-40 ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent className={themeStyles.dialogBg}>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem
                    key={account.instagramId}
                    value={account.username}
                  >
                    @{account.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(v: any) => setFilterStatus(v)}
            >
              <SelectTrigger
                className={`w-32 ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.inputText}`}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className={themeStyles.dialogBg}>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Templates Count */}
        <div className="mb-6">
          <p className={themeStyles.textMuted}>
            Showing {filteredTemplates.length} of {totalTemplates} templates
            {searchTerm && ` • "${searchTerm}"`}
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template._id}
              className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                template.isActive
                  ? "border-l-4 border-l-green-500"
                  : "border-l-4 border-l-gray-500 opacity-75"
              } ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle
                        className={`text-lg font-semibold ${themeStyles.textPrimary}`}
                      >
                        {template.name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={template.isActive ? "default" : "outline"}
                          className={template.isActive ? "bg-green-500" : ""}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {template.mediaType && (
                          <Badge
                            variant="outline"
                            className="border-blue-500/30 text-blue-400"
                          >
                            {template.mediaType === "VIDEO" ? "Reel" : "Post"}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`${themeStyles.inputBorder} ${themeStyles.textMuted}`}
                        >
                          Priority {template.priority}
                        </Badge>
                        {template.delaySeconds && template.delaySeconds > 0 && (
                          <Badge
                            variant="outline"
                            className="border-yellow-500/30 text-yellow-400"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {template.delaySeconds}s delay
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        @{template.accountUsername}
                      </p>
                      {template.settingsByTier?.pro?.requireFollow && (
                        <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-400/30">
                          <Users className="h-3 w-3 mr-1" />
                          Follow Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTemplate(template._id)}
                      className={
                        template.isActive
                          ? "text-green-500 hover:text-green-600"
                          : "text-gray-500 hover:text-gray-600"
                      }
                      title={
                        template.isActive
                          ? "Deactivate template"
                          : "Activate template"
                      }
                    >
                      {template.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
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
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent
                        className={`${themeStyles.dialogBg} ${themeStyles.cardBorder}`}
                      >
                        <AlertDialogHeader>
                          <AlertDialogTitle className={themeStyles.textPrimary}>
                            Delete Template
                          </AlertDialogTitle>
                          <AlertDialogDescription
                            className={themeStyles.textMuted}
                          >
                            Are you sure you want to delete {template.name}?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText}`}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTemplate(template._id)}
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

              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Media and Basic Info */}
                  <div className="space-y-4">
                    {template.mediaUrl && (
                      <div>
                        <p className={`text-sm ${themeStyles.textMuted} mb-2`}>
                          Linked Media:
                        </p>
                        <div className="relative w-full h-48 rounded-md overflow-hidden border">
                          <Image
                            src={template.mediaUrl}
                            alt="Linked media"
                            fill
                            className="object-cover"
                          />
                          {template.mediaType === "VIDEO" && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <VideoIcon className="h-8 w-8 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className={`text-sm ${themeStyles.textMuted} mb-2`}>
                        Comment Replies:
                      </p>
                      <div className="space-y-2">
                        {template.reply.map((reply: string, index: number) => (
                          <div
                            key={index}
                            className={`p-3 rounded-md ${themeStyles.inputBg} border ${themeStyles.inputBorder}`}
                          >
                            <p
                              className={`${themeStyles.textMuted} font-montserrat`}
                            >
                              {reply}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Content and Triggers */}
                  <div className="space-y-4">
                    <div>
                      <p className={`text-sm ${themeStyles.textMuted} mb-2`}>
                        DM Replies:
                      </p>
                      <div className="space-y-3">
                        {template.content.map(
                          (content: ContentItem, index: number) => (
                            <div
                              key={index}
                              className={`p-3 rounded-md ${themeStyles.inputBg} border ${themeStyles.inputBorder}`}
                            >
                              <p
                                className={`${themeStyles.textMuted} font-montserrat mb-2`}
                              >
                                {content.text}
                              </p>
                              {content.link && (
                                <div className="flex items-center gap-2 text-sm">
                                  <LinkIcon className="h-3 w-3 text-cyan-400" />
                                  <a
                                    href={content.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 truncate"
                                  >
                                    {content.link.length > 40
                                      ? content.link.substring(0, 40) + "..."
                                      : content.link}
                                  </a>
                                  {content.buttonTitle && (
                                    <Badge className="ml-auto">
                                      {content.buttonTitle}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {template.triggers &&
                      template.triggers.length > 0 &&
                      template.triggers[0] && (
                        <div>
                          <p
                            className={`text-sm ${themeStyles.textMuted} mb-2`}
                          >
                            Trigger Keywords:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.triggers.map(
                              (trigger: string, index: number) =>
                                trigger && (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="bg-blue-500/10 text-blue-400 border-blue-400/30"
                                  >
                                    {trigger}
                                  </Badge>
                                ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Settings Summary */}
                    <div className="pt-4 border-t">
                      <p className={`text-sm ${themeStyles.textMuted} mb-2`}>
                        Settings:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={`p-2 rounded ${themeStyles.inputBg}`}>
                          <div className="font-medium">Free Users</div>
                          <div className="text-xs opacity-75">
                            {template.settingsByTier?.free?.directLink
                              ? "Direct link"
                              : "Follow check"}
                            {template.settingsByTier?.free?.skipFollowCheck &&
                              " (skip)"}
                          </div>
                        </div>
                        <div className={`p-2 rounded ${themeStyles.inputBg}`}>
                          <div className="font-medium">Pro Users</div>
                          <div className="text-xs opacity-75">
                            {template.settingsByTier?.pro?.requireFollow
                              ? "Follow required"
                              : "No follow"}
                            {template.settingsByTier?.pro?.useAdvancedFlow &&
                              " (advanced)"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="flex flex-wrap items-center justify-between pt-4 mt-4 border-t gap-4">
                  <div
                    className={`flex flex-wrap items-center gap-4 text-sm ${themeStyles.textMuted}`}
                  >
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {template.usageCount || 0} uses
                    </div>
                    <div>Last used: {formatLastUsed(template.lastUsed)}</div>
                    {template.successRate && (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-16 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${Math.min(template.successRate, 100)}%`,
                            }}
                          />
                        </div>
                        <span>{template.successRate.toFixed(0)}% success</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {template.settingsByTier?.free?.directLink && (
                      <Badge variant="outline" className="text-xs">
                        Free: Direct Link
                      </Badge>
                    )}
                    {template.settingsByTier?.pro?.requireFollow && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs">
                        Pro: Follow Required
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More Button */}
          {hasMoreTemplates && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMoreTemplates}
                disabled={isLoadingMore}
                className="btn-gradient-cyan px-8 py-3"
                size="lg"
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

          {/* No templates states */}
          {accounts.length === 0 && (
            <Card
              className={`text-center ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
            >
              <CardContent className="py-12">
                <div
                  className={`mx-auto w-24 h-24 ${
                    currentTheme === "dark" ? "bg-white/5" : "bg-gray-100"
                  } rounded-full flex items-center justify-center mb-4`}
                >
                  <Instagram className="h-8 w-8 text-gray-500" />
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}
                >
                  No Instagram accounts connected
                </h3>
                <p className={`${themeStyles.textMuted} mb-4 font-montserrat`}>
                  Connect your first Instagram account to start creating
                  templates
                </p>
                <Button className="btn-gradient-cyan" asChild>
                  <Link href="/insta/accounts/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Account
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {activeAccounts === 0 && accounts.length > 0 && (
            <Card
              className={`text-center ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
            >
              <CardContent className="py-12">
                <div
                  className={`mx-auto w-24 h-24 ${
                    currentTheme === "dark" ? "bg-white/5" : "bg-gray-100"
                  } rounded-full flex items-center justify-center mb-4`}
                >
                  <Instagram className="h-8 w-8 text-gray-500" />
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}
                >
                  No active accounts
                </h3>
                <p className={`${themeStyles.textMuted} mb-4 font-montserrat`}>
                  Activate your Instagram accounts to create templates
                </p>
                <Button className="btn-gradient-cyan" asChild>
                  <Link href="/insta/accounts">
                    <Plus className="mr-2 h-4 w-4" />
                    Manage Accounts
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {activeAccounts > 0 && templates.length === 0 && (
            <Card
              className={`text-center ${themeStyles.cardBg} ${themeStyles.cardBorder}`}
            >
              <CardContent className="py-12">
                <div
                  className={`mx-auto w-24 h-24 ${
                    currentTheme === "dark" ? "bg-white/5" : "bg-gray-100"
                  } rounded-full flex items-center justify-center mb-4`}
                >
                  <MessageSquare className="h-8 w-8 text-gray-500" />
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}
                >
                  {searchTerm ||
                  filterAccount !== "all" ||
                  filterStatus !== "all"
                    ? "No templates match your filters"
                    : "No templates yet"}
                </h3>
                <p className={`${themeStyles.textMuted} mb-4 font-montserrat`}>
                  {searchTerm ||
                  filterAccount !== "all" ||
                  filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first reply template to start automating responses"}
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="btn-gradient-cyan"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
