"use client";

import { useState, useEffect, useCallback, useMemo, useRef, JSX } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  RefreshCw,
  Globe,
  Users,
  User,
  Mail,
  Calendar,
  Eye,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Target,
  MessageCircle,
  GraduationCap,
  ShoppingCart,
  Zap,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  getAllChatbots,
  getWebSubscriptions,
  getUsers,
  verifyOwner,
} from "@/lib/services/admin-actions.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";

interface WebChatbot {
  _id: string;
  clerkId: string;
  name: string;
  type: string;
  websiteUrl?: string;
  isScrapped: boolean;
  isActive: boolean;
  settings?: {
    welcomeMessage?: string;
    primaryColor?: string;
    position?: string;
  };
  analytics?: {
    totalConversations?: number;
    totalMessages?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface WebSubscription {
  _id: string;
  clerkId: string;
  chatbotType: string;
  subscriptionId: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  createdAt: string;
  expiresAt: string;
}

interface User {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

interface CombinedUserData {
  user: User;
  chatbots: WebChatbot[];
  subscriptions: WebSubscription[];
  totalConversations: number;
  totalMessages: number;
  activeChatbots: number;
}

const getChatbotIcon = (type: string) => {
  const icons: Record<string, JSX.Element> = {
    "chatbot-lead-generation": <Target className="h-4 w-4" />,
    "chatbot-customer-support": <MessageCircle className="h-4 w-4" />,
    "chatbot-education": <GraduationCap className="h-4 w-4" />,
    "chatbot-e-commerce": <ShoppingCart className="h-4 w-4" />,
  };
  return icons[type] || <Bot className="h-4 w-4" />;
};

const getChatbotColor = (type: string) => {
  const colors: Record<string, string> = {
    "chatbot-lead-generation": "bg-purple-100 text-purple-600",
    "chatbot-customer-support": "bg-blue-100 text-blue-600",
    "chatbot-education": "bg-green-100 text-green-600",
    "chatbot-e-commerce": "bg-amber-100 text-amber-600",
  };
  return colors[type] || "bg-gray-100 text-gray-600";
};

export default function AdminWebPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();
  const [usersData, setUsersData] = useState<CombinedUserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CombinedUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<CombinedUserData | null>(
    null,
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

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
      tableBg: isDark ? "bg-[#1A1A1E]" : "bg-white",
      tableBorder: isDark ? "border-gray-800" : "border-gray-100",
      tableRowHover: isDark ? "hover:bg-[#252529]" : "hover:bg-gray-50",
    };
  }, [currentTheme]);

  // Check owner and fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Verify owner
      const ownerVerification = await verifyOwner(apiRequest);

      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      // Fetch all data
      const [chatbots, subscriptions, users] = await Promise.all([
        getAllChatbots(apiRequest),
        getWebSubscriptions(apiRequest),
        getUsers(apiRequest),
      ]);

      // Create maps
      const chatbotsByUser = new Map<string, WebChatbot[]>();
      const subscriptionsByUser = new Map<string, WebSubscription[]>();

      chatbots.data.forEach((bot: WebChatbot) => {
        const userBots = chatbotsByUser.get(bot.clerkId) || [];
        userBots.push(bot);
        chatbotsByUser.set(bot.clerkId, userBots);
      });

      subscriptions.forEach((sub: WebSubscription) => {
        const userSubs = subscriptionsByUser.get(sub.clerkId) || [];
        userSubs.push(sub);
        subscriptionsByUser.set(sub.clerkId, userSubs);
      });

      // Combine user data
      const combined: CombinedUserData[] = users.map((u: User) => {
        const userChatbots = chatbotsByUser.get(u.clerkId) || [];
        const userSubscriptions = subscriptionsByUser.get(u.clerkId) || [];

        const totalConversations = userChatbots.reduce(
          (sum, bot) => sum + (bot.analytics?.totalConversations || 0),
          0,
        );
        const totalMessages = userChatbots.reduce(
          (sum, bot) => sum + (bot.analytics?.totalMessages || 0),
          0,
        );
        const activeChatbots = userChatbots.filter(
          (bot) => bot.isActive,
        ).length;

        return {
          user: u,
          chatbots: userChatbots,
          subscriptions: userSubscriptions,
          totalConversations,
          totalMessages,
          activeChatbots,
        };
      });

      setUsersData(combined);
      setFilteredUsers(combined);
    } catch (err) {
      console.error("Error fetching web users data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch web users data",
      );
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  // Filter users
  useEffect(() => {
    let filtered = usersData;

    if (searchTerm) {
      filtered = filtered.filter(
        (data) =>
          data.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          data.user.firstName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          data.user.lastName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          data.chatbots.some((bot) =>
            bot.name.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    setFilteredUsers(filtered);
  }, [usersData, searchTerm]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    const data = filteredUsers.map((data) => ({
      Name: `${data.user.firstName || ""} ${data.user.lastName || ""}`.trim(),
      Email: data.user.email,
      "Total Chatbots": data.chatbots.length,
      "Active Chatbots": data.activeChatbots,
      "Total Conversations": data.totalConversations,
      "Total Messages": data.totalMessages,
      "Active Subscriptions": data.subscriptions.filter(
        (s) => s.status === "active",
      ).length,
      "Total Subscriptions": data.subscriptions.length,
      Created: data.user.createdAt
        ? new Date(data.user.createdAt).toLocaleDateString()
        : "",
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `web-users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalChatbots = filteredUsers.reduce(
      (sum, u) => sum + u.chatbots.length,
      0,
    );
    const totalActiveChatbots = filteredUsers.reduce(
      (sum, u) => sum + u.activeChatbots,
      0,
    );
    const totalConversations = filteredUsers.reduce(
      (sum, u) => sum + u.totalConversations,
      0,
    );
    const totalMessages = filteredUsers.reduce(
      (sum, u) => sum + u.totalMessages,
      0,
    );
    const totalSubscriptions = filteredUsers.reduce(
      (sum, u) => sum + u.subscriptions.length,
      0,
    );
    const activeSubscriptions = filteredUsers.reduce(
      (sum, u) =>
        sum + u.subscriptions.filter((s) => s.status === "active").length,
      0,
    );

    return {
      totalUsers: filteredUsers.length,
      totalChatbots,
      totalActiveChatbots,
      totalConversations,
      totalMessages,
      totalSubscriptions,
      activeSubscriptions,
    };
  }, [filteredUsers]);

  // Check access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access the admin dashboard.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-500 mb-2">
            You are not authorized to view this page.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Logged in as:{" "}
            <span className="text-blue-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading web users...</p>
        </div>
      </div>
    );
  }

  if (error && error !== "ACCESS_DENIED") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-2xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">Error loading data</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200/50">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Web Users</h1>
              <p className="text-sm text-gray-500">
                Manage all web chatbot users
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Chatbots</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalChatbots}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">
              {stats.totalActiveChatbots} active
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Conversations</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalConversations.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Active Subscriptions
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.activeSubscriptions}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or chatbot name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Chatbots
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Subscriptions
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Conversations
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Messages
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((data) => (
                  <tr
                    key={data.user.clerkId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                          {data.user.firstName?.[0]}
                          {data.user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {data.user.firstName} {data.user.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {data.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {data.chatbots.map((bot) => (
                          <Badge
                            key={bot._id}
                            className={getChatbotColor(bot.type)}
                          >
                            {getChatbotIcon(bot.type)}
                            <span className="ml-1">{bot.name}</span>
                          </Badge>
                        ))}
                        {data.chatbots.length === 0 && (
                          <span className="text-xs text-gray-400">
                            No chatbots
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-800">
                          {
                            data.subscriptions.filter(
                              (s) => s.status === "active",
                            ).length
                          }{" "}
                          active
                        </p>
                        <p className="text-xs text-gray-400">
                          Total: {data.subscriptions.length}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">
                        {data.totalConversations.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800">
                        {data.totalMessages.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedUser(data);
                          setShowDetailsDialog(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center">
              <Globe className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No web users found</p>
            </div>
          )}
        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              User Details
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3">
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-blue-600 mb-1">Name</p>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedUser.user.firstName} {selectedUser.user.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 mb-1">Email</p>
                    <p className="text-sm text-blue-900">
                      {selectedUser.user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 mb-1">Clerk ID</p>
                    <p className="text-sm text-blue-900 font-mono">
                      {selectedUser.user.clerkId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chatbots */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Chatbots ({selectedUser.chatbots.length})
                </h3>
                <div className="space-y-3">
                  {selectedUser.chatbots.map((bot) => (
                    <div
                      key={bot._id}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg ${getChatbotColor(bot.type)} flex items-center justify-center`}
                          >
                            {getChatbotIcon(bot.type)}
                          </div>
                          <span className="text-sm font-medium text-gray-800">
                            {bot.name}
                          </span>
                        </div>
                        <Badge
                          className={
                            bot.isActive
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {bot.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {bot.websiteUrl && (
                        <p className="text-xs text-gray-500 mb-1">
                          URL: {bot.websiteUrl}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <p className="text-xs text-gray-600">
                          Conversations:{" "}
                          {bot.analytics?.totalConversations || 0}
                        </p>
                        <p className="text-xs text-gray-600">
                          Messages: {bot.analytics?.totalMessages || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscriptions */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Subscriptions ({selectedUser.subscriptions.length})
                </h3>
                <div className="space-y-2">
                  {selectedUser.subscriptions.map((sub) => (
                    <div
                      key={sub._id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {sub.plan}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sub.billingCycle}
                        </p>
                      </div>
                      <Badge
                        className={
                          sub.status === "active"
                            ? "bg-green-100 text-green-600"
                            : sub.status === "cancelled"
                              ? "bg-red-100 text-red-600"
                              : "bg-yellow-100 text-yellow-600"
                        }
                      >
                        {sub.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                  <p className="text-xs text-cyan-600 mb-1">
                    Total Conversations
                  </p>
                  <p className="text-lg font-bold text-cyan-800">
                    {selectedUser.totalConversations.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 mb-1">Total Messages</p>
                  <p className="text-lg font-bold text-green-800">
                    {selectedUser.totalMessages.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs text-purple-600 mb-1">
                    Active Chatbots
                  </p>
                  <p className="text-lg font-bold text-purple-800">
                    {selectedUser.activeChatbots}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
