"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Database,
  Eye,
  Gauge,
  Hash,
  Loader2,
  MessageCircle,
  PackageCheck,
  PauseCircle,
  PhoneCall,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Orbs,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  getAdminWorkspaces,
  updateWorkspace,
  type AdminManagedServiceType,
  type AdminPagination,
  type AdminProduct,
  type AdminWorkspaceAction,
  type AdminWorkspaceItem,
  type AdminWorkspaceSummary,
} from "@/lib/services/admin-platform.api";

type UnknownRecord = Record<string, unknown>;

interface ProductConfig {
  title: string;
  singular: string;
  eyebrow: string;
  description: string;
  usageLabel: string;
  usageUnit: string;
  icon: LucideIcon;
  iconClasses: string;
  metricClasses: string;
  gradient: string;
  summaryUsageKeys: string[];
}

const PRODUCT_CONFIG: Record<AdminProduct, ProductConfig> = {
  whatsapp: {
    title: "WhatsApp Operations",
    singular: "WhatsApp workspace",
    eyebrow: "Messaging operations",
    description:
      "Monitor connected businesses, message usage, onboarding health, and operational access.",
    usageLabel: "Messages used",
    usageUnit: "messages",
    icon: MessageCircle,
    iconClasses: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    metricClasses: "from-emerald-500 to-teal-500",
    gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
    summaryUsageKeys: ["messagesUsed", "totalMessages", "usageUsed"],
  },
  call: {
    title: "AI Call Operations",
    singular: "call workspace",
    eyebrow: "Voice operations",
    description:
      "Track routing readiness, minute consumption, call-assistant health, and customer workspaces.",
    usageLabel: "Minutes used",
    usageUnit: "minutes",
    icon: PhoneCall,
    iconClasses: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    metricClasses: "from-cyan-500 to-blue-500",
    gradient: "from-cyan-500/15 via-blue-500/5 to-transparent",
    summaryUsageKeys: ["minutesUsed", "totalMinutes", "usageUsed"],
  },
  packages: {
    title: "Package Operations",
    singular: "package subscription",
    eyebrow: "Bundle operations",
    description:
      "Manage bundled services, setup readiness, package status, and subscription-level usage.",
    usageLabel: "Tracked usage",
    usageUnit: "units",
    icon: PackageCheck,
    iconClasses: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    metricClasses: "from-violet-500 to-fuchsia-500",
    gradient: "from-violet-500/15 via-fuchsia-500/5 to-transparent",
    summaryUsageKeys: ["usageUsed", "totalUsage", "managedSubscriptions"],
  },
};

const STATUS_OPTIONS: Record<
  AdminProduct,
  Array<{ value: string; label: string }>
> = {
  whatsapp: [
    { value: "all", label: "All statuses" },
    { value: "trial", label: "Trial" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "past_due", label: "Past due" },
    { value: "cancelled", label: "Cancelled" },
  ],
  call: [
    { value: "all", label: "All statuses" },
    { value: "trial", label: "Trial" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "past_due", label: "Past due" },
    { value: "cancelled", label: "Cancelled" },
  ],
  packages: [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "cancelled", label: "Cancelled" },
    { value: "expired", label: "Expired" },
  ],
};

const ACTIVE_STATUSES = new Set(["active", "connected", "ready", "enabled"]);
const TERMINAL_STATUSES = new Set(["cancelled", "canceled", "expired"]);

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return {};
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function managedServiceType(
  item: AdminWorkspaceItem,
): AdminManagedServiceType | undefined {
  const value = textValue(item.serviceType, item.product);
  switch (value) {
    case "package":
    case "meta-ads":
    case "website-maintenance":
    case "content-creation":
      return value;
    default:
      return undefined;
  }
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function itemId(item: AdminWorkspaceItem) {
  const workspace = asRecord(item.workspace);
  return textValue(
    item.id,
    item._id,
    workspace.id,
    workspace._id,
    item.subscriptionId,
  );
}

function workspaceName(item: AdminWorkspaceItem, config: ProductConfig) {
  const workspace = asRecord(item.workspace);
  const subscription = asRecord(item.subscription);
  return (
    textValue(
      item.name,
      item.workspaceName,
      item.businessName,
      item.organizationName,
      item.packageName,
      workspace.name,
      workspace.businessName,
      subscription.packageName,
      subscription.planName,
    ) || `${config.singular} ${itemId(item).slice(-6) || "record"}`
  );
}

function ownerInfo(item: AdminWorkspaceItem) {
  const workspace = asRecord(item.workspace);
  const workspaceOwner = asRecord(workspace.owner);
  const candidate =
    Object.keys(item.customer || {}).length > 0
      ? asRecord(item.customer)
      : Object.keys(item.owner || {}).length > 0
        ? asRecord(item.owner)
        : Object.keys(item.user || {}).length > 0
          ? asRecord(item.user)
          : workspaceOwner;

  const fullName = [candidate.firstName, candidate.lastName]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");

  return {
    name:
      textValue(candidate.name, fullName, item.businessName) ||
      "Unknown customer",
    email: textValue(candidate.email, item.email),
    phone: textValue(candidate.phone, item.phone),
    clerkId: textValue(candidate.clerkId, item.clerkId),
  };
}

function workspaceStatus(item: AdminWorkspaceItem) {
  const workspace = asRecord(item.workspace);
  const subscription = asRecord(item.subscription);
  return textValue(item.status, workspace.status, subscription.status) || "unknown";
}

function workspacePlan(item: AdminWorkspaceItem) {
  const plan = asRecord(item.plan);
  const subscription = asRecord(item.subscription);
  return (
    textValue(
      typeof item.plan === "string" ? item.plan : undefined,
      plan.name,
      plan.label,
      item.planName,
      subscription.planName,
      subscription.plan,
      item.packageName,
      item.packageId,
    ) || "No plan"
  );
}

function usageInfo(item: AdminWorkspaceItem, product: AdminProduct) {
  const config = PRODUCT_CONFIG[product];
  const usage = asRecord(item.usage);
  const limits = asRecord(item.limits);
  const metrics = asRecord(item.metrics);
  const overview = asRecord(item.overview);
  const workspace = asRecord(item.workspace);
  const workspaceOverview = asRecord(workspace.overview);

  const productUsed =
    product === "whatsapp"
      ? numberValue(
          typeof item.usage === "number" ? item.usage : undefined,
          item.messagesUsed,
          metrics.messagesUsed,
          overview.messagesUsed,
          workspaceOverview.messagesUsed,
        )
      : product === "call"
        ? numberValue(
            typeof item.usage === "number" ? item.usage : undefined,
            item.minutesUsed,
            metrics.minutesUsed,
            overview.minutesUsed,
            workspaceOverview.minutesUsed,
          )
        : numberValue(
            typeof item.usage === "number" ? item.usage : undefined,
            item.usageUsed,
            metrics.usageUsed,
            overview.usageUsed,
          );

  const productLimit =
    product === "whatsapp"
      ? numberValue(
          item.limit,
          item.messageLimit,
          metrics.messageLimit,
          overview.messageLimit,
          workspaceOverview.messageLimit,
        )
      : product === "call"
        ? numberValue(
            item.limit,
            item.minutesLimit,
            metrics.minutesLimit,
            overview.minutesLimit,
            workspaceOverview.minutesLimit,
          )
        : numberValue(
            item.limit,
            item.usageLimit,
            metrics.usageLimit,
            overview.usageLimit,
          );

  const used = numberValue(
    usage.used,
    usage.current,
    usage.consumed,
    product === "whatsapp"
      ? usage.messages
      : product === "call"
        ? usage.minutes
        : usage.services,
    productUsed,
  );
  const limit = numberValue(
    usage.limit,
    usage.total,
    product === "whatsapp"
      ? limits.messages
      : product === "call"
        ? limits.minutes
        : limits.services,
    productLimit,
  );
  const remaining = numberValue(usage.remaining);
  const resetAt = textValue(usage.resetAt, item.usageResetAt);

  return {
    used,
    limit,
    remaining,
    resetAt,
    unit: textValue(usage.unit) || config.usageUnit,
    percentage:
      used !== null && limit !== null && limit > 0
        ? Math.min(100, Math.max(0, (used / limit) * 100))
        : null,
  };
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  });
}

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en-IN");
}

function activityDate(item: AdminWorkspaceItem) {
  const workspace = asRecord(item.workspace);
  return textValue(
    item.lastActivity,
    item.updatedAt,
    workspace.updatedAt,
    item.createdAt,
  );
}

function statusClasses(status: string, isDark: boolean) {
  const value = status.toLowerCase();
  if (ACTIVE_STATUSES.has(value)) {
    return isDark
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "paused" || value === "pending" || value === "processing") {
    return isDark
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (
    value === "disabled" ||
    value === "error" ||
    value === "failed" ||
    TERMINAL_STATUSES.has(value)
  ) {
    return isDark
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-red-200 bg-red-50 text-red-700";
  }
  return isDark
    ? "border-white/10 bg-white/[0.05] text-white/60"
    : "border-gray-200 bg-gray-50 text-gray-600";
}

function summaryNumber(
  summary: AdminWorkspaceSummary,
  keys: string[],
  fallback = 0,
) {
  return numberValue(...keys.map((key) => summary[key])) ?? fallback;
}

function displayFact(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return textValue(value) || "—";
}

function productFacts(item: AdminWorkspaceItem, product: AdminProduct) {
  const workspace = asRecord(item.workspace);
  const metadata = {
    ...asRecord(item.metadata),
    ...asRecord(workspace.metadata),
    ...asRecord(workspace.meta),
  };
  const metrics = asRecord(item.metrics);
  const overview = {
    ...asRecord(workspace.overview),
    ...asRecord(item.overview),
    ...metrics,
  };
  const subscription = asRecord(item.subscription);

  if (product === "whatsapp") {
    return [
      {
        label: "Business phone",
        value: textValue(
          item.displayPhoneNumber,
          workspace.displayPhoneNumber,
          metadata.displayPhoneNumber,
        ),
      },
      {
        label: "WABA ID",
        value: textValue(item.wabaId, workspace.wabaId, metadata.wabaId),
      },
      {
        label: "Phone number ID",
        value: textValue(
          item.phoneNumberId,
          workspace.phoneNumberId,
          metadata.phoneNumberId,
        ),
      },
      {
        label: "Appointments",
        value: numberValue(item.appointmentsCount, overview.totalAppointments),
      },
    ];
  }

  if (product === "call") {
    return [
      {
        label: "Assigned number",
        value: textValue(
          item.assignedNumber,
          workspace.assignedNumber,
          metadata.assignedNumber,
        ),
      },
      {
        label: "Routing status",
        value: textValue(item.routingStatus, metadata.routingStatus),
      },
      {
        label: "Total calls",
        value: numberValue(item.totalCalls, overview.totalCalls),
      },
      {
        label: "Concurrent limit",
        value: numberValue(
          item.concurrentCallLimit,
          overview.concurrentCallLimit,
          subscription.concurrentCallLimit,
        ),
      },
    ];
  }

  return [
    {
      label: "Package ID",
      value: textValue(item.packageId, subscription.packageId),
    },
    {
      label: "Included services",
      value: item.includedServices || subscription.includedServices,
    },
    {
      label: "Billing cycle",
      value: textValue(item.billingCycle, subscription.billingCycle),
    },
    {
      label: "Amount",
      value:
        numberValue(item.amountInr, item.amount, subscription.amountInr) !== null
          ? `₹${numberValue(
              item.amountInr,
              item.amount,
              subscription.amountInr,
            )?.toLocaleString("en-IN")}`
          : "",
    },
  ];
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  color,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  color: string;
}) {
  const { styles, isDark } = useThemeStyles();
  return (
    <div className={`${styles.card} p-4 sm:p-5`}>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${styles.text.muted}`}>
            {label}
          </p>
          <p className={`mt-2 text-2xl font-black ${styles.text.primary}`}>
            {value}
          </p>
          <p className={`mt-1 truncate text-xs ${styles.text.secondary}`}>
            {helper}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${color} ${
            isDark ? "shadow-lg shadow-black/10" : ""
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function UsageDisplay({
  item,
  product,
  compact = false,
}: {
  item: AdminWorkspaceItem;
  product: AdminProduct;
  compact?: boolean;
}) {
  const { styles, isDark } = useThemeStyles();
  const usage = usageInfo(item, product);

  if (usage.used === null && usage.limit === null) {
    return <span className={`text-sm ${styles.text.muted}`}>Not reported</span>;
  }

  return (
    <div className={compact ? "min-w-[130px]" : "w-full"}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm font-semibold ${styles.text.primary}`}>
          {formatNumber(usage.used)}
          {usage.limit !== null ? ` / ${formatNumber(usage.limit)}` : ""}
        </span>
        {!compact && (
          <span className={`text-xs ${styles.text.muted}`}>{usage.unit}</span>
        )}
      </div>
      {usage.percentage !== null && (
        <div
          className={`mt-2 h-1.5 overflow-hidden rounded-full ${
            isDark ? "bg-white/[0.07]" : "bg-gray-100"
          }`}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r ${
              PRODUCT_CONFIG[product].metricClasses
            }`}
            style={{ width: `${usage.percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface PendingAction {
  item: AdminWorkspaceItem;
  action: AdminWorkspaceAction;
  targetStatus?: string;
}

export default function ProductOperationsPage({
  product,
}: {
  product: AdminProduct;
}) {
  const config = PRODUCT_CONFIG[product];
  const ProductIcon = config.icon;
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [items, setItems] = useState<AdminWorkspaceItem[]>([]);
  const [summary, setSummary] = useState<AdminWorkspaceSummary>({});
  const [pagination, setPagination] = useState<AdminPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<AdminWorkspaceItem | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const loadSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (refresh = false) => {
      const requestId = ++loadSequence.current;
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        const data = await getAdminWorkspaces(apiRequest, product, {
          search: debouncedSearch,
          status,
          page,
          limit: pagination.limit,
        });
        if (requestId !== loadSequence.current) return;

        const nextItems = Array.isArray(data?.items) ? data.items : [];
        const nextPagination = data?.pagination || ({} as AdminPagination);

        setItems(nextItems);
        setSummary(data?.summary || {});
        setPagination((current) => ({
          page: numberValue(nextPagination.page) || page,
          limit: numberValue(nextPagination.limit) || current.limit,
          total:
            numberValue(nextPagination.total) ||
            numberValue(data?.summary?.total) ||
            nextItems.length,
          totalPages: Math.max(
            1,
            numberValue(nextPagination.totalPages, nextPagination.pages) || 1,
          ),
          hasNextPage: nextPagination.hasNextPage,
          hasPreviousPage: nextPagination.hasPreviousPage,
        }));
      } catch (requestError) {
        if (requestId !== loadSequence.current) return;
        const message =
          requestError instanceof Error
            ? requestError.message
            : `Failed to load ${config.title.toLowerCase()}`;
        setError(message);
      } finally {
        if (requestId === loadSequence.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }, [
      apiRequest,
      config.title,
      debouncedSearch,
      page,
      pagination.limit,
      product,
      status,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openAction = useCallback(
    (
      item: AdminWorkspaceItem,
      action: AdminWorkspaceAction,
      targetStatus?: string,
    ) => {
      setSelectedItem(null);
      setReason("");
      setPendingAction({ item, action, targetStatus });
    },
    [],
  );

  const runPendingAction = useCallback(async () => {
    if (!pendingAction) return;
    const id = itemId(pendingAction.item);
    if (!id) {
      toast({
        title: "Workspace identifier missing",
        description: "This record cannot be updated until it has a stable ID.",
        variant: "destructive",
      });
      return;
    }
    const serviceType =
      product === "packages"
        ? managedServiceType(pendingAction.item)
        : undefined;
    if (product === "packages" && !serviceType) {
      toast({
        title: "Service type missing",
        description:
          "This managed-service record cannot be updated without its exact service type.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(id);
      const result = await updateWorkspace(apiRequest, product, id, {
        action: pendingAction.action,
        status: pendingAction.targetStatus,
        serviceType,
        reason: reason.trim(),
      });

      toast({
        title:
          pendingAction.action === "reset-usage"
            ? "Usage reset complete"
            : `Workspace ${pendingAction.targetStatus === "active" ? "activated" : "paused"}`,
        description:
          result?.message ||
          `The ${config.singular} was updated successfully.`,
      });
      setPendingAction(null);
      setReason("");
      await load(true);
    } catch (requestError) {
      toast({
        title: "Operation failed",
        description:
          requestError instanceof Error
            ? requestError.message
            : "The workspace could not be updated.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }, [apiRequest, config.singular, load, pendingAction, product, reason]);

  const metrics = useMemo(() => {
    const activeFallback = items.filter((item) =>
      ACTIVE_STATUSES.has(workspaceStatus(item).toLowerCase()),
    ).length;
    const pausedFallback = items.filter((item) =>
      ["paused", "disabled"].includes(workspaceStatus(item).toLowerCase()),
    ).length;
    const attentionFallback = items.filter((item) =>
      ["pending", "error", "failed", "disabled"].includes(
        workspaceStatus(item).toLowerCase(),
      ),
    ).length;
    const itemUsage = items.reduce(
      (total, item) => total + (usageInfo(item, product).used || 0),
      0,
    );
    const summaryUsage = asRecord(summary.usage);

    return {
      total: summaryNumber(summary, ["total", "totalWorkspaces"], pagination.total),
      active: summaryNumber(
        summary,
        ["active", "activeWorkspaces"],
        activeFallback,
      ),
      paused: summaryNumber(
        summary,
        ["paused", "disabled", "pausedWorkspaces"],
        pausedFallback,
      ),
      attention: summaryNumber(
        summary,
        ["needsAttention", "attention", "errors", "failed"],
        attentionFallback,
      ),
      usage:
        numberValue(
          ...config.summaryUsageKeys.map((key) => summary[key]),
          summaryUsage.used,
          summaryUsage.current,
        ) ?? itemUsage,
    };
  }, [config.summaryUsageKeys, items, pagination.total, product, summary]);

  const actionDialogOpen = Boolean(pendingAction);
  const actionItemStatus = pendingAction
    ? workspaceStatus(pendingAction.item).toLowerCase()
    : "";
  const actionItemId = pendingAction ? itemId(pendingAction.item) : "";
  const actionIsSaving = updatingId === actionItemId && Boolean(actionItemId);

  const ActionButtons = ({ item }: { item: AdminWorkspaceItem }) => {
    const id = itemId(item);
    const currentStatus = workspaceStatus(item).toLowerCase();
    const isActive = ACTIVE_STATUSES.has(currentStatus);
    const isTerminal = TERMINAL_STATUSES.has(currentStatus);
    const isUpdating = updatingId === id;

    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedItem(item)}
          className={`flex h-8 w-8 items-center justify-center ${styles.pill}`}
          title="View details"
          aria-label={`View ${workspaceName(item, config)} details`}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            openAction(item, "set-status", isActive ? "paused" : "active")
          }
          disabled={isUpdating || isTerminal || !id}
          className={`flex h-8 w-8 items-center justify-center ${styles.pill} disabled:cursor-not-allowed disabled:opacity-40`}
          title={
            isTerminal
              ? "Terminal workspaces cannot be reactivated"
              : isActive
                ? "Pause workspace"
                : "Activate workspace"
          }
          aria-label={isActive ? "Pause workspace" : "Activate workspace"}
        >
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isActive ? (
            <PauseCircle className="h-3.5 w-3.5" />
          ) : (
            <PlayCircle className="h-3.5 w-3.5" />
          )}
        </button>
        {product !== "packages" && (
          <button
            type="button"
            onClick={() => openAction(item, "reset-usage")}
            disabled={isUpdating || !id}
            className={`flex h-8 w-8 items-center justify-center ${styles.pill} disabled:cursor-not-allowed disabled:opacity-40`}
            title="Reset usage"
            aria-label="Reset workspace usage"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <section className={`${styles.card} overflow-hidden p-5 md:p-7`}>
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${config.gradient}`}
          />
          <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${config.iconClasses}`}
              >
                <ProductIcon className="h-6 w-6" />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${styles.text.muted}`}>
                  {config.eyebrow}
                </p>
                <h1 className={`mt-1 text-2xl font-black md:text-3xl ${styles.text.primary}`}>
                  {config.title}
                </h1>
                <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${styles.text.secondary}`}>
                  {config.description}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void load(true)}
              disabled={isRefreshing}
              className={`${styles.button.secondary} flex-shrink-0`}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh data
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Total workspaces"
            value={metrics.total.toLocaleString("en-IN")}
            helper="Matching this product"
            icon={<Database className="h-5 w-5 text-blue-400" />}
            color={isDark ? "border-blue-500/20 bg-blue-500/10" : "border-blue-100 bg-blue-50"}
          />
          <MetricCard
            label="Active"
            value={metrics.active.toLocaleString("en-IN")}
            helper="Currently operational"
            icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
            color={isDark ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}
          />
          <MetricCard
            label="Paused"
            value={metrics.paused.toLocaleString("en-IN")}
            helper={`${metrics.attention.toLocaleString("en-IN")} need attention`}
            icon={<PauseCircle className="h-5 w-5 text-amber-400" />}
            color={isDark ? "border-amber-500/20 bg-amber-500/10" : "border-amber-100 bg-amber-50"}
          />
          <MetricCard
            label={config.usageLabel}
            value={metrics.usage.toLocaleString("en-IN")}
            helper={`Across loaded ${config.usageUnit}`}
            icon={<Gauge className="h-5 w-5 text-violet-400" />}
            color={isDark ? "border-violet-500/20 bg-violet-500/10" : "border-violet-100 bg-violet-50"}
          />
        </section>

        <section className={`${styles.card} p-4`}>
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search workspaces</span>
              <Search
                className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${styles.text.muted}`}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, workspace, plan, email, or ID…"
                className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 ${styles.input}`}
              />
            </label>
            <label className="sm:w-48">
              <span className="sr-only">Filter by status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${styles.input}`}
              >
                {STATUS_OPTIONS[product].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error && (
          <section
            className={`rounded-2xl border p-5 ${
              isDark
                ? "border-red-500/20 bg-red-500/10"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div>
                  <p className={`text-sm font-bold ${styles.text.primary}`}>
                    Product operations could not be loaded
                  </p>
                  <p className={`mt-1 text-sm ${styles.text.secondary}`}>{error}</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => void load(true)}
                className={styles.button.secondary}
              >
                Try again
              </Button>
            </div>
          </section>
        )}

        {!error && isLoading ? (
          <section className={`${styles.card} flex min-h-72 items-center justify-center p-8`}>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
              <p className={`text-sm ${styles.text.secondary}`}>
                Loading real-time operations…
              </p>
            </div>
          </section>
        ) : !error && items.length === 0 ? (
          <section className={styles.card}>
            <EmptyState
              icon={<ProductIcon className="h-8 w-8" />}
              label={
                debouncedSearch || status !== "all"
                  ? "No workspaces match the current filters"
                  : `No ${config.singular} records are available yet`
              }
            />
          </section>
        ) : !error ? (
          <>
            <section className={`${styles.card} hidden overflow-hidden md:block`}>
              <div className="relative z-10 overflow-x-auto">
                <table className="w-full min-w-[940px]">
                  <thead>
                    <tr className={styles.divider}>
                      {[
                        "Workspace",
                        "Customer",
                        "Plan",
                        "Usage",
                        "Status",
                        "Last activity",
                        "Actions",
                      ].map((label) => (
                        <th
                          key={label}
                          className={`px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${styles.text.muted}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const owner = ownerInfo(item);
                      const itemStatus = workspaceStatus(item);
                      const id = itemId(item);
                      return (
                        <tr
                          key={id || `${workspaceName(item, config)}-${activityDate(item)}`}
                          className={`${styles.divider} ${styles.rowHover}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${config.iconClasses}`}
                              >
                                <ProductIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedItem(item)}
                                  className={`block max-w-[220px] truncate text-left text-sm font-bold hover:underline ${styles.text.primary}`}
                                >
                                  {workspaceName(item, config)}
                                </button>
                                <p className={`mt-0.5 max-w-[210px] truncate font-mono text-[11px] ${styles.text.muted}`}>
                                  {id || "ID unavailable"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className={`max-w-[180px] truncate text-sm font-medium ${styles.text.primary}`}>
                              {owner.name}
                            </p>
                            <p className={`mt-0.5 max-w-[180px] truncate text-xs ${styles.text.muted}`}>
                              {owner.email || owner.clerkId || "No contact"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <CreditCard className={`h-3.5 w-3.5 ${styles.text.muted}`} />
                              <span className={`max-w-[150px] truncate text-sm ${styles.text.primary}`}>
                                {workspacePlan(item)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <UsageDisplay item={item} product={product} compact />
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusClasses(
                                itemStatus,
                                isDark,
                              )}`}
                            >
                              {itemStatus.replace(/[_-]/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Clock3 className={`h-3.5 w-3.5 ${styles.text.muted}`} />
                              <span className={`text-xs ${styles.text.secondary}`}>
                                {formatDate(activityDate(item), true)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <ActionButtons item={item} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3 md:hidden">
              {items.map((item) => {
                const owner = ownerInfo(item);
                const itemStatus = workspaceStatus(item);
                const id = itemId(item);
                return (
                  <article
                    key={id || `${workspaceName(item, config)}-${activityDate(item)}`}
                    className={`${styles.card} p-4`}
                  >
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${config.iconClasses}`}
                          >
                            <ProductIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h2 className={`truncate text-sm font-black ${styles.text.primary}`}>
                              {workspaceName(item, config)}
                            </h2>
                            <p className={`truncate text-xs ${styles.text.muted}`}>
                              {owner.name} {owner.email ? `• ${owner.email}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${statusClasses(
                            itemStatus,
                            isDark,
                          )}`}
                        >
                          {itemStatus.replace(/[_-]/g, " ")}
                        </span>
                      </div>

                      <div className={`my-4 grid grid-cols-2 gap-3 rounded-xl p-3 ${styles.innerCard}`}>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.text.muted}`}>
                            Plan
                          </p>
                          <p className={`mt-1 truncate text-xs font-semibold ${styles.text.primary}`}>
                            {workspacePlan(item)}
                          </p>
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.text.muted}`}>
                            Usage
                          </p>
                          <div className="mt-1">
                            <UsageDisplay item={item} product={product} compact />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className={`truncate text-[11px] ${styles.text.muted}`}>
                          Updated {formatDate(activityDate(item), true)}
                        </p>
                        <ActionButtons item={item} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className={`${styles.card} px-4 py-3`}>
              <div className="relative z-10 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className={`text-xs ${styles.text.secondary}`}>
                  Showing {items.length.toLocaleString("en-IN")} of{" "}
                  {pagination.total.toLocaleString("en-IN")} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || isLoading}
                    className={styles.button.secondary}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <span className={`px-2 text-xs font-semibold ${styles.text.secondary}`}>
                    Page {pagination.page || page} of {pagination.totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(pagination.totalPages, current + 1),
                      )
                    }
                    disabled={page >= pagination.totalPages || isLoading}
                    className={styles.button.secondary}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent
          className={`max-h-[90vh] max-w-2xl overflow-y-auto border p-0 ${
            isDark
              ? "border-white/[0.08] bg-[#151519] text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          {selectedItem && (
            <>
              <DialogHeader
                className={`border-b p-5 pr-12 text-left ${
                  isDark ? "border-white/[0.07]" : "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border ${config.iconClasses}`}
                  >
                    <ProductIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className={`truncate text-xl font-black ${styles.text.primary}`}>
                      {workspaceName(selectedItem, config)}
                    </DialogTitle>
                    <DialogDescription className={`mt-1 ${styles.text.secondary}`}>
                      Operational detail for this {config.singular}.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${statusClasses(
                      workspaceStatus(selectedItem),
                      isDark,
                    )}`}
                  >
                    {workspaceStatus(selectedItem).replace(/[_-]/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    {!TERMINAL_STATUSES.has(
                      workspaceStatus(selectedItem).toLowerCase(),
                    ) && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const active = ACTIVE_STATUSES.has(
                            workspaceStatus(selectedItem).toLowerCase(),
                          );
                          openAction(
                            selectedItem,
                            "set-status",
                            active ? "paused" : "active",
                          );
                        }}
                        className={styles.button.secondary}
                      >
                        {ACTIVE_STATUSES.has(
                          workspaceStatus(selectedItem).toLowerCase(),
                        ) ? (
                          <PauseCircle className="mr-1.5 h-4 w-4" />
                        ) : (
                          <PlayCircle className="mr-1.5 h-4 w-4" />
                        )}
                        {ACTIVE_STATUSES.has(
                          workspaceStatus(selectedItem).toLowerCase(),
                        )
                          ? "Pause"
                          : "Activate"}
                      </Button>
                    )}
                    {product !== "packages" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openAction(selectedItem, "reset-usage")}
                        className={styles.button.secondary}
                      >
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        Reset usage
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${styles.innerCard} p-4`}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-cyan-400" />
                      <h3 className={`text-sm font-bold ${styles.text.primary}`}>
                        Customer
                      </h3>
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className={`text-sm font-semibold ${styles.text.primary}`}>
                        {ownerInfo(selectedItem).name}
                      </p>
                      <p className={`break-all text-xs ${styles.text.secondary}`}>
                        {ownerInfo(selectedItem).email || "Email unavailable"}
                      </p>
                      <p className={`break-all font-mono text-[11px] ${styles.text.muted}`}>
                        {ownerInfo(selectedItem).clerkId || "Clerk ID unavailable"}
                      </p>
                    </div>
                  </div>
                  <div className={`${styles.innerCard} p-4`}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-violet-400" />
                      <h3 className={`text-sm font-bold ${styles.text.primary}`}>
                        Plan & usage
                      </h3>
                    </div>
                    <p className={`mt-3 text-sm font-semibold ${styles.text.primary}`}>
                      {workspacePlan(selectedItem)}
                    </p>
                    <div className="mt-3">
                      <UsageDisplay item={selectedItem} product={product} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <h3 className={`text-sm font-bold ${styles.text.primary}`}>
                      Operational snapshot
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {productFacts(selectedItem, product).map((fact) => (
                      <div key={fact.label} className={`${styles.innerCard} p-3`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.text.muted}`}>
                          {fact.label}
                        </p>
                        <p className={`mt-1 break-words text-sm font-semibold ${styles.text.primary}`}>
                          {displayFact(fact.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${styles.innerCard} p-3`}>
                    <div className="flex items-center gap-2">
                      <Hash className={`h-3.5 w-3.5 ${styles.text.muted}`} />
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.text.muted}`}>
                        Workspace ID
                      </p>
                    </div>
                    <p className={`mt-2 break-all font-mono text-xs ${styles.text.secondary}`}>
                      {itemId(selectedItem) || "Unavailable"}
                    </p>
                  </div>
                  <div className={`${styles.innerCard} p-3`}>
                    <div className="flex items-center gap-2">
                      <CreditCard className={`h-3.5 w-3.5 ${styles.text.muted}`} />
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.text.muted}`}>
                        Subscription ID
                      </p>
                    </div>
                    <p className={`mt-2 break-all font-mono text-xs ${styles.text.secondary}`}>
                      {textValue(
                        selectedItem.subscriptionId,
                        asRecord(selectedItem.subscription).subscriptionId,
                      ) || "Unavailable"}
                    </p>
                  </div>
                </div>

                <div className={`${styles.innerCard} grid gap-3 p-4 sm:grid-cols-3`}>
                  {[
                    ["Created", selectedItem.createdAt],
                    ["Updated", selectedItem.updatedAt],
                    ["Last activity", activityDate(selectedItem)],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className={`h-3.5 w-3.5 ${styles.text.muted}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.text.muted}`}>
                          {label}
                        </p>
                      </div>
                      <p className={`mt-1 text-xs ${styles.text.secondary}`}>
                        {formatDate(value, true)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          if (!open && !actionIsSaving) {
            setPendingAction(null);
            setReason("");
          }
        }}
      >
        <AlertDialogContent
          className={`max-w-lg border ${
            isDark
              ? "border-white/[0.08] bg-[#151519] text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <AlertDialogHeader>
            <div
              className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${
                pendingAction?.action === "reset-usage"
                  ? isDark
                    ? "bg-violet-500/15 text-violet-300"
                    : "bg-violet-50 text-violet-700"
                  : pendingAction?.targetStatus === "active"
                    ? isDark
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-emerald-50 text-emerald-700"
                    : isDark
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-amber-50 text-amber-700"
              }`}
            >
              {pendingAction?.action === "reset-usage" ? (
                <RotateCcw className="h-5 w-5" />
              ) : pendingAction?.targetStatus === "active" ? (
                <PlayCircle className="h-5 w-5" />
              ) : (
                <PauseCircle className="h-5 w-5" />
              )}
            </div>
            <AlertDialogTitle className={styles.text.primary}>
              {pendingAction?.action === "reset-usage"
                ? "Reset workspace usage?"
                : pendingAction?.targetStatus === "active"
                  ? "Activate this workspace?"
                  : "Pause this workspace?"}
            </AlertDialogTitle>
            <AlertDialogDescription className={styles.text.secondary}>
              {pendingAction?.action === "reset-usage"
                ? `This resets tracked ${config.usageUnit} for “${
                    pendingAction
                      ? workspaceName(pendingAction.item, config)
                      : "this workspace"
                  }”. Billing records are not changed.`
                : pendingAction?.targetStatus === "active"
                  ? "Customer-facing product operations will be allowed to resume."
                  : "Customer-facing product operations will be paused until an admin activates the workspace again."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="block space-y-2">
            <span className={`text-xs font-bold uppercase tracking-wide ${styles.text.muted}`}>
              Audit reason
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder={
                pendingAction?.action === "reset-usage"
                  ? "Why is usage being reset?"
                  : `Why is this workspace being ${
                      pendingAction?.targetStatus === "active"
                        ? "activated"
                        : "paused"
                    }?`
              }
              className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${styles.input}`}
            />
            <div className="flex items-center justify-between">
              <span className={`text-[11px] ${styles.text.muted}`}>
                Minimum 4 characters; included in the admin audit trail.
              </span>
              <span className={`text-[11px] ${styles.text.muted}`}>
                {reason.length}/300
              </span>
            </div>
          </label>

          {pendingAction?.action === "set-status" && actionItemStatus === "unknown" && (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                isDark
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              The current status was not reported by the API. Confirm the target
              state carefully.
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionIsSaving}>
              Keep current state
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionIsSaving || reason.trim().length < 4}
              onClick={(event) => {
                event.preventDefault();
                void runPendingAction();
              }}
              className={
                pendingAction?.action === "set-status" &&
                pendingAction.targetStatus === "paused"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : pendingAction?.action === "reset-usage"
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
            >
              {actionIsSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {pendingAction?.action === "reset-usage"
                ? "Reset usage"
                : pendingAction?.targetStatus === "active"
                  ? "Activate workspace"
                  : "Pause workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
