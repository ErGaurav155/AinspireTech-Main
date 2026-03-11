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
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import {
  getAllChatbots,
  getWebSubscriptions,
  getUsers,
  verifyOwner,
} from "@/lib/services/admin-actions.api";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AvatarCircle,
  Badge,
  EmptyState,
  GateScreen,
  Orbs,
  Spinner,
  StatCard,
  useThemeStyles,
} from "@rocketreplai/ui";
import TableHead from "../../../../../packages/ui/src/components/shared/Table";
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
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

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

  // Check owner and fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const ownerVerification = await verifyOwner(apiRequest);
      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      const [chatbots, subscriptions, users] = await Promise.all([
        getAllChatbots(apiRequest),
        getWebSubscriptions(apiRequest),
        getUsers(apiRequest),
      ]);

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

  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded) {
    return (
      <div className={styles.page}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            <p className={`text-sm ${styles.text.secondary}`}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <GateScreen
        icon={<Shield className="h-8 w-8 text-blue-400" />}
        title="Authentication Required"
        body="Please sign in to access the admin dashboard."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Sign In
        </Link>
      </GateScreen>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Access Denied"
        body="You are not authorized to view this page."
        subText={`Logged in as: ${user.primaryEmailAddress?.emailAddress}`}
      >
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Return to Home
        </Link>
      </GateScreen>
    );
  }

  if (loading) {
    return <Spinner label="Loading web users..." />;
  }

  if (error && error !== "ACCESS_DENIED") {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Something went wrong"
        body={error}
      >
        <button
          onClick={fetchData}
          className={`px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Try Again
        </button>
      </GateScreen>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-200/50`}
            >
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${styles.text.primary}`}>
                Web Users
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                Manage all web chatbot users
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-400" />}
            iconBg={styles.icon.blue}
            label="Total Users"
            value={stats.totalUsers}
          />
          <StatCard
            icon={<Bot className="h-5 w-5 text-purple-400" />}
            iconBg={styles.icon.purple}
            label="Total Chatbots"
            value={stats.totalChatbots}
            sub={
              <p
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.green}`}
              >
                {stats.totalActiveChatbots} active
              </p>
            }
          />
          <StatCard
            icon={<MessageCircle className="h-5 w-5 text-green-400" />}
            iconBg={styles.icon.green}
            label="Conversations"
            value={stats.totalConversations.toLocaleString()}
          />
          <StatCard
            icon={<CreditCard className="h-5 w-5 text-amber-400" />}
            iconBg={styles.icon.amber}
            label="Active Subscriptions"
            value={stats.activeSubscriptions}
          />
        </div>

        {/* Search */}
        <div className={styles.card}>
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${styles.text.muted}`}
            />
            <input
              type="text"
              placeholder="Search by name, email, or chatbot name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${styles.input}`}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
          <div className="overflow-x-auto no-scrollbar relative z-10">
            <table className="w-full">
              <TableHead
                cols={[
                  "User",
                  "Chatbots",
                  "Subscriptions",
                  "Conversations",
                  "Messages",
                  "Actions",
                ]}
              />
              <tbody>
                {filteredUsers.map((data) => (
                  <tr
                    key={data.user.clerkId}
                    className={`border-b ${styles.divider} transition-colors ${styles.rowHover}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AvatarCircle
                          name={`${data.user.firstName} ${data.user.lastName}`}
                          idx={0}
                        />
                        <div>
                          <p
                            className={
                              styles.text.primary + " text-sm font-medium"
                            }
                          >
                            {data.user.firstName} {data.user.lastName}
                          </p>
                          <p className={styles.text.muted + " text-xs"}>
                            {data.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
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
                          <span className={`text-xs ${styles.text.muted}`}>
                            No chatbots
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className=" flex flex-wrap gap-1">
                        <p
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.cyan}`}
                        >
                          {
                            data.subscriptions.filter(
                              (s) => s.status === "active",
                            ).length
                          }{" "}
                          active
                        </p>
                        <p
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.pink}`}
                        >
                          Total: {data.subscriptions.length}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        {data.totalConversations.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm ${styles.text.primary}`}>
                        {data.totalMessages.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedUser(data);
                          setShowDetailsDialog(true);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark
                            ? "text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                            : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        }`}
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
            <EmptyState
              icon={<Globe className="h-8 w-8" />}
              label="No web users found"
            />
          )}
        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog.Root open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={`${styles.dialogContent} max-w-3xl max-h-[80vh] overflow-y-auto`}
          >
            <Dialog.Close className={styles.dialogClose}>
              <X className="h-4 w-4" />
            </Dialog.Close>

            <Dialog.Title className="sr-only">User Details</Dialog.Title>

            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <User
                className={`h-5 w-5 ${isDark ? "text-blue-400" : "text-blue-500"}`}
              />
              <h2 className={`text-lg font-semibold ${styles.text.primary}`}>
                User Details
              </h2>
            </div>

            {selectedUser && (
              <div className="space-y-4">
                {/* User Info */}
                <div
                  className={`rounded-xl p-4 border ${isDark ? "bg-white/5 border-white/10" : "bg-blue-50 border-blue-200"}`}
                >
                  <h3
                    className={`text-sm font-semibold mb-3 ${isDark ? "text-blue-300" : "text-blue-800"}`}
                  >
                    User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p
                        className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"} mb-1`}
                      >
                        Name
                      </p>
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        {selectedUser.user.firstName}{" "}
                        {selectedUser.user.lastName}
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"} mb-1`}
                      >
                        Email
                      </p>
                      <p className={`text-sm ${styles.text.primary}`}>
                        {selectedUser.user.email}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p
                        className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"} mb-1`}
                      >
                        Clerk ID
                      </p>
                      <p
                        className={`text-xs font-mono ${styles.text.secondary}`}
                      >
                        {selectedUser.user.clerkId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chatbots */}
                <div
                  className={`rounded-xl p-4 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}
                >
                  <h3
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Chatbots ({selectedUser.chatbots.length})
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedUser.chatbots.map((bot) => (
                      <div
                        key={bot._id}
                        className={`rounded-lg p-3 ${isDark ? "bg-white/5" : "bg-white border border-gray-200"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-lg ${getChatbotColor(bot.type)} flex items-center justify-center`}
                            >
                              {getChatbotIcon(bot.type)}
                            </div>
                            <span
                              className={`text-sm font-medium ${styles.text.primary}`}
                            >
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
                          <p
                            className={`text-xs ${styles.text.secondary} mb-1`}
                          >
                            URL: {bot.websiteUrl}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <p className={`text-xs ${styles.text.muted}`}>
                            Conversations:{" "}
                            {bot.analytics?.totalConversations || 0}
                          </p>
                          <p className={`text-xs ${styles.text.muted}`}>
                            Messages: {bot.analytics?.totalMessages || 0}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscriptions */}
                <div
                  className={`rounded-xl p-4 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}
                >
                  <h3
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Subscriptions ({selectedUser.subscriptions.length})
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedUser.subscriptions.map((sub) => (
                      <div
                        key={sub._id}
                        className={`flex items-center justify-between rounded-lg p-2 ${isDark ? "bg-white/5" : "bg-white border border-gray-200"}`}
                      >
                        <div>
                          <p
                            className={`text-sm font-medium ${styles.text.primary}`}
                          >
                            {sub.plan}
                          </p>
                          <p className={`text-xs ${styles.text.secondary}`}>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-50 border border-cyan-200"}`}
                  >
                    <p
                      className={`text-xs mb-1 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
                    >
                      Total Conversations
                    </p>
                    <p
                      className={`text-lg font-bold ${isDark ? "text-cyan-300" : "text-cyan-800"}`}
                    >
                      {selectedUser.totalConversations.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}
                  >
                    <p
                      className={`text-xs mb-1 ${isDark ? "text-green-400" : "text-green-600"}`}
                    >
                      Total Messages
                    </p>
                    <p
                      className={`text-lg font-bold ${isDark ? "text-green-300" : "text-green-800"}`}
                    >
                      {selectedUser.totalMessages.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-200"}`}
                  >
                    <p
                      className={`text-xs mb-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                    >
                      Active Chatbots
                    </p>
                    <p
                      className={`text-lg font-bold ${isDark ? "text-purple-300" : "text-purple-800"}`}
                    >
                      {selectedUser.activeChatbots}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
