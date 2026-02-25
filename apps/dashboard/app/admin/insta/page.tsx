"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  RefreshCw,
  Instagram,
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
  Camera,
  Heart,
  MessageCircle,
  Activity,
  BarChart3,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  getInstaAccounts,
  getInstaSubscriptions,
  getUsers,
  verifyOwner,
} from "@/lib/services/admin-actions.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";

interface InstaAccount {
  _id: string;
  instagramId: string;
  userId: string;
  username: string;
  accessToken?: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  accountReply: number;
  accountDMSent: number;
  accountFollowCheck: number;
  lastActivity: string;
  profilePicture?: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  metaCallsThisHour: number;
  isMetaRateLimited: boolean;
  metaRateLimitResetAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  photo?: string;
}

interface CombinedAccount {
  id: string;
  instagramId: string;
  username: string;
  user?: User;
  isActive: boolean;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  accountReply: number;
  accountDMSent: number;
  accountFollowCheck: number;
  lastActivity: string;
  metaCallsThisHour: number;
  isMetaRateLimited: boolean;
  createdAt: string;
}

export default function AdminInstagramPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  const [accounts, setAccounts] = useState<CombinedAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<CombinedAccount[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] =
    useState<CombinedAccount | null>(null);
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
      const [instaAccounts, users] = await Promise.all([
        getInstaAccounts(apiRequest),
        getUsers(apiRequest),
      ]);

      // Create user map
      const userMap = new Map(users?.map((u: User) => [u.clerkId, u]));

      // Transform accounts
      const transformed: CombinedAccount[] = instaAccounts.accounts.map(
        (acc: InstaAccount) => ({
          id: acc._id,
          instagramId: acc.instagramId,
          username: acc.username,
          user: userMap.get(acc.userId),
          isActive: acc.isActive,
          followersCount: acc.followersCount || 0,
          followingCount: acc.followingCount || 0,
          mediaCount: acc.mediaCount || 0,
          accountReply: acc.accountReply || 0,
          accountDMSent: acc.accountDMSent || 0,
          accountFollowCheck: acc.accountFollowCheck || 0,
          lastActivity: acc.lastActivity,
          metaCallsThisHour: acc.metaCallsThisHour || 0,
          isMetaRateLimited: acc.isMetaRateLimited || false,
          createdAt: acc.createdAt,
        }),
      );

      setAccounts(transformed);
      setFilteredAccounts(transformed);
    } catch (err) {
      console.error("Error fetching Instagram accounts:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch Instagram accounts",
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

  // Filter accounts
  useEffect(() => {
    let filtered = accounts;

    if (searchTerm) {
      filtered = filtered.filter(
        (acc) =>
          acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acc.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acc.user?.firstName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          acc.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((acc) => acc.isActive);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((acc) => !acc.isActive);
      } else if (statusFilter === "rate-limited") {
        filtered = filtered.filter((acc) => acc.isMetaRateLimited);
      }
    }

    setFilteredAccounts(filtered);
  }, [accounts, searchTerm, statusFilter]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    const data = filteredAccounts.map((acc) => ({
      Username: acc.username,
      Owner: `${acc.user?.firstName || ""} ${acc.user?.lastName || ""}`.trim(),
      Email: acc.user?.email || "",
      Status: acc.isActive ? "Active" : "Inactive",
      Followers: acc.followersCount,
      Following: acc.followingCount,
      Posts: acc.mediaCount,
      "Comments Replied": acc.accountReply,
      "DMs Sent": acc.accountDMSent,
      "Follow Checks": acc.accountFollowCheck,
      "API Calls": acc.metaCallsThisHour,
      "Rate Limited": acc.isMetaRateLimited ? "Yes" : "No",
      "Last Active": new Date(acc.lastActivity).toLocaleDateString(),
      Created: new Date(acc.createdAt).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instagram-accounts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const active = filteredAccounts.filter((a) => a.isActive);
    const rateLimited = filteredAccounts.filter((a) => a.isMetaRateLimited);
    const totalFollowers = filteredAccounts.reduce(
      (sum, a) => sum + a.followersCount,
      0,
    );
    const totalReplies = filteredAccounts.reduce(
      (sum, a) => sum + a.accountReply,
      0,
    );
    const totalDMs = filteredAccounts.reduce(
      (sum, a) => sum + a.accountDMSent,
      0,
    );

    return {
      total: filteredAccounts.length,
      active: active.length,
      rateLimited: rateLimited.length,
      totalFollowers,
      totalReplies,
      totalDMs,
    };
  }, [filteredAccounts]);

  // Check access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-pink-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access the admin dashboard.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:opacity-90 transition-opacity"
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
            <span className="text-pink-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:opacity-90 transition-opacity"
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
          <RefreshCw className="h-8 w-8 text-pink-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading Instagram accounts...</p>
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
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:opacity-90 transition-opacity"
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200/50">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Instagram Users
              </h1>
              <p className="text-sm text-gray-500">
                Manage all connected Instagram accounts
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
                <p className="text-xs text-gray-400 mb-1">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-pink-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">{stats.active} active</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Followers</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {stats.totalFollowers.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <Heart className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Comments Replied</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalReplies.toLocaleString()}
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
                <p className="text-xs text-gray-400 mb-1">Rate Limited</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rateLimited}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username, owner name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="rate-limited">Rate Limited</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Account
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Owner
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Followers
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Engagement
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    API Calls
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Last Active
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs font-medium">
                          {acc.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            @{acc.username}
                          </p>
                          <p className="text-xs text-gray-400">
                            ID: {acc.instagramId.slice(-8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-800">
                          {acc.user?.firstName} {acc.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {acc.user?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge
                          className={
                            acc.isActive
                              ? "bg-green-100 text-green-600 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {acc.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {acc.isMetaRateLimited && (
                          <Badge className="bg-red-100 text-red-600 border-red-200">
                            Rate Limited
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">
                        {acc.followersCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Following: {acc.followingCount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          <MessageCircle className="h-3 w-3 inline mr-1" />
                          Replies: {acc.accountReply}
                        </p>
                        <p className="text-xs text-gray-600">
                          <Zap className="h-3 w-3 inline mr-1" />
                          DMs: {acc.accountDMSent}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`text-sm font-medium ${
                          acc.metaCallsThisHour > 150
                            ? "text-red-600"
                            : "text-gray-800"
                        }`}
                      >
                        {acc.metaCallsThisHour}/hour
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(acc.lastActivity).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setShowDetailsDialog(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAccounts.length === 0 && (
            <div className="p-12 text-center">
              <Instagram className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                No Instagram accounts found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Account Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-600" />
              Instagram Account Details
            </DialogTitle>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-pink-800 mb-3">
                  Account Information
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-pink-600 mb-1">Username</p>
                    <p className="text-sm font-medium text-pink-900">
                      @{selectedAccount.username}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-pink-600 mb-1">Instagram ID</p>
                    <p className="text-sm text-pink-900 font-mono">
                      {selectedAccount.instagramId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-pink-600 mb-1">Status</p>
                    <div className="flex gap-1">
                      <Badge
                        className={
                          selectedAccount.isActive
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {selectedAccount.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {selectedAccount.isMetaRateLimited && (
                        <Badge className="bg-red-100 text-red-600">
                          Rate Limited
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-pink-600 mb-1">
                      API Calls This Hour
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        selectedAccount.metaCallsThisHour > 150
                          ? "text-red-600"
                          : "text-pink-900"
                      }`}
                    >
                      {selectedAccount.metaCallsThisHour} / 200
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Owner Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    <p className="text-sm text-gray-800">
                      {selectedAccount.user?.firstName}{" "}
                      {selectedAccount.user?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-800">
                      {selectedAccount.user?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Clerk ID</p>
                    <p className="text-sm text-gray-600 font-mono">
                      {selectedAccount.user?.clerkId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                  <p className="text-xs text-cyan-600 mb-1">Followers</p>
                  <p className="text-lg font-bold text-cyan-800">
                    {selectedAccount.followersCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 mb-1">Following</p>
                  <p className="text-lg font-bold text-blue-800">
                    {selectedAccount.followingCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs text-purple-600 mb-1">Posts</p>
                  <p className="text-lg font-bold text-purple-800">
                    {selectedAccount.mediaCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 mb-1">DMs Sent</p>
                  <p className="text-lg font-bold text-green-800">
                    {selectedAccount.accountDMSent.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-600 mb-1">Created</p>
                  <p className="text-sm font-medium text-green-800">
                    {new Date(selectedAccount.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-600 mb-1">Last Active</p>
                  <p className="text-sm font-medium text-yellow-800">
                    {new Date(selectedAccount.lastActivity).toLocaleString()}
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
