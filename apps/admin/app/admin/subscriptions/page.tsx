"use client";

import { useState, useEffect, useCallback, useMemo, JSX } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  RefreshCw,
  Instagram,
  Globe,
  Users,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Eye,
  User,
  Shield,
  AlertTriangle,
  CreditCard,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Coins,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import {
  getInstaSubscriptions,
  getWebSubscriptions,
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

interface User {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  photo?: string;
  totalReplies?: number;
  replyLimit?: number;
  accountLimit?: number;
  createdAt?: string;
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
  cancelledAt?: string;
  updatedAt: string;
  price?: number;
}

interface InstaSubscription {
  _id: string;
  clerkId: string;
  chatbotType: string;
  subscriptionId: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  createdAt: string;
  expiresAt: string;
  cancelledAt?: string;
  updatedAt: string;
  price?: number;
}

interface CombinedSubscription {
  id: string;
  clerkId: string;
  user?: User;
  type: "web" | "instagram";
  chatbotType: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  price: number;
  createdAt: string;
  expiresAt: string;
  subscriptionId: string;
}

// Pricing mapping (kept as is)
const PRICING: Record<string, { monthly: number; yearly: number }> = {
  "chatbot-customer-support": { monthly: 29, yearly: 290 },
  "chatbot-e-commerce": { monthly: 49, yearly: 490 },
  "chatbot-lead-generation": { monthly: 39, yearly: 390 },
  "chatbot-education": { monthly: 35, yearly: 350 },
  "Insta-Automation-Starter": { monthly: 19, yearly: 190 },
  "Insta-Automation-Grow": { monthly: 39, yearly: 390 },
  "Insta-Automation-Professional": { monthly: 79, yearly: 790 },
};

const getPlanDisplayName = (chatbotType: string): string => {
  const names: Record<string, string> = {
    "chatbot-customer-support": "Customer Support",
    "chatbot-e-commerce": "E-Commerce",
    "chatbot-lead-generation": "Lead Generation",
    "chatbot-education": "Education",
    "Insta-Automation-Starter": "Instagram Starter",
    "Insta-Automation-Grow": "Instagram Grow",
    "Insta-Automation-Professional": "Instagram Pro",
  };
  return names[chatbotType] || chatbotType;
};

const getPlanIcon = (type: string, chatbotType: string) => {
  if (type === "instagram") return <Instagram className="h-4 w-4" />;
  const icons: Record<string, JSX.Element> = {
    "chatbot-customer-support": <Users className="h-4 w-4" />,
    "chatbot-e-commerce": <CreditCard className="h-4 w-4" />,
    "chatbot-lead-generation": <Zap className="h-4 w-4" />,
    "chatbot-education": <Calendar className="h-4 w-4" />,
  };
  return icons[chatbotType] || <Globe className="h-4 w-4" />;
};

const getStatusBadge = (
  styles: ReturnType<typeof useThemeStyles>["styles"],
  status: string,
) => {
  const Icon =
    status === "active"
      ? CheckCircle
      : status === "cancelled"
        ? XCircle
        : Clock;
  const badgeClass =
    status === "active"
      ? styles.badge.active
      : status === "cancelled"
        ? styles.badge.cancelled
        : styles.badge.expired;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${badgeClass}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
};

export default function AdminSubscriptionsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [subscriptions, setSubscriptions] = useState<CombinedSubscription[]>(
    [],
  );
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<
    CombinedSubscription[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] =
    useState<CombinedSubscription | null>(null);
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

      const [webSubs, instaSubs, users] = await Promise.all([
        getWebSubscriptions(apiRequest),
        getInstaSubscriptions(apiRequest),
        getUsers(apiRequest),
      ]);

      const userMap = new Map(users?.map((u: User) => [u.clerkId, u]));

      const webTransformed: CombinedSubscription[] = webSubs.map(
        (sub: WebSubscription) => ({
          id: sub._id,
          clerkId: sub.clerkId,
          user: userMap.get(sub.clerkId),
          type: "web",
          chatbotType: sub.chatbotType,
          plan: getPlanDisplayName(sub.chatbotType),
          billingCycle: sub.billingCycle,
          status: sub.status,
          price: PRICING[sub.chatbotType]?.[sub.billingCycle] || 0,
          createdAt: sub.createdAt,
          expiresAt: sub.expiresAt,
          subscriptionId: sub.subscriptionId,
        }),
      );

      const instaTransformed: CombinedSubscription[] = instaSubs.map(
        (sub: InstaSubscription) => ({
          id: sub._id,
          clerkId: sub.clerkId,
          user: userMap.get(sub.clerkId),
          type: "instagram",
          chatbotType: sub.chatbotType,
          plan: getPlanDisplayName(sub.chatbotType),
          billingCycle: sub.billingCycle,
          status: sub.status,
          price: PRICING[sub.chatbotType]?.[sub.billingCycle] || 0,
          createdAt: sub.createdAt,
          expiresAt: sub.expiresAt,
          subscriptionId: sub.subscriptionId,
        }),
      );

      const combined = [...webTransformed, ...instaTransformed].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setSubscriptions(combined);
      setFilteredSubscriptions(combined);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch subscriptions",
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

  // Filter subscriptions
  useEffect(() => {
    let filtered = subscriptions;

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.user?.firstName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          sub.user?.lastName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          sub.plan.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.subscriptionId.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((sub) => sub.type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    setFilteredSubscriptions(filtered);
  }, [subscriptions, searchTerm, typeFilter, statusFilter]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    const data = filteredSubscriptions.map((sub) => ({
      Name: `${sub.user?.firstName || ""} ${sub.user?.lastName || ""}`.trim(),
      Email: sub.user?.email || "",
      Type: sub.type,
      Plan: sub.plan,
      Billing: sub.billingCycle,
      Status: sub.status,
      Price: `$${sub.price}`,
      "Start Date": new Date(sub.createdAt).toLocaleDateString(),
      "Expiry Date": new Date(sub.expiresAt).toLocaleDateString(),
      "Subscription ID": sub.subscriptionId,
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const active = filteredSubscriptions.filter((s) => s.status === "active");
    const monthlyRevenue = active
      .filter((s) => s.billingCycle === "monthly")
      .reduce((sum, s) => sum + s.price, 0);
    const yearlyRevenue = active
      .filter((s) => s.billingCycle === "yearly")
      .reduce((sum, s) => sum + s.price / 12, 0);

    return {
      total: filteredSubscriptions.length,
      active: active.length,
      web: filteredSubscriptions.filter((s) => s.type === "web").length,
      insta: filteredSubscriptions.filter((s) => s.type === "instagram").length,
      monthlyRevenue: Math.round(monthlyRevenue),
      yearlyRevenue: Math.round(yearlyRevenue),
      totalRevenue: Math.round(monthlyRevenue + yearlyRevenue),
    };
  }, [filteredSubscriptions]);

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
        icon={<Shield className="h-8 w-8 text-blue-400" />}
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
    return <Spinner label="Loading subscriptions…" />;
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
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon.green}`}
            >
              <CreditCard className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1
                className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
              >
                Subscriptions
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Manage all web and Instagram subscriptions
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
                  Total Subscriptions
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.total}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.blue}`}
              >
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 relative z-10">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.cyan}`}
              >
                Web: {stats.web}
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.pink}`}
              >
                Insta: {stats.insta}
              </span>
            </div>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Active Subscriptions
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.active}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.green}`}
              >
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className={`text-xs mt-2 ${styles.text.muted}`}>
              {((stats.active / stats.total) * 100 || 0).toFixed(1)}% active
              rate
            </p>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Monthly Revenue
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  ${stats.monthlyRevenue}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.purple}`}
              >
                <DollarSign className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Total Revenue (MRR)
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  ${stats.totalRevenue}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.cyan}`}
              >
                <Coins className="h-5 w-5 text-cyan-400" />
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
              placeholder="Search by name, email, plan, or subscription ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            >
              <option value="all" className={styles.tableHead}>
                All Types
              </option>
              <option value="web" className={styles.tableHead}>
                Web
              </option>
              <option value="instagram" className={styles.tableHead}>
                Instagram
              </option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            >
              <option value="all" className={styles.tableHead}>
                All Status
              </option>
              <option value="active" className={styles.tableHead}>
                Active
              </option>
              <option value="cancelled" className={styles.tableHead}>
                Cancelled
              </option>
              <option value="expired" className={styles.tableHead}>
                Expired
              </option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
          <div className="overflow-x-auto no-scrollbar relative z-10">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${styles.divider}`}>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    User
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Type
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Plan
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Billing
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Status
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Price
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Start Date
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Expiry
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub, idx) => (
                  <tr
                    key={sub.id}
                    className={`border-b ${styles.divider} transition-colors ${styles.rowHover}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AvatarCircle
                          name={`${sub.user?.firstName || ""} ${sub.user?.lastName || ""}`}
                          idx={idx}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${styles.text.primary}`}
                          >
                            {sub.user?.firstName} {sub.user?.lastName}
                          </p>
                          <p className={`text-xs ${styles.text.muted}`}>
                            {sub.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            sub.type === "instagram"
                              ? styles.icon.pink
                              : styles.icon.cyan
                          }`}
                        >
                          {getPlanIcon(sub.type, sub.chatbotType)}
                        </div>
                        <span
                          className={`text-sm capitalize ${styles.text.primary}`}
                        >
                          {sub.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${styles.text.primary}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                          sub.billingCycle === "yearly"
                            ? styles.badge.green
                            : styles.badge.blue
                        }`}
                      >
                        {sub.billingCycle}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(styles, sub.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        ${sub.price}
                        <span className={`text-xs ml-1 ${styles.text.muted}`}>
                          /{sub.billingCycle === "yearly" ? "yr" : "mo"}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${styles.text.secondary}`}>
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${styles.text.secondary}`}>
                        {new Date(sub.expiresAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedSubscription(sub);
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

          {filteredSubscriptions.length === 0 && (
            <EmptyState
              icon={<CreditCard className="h-8 w-8" />}
              label="No subscriptions found"
            />
          )}
        </div>
      </div>

      {/* Subscription Details Dialog - Radix UI Dialog */}
      <Dialog.Root open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Title className="sr-only">
              Subscription Details
            </Dialog.Title>
            <Dialog.Close className={styles.dialogClose}>
              <X className="h-4 w-4" />
            </Dialog.Close>

            {selectedSubscription && (
              <div className="space-y-4">
                <h3
                  className={`text-lg font-semibold mb-4 ${styles.text.primary}`}
                >
                  Subscription Details
                </h3>

                {/* User Info */}
                <div className={`rounded-xl p-4 ${styles.innerCard}`}>
                  <h4
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    User Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Name
                      </p>
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        {selectedSubscription.user?.firstName}{" "}
                        {selectedSubscription.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Email
                      </p>
                      <p className={`text-sm ${styles.text.primary}`}>
                        {selectedSubscription.user?.email}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Clerk ID
                      </p>
                      <p
                        className={`text-xs font-mono ${styles.text.secondary}`}
                      >
                        {selectedSubscription.clerkId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subscription Info */}
                <div className={`rounded-xl p-4 ${styles.innerCard}`}>
                  <h4
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Subscription Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Type
                      </p>
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                            selectedSubscription.type === "instagram"
                              ? styles.icon.pink
                              : styles.icon.cyan
                          }`}
                        >
                          {selectedSubscription.type === "instagram" ? (
                            <Instagram className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                        </div>
                        <span
                          className={`text-sm capitalize ${styles.text.primary}`}
                        >
                          {selectedSubscription.type}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Plan
                      </p>
                      <p className={`text-sm ${styles.text.primary}`}>
                        {selectedSubscription.plan}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Billing Cycle
                      </p>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                          selectedSubscription.billingCycle === "yearly"
                            ? styles.badge.green
                            : styles.badge.blue
                        }`}
                      >
                        {selectedSubscription.billingCycle}
                      </span>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Status
                      </p>
                      {getStatusBadge(styles, selectedSubscription.status)}
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Price
                      </p>
                      <p
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        ${selectedSubscription.price}
                        <span className={`text-xs ml-1 ${styles.text.muted}`}>
                          /
                          {selectedSubscription.billingCycle === "yearly"
                            ? "year"
                            : "month"}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Subscription ID
                      </p>
                      <p
                        className={`text-xs font-mono ${styles.text.secondary}`}
                      >
                        {selectedSubscription.subscriptionId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-xl p-3 ${styles.badge.blue}`}>
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Start Date
                    </p>
                    <p className={`text-sm font-medium ${styles.text.primary}`}>
                      {new Date(
                        selectedSubscription.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ${styles.badge.green}`}>
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Expiry Date
                    </p>
                    <p className={`text-sm font-medium ${styles.text.primary}`}>
                      {new Date(
                        selectedSubscription.expiresAt,
                      ).toLocaleDateString()}
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
