"use client";

import { useState, useEffect, useCallback, useMemo, useRef, JSX } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Instagram,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ChevronDown,
  Eye,
  MoreHorizontal,
  FileText,
  Mail,
  User,
  Shield,
  AlertTriangle,
  CreditCard,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  getInstaSubscriptions,
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

// Pricing mapping
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-600 border-green-200">
          Active
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-600 border-red-200">
          Cancelled
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-yellow-100 text-yellow-600 border-yellow-200">
          Expired
        </Badge>
      );
    default:
      return <Badge className="bg-gray-100 text-gray-600">Unknown</Badge>;
  }
};

export default function AdminSubscriptionsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

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
      const [webSubs, instaSubs, users] = await Promise.all([
        getWebSubscriptions(apiRequest),
        getInstaSubscriptions(apiRequest),
        getUsers(apiRequest),
      ]);

      // Create user map
      const userMap = new Map(users?.map((u: User) => [u.clerkId, u]));

      // Transform web subscriptions
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

      // Transform insta subscriptions
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

      // Combine and sort
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-cyan-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access the admin dashboard.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading subscriptions...</p>
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
            <span className="text-cyan-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Return to Home
          </Link>
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
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity"
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200/50">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Subscriptions
              </h1>
              <p className="text-sm text-gray-500">
                Manage all web and Instagram subscriptions
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
            <p className="text-xs text-gray-400 mb-1">Total Subscriptions</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-cyan-100 text-cyan-600 border-cyan-200">
                Web: {stats.web}
              </Badge>
              <Badge className="bg-pink-100 text-pink-600 border-pink-200">
                Insta: {stats.insta}
              </Badge>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Active Subscriptions</p>
            <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            <p className="text-xs text-green-600 mt-2">
              {((stats.active / stats.total) * 100 || 0).toFixed(1)}% active
              rate
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.monthlyRevenue}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Revenue (MRR)</p>
            <p className="text-2xl font-bold text-cyan-600">
              ${stats.totalRevenue}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, plan, or subscription ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <option value="all">All Types</option>
                <option value="web">Web</option>
                <option value="instagram">Instagram</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Plan
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Billing
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Start Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Expiry
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                          {sub.user?.firstName?.[0]}
                          {sub.user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {sub.user?.firstName} {sub.user?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sub.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg ${
                            sub.type === "instagram"
                              ? "bg-pink-100"
                              : "bg-cyan-100"
                          } flex items-center justify-center`}
                        >
                          {getPlanIcon(sub.type, sub.chatbotType)}
                        </div>
                        <span className="text-sm capitalize text-gray-700">
                          {sub.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{sub.plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          sub.billingCycle === "yearly"
                            ? "bg-green-100 text-green-600 border-green-200"
                            : "bg-blue-100 text-blue-600 border-blue-200"
                        }
                      >
                        {sub.billingCycle}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-800">
                        ${sub.price}
                        <span className="text-xs text-gray-400 ml-1">
                          /{sub.billingCycle === "yearly" ? "yr" : "mo"}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sub.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedSubscription(sub);
                          setShowDetailsDialog(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors"
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
            <div className="p-12 text-center">
              <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No subscriptions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-600" />
              Subscription Details
            </DialogTitle>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-cyan-800 mb-3">
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-cyan-600 mb-1">Name</p>
                    <p className="text-sm font-medium text-cyan-900">
                      {selectedSubscription.user?.firstName}{" "}
                      {selectedSubscription.user?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-600 mb-1">Email</p>
                    <p className="text-sm text-cyan-900">
                      {selectedSubscription.user?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-600 mb-1">Clerk ID</p>
                    <p className="text-sm text-cyan-900 font-mono">
                      {selectedSubscription.clerkId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Subscription Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <div className="flex items-center gap-1">
                      {selectedSubscription.type === "instagram" ? (
                        <Instagram className="h-4 w-4 text-pink-500" />
                      ) : (
                        <Globe className="h-4 w-4 text-cyan-500" />
                      )}
                      <span className="text-sm capitalize text-gray-800">
                        {selectedSubscription.type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="text-sm text-gray-800">
                      {selectedSubscription.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Billing Cycle</p>
                    <Badge
                      className={
                        selectedSubscription.billingCycle === "yearly"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }
                    >
                      {selectedSubscription.billingCycle}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(selectedSubscription.status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Price</p>
                    <p className="text-sm font-medium text-gray-800">
                      ${selectedSubscription.price}/
                      {selectedSubscription.billingCycle === "yearly"
                        ? "year"
                        : "month"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Subscription ID
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      {selectedSubscription.subscriptionId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-600 mb-1">Start Date</p>
                  <p className="text-sm font-medium text-green-800">
                    {new Date(
                      selectedSubscription.createdAt,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-600 mb-1">Expiry Date</p>
                  <p className="text-sm font-medium text-yellow-800">
                    {new Date(
                      selectedSubscription.expiresAt,
                    ).toLocaleDateString()}
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
