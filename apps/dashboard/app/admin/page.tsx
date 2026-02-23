"use client";

import { useState, useEffect, JSX, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  Instagram,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Phone,
  MessageCircle,
  BookOpen,
  ShoppingCart,
  Shield,
  Lock,
  CalendarDays,
  User,
  MapPin,
  Target,
  Mail,
  MessageSquare,
  AlertTriangle,
  Activity,
  CreditCard,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Crown,
  Coins,
} from "lucide-react";
import { useTheme } from "next-themes";
import RateLimitDashboard from "@/components/admin/RateLimitDashboard";
import {
  getAppointments,
  getInstaSubscriptions,
  getUsers,
  getWebSubscriptions,
  verifyOwner,
} from "@/lib/services/admin-actions.api";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

interface User {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
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
}

interface CombinedSubscription {
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
  user?: User;
  price: number;
  type: "web" | "instagram";
}

interface Appointment {
  _id: string;
  name: string;
  phone: string;
  address: string;
  subject: string;
  email: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

interface Analytics {
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyRecurring: number;
  yearlyRecurring: number;
  instaSubscriptions: number;
  webSubscriptions: number;
  totalAppointments: number;
  recentSubscriptions: CombinedSubscription[];
  subscriptionGrowth: number;
  revenueGrowth: number;
  appointmentGrowth: number;
}

type ActiveTab = "overview" | "subscriptions" | "appointments" | "rate-limits";

// Hardcoded pricing
const PRICING = {
  "chatbot-customer-support": { monthly: 29, yearly: 290 },
  "chatbot-e-commerce": { monthly: 49, yearly: 490 },
  "chatbot-lead-generation": { monthly: 39, yearly: 390 },
  "chatbot-education": { monthly: 35, yearly: 350 },
  "Insta-Automation-Starter": { monthly: 19, yearly: 190 },
  "Insta-Automation-Grow": { monthly: 39, yearly: 390 },
  "Insta-Automation-Professional": { monthly: 79, yearly: 790 },
};

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subscriptions, setSubscriptions] = useState<CombinedSubscription[]>(
    [],
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState("");

  // Theme-based styles
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
      hoverBorder: isDark
        ? "hover:border-cyan-500/50"
        : "hover:border-cyan-300",
      badgeBg: isDark ? "bg-gray-800" : "bg-gray-100",
      inputBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
      tableBg: isDark ? "bg-[#1A1A1E]" : "bg-white",
      tableBorder: isDark ? "border-gray-800" : "border-gray-100",
      tableRowHover: isDark ? "hover:bg-[#252529]" : "hover:bg-gray-50",
    };
  }, [currentTheme]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First verify if user is owner
      const ownerVerification = await verifyOwner(apiRequest);

      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      const [webSubs, instaSubs, users, appointmentsData] = await Promise.all([
        getWebSubscriptions(apiRequest),
        getInstaSubscriptions(apiRequest),
        getUsers(apiRequest),
        getAppointments(apiRequest),
      ]);

      // Create user map for quick lookup
      const userMap = new Map(users?.map((user: User) => [user.clerkId, user]));

      // Combine and transform subscriptions
      const combinedSubs: CombinedSubscription[] = [
        ...webSubs.map((sub: WebSubscription) => ({
          ...sub,
          type: "web" as const,
          price: getPlanPrice(sub.chatbotType, sub.billingCycle),
          user: userMap.get(sub.clerkId),
        })),
        ...instaSubs.map((sub: InstaSubscription) => ({
          ...sub,
          type: "instagram" as const,
          price: getPlanPrice(sub.chatbotType, sub.billingCycle),
          user: userMap.get(sub.clerkId),
        })),
      ];

      // Sort by creation date (newest first)
      combinedSubs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setSubscriptions(combinedSubs);
      setAppointments(appointmentsData.formattedAppointments || []);

      // Calculate analytics
      const analyticsData = calculateAnalytics(
        combinedSubs,
        appointmentsData.formattedAppointments || [],
      );
      setAnalytics(analyticsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMessage);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  // Calculate analytics from subscription data
  const calculateAnalytics = (
    subs: CombinedSubscription[],
    apps: Appointment[],
  ): Analytics => {
    const activeSubs = subs.filter((sub) => sub.status === "active");
    const instaSubs = activeSubs.filter((sub) => sub.type === "instagram");
    const webSubs = activeSubs.filter((sub) => sub.type === "web");

    const monthlyRecurring = activeSubs
      .filter((sub) => sub.billingCycle === "monthly")
      .reduce((sum, sub) => sum + sub.price, 0);

    const yearlyRecurring = activeSubs
      .filter((sub) => sub.billingCycle === "yearly")
      .reduce((sum, sub) => sum + sub.price / 12, 0);

    const totalRevenue = monthlyRecurring + yearlyRecurring;

    return {
      totalRevenue: Math.round(totalRevenue),
      activeSubscriptions: activeSubs.length,
      monthlyRecurring: Math.round(monthlyRecurring),
      yearlyRecurring: Math.round(yearlyRecurring),
      instaSubscriptions: instaSubs.length,
      webSubscriptions: webSubs.length,
      totalAppointments: apps.length,
      recentSubscriptions: subs.slice(0, 10),
      subscriptionGrowth: 12.5,
      revenueGrowth: 8.3,
      appointmentGrowth: 15.2,
    };
  };

  const getPlanPrice = (
    chatbotType: string,
    billingCycle: "monthly" | "yearly",
  ) => {
    return PRICING[chatbotType as keyof typeof PRICING]?.[billingCycle] || 0;
  };

  const getPlanIcon = (chatbotType: string) => {
    if (chatbotType.includes("Insta")) return <Instagram className="h-4 w-4" />;
    const icons: { [key: string]: JSX.Element } = {
      "chatbot-customer-support": <MessageCircle className="h-4 w-4" />,
      "chatbot-e-commerce": <ShoppingCart className="h-4 w-4" />,
      "chatbot-lead-generation": <Target className="h-4 w-4" />,
      "chatbot-education": <BookOpen className="h-4 w-4" />,
    };
    return icons[chatbotType] || <Globe className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "expired":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
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

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesType = typeFilter === "all" || sub.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredAppointments = appointments?.filter((appointment) => {
    if (!appointment) return false;
    return (
      appointment.name
        ?.toLowerCase()
        .includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.email
        ?.toLowerCase()
        .includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.subject
        ?.toLowerCase()
        .includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.phone?.includes(appointmentSearchTerm)
    );
  });

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  // Check if user is owner for access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire155@gmail.com";

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
            <Lock className="h-10 w-10 text-cyan-600" />
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

  if (!isUserOwner && isOwner === false) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-500 mb-2">
            You are not authorized to access the admin dashboard.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Logged in as:{" "}
            <span className="text-cyan-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Only the owner (
            <span className="text-cyan-600">gauravgkhaire@gmail.com</span>) can
            view this page.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
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
        <div className="flex flex-wrap md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-200/50">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Manage and monitor your subscription business
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full gap-4">
          {/* Total Revenue */}
          <div className=" bg-white border border-gray-100 rounded-2xl p-5 hover:border-cyan-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-cyan-600" />
              </div>
              <Badge
                variant="outline"
                className="text-green-600 border-green-200"
              >
                <TrendingUp className="h-3 w-3 mr-1" />+
                {analytics?.revenueGrowth}%
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">
              ${analytics?.totalRevenue?.toLocaleString()}
            </p>
          </div>

          {/* Active Subscriptions */}
          <div className=" bg-white border border-gray-100 rounded-2xl p-5 hover:border-cyan-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <Badge
                variant="outline"
                className="text-green-600 border-green-200"
              >
                <TrendingUp className="h-3 w-3 mr-1" />+
                {analytics?.subscriptionGrowth}%
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-1">Active Subscriptions</p>
            <p className="text-2xl font-bold text-gray-800">
              {analytics?.activeSubscriptions}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className="bg-pink-100 text-pink-600 border-pink-200">
                Insta: {analytics?.instaSubscriptions}
              </Badge>
              <Badge className="bg-blue-100 text-blue-600 border-blue-200">
                Web: {analytics?.webSubscriptions}
              </Badge>
            </div>
          </div>

          {/* Total Appointments */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-cyan-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
              <Badge
                variant="outline"
                className="text-purple-600 border-purple-200"
              >
                <TrendingUp className="h-3 w-3 mr-1" />+
                {analytics?.appointmentGrowth}%
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-1">Total Appointments</p>
            <p className="text-2xl font-bold text-gray-800">
              {analytics?.totalAppointments || appointments?.length}
            </p>
          </div>

          {/* MRR */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-cyan-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Monthly Recurring</p>
            <p className="text-2xl font-bold text-gray-800">
              ${analytics?.monthlyRecurring}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Yearly: ${analytics?.yearlyRecurring}/mo
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "subscriptions"
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "appointments"
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab("rate-limits")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "rate-limits"
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Rate Limits
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monthly Recurring</p>
                    <p className="text-lg font-bold text-gray-800">
                      ${analytics?.monthlyRecurring}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Yearly Recurring</p>
                    <p className="text-lg font-bold text-gray-800">
                      ${analytics?.yearlyRecurring}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Records</p>
                    <p className="text-lg font-bold text-gray-800">
                      {subscriptions.length + appointments.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Subscriptions */}
            <div className="bg-white border border-gray-100 rounded-2xl">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">
                  Subscriptions
                </h3>
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className="text-xs text-cyan-500 font-semibold flex items-center gap-1 hover:text-cyan-600"
                >
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {subscriptions.slice(0, 5).map((sub) => (
                  <div
                    key={sub._id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${
                          sub.type === "instagram"
                            ? "bg-pink-100"
                            : "bg-cyan-100"
                        } flex items-center justify-center`}
                      >
                        {getPlanIcon(sub.chatbotType)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {sub.user?.firstName} {sub.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{sub.plan}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(sub.status)}
                      <span className="text-xs text-gray-400">
                        ${sub.price}/
                        {sub.billingCycle === "yearly" ? "yr" : "mo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Appointments */}
            <div className="bg-white border border-gray-100 rounded-2xl">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">
                  Appointments
                </h3>
                <button
                  onClick={() => setActiveTab("appointments")}
                  className="text-xs text-cyan-500 font-semibold flex items-center gap-1 hover:text-cyan-600"
                >
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {appointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt._id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {apt.name}
                        </p>
                        <p className="text-xs text-gray-400">{apt.subject}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(apt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users, emails, or plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
                <div className="flex gap-2">
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
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  >
                    <option value="all">All Types</option>
                    <option value="web">Web</option>
                    <option value="instagram">Instagram</option>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSubscriptions.map((sub) => (
                      <tr
                        key={sub._id}
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
                              {getPlanIcon(sub.chatbotType)}
                            </div>
                            <span className="text-sm capitalize text-gray-700">
                              {sub.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">
                            {sub.plan}
                          </span>
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
                        <td className="px-6 py-4">
                          {getStatusBadge(sub.status)}
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredSubscriptions.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No subscriptions found
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search appointments by name, email, subject, or phone..."
                  value={appointmentSearchTerm}
                  onChange={(e) => setAppointmentSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                />
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Subject
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Address
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppointments.map((apt) => (
                      <tr
                        key={apt._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {apt.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {apt.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {apt.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-nowrap text-gray-600 max-w-xs overflow-x-auto">
                          <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                            {apt.subject}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {apt.address}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(apt.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAppointments.length === 0 && (
                <div className="p-12 text-center">
                  <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No appointments found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rate Limits Tab */}
        {activeTab === "rate-limits" && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <RateLimitDashboard />
          </div>
        )}
      </div>
    </div>
  );
}
