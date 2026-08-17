"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gauge,
  Instagram,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessageSquareText,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAdminCustomers,
  updateCustomerLimits,
} from "@/lib/services/admin-platform.api";
import {
  EmptyState,
  GateScreen,
  Orbs,
  Spinner,
  StatCard,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";

const PAGE_SIZE = 12;

const PRODUCT_KEYS = [
  "web",
  "instagram",
  "whatsapp",
  "call",
  "packages",
] as const;

type ProductKey = (typeof PRODUCT_KEYS)[number];
type CustomerSummary = Record<string, unknown>;

interface CustomerProducts {
  web: number;
  instagram: number;
  whatsapp: number;
  call: number;
  packages: number;
}

interface CustomerUsage {
  replies: number;
  tokens: number;
  messages: number;
  calls: number;
}

interface AdminCustomer {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  replyLimit: number;
  accountLimit: number;
  products: CustomerProducts;
  usage: CustomerUsage;
}

interface CustomerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface NormalizedCustomerResponse {
  items: AdminCustomer[];
  summary: CustomerSummary;
  pagination: CustomerPagination;
}

const PRODUCT_CONFIG = {
  web: {
    label: "Web AI",
    icon: Bot,
    dark: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
    light: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    dark: "border-pink-500/20 bg-pink-500/10 text-pink-400",
    light: "border-pink-200 bg-pink-50 text-pink-700",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    dark: "border-green-500/20 bg-green-500/10 text-green-400",
    light: "border-green-200 bg-green-50 text-green-700",
  },
  call: {
    label: "Voice AI",
    icon: PhoneCall,
    dark: "border-purple-500/20 bg-purple-500/10 text-purple-400",
    light: "border-purple-200 bg-purple-50 text-purple-700",
  },
  packages: {
    label: "Packages",
    icon: PackageCheck,
    dark: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    light: "border-amber-200 bg-amber-50 text-amber-700",
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function productCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value)) {
    if ("count" in value) return Math.max(0, asNumber(value.count));
    if ("total" in value) return Math.max(0, asNumber(value.total));
    if ("active" in value) return value.active ? 1 : 0;
    if ("enabled" in value) return value.enabled ? 1 : 0;
    return Object.keys(value).length > 0 ? 1 : 0;
  }
  return Math.max(0, asNumber(value));
}

function normalizeCustomer(value: unknown): AdminCustomer | null {
  if (!isRecord(value)) return null;

  const products = isRecord(value.products) ? value.products : {};
  const usage = isRecord(value.usage) ? value.usage : {};
  const limits = isRecord(value.limits) ? value.limits : {};
  const clerkId = asString(value.clerkId) || asString(value.userId);

  if (!clerkId) return null;

  return {
    clerkId,
    email: asString(value.email, "Email unavailable"),
    firstName: asString(value.firstName),
    lastName: asString(value.lastName),
    createdAt: asString(value.createdAt),
    replyLimit: Math.max(
      0,
      Math.round(asNumber(value.replyLimit ?? limits.replyLimit)),
    ),
    accountLimit: Math.max(
      0,
      Math.round(asNumber(value.accountLimit ?? limits.accountLimit, 1)),
    ),
    products: {
      web: productCount(products.web),
      instagram: productCount(products.instagram),
      whatsapp: productCount(products.whatsapp),
      call: productCount(products.call),
      packages: productCount(products.packages),
    },
    usage: {
      replies: Math.max(0, asNumber(usage.replies ?? value.totalReplies)),
      tokens: Math.max(0, asNumber(usage.tokens ?? value.totalTokens)),
      messages: Math.max(0, asNumber(usage.messages ?? value.totalMessages)),
      calls: Math.max(0, asNumber(usage.calls ?? value.totalCalls)),
    },
  };
}

function normalizeCustomerResponse(
  rawResponse: unknown,
  requestedPage: number,
): NormalizedCustomerResponse {
  const responseRecord = isRecord(rawResponse) ? rawResponse : {};
  const nestedData = isRecord(responseRecord.data) ? responseRecord.data : null;
  const payload =
    nestedData &&
    (Array.isArray(nestedData.items) || Array.isArray(nestedData.customers))
      ? nestedData
      : responseRecord;

  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.customers)
      ? payload.customers
      : [];
  const items = rawItems
    .map(normalizeCustomer)
    .filter((item): item is AdminCustomer => item !== null);
  const summary = isRecord(payload.summary) ? payload.summary : {};
  const rawPagination = isRecord(payload.pagination) ? payload.pagination : {};

  const page = Math.max(
    1,
    Math.round(
      asNumber(
        rawPagination.page ?? rawPagination.currentPage,
        requestedPage,
      ),
    ),
  );
  const limit = Math.max(
    1,
    Math.round(asNumber(rawPagination.limit ?? rawPagination.pageSize, PAGE_SIZE)),
  );
  const summaryTotal = readMetric(summary, [
    ["totalCustomers"],
    ["total"],
    ["customers"],
  ]);
  const total = Math.max(
    0,
    Math.round(
      asNumber(
        rawPagination.total ?? rawPagination.totalItems,
        summaryTotal ?? items.length,
      ),
    ),
  );
  const totalPages = Math.max(
    1,
    Math.round(
      asNumber(
        rawPagination.totalPages ?? rawPagination.pages,
        Math.ceil(total / limit) || 1,
      ),
    ),
  );

  return {
    items,
    summary,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext:
        typeof rawPagination.hasNext === "boolean"
          ? rawPagination.hasNext
          : typeof rawPagination.hasNextPage === "boolean"
            ? rawPagination.hasNextPage
          : page < totalPages,
      hasPrevious:
        typeof rawPagination.hasPrevious === "boolean"
          ? rawPagination.hasPrevious
          : typeof rawPagination.hasPreviousPage === "boolean"
            ? rawPagination.hasPreviousPage
          : typeof rawPagination.hasPrev === "boolean"
            ? rawPagination.hasPrev
            : page > 1,
    },
  };
}

function getNestedValue(
  source: Record<string, unknown>,
  path: readonly string[],
): unknown {
  let current: unknown = source;

  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }

  return current;
}

function readMetric(
  source: Record<string, unknown>,
  paths: readonly (readonly string[])[],
): number | undefined {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (value !== undefined && value !== null && value !== "") {
      const parsed = asNumber(value, Number.NaN);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatDate(value: string): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function customerName(customer: AdminCustomer): string {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email.split("@")[0] ||
    "Customer"
  );
}

function customerInitials(customer: AdminCustomer): string {
  const name = customerName(customer);
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "C"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as unknown;
      if (isRecord(parsed)) {
        return asString(parsed.error) || asString(parsed.message) || error.message;
      }
    } catch {
      return error.message;
    }
  }

  return "Unable to load customers. Please try again.";
}

function getVisiblePages(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function ProductBadges({
  products,
  isDark,
}: {
  products: CustomerProducts;
  isDark: boolean;
}) {
  const activeProducts = PRODUCT_KEYS.filter((key) => products[key] > 0);

  if (activeProducts.length === 0) {
    return (
      <span
        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs ${
          isDark
            ? "border-white/[0.08] bg-white/[0.03] text-white/35"
            : "border-gray-200 bg-gray-50 text-gray-500"
        }`}
      >
        No active products
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeProducts.map((key) => {
        const config = PRODUCT_CONFIG[key];
        const Icon = config.icon;
        const count = products[key];

        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${
              isDark ? config.dark : config.light
            }`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
            {count > 1 ? ` · ${count}` : ""}
          </span>
        );
      })}
    </div>
  );
}

export default function AdminCustomersPage() {
  const { user, isLoaded } = useUser();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const latestRequest = useRef(0);

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [summary, setSummary] = useState<CustomerSummary>({});
  const [pagination, setPagination] = useState<CustomerPagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<AdminCustomer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [replyLimitInput, setReplyLimitInput] = useState("");
  const [accountLimitInput, setAccountLimitInput] = useState("");
  const [reason, setReason] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(
    async (silent = false) => {
      if (!user) return;

      const requestId = ++latestRequest.current;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const response = await getAdminCustomers(apiRequest, {
          search,
          page,
          limit: PAGE_SIZE,
        });
        if (requestId !== latestRequest.current) return;

        const normalized = normalizeCustomerResponse(response, page);
        setCustomers(normalized.items);
        setSummary(normalized.summary);
        setPagination(normalized.pagination);
        setLastUpdatedAt(new Date());
      } catch (fetchError) {
        if (requestId !== latestRequest.current) return;
        setError(getErrorMessage(fetchError));
      } finally {
        if (requestId === latestRequest.current && !silent) setLoading(false);
      }
    },
    [apiRequest, page, search, user],
  );

  useEffect(() => {
    if (isLoaded && user) void fetchCustomers();
  }, [fetchCustomers, isLoaded, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers(true);
    setRefreshing(false);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchDraft.trim();

    if (nextSearch === search && page === 1) {
      void fetchCustomers();
      return;
    }

    setPage(1);
    setSearch(nextSearch);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setPage(1);
    setSearch("");
  };

  const fallbackProductTotal = useMemo(
    () =>
      customers.reduce(
        (total, customer) =>
          total +
          PRODUCT_KEYS.reduce(
            (count, key) => count + customer.products[key],
            0,
          ),
        0,
      ),
    [customers],
  );

  const metrics = useMemo(() => {
    const productMetrics = PRODUCT_KEYS.map((key) =>
      readMetric(summary, [
        ["products", key],
        ["productCounts", key],
        [`${key}Customers`],
      ]),
    ).filter((value): value is number => value !== undefined);
    const fallbackUsage = customers.reduce(
      (totals, customer) => ({
        replies: totals.replies + customer.usage.replies,
        tokens: totals.tokens + customer.usage.tokens,
        messages: totals.messages + customer.usage.messages,
        calls: totals.calls + customer.usage.calls,
      }),
      { replies: 0, tokens: 0, messages: 0, calls: 0 },
    );

    return {
      customers:
        readMetric(summary, [
          ["totalCustomers"],
          ["total"],
          ["customers"],
        ]) ?? pagination.total,
      products:
        readMetric(summary, [["activeProducts"], ["totalProducts"]]) ??
        (productMetrics.length > 0
          ? productMetrics.reduce((total, value) => total + value, 0)
          : fallbackProductTotal),
      replies:
        readMetric(summary, [
          ["usage", "replies"],
          ["totalReplies"],
          ["replies"],
        ]) ?? fallbackUsage.replies,
      messages:
        readMetric(summary, [
          ["usage", "messages"],
          ["totalMessages"],
          ["messages"],
        ]) ?? fallbackUsage.messages,
      tokens:
        readMetric(summary, [
          ["usage", "tokens"],
          ["totalTokens"],
          ["tokens"],
        ]) ?? fallbackUsage.tokens,
      calls:
        readMetric(summary, [
          ["usage", "calls"],
          ["totalCalls"],
          ["calls"],
        ]) ?? fallbackUsage.calls,
    };
  }, [customers, fallbackProductTotal, pagination.total, summary]);

  const visiblePages = useMemo(
    () => getVisiblePages(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  const openCustomer = (customer: AdminCustomer) => {
    setSelectedCustomer(customer);
    setReplyLimitInput(String(customer.replyLimit));
    setAccountLimitInput(String(customer.accountLimit));
    setReason("");
    setEditError(null);
    setConfirming(false);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open && saving) return;
    setModalOpen(open);
    if (!open) {
      setSelectedCustomer(null);
      setConfirming(false);
      setEditError(null);
    }
  };

  const validateLimitChanges = () => {
    if (!selectedCustomer) return null;

    const replyLimit = Number(replyLimitInput);
    const accountLimit = Number(accountLimitInput);
    const trimmedReason = reason.trim();

    if (
      !Number.isInteger(replyLimit) ||
      replyLimit < 0 ||
      replyLimit > 10_000_000
    ) {
      setEditError("Reply limit must be a whole number between 0 and 10,000,000.");
      return null;
    }

    if (
      !Number.isInteger(accountLimit) ||
      accountLimit < 1 ||
      accountLimit > 100
    ) {
      setEditError("Account limit must be a whole number between 1 and 100.");
      return null;
    }

    if (trimmedReason.length < 8) {
      setEditError("Enter a clear reason of at least 8 characters for the audit trail.");
      return null;
    }

    if (
      replyLimit === selectedCustomer.replyLimit &&
      accountLimit === selectedCustomer.accountLimit
    ) {
      setEditError("Change at least one limit before continuing.");
      return null;
    }

    setEditError(null);
    return { replyLimit, accountLimit, reason: trimmedReason };
  };

  const requestConfirmation = () => {
    if (validateLimitChanges()) setConfirming(true);
  };

  const handleUpdateLimits = async () => {
    if (!selectedCustomer) return;
    const changes = validateLimitChanges();
    if (!changes) {
      setConfirming(false);
      return;
    }

    setSaving(true);
    try {
      const updateResponse = await updateCustomerLimits(
        apiRequest,
        selectedCustomer.clerkId,
        changes,
      );

      const updatedCustomer =
        normalizeCustomer({
          ...selectedCustomer,
          ...(isRecord(updateResponse?.customer)
            ? updateResponse.customer
            : {}),
          products: selectedCustomer.products,
          usage: selectedCustomer.usage,
          replyLimit:
            updateResponse?.customer?.replyLimit ?? changes.replyLimit,
          accountLimit:
            updateResponse?.customer?.accountLimit ?? changes.accountLimit,
        }) ?? {
          ...selectedCustomer,
          replyLimit: changes.replyLimit,
          accountLimit: changes.accountLimit,
        };
      setSelectedCustomer(updatedCustomer);
      setCustomers((current) =>
        current.map((customer) =>
          customer.clerkId === updatedCustomer.clerkId
            ? updatedCustomer
            : customer,
        ),
      );
      setReason("");
      setConfirming(false);

      toast({
        title: "Customer limits updated",
        description: `${customerName(updatedCustomer)} now has ${formatNumber(
          changes.replyLimit,
        )} replies and ${formatNumber(changes.accountLimit)} accounts.`,
        duration: 4000,
      });

      await fetchCustomers(true);
    } catch (updateError) {
      const message = getErrorMessage(updateError);
      setEditError(message);
      setConfirming(false);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: message,
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const accessDenied =
    error?.toLowerCase().includes("access_denied") ||
    error?.toLowerCase().includes("forbidden") ||
    error?.toLowerCase().includes("owner access");

  if (!isLoaded || (loading && customers.length === 0 && !error)) {
    return <Spinner label="Loading customers…" />;
  }

  if (!user) {
    return (
      <GateScreen
        icon={<LockKeyhole className="h-8 w-8 text-cyan-400" />}
        title="Authentication Required"
        body="Please sign in to access the customer directory."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm ${styles.pill}`}
        >
          Sign in <ArrowUpRight className="h-4 w-4" />
        </Link>
      </GateScreen>
    );
  }

  if (accessDenied) {
    return (
      <GateScreen
        icon={<ShieldCheck className="h-8 w-8 text-red-400" />}
        title="Access Denied"
        body="Owner access is required to manage customers."
      >
        <Link
          href="/admin"
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm ${styles.pill}`}
        >
          Back to overview <ArrowUpRight className="h-4 w-4" />
        </Link>
      </GateScreen>
    );
  }

  const resultStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const resultEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}

      <div className={styles.container}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon.purple}`}>
              <Users className="h-6 w-6 text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <h1 className={`text-xl font-bold md:text-2xl ${styles.text.primary}`}>
                Customer Directory
              </h1>
              <p className={`text-xs md:text-sm ${styles.text.secondary}`}>
                Review product access, usage, and account limits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${styles.pill}`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />}
            iconBg={styles.icon.blue}
            label="Total Customers"
            value={formatNumber(metrics.customers)}
            sub={<span className={`text-xs ${styles.text.muted}`}>Registered accounts</span>}
          />
          <StatCard
            icon={<PackageCheck className="h-5 w-5 text-green-500 dark:text-green-400" />}
            iconBg={styles.icon.green}
            label="Enabled Products"
            value={formatNumber(metrics.products)}
            sub={<span className={`text-xs ${styles.text.muted}`}>Product connections</span>}
          />
          <StatCard
            icon={<MessageSquareText className="h-5 w-5 text-purple-500 dark:text-purple-400" />}
            iconBg={styles.icon.purple}
            label="Customer Interactions"
            value={formatNumber(metrics.replies + metrics.messages)}
            sub={
              <span className={`text-xs ${styles.text.muted}`}>
                {formatNumber(metrics.replies)} replies · {formatNumber(metrics.messages)} messages
              </span>
            }
          />
          <StatCard
            icon={<Coins className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
            iconBg={styles.icon.amber}
            label="AI Token Usage"
            value={formatNumber(metrics.tokens)}
            sub={
              <span className={`text-xs ${styles.text.muted}`}>
                {formatNumber(metrics.calls)} voice calls
              </span>
            }
          />
        </div>

        <div className={`rounded-2xl p-4 md:p-5 ${styles.card}`}>
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={handleSearch}
              className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl"
            >
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${styles.text.muted}`} />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search by name, email, or Clerk ID"
                  className={`h-10 w-full rounded-xl border py-2 pl-10 pr-10 text-sm outline-none focus:ring-2 ${styles.input}`}
                />
                {searchDraft && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 ${styles.text.muted}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className={`inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium ${styles.button.primary}`}
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>

            <div className={`flex items-center gap-2 text-xs ${styles.text.muted}`}>
              <SlidersHorizontal className="h-4 w-4" />
              {search ? `Results for “${search}”` : "All customers"}
              {lastUpdatedAt && (
                <span className="hidden sm:inline">
                  · Updated {lastUpdatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              isDark
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void fetchCustomers()}
              className="text-sm font-semibold underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        <div className={`overflow-hidden rounded-2xl ${styles.card}`}>
          <div className={`relative z-10 flex items-center justify-between px-5 py-4 ${styles.divider}`}>
            <div>
              <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                Customers
              </h2>
              <p className={`mt-0.5 text-xs ${styles.text.muted}`}>
                Showing {resultStart}–{resultEnd} of {formatNumber(pagination.total)}
              </p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />}
          </div>

          {customers.length === 0 && !loading ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              label={search ? "No customers match this search." : "No customers found."}
            />
          ) : (
            <>
              <div className="relative z-10 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1040px]">
                  <thead>
                    <tr className={styles.divider}>
                      {[
                        "Customer",
                        "Joined",
                        "Products",
                        "Usage",
                        "Limits",
                        "",
                      ].map((heading) => (
                        <th
                          key={heading || "actions"}
                          className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${styles.text.muted}`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer.clerkId}
                        className={`border-b last:border-b-0 ${
                          isDark ? "border-white/[0.06]" : "border-gray-100"
                        } ${styles.rowHover}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-xs font-bold text-white shadow-sm">
                              {customerInitials(customer)}
                            </div>
                            <div className="min-w-0">
                              <p className={`max-w-[210px] truncate text-sm font-semibold ${styles.text.primary}`}>
                                {customerName(customer)}
                              </p>
                              <p className={`mt-0.5 max-w-[210px] truncate text-xs ${styles.text.secondary}`}>
                                {customer.email}
                              </p>
                              <p className={`mt-0.5 max-w-[210px] truncate font-mono text-[10px] ${styles.text.muted}`}>
                                {customer.clerkId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-5 py-4 text-xs ${styles.text.secondary}`}>
                          {formatDate(customer.createdAt)}
                        </td>
                        <td className="max-w-[300px] px-5 py-4">
                          <ProductBadges products={customer.products} isDark={isDark} />
                        </td>
                        <td className="px-5 py-4">
                          <div className={`space-y-1 text-xs ${styles.text.secondary}`}>
                            <p>{formatNumber(customer.usage.replies)} replies</p>
                            <p>{formatNumber(customer.usage.tokens)} tokens</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`space-y-1 text-xs ${styles.text.secondary}`}>
                            <p>{formatNumber(customer.replyLimit)} replies</p>
                            <p>{formatNumber(customer.accountLimit)} accounts</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openCustomer(customer)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${styles.pill}`}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            View & edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="relative z-10 divide-y divide-gray-100 dark:divide-white/[0.06] md:hidden">
                {customers.map((customer) => (
                  <article key={customer.clerkId} className="space-y-4 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-xs font-bold text-white">
                        {customerInitials(customer)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${styles.text.primary}`}>
                          {customerName(customer)}
                        </p>
                        <p className={`truncate text-xs ${styles.text.secondary}`}>
                          {customer.email}
                        </p>
                        <p className={`mt-1 text-[10px] ${styles.text.muted}`}>
                          Joined {formatDate(customer.createdAt)}
                        </p>
                      </div>
                    </div>

                    <ProductBadges products={customer.products} isDark={isDark} />

                    <div className={`grid grid-cols-2 gap-2 rounded-xl p-3 ${styles.innerCard}`}>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Usage</p>
                        <p className={`mt-1 text-xs font-medium ${styles.text.primary}`}>
                          {formatNumber(customer.usage.replies)} replies
                        </p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Limits</p>
                        <p className={`mt-1 text-xs font-medium ${styles.text.primary}`}>
                          {formatNumber(customer.replyLimit)} / {formatNumber(customer.accountLimit)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCustomer(customer)}
                      className={`flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium ${styles.pill}`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      View details and edit limits
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {pagination.totalPages > 1 && (
            <div className={`relative z-10 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}>
              <p className={`text-xs ${styles.text.muted}`}>
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPrevious || loading}
                  aria-label="Previous page"
                  className={`flex h-9 w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 ${styles.pill}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {visiblePages.map((pageNumber) => {
                  const active = pageNumber === pagination.page;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      disabled={loading}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-sm"
                          : styles.pill
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1),
                    )
                  }
                  disabled={!pagination.hasNext || loading}
                  aria-label="Next page"
                  className={`flex h-9 w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 ${styles.pill}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={handleModalOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={`fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border p-0 shadow-2xl focus:outline-none ${
              isDark
                ? "border-white/[0.08] bg-[#15151A] text-white"
                : "border-gray-200 bg-white text-gray-900"
            }`}
          >
            {selectedCustomer && (
              <>
                <div className={`sticky top-0 z-10 flex items-start justify-between gap-4 border-b p-5 backdrop-blur-xl md:p-6 ${
                  isDark
                    ? "border-white/[0.06] bg-[#15151A]/95"
                    : "border-gray-100 bg-white/95"
                }`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-sm font-bold text-white">
                      {customerInitials(selectedCustomer)}
                    </div>
                    <div className="min-w-0">
                      <Dialog.Title className={`truncate text-lg font-bold ${styles.text.primary}`}>
                        {customerName(selectedCustomer)}
                      </Dialog.Title>
                      <Dialog.Description className={`mt-0.5 truncate text-xs ${styles.text.secondary}`}>
                        {selectedCustomer.email}
                      </Dialog.Description>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      disabled={saving}
                      aria-label="Close customer details"
                      className={`rounded-lg p-2 disabled:opacity-40 ${styles.pill}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="space-y-6 p-5 md:p-6">
                  <section className={`rounded-xl p-4 ${styles.innerCard}`}>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 text-cyan-500" />
                        <div className="min-w-0">
                          <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Email</p>
                          <p className={`mt-1 truncate text-xs font-medium ${styles.text.primary}`}>
                            {selectedCustomer.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 h-4 w-4 text-purple-500" />
                        <div>
                          <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Joined</p>
                          <p className={`mt-1 text-xs font-medium ${styles.text.primary}`}>
                            {formatDate(selectedCustomer.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <UserRound className="mt-0.5 h-4 w-4 text-amber-500" />
                        <div className="min-w-0">
                          <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>Clerk ID</p>
                          <p className={`mt-1 truncate font-mono text-[11px] ${styles.text.primary}`}>
                            {selectedCustomer.clerkId}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className={`mb-3 text-sm font-semibold ${styles.text.primary}`}>Products</h3>
                    <ProductBadges products={selectedCustomer.products} isDark={isDark} />
                  </section>

                  <section>
                    <h3 className={`mb-3 text-sm font-semibold ${styles.text.primary}`}>Usage</h3>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {[
                        { label: "Replies", value: selectedCustomer.usage.replies, icon: MessageSquareText, cls: "text-blue-500" },
                        { label: "Tokens", value: selectedCustomer.usage.tokens, icon: Coins, cls: "text-amber-500" },
                        { label: "Messages", value: selectedCustomer.usage.messages, icon: MessageCircle, cls: "text-green-500" },
                        { label: "Calls", value: selectedCustomer.usage.calls, icon: PhoneCall, cls: "text-purple-500" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className={`rounded-xl p-3 ${styles.innerCard}`}>
                            <Icon className={`h-4 w-4 ${item.cls}`} />
                            <p className={`mt-3 text-lg font-bold ${styles.text.primary}`}>
                              {formatNumber(item.value)}
                            </p>
                            <p className={`text-[11px] ${styles.text.muted}`}>{item.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className={`rounded-2xl border p-4 md:p-5 ${
                    isDark
                      ? "border-white/[0.08] bg-white/[0.025]"
                      : "border-gray-100 bg-gray-50/70"
                  }`}>
                    <div className="mb-4 flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-cyan-500" />
                      <div>
                        <h3 className={`text-sm font-semibold ${styles.text.primary}`}>Account limits</h3>
                        <p className={`text-xs ${styles.text.muted}`}>Changes are recorded with the reason below.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={`text-xs font-medium ${styles.text.secondary}`}>Reply limit</span>
                        <input
                          type="number"
                          min={0}
                          max={10_000_000}
                          step={1}
                          value={replyLimitInput}
                          onChange={(event) => {
                            setReplyLimitInput(event.target.value);
                            setConfirming(false);
                            setEditError(null);
                          }}
                          disabled={saving}
                          className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 disabled:opacity-60 ${styles.input}`}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className={`text-xs font-medium ${styles.text.secondary}`}>Connected account limit</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={accountLimitInput}
                          onChange={(event) => {
                            setAccountLimitInput(event.target.value);
                            setConfirming(false);
                            setEditError(null);
                          }}
                          disabled={saving}
                          className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 disabled:opacity-60 ${styles.input}`}
                        />
                      </label>
                    </div>

                    <label className="mt-4 block space-y-2">
                      <span className={`text-xs font-medium ${styles.text.secondary}`}>
                        Reason for change <span className="text-red-500">*</span>
                      </span>
                      <textarea
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value);
                          setConfirming(false);
                          setEditError(null);
                        }}
                        disabled={saving}
                        maxLength={300}
                        rows={3}
                        placeholder="Explain why these limits are being changed…"
                        className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:opacity-60 ${styles.input}`}
                      />
                      <span className={`block text-right text-[10px] ${styles.text.muted}`}>
                        {reason.trim().length}/300
                      </span>
                    </label>

                    {editError && (
                      <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${
                        isDark
                          ? "border-red-500/20 bg-red-500/10 text-red-300"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}>
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {editError}
                      </div>
                    )}

                    {confirming && !editError && (
                      <div className={`mt-4 rounded-xl border p-4 ${
                        isDark
                          ? "border-amber-500/20 bg-amber-500/10"
                          : "border-amber-200 bg-amber-50"
                      }`}>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                          <div>
                            <p className={`text-sm font-semibold ${styles.text.primary}`}>Confirm limit change</p>
                            <p className={`mt-1 text-xs leading-5 ${styles.text.secondary}`}>
                              Set reply limit to {formatNumber(Number(replyLimitInput))} and account limit to {formatNumber(Number(accountLimitInput))}. Reason: “{reason.trim()}”
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          confirming
                            ? setConfirming(false)
                            : handleModalOpenChange(false)
                        }
                        disabled={saving}
                        className={`px-4 py-2.5 text-sm disabled:opacity-50 ${styles.pill}`}
                      >
                        {confirming ? "Back" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirming
                            ? void handleUpdateLimits()
                            : requestConfirmation()
                        }
                        disabled={saving}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${styles.button.primary}`}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : confirming ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {saving
                          ? "Updating…"
                          : confirming
                            ? "Confirm update"
                            : "Review changes"}
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
