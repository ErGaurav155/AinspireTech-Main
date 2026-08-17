"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  IndianRupee,
  Instagram,
  Layers3,
  MessageCircle,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Button,
  Orbs,
  Spinner,
  StatCard,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";

type ProductKey =
  | "web"
  | "instagram"
  | "whatsapp"
  | "call"
  | "packages";

interface AdminOverview {
  generatedAt: string;
  summary: {
    customers: number;
    activeSubscriptions: number;
    workspaces: number;
    monthlyValueInr: number;
    pendingPayouts: number;
    pendingPayoutAmountInr: number;
    appointments: number;
    leads: number;
  };
  products: Array<{
    product: ProductKey;
    label: string;
    total: number;
    active: number;
    usage: number;
    health: "healthy" | "warning" | "critical";
    attention: number;
  }>;
  engagement: {
    conversations: number;
    messages: number;
    leads: number;
    appointments: number;
    calls: number;
  };
  attention: Array<{
    id: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    count: number;
    href: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    product: ProductKey | "system";
    createdAt: string;
    status?: string;
  }>;
}

const EMPTY_OVERVIEW: AdminOverview = {
  generatedAt: "",
  summary: {
    customers: 0,
    activeSubscriptions: 0,
    workspaces: 0,
    monthlyValueInr: 0,
    pendingPayouts: 0,
    pendingPayoutAmountInr: 0,
    appointments: 0,
    leads: 0,
  },
  products: [],
  engagement: {
    conversations: 0,
    messages: 0,
    leads: 0,
    appointments: 0,
    calls: 0,
  },
  attention: [],
  recentActivity: [],
};

const PRODUCT_META: Record<
  ProductKey,
  {
    label: string;
    href: string;
    icon: typeof Bot;
    iconClass: string;
    accent: string;
  }
> = {
  web: {
    label: "Web AI",
    href: "/admin/web",
    icon: Bot,
    iconClass: "text-violet-500",
    accent: "from-violet-500 to-indigo-500",
  },
  instagram: {
    label: "Instagram",
    href: "/admin/insta",
    icon: Instagram,
    iconClass: "text-pink-500",
    accent: "from-pink-500 to-rose-500",
  },
  whatsapp: {
    label: "WhatsApp",
    href: "/admin/whatsapp",
    icon: MessageCircle,
    iconClass: "text-emerald-500",
    accent: "from-emerald-500 to-teal-500",
  },
  call: {
    label: "Voice AI",
    href: "/admin/call",
    icon: PhoneCall,
    iconClass: "text-cyan-500",
    accent: "from-cyan-500 to-blue-500",
  },
  packages: {
    label: "Packages",
    href: "/admin/packages",
    icon: PackageCheck,
    iconClass: "text-amber-500",
    accent: "from-amber-500 to-orange-500",
  },
};

const QUICK_ACTIONS = [
  {
    title: "Find a customer",
    description: "Review access, products and usage limits",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Manage subscriptions",
    description: "Inspect billing and entitlement status",
    href: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Review appointments",
    description: "See booking activity across channels",
    href: "/admin/appointments",
    icon: CalendarDays,
  },
  {
    title: "Process payouts",
    description: "Resolve pending affiliate requests",
    href: "/admin/payouts",
    icon: WalletCards,
  },
] as const;

const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const productKey = (value: unknown): ProductKey | null => {
  const normalized = String(value || "").toLowerCase().replace(/_/g, "-");
  if (normalized === "web") return "web";
  if (normalized.includes("insta")) return "instagram";
  if (normalized.includes("whatsapp")) return "whatsapp";
  if (normalized.includes("call") || normalized.includes("voice")) return "call";
  if (
    normalized.includes("package") ||
    normalized.includes("meta-ads") ||
    normalized.includes("maintenance") ||
    normalized.includes("content-creation")
  )
    return "packages";
  return null;
};

const usageNumber = (value: unknown) => {
  if (typeof value === "number") return number(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return number(record.used ?? record.current ?? record.total);
  }
  return 0;
};

const healthValue = (
  value: unknown,
): "healthy" | "warning" | "critical" => {
  const raw = (
    value && typeof value === "object"
      ? String((value as Record<string, unknown>).status || "")
      : String(value || "")
  ).toLowerCase();
  if (["critical", "error", "failed"].includes(raw)) return "critical";
  if (["warning", "attention", "degraded"].includes(raw)) return "warning";
  return "healthy";
};

const normalizeProducts = (value: unknown): AdminOverview["products"] => {
  if (!Array.isArray(value)) return [];
  const grouped = new Map<ProductKey, AdminOverview["products"][number]>();
  value.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Record<string, unknown>;
    const key = productKey(item.product);
    if (!key) return;
    const current = grouped.get(key);
    const nextHealth = healthValue(item.health);
    grouped.set(key, {
      product: key,
      label: PRODUCT_META[key].label,
      total: number(current?.total) + number(item.total),
      active: number(current?.active) + number(item.active),
      usage: number(current?.usage) + usageNumber(item.usage),
      attention: number(current?.attention) + number(item.attention),
      health:
        current?.health === "critical" || nextHealth === "critical"
          ? "critical"
          : current?.health === "warning" || nextHealth === "warning"
            ? "warning"
            : "healthy",
    });
  });
  return [...grouped.values()];
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const relativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const { styles } = useThemeStyles();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
          {title}
        </h2>
        <p className={`mt-1 text-xs ${styles.text.muted}`}>{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [overview, setOverview] = useState<AdminOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (quiet = false) => {
      quiet ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<AdminOverview>("/admin/overview", {
          method: "GET",
        });
        setOverview({
          ...EMPTY_OVERVIEW,
          ...data,
          summary: { ...EMPTY_OVERVIEW.summary, ...(data?.summary || {}) },
          engagement: {
            ...EMPTY_OVERVIEW.engagement,
            ...(data?.engagement || {}),
          },
          products: normalizeProducts(data?.products),
          attention: Array.isArray(data?.attention) ? data.attention : [],
          recentActivity: Array.isArray(data?.recentActivity)
            ? data.recentActivity
            : [],
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load admin overview",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiRequest],
  );

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const products = useMemo(() => {
    const byKey = new Map(overview.products.map((item) => [item.product, item]));
    return (Object.keys(PRODUCT_META) as ProductKey[]).map((product) => ({
      product,
      label: PRODUCT_META[product].label,
      total: 0,
      active: 0,
      usage: 0,
      health: "healthy" as const,
      attention: 0,
      ...byKey.get(product),
    }));
  }, [overview.products]);

  const maxEngagement = Math.max(
    1,
    ...Object.values(overview.engagement).map(number),
  );

  if (loading) return <Spinner label="Loading command center…" />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div
              className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${styles.badge.blue}`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Owner command center
            </div>
            <h1
              className={`text-2xl font-bold tracking-tight md:text-3xl ${styles.text.primary}`}
            >
              Platform overview
            </h1>
            <p className={`mt-2 max-w-2xl text-sm ${styles.text.secondary}`}>
              Customers, product health, billing and attention items across every
              RocketReplai workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overview.generatedAt && (
              <span className={`hidden text-xs sm:block ${styles.text.muted}`}>
                Updated {relativeTime(overview.generatedAt)}
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => void fetchOverview(true)}
              disabled={refreshing}
              className={`gap-2 ${styles.pill}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div
            className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.badge.red}`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Overview unavailable</p>
                <p className="mt-0.5 text-xs opacity-80">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-current bg-transparent"
              onClick={() => void fetchOverview()}
            >
              Try again
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-500" />}
            iconBg={styles.icon.blue}
            label="Customers"
            value={formatCompact(number(overview.summary.customers))}
            sub={
              <Link
                href="/admin/customers"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                Open directory <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          <StatCard
            icon={<Layers3 className="h-5 w-5 text-violet-500" />}
            iconBg={styles.icon.purple}
            label="Active subscriptions"
            value={formatCompact(number(overview.summary.activeSubscriptions))}
            sub={
              <span className={`text-xs ${styles.text.muted}`}>
                {formatCompact(number(overview.summary.workspaces))} product
                workspaces
              </span>
            }
          />
          <StatCard
            icon={<IndianRupee className="h-5 w-5 text-emerald-500" />}
            iconBg={styles.icon.green}
            label="Active monthly value"
            value={formatInr(number(overview.summary.monthlyValueInr))}
            sub={
              <span className={`text-xs ${styles.text.muted}`}>
                Based on stored or canonical plan amounts
              </span>
            }
          />
          <StatCard
            icon={<WalletCards className="h-5 w-5 text-amber-500" />}
            iconBg={styles.icon.amber}
            label="Pending payouts"
            value={formatInr(number(overview.summary.pendingPayoutAmountInr))}
            sub={
              <span className={`text-xs ${styles.text.muted}`}>
                {formatCompact(number(overview.summary.pendingPayouts))} requests
              </span>
            }
          />
        </div>

        <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
          <SectionHeading
            title="Product operations"
            description="Adoption, active access and issues requiring review"
          />
          <div className="relative z-10 mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {products.map((item) => {
              const meta = PRODUCT_META[item.product];
              const Icon = meta.icon;
              const activeShare = item.total
                ? Math.min(100, Math.round((item.active / item.total) * 100))
                : 0;
              return (
                <Link
                  key={item.product}
                  href={meta.href}
                  className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${styles.innerCard}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        item.health === "critical"
                          ? styles.badge.red
                          : item.health === "warning"
                            ? styles.badge.amber
                            : styles.badge.green
                      }`}
                    >
                      {item.attention
                        ? `${item.attention} to review`
                        : "Healthy"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${styles.text.primary}`}>
                        {item.label || meta.label}
                      </p>
                      <p className={`mt-1 text-xs ${styles.text.muted}`}>
                        {formatCompact(item.active)} active of {formatCompact(item.total)}
                      </p>
                    </div>
                    <ArrowUpRight
                      className={`h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${styles.text.muted}`}
                    />
                  </div>
                  <div
                    className={`mt-4 h-1.5 overflow-hidden rounded-full ${
                      isDark ? "bg-white/10" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.accent}`}
                      style={{ width: `${activeShare}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-[10px] ${styles.text.muted}`}>
                    {formatCompact(item.usage)} recorded usage events
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <SectionHeading
              title="Cross-channel engagement"
              description="Live persisted totals, not sampled growth estimates"
            />
            <div className="relative z-10 mt-6 space-y-5">
              {[
                ["Messages", overview.engagement.messages, MessageCircle, "bg-blue-500"],
                ["Conversations", overview.engagement.conversations, Bot, "bg-violet-500"],
                ["Leads", overview.engagement.leads, Sparkles, "bg-pink-500"],
                ["Appointments", overview.engagement.appointments, CalendarDays, "bg-emerald-500"],
                ["Calls", overview.engagement.calls, PhoneCall, "bg-cyan-500"],
              ].map(([label, rawValue, Icon, barClass]) => {
                const value = number(rawValue);
                const width = value ? Math.max(4, (value / maxEngagement) * 100) : 0;
                const EngagementIcon = Icon as typeof Bot;
                return (
                  <div key={String(label)}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span
                        className={`flex items-center gap-2 text-xs font-medium ${styles.text.secondary}`}
                      >
                        <EngagementIcon className="h-3.5 w-3.5" />
                        {String(label)}
                      </span>
                      <span className={`text-sm font-semibold ${styles.text.primary}`}>
                        {formatCompact(value)}
                      </span>
                    </div>
                    <div
                      className={`h-2 overflow-hidden rounded-full ${
                        isDark ? "bg-white/[0.06]" : "bg-gray-100"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${String(barClass)}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            id="attention"
            className={`scroll-mt-24 rounded-2xl p-5 md:p-6 ${styles.card}`}
          >
            <SectionHeading
              title="Attention queue"
              description="Billing, quota and integration conditions to resolve"
              action={
                <Activity className={`h-4 w-4 ${styles.text.muted}`} />
              }
            />
            <div className="relative z-10 mt-4 space-y-2">
              {overview.attention.length === 0 ? (
                <div className={`rounded-xl p-5 text-center ${styles.innerCard}`}>
                  <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                  <p className={`mt-2 text-sm font-medium ${styles.text.primary}`}>
                    Everything looks healthy
                  </p>
                  <p className={`mt-1 text-xs ${styles.text.muted}`}>
                    No operational alerts are currently open.
                  </p>
                </div>
              ) : (
                overview.attention.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href || "/admin"}
                    className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${styles.innerCard} ${styles.rowHover}`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.severity === "critical"
                          ? styles.icon.red
                          : item.severity === "warning"
                            ? styles.icon.amber
                            : styles.icon.blue
                      }`}
                    >
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          item.severity === "critical"
                            ? "text-red-500"
                            : item.severity === "warning"
                              ? "text-amber-500"
                              : "text-blue-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-xs font-semibold ${styles.text.primary}`}>
                          {item.title}
                        </p>
                        <span className={`text-xs font-bold ${styles.text.secondary}`}>
                          {item.count}
                        </span>
                      </div>
                      <p className={`mt-1 line-clamp-2 text-[11px] ${styles.text.muted}`}>
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <SectionHeading
              title="Recent platform activity"
              description="New customers, workspaces and billing events"
              action={<Clock3 className={`h-4 w-4 ${styles.text.muted}`} />}
            />
            <div className="relative z-10 mt-4 divide-y divide-black/5 dark:divide-white/[0.06]">
              {overview.recentActivity.length === 0 ? (
                <p className={`py-8 text-center text-xs ${styles.text.muted}`}>
                  Activity will appear as customers use the platform.
                </p>
              ) : (
                overview.recentActivity.slice(0, 8).map((item) => {
                  const activityProduct = productKey(item.product);
                  const meta = activityProduct
                    ? PRODUCT_META[activityProduct]
                    : undefined;
                  const Icon = meta?.icon || Activity;
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.innerCard}`}>
                        <Icon className={`h-4 w-4 ${meta?.iconClass || "text-blue-500"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs font-semibold ${styles.text.primary}`}>
                          {item.title}
                        </p>
                        <p className={`mt-0.5 truncate text-[11px] ${styles.text.muted}`}>
                          {item.description}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] ${styles.text.muted}`}>
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <SectionHeading
              title="Admin shortcuts"
              description="Common owner workflows"
            />
            <div className="relative z-10 mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`group flex items-center gap-3 rounded-xl p-3 transition-colors ${styles.innerCard} ${styles.rowHover}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon.blue}`}>
                      <Icon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${styles.text.primary}`}>
                        {action.title}
                      </p>
                      <p className={`mt-0.5 truncate text-[10px] ${styles.text.muted}`}>
                        {action.description}
                      </p>
                    </div>
                    <ArrowUpRight className={`h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${styles.text.muted}`} />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
