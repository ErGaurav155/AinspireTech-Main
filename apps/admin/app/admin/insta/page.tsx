"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Eye,
  AlertTriangle,
  Shield,
  Heart,
  MessageCircle,
  Zap,
  ArrowUpRight,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import {
  getInstaAccounts,
  getUsers,
  verifyOwner,
} from "@/lib/services/admin-actions.api";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AvatarCircle,
  EmptyState,
  GateScreen,
  Orbs,
  Spinner,
  useThemeStyles,
} from "@rocketreplai/ui";
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
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

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

      const [instaAccounts, users] = await Promise.all([
        getInstaAccounts(apiRequest),
        getUsers(apiRequest),
      ]);

      const userMap = new Map(users?.map((u: User) => [u.clerkId, u]));

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

  // Guard screens
  if (!isLoaded) {
    return <Spinner label="Loading..." />;
  }

  if (!user) {
    return (
      <GateScreen
        icon={<Shield className="h-8 w-8 text-pink-400" />}
        title="Authentication Required"
        body="Please sign in to access the admin dashboard."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Sign In <ArrowUpRight size={14} />
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
          Return to Home <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (loading) {
    return <Spinner label="Loading Instagram accounts…" />;
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
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon.pink}`}
            >
              <Instagram className="h-6 w-6 text-pink-400" />
            </div>
            <div>
              <h1
                className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
              >
                Instagram Users
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Manage all connected Instagram accounts
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
          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Total Accounts
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.total}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.pink}`}
              >
                <Users className="h-5 w-5 text-pink-400" />
              </div>
            </div>
            <p
              className={`text-xs mt-2 p-1 rounded max-w-max ${styles.badge.green}`}
            >
              {stats.active} active
            </p>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Total Followers
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.totalFollowers.toLocaleString()}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.cyan}`}
              >
                <Heart className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Comments Replied
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.totalReplies.toLocaleString()}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.green}`}
              >
                <MessageCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Rate Limited
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.rateLimited}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.red}`}
              >
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="flex-1 relative">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
            />
            <input
              type="text"
              placeholder="Search by username, owner name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            >
              <option value="all" className={styles.innerCard}>
                All Status
              </option>
              <option value="active" className={styles.innerCard}>
                Active
              </option>
              <option value="inactive" className={styles.innerCard}>
                Inactive
              </option>
              <option value="rate-limited" className={styles.innerCard}>
                Rate Limited
              </option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
        <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
          <div className="overflow-x-auto no-scrollbar relative z-10">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${styles.divider}`}>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Account
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Owner
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Status
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Followers
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Engagement
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    API Calls
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Last Active
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${styles.divider}`}>
                {filteredAccounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className={`transition-colors ${styles.rowHover}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AvatarCircle name={acc.username} idx={idx} />
                        <div>
                          <p
                            className={`text-sm font-medium ${styles.text.primary}`}
                          >
                            @{acc.username}
                          </p>
                          <p className={`text-xs ${styles.text.muted}`}>
                            ID: {acc.instagramId.slice(-8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`text-sm ${styles.text.primary}`}>
                          {acc.user?.firstName} {acc.user?.lastName}
                        </p>
                        <p className={`text-xs ${styles.text.muted}`}>
                          {acc.user?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                            acc.isActive
                              ? styles.badge.green
                              : styles.badge.gray
                          }`}
                        >
                          {acc.isActive ? "Active" : "Inactive"}
                        </span>
                        {acc.isMetaRateLimited && (
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.red}`}
                          >
                            Rate Limited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        {acc.followersCount.toLocaleString()}
                      </p>
                      <p className={`text-xs ${styles.text.muted}`}>
                        Following: {acc.followingCount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className={`text-xs ${styles.text.secondary}`}>
                          <MessageCircle className="h-3 w-3 inline mr-1" />
                          Replies: {acc.accountReply}
                        </p>
                        <p className={`text-xs ${styles.text.secondary}`}>
                          <Zap className="h-3 w-3 inline mr-1" />
                          DMs: {acc.accountDMSent}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${
                          acc.metaCallsThisHour > 150
                            ? styles.badge.red
                            : styles.text.primary
                        }`}
                      >
                        {acc.metaCallsThisHour}/hour
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${styles.text.secondary}`}>
                        {new Date(acc.lastActivity).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setShowDetailsDialog(true);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${styles.pill}`}
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
            <EmptyState
              icon={<Instagram className="h-8 w-8" />}
              label="No Instagram accounts found"
            />
          )}
        </div>
      </div>

      {/* Account Details Dialog - Radix UI Dialog */}
      <Dialog.Root open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Title className="sr-only">
              Instagram Account Details
            </Dialog.Title>
            <Dialog.Close className={styles.dialogClose}>
              <X className="h-4 w-4" />
            </Dialog.Close>

            {selectedAccount && (
              <div className="space-y-4">
                <h3
                  className={`text-lg font-semibold mb-4 ${styles.text.primary}`}
                >
                  Instagram Account Details
                </h3>

                {/* Account Info */}
                <div
                  className={`rounded-xl p-4 ${isDark ? "bg-pink-500/10 border border-pink-500/20" : "bg-pink-50 border border-pink-200"}`}
                >
                  <h4
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Account Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Username
                      </p>
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        @{selectedAccount.username}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Instagram ID
                      </p>
                      <p
                        className={`text-sm font-mono ${styles.text.secondary}`}
                      >
                        {selectedAccount.instagramId}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Status
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                            selectedAccount.isActive
                              ? styles.badge.green
                              : styles.badge.gray
                          }`}
                        >
                          {selectedAccount.isActive ? "Active" : "Inactive"}
                        </span>
                        {selectedAccount.isMetaRateLimited && (
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.red}`}
                          >
                            Rate Limited
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        API Calls This Hour
                      </p>
                      <span
                        className={`text-sm font-medium ${
                          selectedAccount.metaCallsThisHour > 150
                            ? styles.badge.red
                            : styles.text.primary
                        }`}
                      >
                        {selectedAccount.metaCallsThisHour} / 200
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className={`rounded-xl p-4 ${styles.innerCard}`}>
                  <h4
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Owner Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Name
                      </p>
                      <p className={`text-sm ${styles.text.primary}`}>
                        {selectedAccount.user?.firstName}{" "}
                        {selectedAccount.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Email
                      </p>
                      <p className={`text-sm ${styles.text.primary}`}>
                        {selectedAccount.user?.email}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Clerk ID
                      </p>
                      <p
                        className={`text-xs font-mono ${styles.text.secondary}`}
                      >
                        {selectedAccount.user?.clerkId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-pink-500/10 border border-pink-500/20" : "bg-pink-50 border border-pink-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Followers
                    </p>
                    <p className={`text-lg font-bold ${styles.text.primary}`}>
                      {selectedAccount.followersCount.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-50 border border-cyan-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Following
                    </p>
                    <p className={`text-lg font-bold ${styles.text.primary}`}>
                      {selectedAccount.followingCount.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>Posts</p>
                    <p className={`text-lg font-bold ${styles.text.primary}`}>
                      {selectedAccount.mediaCount.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      DMs Sent
                    </p>
                    <p className={`text-lg font-bold ${styles.text.primary}`}>
                      {selectedAccount.accountDMSent.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className={`rounded-xl p-4 ${styles.innerCard}`}>
                  <h4
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Activity Statistics
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Comments Replied
                      </p>
                      <p
                        className={`text-base font-semibold ${styles.text.primary}`}
                      >
                        {selectedAccount.accountReply.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        DMs Sent
                      </p>
                      <p
                        className={`text-base font-semibold ${styles.text.primary}`}
                      >
                        {selectedAccount.accountDMSent.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Follow Checks
                      </p>
                      <p
                        className={`text-base font-semibold ${styles.text.primary}`}
                      >
                        {selectedAccount.accountFollowCheck.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl p-3 ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Created
                    </p>
                    <p className={`text-sm font-medium ${styles.text.primary}`}>
                      {new Date(selectedAccount.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${isDark ? "bg-pink-500/10 border border-pink-500/20" : "bg-pink-50 border border-pink-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Last Active
                    </p>
                    <p className={`text-sm font-medium ${styles.text.primary}`}>
                      {new Date(selectedAccount.lastActivity).toLocaleString()}
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
