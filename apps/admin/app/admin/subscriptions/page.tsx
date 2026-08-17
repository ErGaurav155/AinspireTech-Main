"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  ExternalLink,
  Filter,
  IndianRupee,
  Instagram,
  Layers3,
  MessageCircle,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Orbs,
  Spinner,
  StatCard,
  Textarea,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";

type SubscriptionStatus =
  | "trial"
  | "active"
  | "paused"
  | "past_due"
  | "cancelled"
  | "expired";

interface AdminSubscription {
  id: string;
  clerkId: string;
  customer?: {
    name?: string;
    email?: string;
  };
  product: string;
  plan: string;
  status: SubscriptionStatus;
  billingCycle?: string;
  amountInr: number | null;
  usage?: number | null;
  limit?: number | null;
  externalId?: string;
  createdAt?: string;
  expiresAt?: string;
}

interface SubscriptionResponse {
  items: AdminSubscription[];
  summary: {
    total: number;
    active: number;
    paused: number;
    trial: number;
    pastDue: number;
    expiringSoon: number;
    monthlyValueInr: number;
    byProduct?: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const EMPTY_RESPONSE: SubscriptionResponse = {
  items: [],
  summary: {
    total: 0,
    active: 0,
    paused: 0,
    trial: 0,
    pastDue: 0,
    expiringSoon: 0,
    monthlyValueInr: 0,
    byProduct: {},
  },
  pagination: { page: 1, limit: 20, total: 0, pages: 1 },
};

const PRODUCT_OPTIONS = [
  ["all", "All products"],
  ["web", "Web AI"],
  ["instagram", "Instagram"],
  ["whatsapp", "WhatsApp"],
  ["call", "Voice AI"],
  ["packages", "Packages & services"],
] as const;

const STATUS_OPTIONS: Array<["all" | SubscriptionStatus, string]> = [
  ["all", "All statuses"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["trial", "Trial"],
  ["past_due", "Past due"],
  ["cancelled", "Cancelled"],
  ["expired", "Expired"],
];

const EDITABLE_STATUSES: Array<[SubscriptionStatus, string]> = [
  ["active", "Active"],
  ["paused", "Paused"],
  ["trial", "Trial"],
  ["past_due", "Past due"],
  ["cancelled", "Cancelled"],
  ["expired", "Expired"],
];

const REGULAR_EDITABLE_STATUSES = EDITABLE_STATUSES.filter(
  ([value]) => value !== "trial" && value !== "past_due",
);

const normalizeProduct = (product: string) => {
  const value = product.toLowerCase().replace(/_/g, "-");
  if (value.includes("insta")) return "instagram";
  if (value.includes("whatsapp")) return "whatsapp";
  if (value.includes("call") || value.includes("voice")) return "call";
  if (
    value.includes("package") ||
    value.includes("meta-ads") ||
    value.includes("maintenance") ||
    value.includes("content-creation")
  )
    return "packages";
  return "web";
};

const PRODUCT_META: Record<
  string,
  { label: string; icon: typeof Bot; badge: string; text: string }
> = {
  web: {
    label: "Web AI",
    icon: Bot,
    badge: "bg-violet-500/10 border-violet-500/20",
    text: "text-violet-500",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    badge: "bg-pink-500/10 border-pink-500/20",
    text: "text-pink-500",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    badge: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-500",
  },
  call: {
    label: "Voice AI",
    icon: PhoneCall,
    badge: "bg-cyan-500/10 border-cyan-500/20",
    text: "text-cyan-500",
  },
  packages: {
    label: "Packages",
    icon: PackageCheck,
    badge: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-500",
  },
};

const STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  active:
    "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500",
  paused: "bg-amber-500/10 border border-amber-500/20 text-amber-500",
  trial: "bg-blue-500/10 border border-blue-500/20 text-blue-500",
  past_due: "bg-amber-500/10 border border-amber-500/20 text-amber-500",
  cancelled: "bg-red-500/10 border border-red-500/20 text-red-500",
  expired: "bg-gray-500/10 border border-gray-500/20 text-gray-500",
};

const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const displayStatus = (status: SubscriptionStatus) =>
  status.replace(/_/g, " ");

function ProductBadge({ product }: { product: string }) {
  const key = normalizeProduct(product);
  const meta = PRODUCT_META[key];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium ${meta.badge} ${meta.text}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium capitalize ${STATUS_CLASSES[status] || STATUS_CLASSES.expired}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {displayStatus(status)}
    </span>
  );
}

export default function AdminSubscriptionsPage() {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [data, setData] = useState<SubscriptionResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminSubscription | null>(null);
  const [nextStatus, setNextStatus] = useState<SubscriptionStatus>("active");
  const [reason, setReason] = useState("");
  const requestSequence = useRef(0);

  const fetchSubscriptions = useCallback(
    async (quiet = false) => {
      const requestId = ++requestSequence.current;
      quiet ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (search) params.set("search", search);
        if (product !== "all") params.set("product", product);
        if (status !== "all") params.set("status", status);
        const response = await apiRequest<SubscriptionResponse>(
          `/admin/subscriptions?${params.toString()}`,
          { method: "GET" },
        );
        if (requestId !== requestSequence.current) return;
        setData({
          ...EMPTY_RESPONSE,
          ...response,
          items: Array.isArray(response?.items) ? response.items : [],
          summary: {
            ...EMPTY_RESPONSE.summary,
            ...(response?.summary || {}),
          },
          pagination: {
            ...EMPTY_RESPONSE.pagination,
            ...(response?.pagination || {}),
          },
        });
      } catch (requestError) {
        if (requestId !== requestSequence.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load subscriptions",
        );
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [apiRequest, page, product, search, status],
  );

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  const openSubscription = (subscription: AdminSubscription) => {
    setSelected(subscription);
    setNextStatus(subscription.status);
    setReason("");
  };

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const updateStatus = async () => {
    if (!selected || saving) return;
    if (nextStatus === selected.status) {
      toast({
        title: "No change selected",
        description: "Choose a different entitlement status.",
      });
      return;
    }
    if (reason.trim().length < 5) {
      toast({
        title: "Reason required",
        description: "Add a short reason so this override is auditable.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await apiRequest(
        `/admin/subscriptions/${encodeURIComponent(selected.product)}/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus, reason: reason.trim() }),
        },
      );
      toast({
        title: "Subscription updated",
        description: `${selected.customer?.email || selected.clerkId} is now ${displayStatus(nextStatus)}.`,
      });
      setSelected(null);
      await fetchSubscriptions(true);
    } catch (requestError) {
      toast({
        title: "Update failed",
        description:
          requestError instanceof Error
            ? requestError.message
            : "The subscription could not be updated.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const visibleRange = useMemo(() => {
    if (!data.pagination.total) return "0 results";
    const start = (data.pagination.page - 1) * data.pagination.limit + 1;
    const end = Math.min(
      data.pagination.total,
      start + data.items.length - 1,
    );
    return `${start}–${end} of ${data.pagination.total}`;
  }, [data.items.length, data.pagination]);

  if (loading) return <Spinner label="Loading subscriptions…" />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${styles.badge.green}`}>
              <CreditCard className="h-3.5 w-3.5" />
              Billing & entitlements
            </div>
            <h1 className={`text-2xl font-bold md:text-3xl ${styles.text.primary}`}>
              Subscriptions
            </h1>
            <p className={`mt-2 text-sm ${styles.text.secondary}`}>
              One view for Web AI, Instagram, WhatsApp, Voice AI and managed
              packages.
            </p>
          </div>
          <Button
            variant="outline"
            className={`gap-2 ${styles.pill}`}
            disabled={refreshing}
            onClick={() => void fetchSubscriptions(true)}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${styles.badge.red}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Could not load subscriptions</p>
                <p className="mt-0.5 text-xs opacity-80">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void fetchSubscriptions()}>
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Layers3 className="h-5 w-5 text-blue-500" />}
            iconBg={styles.icon.blue}
            label="All subscriptions"
            value={data.summary.total}
            sub={<span className={`text-xs ${styles.text.muted}`}>{data.summary.active} active access grants</span>}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            iconBg={styles.icon.green}
            label="Active & trial"
            value={data.summary.active + data.summary.trial}
            sub={<span className={`text-xs ${styles.text.muted}`}>{data.summary.trial} currently in trial</span>}
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5 text-amber-500" />}
            iconBg={styles.icon.amber}
            label="Needs attention"
            value={data.summary.paused + data.summary.pastDue + data.summary.expiringSoon}
            sub={<span className={`text-xs ${styles.text.muted}`}>{data.summary.paused} paused · {data.summary.pastDue} past due · {data.summary.expiringSoon} expiring</span>}
          />
          <StatCard
            icon={<IndianRupee className="h-5 w-5 text-violet-500" />}
            iconBg={styles.icon.purple}
            label="Active monthly value"
            value={formatInr(data.summary.monthlyValueInr || 0)}
            sub={<span className={`text-xs ${styles.text.muted}`}>Only plans with reliable amounts</span>}
          />
        </div>

        <section className={`rounded-2xl p-4 md:p-5 ${styles.card}`}>
          <form
            onSubmit={applySearch}
            className="relative z-10 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_170px_auto]"
          >
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${styles.text.muted}`} />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search email, customer, plan or ID"
                className={`h-10 pl-9 ${styles.input}`}
              />
            </div>
            <div className="relative">
              <Filter className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${styles.text.muted}`} />
              <select
                value={product}
                onChange={(event) => {
                  setPage(1);
                  setProduct(event.target.value);
                }}
                className={`h-10 w-full appearance-none rounded-xl border pl-9 pr-3 text-sm ${styles.input}`}
              >
                {PRODUCT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className={`h-10 rounded-xl border px-3 text-sm ${styles.input}`}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button type="submit" className="h-10 gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <Search className="h-4 w-4" /> Search
            </Button>
          </form>
        </section>

        <section className={`overflow-hidden rounded-2xl ${styles.card}`}>
          <div className={`relative z-10 flex items-center justify-between px-5 py-4 ${styles.divider}`}>
            <div>
              <h2 className={`text-sm font-semibold ${styles.text.primary}`}>Subscription registry</h2>
              <p className={`mt-1 text-xs ${styles.text.muted}`}>{visibleRange}</p>
            </div>
            {(search || product !== "all" || status !== "all") && (
              <button
                className="text-xs font-medium text-blue-500 hover:underline"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setProduct("all");
                  setStatus("all");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {data.items.length === 0 ? (
            <div className="relative z-10 px-6 py-16 text-center">
              <CircleDollarSign className={`mx-auto h-10 w-10 ${styles.text.muted}`} />
              <p className={`mt-3 text-sm font-semibold ${styles.text.primary}`}>No subscriptions found</p>
              <p className={`mt-1 text-xs ${styles.text.muted}`}>Try a broader search or status filter.</p>
            </div>
          ) : (
            <>
              <div className="relative z-10 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px]">
                  <thead className={styles.tableHeader}>
                    <tr>
                      {[
                        "Customer",
                        "Product",
                        "Plan",
                        "Billing",
                        "Usage",
                        "Renews / expires",
                        "Status",
                        "",
                      ].map((heading) => (
                        <th key={heading} className={styles.tableHead}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => {
                      const usagePercent =
                        item.usage != null && item.limit
                          ? Math.min(100, Math.round((item.usage / item.limit) * 100))
                          : null;
                      return (
                        <tr key={`${item.product}-${item.id}`} className={styles.tableRow}>
                          <td className={styles.tableCell}>
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.icon.blue}`}>
                                <UserRound className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <p className={`max-w-[180px] truncate text-xs font-semibold ${styles.text.primary}`}>
                                  {item.customer?.name || "Unnamed customer"}
                                </p>
                                <p className={`max-w-[190px] truncate text-[11px] ${styles.text.muted}`}>
                                  {item.customer?.email || item.clerkId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={styles.tableCell}><ProductBadge product={item.product} /></td>
                          <td className={styles.tableCell}>
                            <p className={`max-w-[150px] truncate text-xs font-medium ${styles.text.primary}`}>{item.plan || "—"}</p>
                          </td>
                          <td className={styles.tableCell}>
                            <p className={`text-xs ${styles.text.primary}`}>
                              {item.amountInr == null ? "Amount unavailable" : formatInr(item.amountInr)}
                            </p>
                            <p className={`mt-0.5 text-[10px] capitalize ${styles.text.muted}`}>{item.billingCycle || "embedded"}</p>
                          </td>
                          <td className={styles.tableCell}>
                            {usagePercent == null ? (
                              <span className={`text-xs ${styles.text.muted}`}>Not metered</span>
                            ) : (
                              <div className="w-28">
                                <div className="flex justify-between text-[10px]">
                                  <span className={styles.text.secondary}>{item.usage?.toLocaleString()}</span>
                                  <span className={styles.text.muted}>{usagePercent}%</span>
                                </div>
                                <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                                  <div className={`h-full rounded-full ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${usagePercent}%` }} />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className={styles.tableCell}>
                            <span className={`text-xs ${styles.text.secondary}`}>{formatDate(item.expiresAt)}</span>
                          </td>
                          <td className={styles.tableCell}><StatusBadge status={item.status} /></td>
                          <td className={`${styles.tableCell} text-right`}>
                            <Button variant="outline" size="sm" className={styles.pill} onClick={() => openSubscription(item)}>
                              Manage
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="relative z-10 divide-y divide-black/5 dark:divide-white/[0.06] lg:hidden">
                {data.items.map((item) => (
                  <button
                    key={`${item.product}-${item.id}`}
                    onClick={() => openSubscription(item)}
                    className={`w-full p-4 text-left transition-colors ${styles.rowHover}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${styles.text.primary}`}>
                          {item.customer?.name || item.customer?.email || "Unnamed customer"}
                        </p>
                        <p className={`mt-1 truncate text-xs ${styles.text.muted}`}>{item.plan}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <ProductBadge product={item.product} />
                      <span className={`text-xs ${styles.text.secondary}`}>
                        {item.amountInr == null ? "No stored amount" : formatInr(item.amountInr)}
                      </span>
                      <span className={`ml-auto text-[11px] ${styles.text.muted}`}>{formatDate(item.expiresAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className={`relative z-10 flex items-center justify-between gap-3 border-t px-4 py-3 ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}>
            <span className={`text-xs ${styles.text.muted}`}>{visibleRange}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={styles.pill}
                disabled={data.pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className={`min-w-16 text-center text-xs ${styles.text.secondary}`}>
                {data.pagination.page} / {Math.max(1, data.pagination.pages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className={styles.pill}
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className={styles.dialogContent}>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className={styles.text.primary}>Manage entitlement</DialogTitle>
                <DialogDescription className={styles.text.secondary}>
                  Review billing metadata and apply an audited local access override.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`rounded-xl p-3 ${styles.innerCard}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Customer</p>
                  <p className={`mt-1 truncate text-xs font-semibold ${styles.text.primary}`}>{selected.customer?.name || "Unnamed customer"}</p>
                  <p className={`mt-0.5 truncate text-[11px] ${styles.text.muted}`}>{selected.customer?.email || selected.clerkId}</p>
                </div>
                <div className={`rounded-xl p-3 ${styles.innerCard}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Product & plan</p>
                  <div className="mt-1"><ProductBadge product={selected.product} /></div>
                  <p className={`mt-1 truncate text-[11px] ${styles.text.secondary}`}>{selected.plan}</p>
                </div>
                <div className={`rounded-xl p-3 ${styles.innerCard}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Billing</p>
                  <p className={`mt-1 text-xs font-semibold ${styles.text.primary}`}>
                    {selected.amountInr == null ? "No reliable amount" : formatInr(selected.amountInr)}
                  </p>
                  <p className={`mt-0.5 text-[11px] capitalize ${styles.text.muted}`}>{selected.billingCycle || "Embedded access"}</p>
                </div>
                <div className={`rounded-xl p-3 ${styles.innerCard}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Lifecycle</p>
                  <div className="mt-1"><StatusBadge status={selected.status} /></div>
                  <p className={`mt-1 text-[11px] ${styles.text.muted}`}>Expires {formatDate(selected.expiresAt)}</p>
                </div>
              </div>

              {selected.externalId && (
                <div className={`flex items-center justify-between gap-3 rounded-xl p-3 ${styles.innerCard}`}>
                  <div className="min-w-0">
                    <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Provider / subscription ID</p>
                    <p className={`mt-1 truncate font-mono text-[11px] ${styles.text.secondary}`}>{selected.externalId}</p>
                  </div>
                  <ExternalLink className={`h-4 w-4 shrink-0 ${styles.text.muted}`} />
                </div>
              )}

              <div className="space-y-4 border-t border-black/5 pt-4 dark:border-white/[0.06]">
                <div className="space-y-2">
                  <Label htmlFor="subscription-status" className={styles.text.primary}>Override status</Label>
                  <select
                    id="subscription-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as SubscriptionStatus)}
                    className={`h-10 w-full rounded-xl border px-3 text-sm ${styles.input}`}
                  >
                    {(normalizeProduct(selected.product) === "whatsapp"
                      ? EDITABLE_STATUSES
                      : REGULAR_EDITABLE_STATUSES
                    ).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="override-reason" className={styles.text.primary}>Reason</Label>
                  <Textarea
                    id="override-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Why is this local access override required?"
                    className={`min-h-20 ${styles.input}`}
                  />
                  <p className={`text-[10px] ${styles.text.muted}`}>
                    This changes local platform access; it does not issue a provider refund.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" className={styles.pill} onClick={() => setSelected(null)} disabled={saving}>
                  Close
                </Button>
                <Button onClick={() => void updateStatus()} disabled={saving || nextStatus === selected.status} className="bg-blue-600 text-white hover:bg-blue-700">
                  {saving ? "Saving…" : "Apply override"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
