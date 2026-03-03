"use client";

import { useState, useEffect, JSX, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  Search,
  Download,
  Instagram,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  MessageCircle,
  BookOpen,
  ShoppingCart,
  Shield,
  Lock,
  CalendarDays,
  User,
  Target,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  Coins,
  ArrowRight,
  PieChart,
  Layers,
  BarChart,
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
import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";
import { Spinner } from "@/components/shared/Spinner";
import { GateScreen } from "@/components/shared/GateScreen";
import { StatCard } from "@/components/shared/StatCard";
import { AvatarCircle } from "@/components/shared/AvatarCircle";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TableHead } from "@/components/shared/Table";

// ─── Types ──────────────────────────────────────────────────────────────────

interface IUser {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
}
interface BaseSubscription {
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
interface CombinedSubscription extends BaseSubscription {
  user?: IUser;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const PRICING: Record<string, { monthly: number; yearly: number }> = {
  "chatbot-customer-support": { monthly: 29, yearly: 290 },
  "chatbot-e-commerce": { monthly: 49, yearly: 490 },
  "chatbot-lead-generation": { monthly: 39, yearly: 390 },
  "chatbot-education": { monthly: 35, yearly: 350 },
  "Insta-Automation-Starter": { monthly: 19, yearly: 190 },
  "Insta-Automation-Grow": { monthly: 39, yearly: 390 },
  "Insta-Automation-Professional": { monthly: 79, yearly: 790 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getPlanPrice = (type: string, cycle: "monthly" | "yearly") =>
  PRICING[type]?.[cycle] ?? 0;

function getPlanIcon(chatbotType: string): JSX.Element {
  if (chatbotType.includes("Insta")) return <Instagram className="h-4 w-4" />;
  const map: Record<string, JSX.Element> = {
    "chatbot-customer-support": <MessageCircle className="h-4 w-4" />,
    "chatbot-e-commerce": <ShoppingCart className="h-4 w-4" />,
    "chatbot-lead-generation": <Target className="h-4 w-4" />,
    "chatbot-education": <BookOpen className="h-4 w-4" />,
  };
  return map[chatbotType] ?? <Globe className="h-4 w-4" />;
}

function calcAnalytics(
  subs: CombinedSubscription[],
  apps: Appointment[],
): Analytics {
  const active = subs.filter((s) => s.status === "active");
  const mrr = active
    .filter((s) => s.billingCycle === "monthly")
    .reduce((n, s) => n + s.price, 0);
  const yrr = active
    .filter((s) => s.billingCycle === "yearly")
    .reduce((n, s) => n + s.price / 12, 0);
  return {
    totalRevenue: Math.round(mrr + yrr),
    activeSubscriptions: active.length,
    monthlyRecurring: Math.round(mrr),
    yearlyRecurring: Math.round(yrr),
    instaSubscriptions: active.filter((s) => s.type === "instagram").length,
    webSubscriptions: active.filter((s) => s.type === "web").length,
    totalAppointments: apps.length,
    recentSubscriptions: subs.slice(0, 10),
    subscriptionGrowth: 12.5,
    revenueGrowth: 8.3,
    appointmentGrowth: 15.2,
  };
}

// ─── Local components (page‑specific) ─────────────────────────────────────────

function GrowthPill({ pct, cls }: { pct?: number; cls: string }) {
  const { styles } = useThemeStyles();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cls}`}
    >
      <TrendingUp className="h-3 w-3" />+{pct}%
    </span>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { styles } = useThemeStyles();
  return (
    <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
      <div
        className={`flex items-center justify-between px-5 py-3.5  ${styles.divider} relative z-10 `}
      >
        <h3 className={`font-semibold text-sm ${styles.text.primary}`}>
          {title}
        </h3>
        {action}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ListRow({
  last,
  children,
}: {
  last: boolean;
  children: React.ReactNode;
}) {
  const { styles } = useThemeStyles();
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 transition-colors ${styles.rowHover} ${
        last ? "" : ` ${styles.divider}`
      }`}
    >
      {children}
    </div>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  const { styles } = useThemeStyles();
  return (
    <button
      onClick={onClick}
      className={`text-xs flex items-center gap-1 transition-opacity hover:opacity-70 ${styles.text.secondary}`}
    >
      View All <ArrowUpRight size={12} />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles(); // centralised theme

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subscriptions, setSubscriptions] = useState<CombinedSubscription[]>(
    [],
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [aptSearch, setAptSearch] = useState("");

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const { isOwner: ownerFlag } = await verifyOwner(apiRequest);
      setIsOwner(ownerFlag);
      if (!ownerFlag) {
        setError("ACCESS_DENIED");
        return;
      }

      const [webSubs, instaSubs, users, aptsData] = await Promise.all([
        getWebSubscriptions(apiRequest),
        getInstaSubscriptions(apiRequest),
        getUsers(apiRequest),
        getAppointments(apiRequest),
      ]);
      const userMap = new Map(users?.map((u: IUser) => [u.clerkId, u]));
      const combined: CombinedSubscription[] = [
        ...webSubs.map((s: BaseSubscription) => ({
          ...s,
          type: "web" as const,
          price: getPlanPrice(s.chatbotType, s.billingCycle),
          user: userMap.get(s.clerkId),
        })),
        ...instaSubs.map((s: BaseSubscription) => ({
          ...s,
          type: "instagram" as const,
          price: getPlanPrice(s.chatbotType, s.billingCycle),
          user: userMap.get(s.clerkId),
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const apts = aptsData.formattedAppointments ?? [];
      setSubscriptions(combined);
      setAppointments(apts);
      setAnalytics(calcAnalytics(combined, apts));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  useEffect(() => {
    if (isLoaded && user) fetchData();
  }, [isLoaded, user, fetchData]);

  // ─── Filters ────────────────────────────────────────────────────────────

  const filteredSubs = subscriptions.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      (s.user?.email?.toLowerCase().includes(q) ||
        s.user?.firstName?.toLowerCase().includes(q) ||
        s.user?.lastName?.toLowerCase().includes(q) ||
        s.plan.toLowerCase().includes(q)) &&
      (statusFilter === "all" || s.status === statusFilter) &&
      (typeFilter === "all" || s.type === typeFilter)
    );
  });

  const filteredApts = appointments.filter((a) => {
    if (!a) return false;
    const q = aptSearch.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.subject?.toLowerCase().includes(q) ||
      a.phone?.includes(aptSearch)
    );
  });

  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire155@gmail.com";

  // ─── Guard screens ───────────────────────────────────────────────────────

  if (!user)
    return (
      <GateScreen
        icon={<Lock className="h-8 w-8 text-blue-400" />}
        title="Authentication Required"
        body="Please sign in to access the admin dashboard."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Sign In <ArrowRight size={14} />
        </Link>
      </GateScreen>
    );

  if (!isUserOwner && isOwner === false)
    return (
      <GateScreen
        icon={<Shield className="h-8 w-8 text-red-400" />}
        title="Access Denied"
        body="You are not authorized to access the admin dashboard."
      >
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Return to Home <ArrowRight size={14} />
        </Link>
      </GateScreen>
    );

  if (loading) return <Spinner label="Loading dashboard…" />;

  if (error && error !== "ACCESS_DENIED")
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

  // ─── Main UI ─────────────────────────────────────────────────────────────

  const TAB_LABELS: Record<
    ActiveTab,
    { label: string; icon: React.ElementType }
  > = {
    overview: {
      label: "Overview",
      icon: PieChart,
    },
    subscriptions: {
      label: `Subscriptions (${subscriptions.length})`,
      icon: Calendar,
    },
    appointments: {
      label: `Appointments (${appointments.length})`,
      icon: Layers,
    },
    "rate-limits": {
      label: "Rate Limits",
      icon: BarChart,
    },
  };
  return (
    <>
      <div className={`${isDark ? "relative overflow-hidden" : ""} z-10`}>
        {isDark && <Orbs />}
        <div className="relative p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div
            className={`flex flex-wrap md:items-center justify-between gap-4 sticky top-0 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#3b82f6,#60a5fa)",
                  boxShadow: "0 8px 24px rgba(59,130,246,.28)",
                }}
              >
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1
                  className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
                >
                  Admin Dashboard
                </h1>
                <p className={`text-xs ${styles.text.secondary}`}>
                  Manage and monitor your subscription business
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
              >
                <Download className="h-4 w-4" /> Export
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard
              iconBg={styles.icon.blue}
              label="Total Revenue"
              icon={<DollarSign className="h-5 w-5 text-blue-400" />}
              value={`$${analytics?.totalRevenue?.toLocaleString()}`}
              badge={
                <GrowthPill
                  pct={analytics?.revenueGrowth}
                  cls={styles.badge.green}
                />
              }
            />
            <StatCard
              iconBg={styles.icon.green}
              label="Active Subscriptions"
              icon={<Users className="h-5 w-5 text-green-400" />}
              value={analytics?.activeSubscriptions ?? 0}
              badge={
                <GrowthPill
                  pct={analytics?.subscriptionGrowth}
                  cls={styles.badge.green}
                />
              }
              sub={
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.pink}`}
                  >
                    Insta: {analytics?.instaSubscriptions}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge.blue}`}
                  >
                    Web: {analytics?.webSubscriptions}
                  </span>
                </div>
              }
            />
            <StatCard
              iconBg={styles.icon.purple}
              label="Total Appointments"
              icon={<CalendarDays className="h-5 w-5 text-purple-400" />}
              value={analytics?.totalAppointments ?? appointments.length}
              badge={
                <GrowthPill
                  pct={analytics?.appointmentGrowth}
                  cls={styles.badge.purple}
                />
              }
            />
            <StatCard
              iconBg={styles.icon.amber}
              label="Monthly Recurring"
              icon={<CreditCard className="h-5 w-5 text-amber-400" />}
              value={`$${analytics?.monthlyRecurring}`}
              sub={
                <p className={`text-xs mt-1.5 ${styles.text.muted}`}>
                  Yearly avg: ${analytics?.yearlyRecurring}/mo
                </p>
              }
            />
          </div>

          {/* Tabs */}
          <div className={`border-b ${styles.divider}`}>
            <nav className="flex gap-6 overflow-x-auto">
              {(Object.keys(TAB_LABELS) as ActiveTab[]).map((tab) => {
                const Icon = TAB_LABELS[tab].icon;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? styles.tab.active
                        : styles.tab.inactive
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        activeTab === tab ? "text-blue-500" : "text-gray-400"
                      }`}
                    />
                    {TAB_LABELS[tab].label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ── Overview ────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Quick stats row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Coins className="h-4 w-4 text-cyan-400" />,
                    bg: styles.icon.cyan,
                    label: "Monthly Recurring",
                    val: `$${analytics?.monthlyRecurring}`,
                  },
                  {
                    icon: <Calendar className="h-4 w-4 text-green-400" />,
                    bg: styles.icon.green,
                    label: "Yearly Recurring",
                    val: `$${analytics?.yearlyRecurring}`,
                  },
                  {
                    icon: <Zap className="h-4 w-4 text-purple-400" />,
                    bg: styles.icon.purple,
                    label: "Total Records",
                    val: subscriptions.length + appointments.length,
                  },
                ].map(({ icon, bg, label, val }) => (
                  <div key={label} className={`rounded-xl p-4 ${styles.card}`}>
                    <div className="flex items-center gap-3 relative z-10">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}
                      >
                        {icon}
                      </div>
                      <div>
                        <p className={`text-xs ${styles.text.secondary}`}>
                          {label}
                        </p>
                        <p
                          className={`text-base font-bold ${styles.text.primary}`}
                        >
                          {val}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent subscriptions list */}
              <SectionCard
                title="Recent Subscriptions"
                action={
                  <ViewAll onClick={() => setActiveTab("subscriptions")} />
                }
              >
                {subscriptions.slice(0, 5).map((sub, i) => (
                  <ListRow key={sub._id} last={i === 4}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          sub.type === "instagram"
                            ? styles.icon.pink
                            : styles.icon.cyan
                        }`}
                      >
                        {getPlanIcon(sub.chatbotType)}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${styles.text.primary}`}
                        >
                          {sub.user?.firstName} {sub.user?.lastName}
                        </p>
                        <p className={`text-xs ${styles.text.muted}`}>
                          {sub.plan}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={sub.status} />
                      <span className={`text-xs ${styles.text.secondary}`}>
                        ${sub.price}/
                        {sub.billingCycle === "yearly" ? "yr" : "mo"}
                      </span>
                    </div>
                  </ListRow>
                ))}
              </SectionCard>

              {/* Recent appointments list */}
              <SectionCard
                title="Recent Appointments"
                action={
                  <ViewAll onClick={() => setActiveTab("appointments")} />
                }
              >
                {appointments.slice(0, 5).map((apt, i) => (
                  <ListRow key={apt._id} last={i === 4}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.icon.purple}`}
                      >
                        <User className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${styles.text.primary}`}
                        >
                          {apt.name}
                        </p>
                        <p className={`text-xs ${styles.text.muted}`}>
                          {apt.subject}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs ${styles.text.secondary}`}>
                      {new Date(apt.createdAt).toLocaleDateString()}
                    </span>
                  </ListRow>
                ))}
              </SectionCard>
            </div>
          )}

          {/* ── Subscriptions ────────────────────────────────────────── */}
          {activeTab === "subscriptions" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                <div className="flex-1 relative">
                  <Search
                    size={14}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
                  />
                  <input
                    type="text"
                    placeholder="Search users, emails or plans…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
                  />
                </div>
                <div className="flex gap-2">
                  {[
                    {
                      val: statusFilter,
                      set: setStatusFilter,
                      opts: [
                        ["all", "All Status"],
                        ["active", "Active"],
                        ["cancelled", "Cancelled"],
                        ["expired", "Expired"],
                      ],
                    },
                    {
                      val: typeFilter,
                      set: setTypeFilter,
                      opts: [
                        ["all", "All Types"],
                        ["web", "Web"],
                        ["instagram", "Instagram"],
                      ],
                    },
                  ].map((sel, i) => (
                    <select
                      key={i}
                      value={sel.val}
                      onChange={(e) => sel.set(e.target.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
                    >
                      {sel.opts.map(([v, l]) => (
                        <option key={v} value={v} className={styles.innerCard}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
                <div className="overflow-x-auto no-scrollbar relative z-10">
                  <table className="w-full">
                    <TableHead
                      cols={[
                        "User",
                        "Type",
                        "Plan",
                        "Billing",
                        "Status",
                        "Price",
                        "Start Date",
                        "Expiry",
                      ]}
                    />
                    <tbody>
                      {filteredSubs.map((sub, i) => (
                        <tr
                          key={sub._id}
                          className={`transition-colors border-b ${styles.divider} ${styles.rowHover}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <AvatarCircle
                                name={`${sub.user?.firstName ?? ""}${sub.user?.lastName ?? ""}`}
                                idx={i}
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
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                  sub.type === "instagram"
                                    ? styles.icon.pink
                                    : styles.icon.cyan
                                }`}
                              >
                                {getPlanIcon(sub.chatbotType)}
                              </div>
                              <span
                                className={`text-sm capitalize ${styles.text.primary}`}
                              >
                                {sub.type}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm ${styles.text.primary}`}
                          >
                            {sub.plan}
                          </td>
                          <td className="px-5 py-3.5">
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
                          <td className="px-5 py-3.5">
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-sm font-medium ${styles.text.primary}`}
                            >
                              ${sub.price}
                              <span
                                className={`text-xs ml-1 ${styles.text.muted}`}
                              >
                                /{sub.billingCycle === "yearly" ? "yr" : "mo"}
                              </span>
                            </span>
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm ${styles.text.secondary}`}
                          >
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm ${styles.text.secondary}`}
                          >
                            {new Date(sub.expiresAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredSubs.length === 0 && (
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    label="No subscriptions found"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Appointments ─────────────────────────────────────────── */}
          {activeTab === "appointments" && (
            <div className="space-y-4 min-h-80">
              <div className="relative z-10">
                <Search
                  size={14}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
                />
                <input
                  type="text"
                  placeholder="Search by name, email, subject or phone…"
                  value={aptSearch}
                  onChange={(e) => setAptSearch(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
                />
              </div>

              <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
                <div className="overflow-x-auto relative z-10">
                  <table className="w-full">
                    <TableHead
                      cols={[
                        "Name",
                        "Phone",
                        "Email",
                        "Subject",
                        "Address",
                        "Date",
                      ]}
                    />
                    <tbody>
                      {filteredApts.map((apt) => (
                        <tr
                          key={apt._id}
                          className={`transition-colors border-b ${styles.divider} ${styles.rowHover}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.icon.purple}`}
                              >
                                <User className="h-4 w-4 text-purple-400" />
                              </div>
                              <span
                                className={`text-sm font-medium ${styles.text.primary}`}
                              >
                                {apt.name}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm ${styles.text.secondary}`}
                          >
                            {apt.phone}
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm ${styles.text.secondary}`}
                          >
                            {apt.email}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
                            >
                              {apt.subject}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm max-w-xs truncate ${styles.text.secondary}`}
                          >
                            {apt.address}
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm ${styles.text.secondary}`}
                          >
                            {new Date(apt.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredApts.length === 0 && (
                  <EmptyState
                    icon={<CalendarDays className="h-8 w-8" />}
                    label="No appointments found"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Rate Limits ──────────────────────────────────────────── */}
          {activeTab === "rate-limits" && (
            <div className={`rounded-2xl p-6 ${styles.card}`}>
              <div className="relative z-10">
                <RateLimitDashboard />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
