"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  GitBranch,
  Headphones,
  Phone,
  PlugZap,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { createCallItem, getCallCollection } from "@/lib/services/call-actions.api";

type CollectionKey =
  | "calls"
  | "leads"
  | "numbers"
  | "flows"
  | "notifications"
  | "integrations"
  | "appointments"
  | "team"
  | "invoices";

const CONFIG: Record<
  CollectionKey,
  {
    title: string;
    description: string;
    icon: any;
    addLabel?: string;
    fields: string[];
    createPayload?: Record<string, any>;
  }
> = {
  calls: {
    title: "Calls & Leads",
    description: "Review answered calls, missed calls, recordings, transcripts, and captured lead intent.",
    icon: Headphones,
    fields: ["createdAt", "fromNumber", "toNumber", "status", "durationSec", "summary"],
  },
  leads: {
    title: "Lead Inbox",
    description: "Every qualified caller the AI receptionist captured for follow-up.",
    icon: CheckCircle2,
    addLabel: "Add Lead",
    fields: ["createdAt", "callerName", "callerPhone", "callerEmail", "interest", "status"],
    createPayload: {
      callerName: "New lead",
      callerPhone: "+91",
      interest: "Manual lead",
      notes: "Added from dashboard",
      status: "new",
    },
  },
  numbers: {
    title: "Number Management",
    description: "Manage virtual numbers and Exotel forwarding setup for your AI receptionist.",
    icon: Phone,
    addLabel: "Add Number",
    fields: ["phoneNumber", "label", "countryCode", "type", "status", "provider"],
    createPayload: {
      phoneNumber: "+91",
      label: "New receptionist number",
      countryCode: "IN",
      type: "local",
      status: "pending",
      provider: "manual",
    },
  },
  flows: {
    title: "AI Flow Editor",
    description: "Configure greetings, qualifying questions, language, and fallback actions.",
    icon: GitBranch,
    addLabel: "New Flow",
    fields: ["name", "language", "greeting", "questions", "fallbackAction", "isActive"],
    createPayload: {
      name: "New receptionist flow",
      language: "en-IN",
      greeting: "Hello, thanks for calling. How can I help you today?",
      questions: ["May I know your name?", "What should the owner call you about?"],
      fallbackAction: "take_message",
      isActive: false,
    },
  },
  notifications: {
    title: "Notifications",
    description: "Choose where new call summaries, lead alerts, and missed-call alerts are sent.",
    icon: Bell,
    addLabel: "Add Channel",
    fields: ["channel", "address", "enabled"],
    createPayload: { channel: "whatsapp", address: "+91", enabled: true },
  },
  integrations: {
    title: "Integrations",
    description: "Connect Exotel, WhatsApp, calendars, CRMs, or webhooks for the call assistant workflow.",
    icon: PlugZap,
    fields: ["label", "type", "status", "updatedAt"],
  },
  appointments: {
    title: "Appointments",
    description: "Calls that resulted in scheduled visits, demos, or service bookings.",
    icon: CalendarDays,
    addLabel: "Add Appointment",
    fields: ["startsAt", "title", "customerName", "customerPhone", "status"],
    createPayload: {
      title: "Callback",
      customerName: "New customer",
      customerPhone: "+91",
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
    },
  },
  team: {
    title: "Team",
    description: "Invite owners, admins, agents, and viewers to collaborate on call operations.",
    icon: Users,
    addLabel: "Invite User",
    fields: ["name", "email", "role", "status", "createdAt"],
    createPayload: {
      name: "New teammate",
      email: "teammate@example.com",
      role: "viewer",
      status: "invited",
    },
  },
  invoices: {
    title: "Billing",
    description: "Track your current plan, included minutes, overages, invoices, and payment status.",
    icon: CreditCard,
    fields: ["invoiceNumber", "amount", "currency", "status", "periodEnd"],
  },
};

function formatValue(value: any) {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (typeof value === "string" && !Number.isNaN(Date.parse(value)) && value.includes("T")) {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (value === 0 && typeof value === "number") return "0";
  return String(value);
}

export default function CallCollectionPage({
  collection,
}: {
  collection: CollectionKey;
}) {
  const config = CONFIG[collection];
  const Icon = config.icon;
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCallCollection(apiRequest, collection);
      setItems(data?.[collection] || []);
      setMeta(data || {});
    } catch (error) {
      console.error(error);
      toast({
        title: "Could not load call assistant data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, collection]);

  useEffect(() => {
    load();
  }, [load]);

  const usage = useMemo(() => {
    const sub = meta.subscription || {};
    const used = sub.minutesUsed || 0;
    const limit = sub.minutesLimit || 1;
    return Math.min(100, Math.round((used / limit) * 100));
  }, [meta]);

  const handleCreate = async () => {
    if (!config.createPayload) return;
    try {
      setIsSaving(true);
      await createCallItem(apiRequest, collection, config.createPayload);
      toast({ title: `${config.addLabel || "Item"} created` });
      await load();
    } catch (error) {
      console.error(error);
      toast({ title: "Could not create item", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Spinner label={`Loading ${config.title}...`} />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className={`${styles.card} p-5 md:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className={`text-2xl md:text-3xl font-black ${styles.text.primary}`}>
                  {config.title}
                </h1>
                <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${styles.text.secondary}`}>
                  {config.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={load}
                variant="outline"
                className="rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {config.addLabel && (
                <Button
                  onClick={handleCreate}
                  disabled={isSaving}
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {config.addLabel}
                </Button>
              )}
            </div>
          </div>
        </div>

        {collection === "invoices" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${styles.card} p-5`}>
              <p className={`text-xs ${styles.text.muted}`}>Current Plan</p>
              <p className={`text-2xl font-bold capitalize ${styles.text.primary}`}>
                {meta.subscription?.plan || "starter"}
              </p>
            </div>
            <div className={`${styles.card} p-5`}>
              <p className={`text-xs ${styles.text.muted}`}>Minutes Used</p>
              <p className={`text-2xl font-bold ${styles.text.primary}`}>
                {meta.subscription?.minutesUsed || 0} / {meta.subscription?.minutesLimit || 0}
              </p>
              <div className={isDark ? "mt-3 h-2 rounded-full bg-white/[0.08]" : "mt-3 h-2 rounded-full bg-gray-100"}>
                <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${usage}%` }} />
              </div>
            </div>
            <div className={`${styles.card} p-5`}>
              <p className={`text-xs ${styles.text.muted}`}>Overage Rate</p>
              <p className={`text-2xl font-bold ${styles.text.primary}`}>
                ₹{meta.subscription?.overageRate || 0}/min
              </p>
            </div>
          </div>
        )}

        <div className={`${styles.card} overflow-hidden`}>
            <div className={`p-4 border-b ${styles.divider} flex items-center justify-between`}>
              <p className={`text-sm font-bold ${styles.text.primary}`}>
                {items.length} records
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-white/[0.03]" : "bg-gray-50"}>
                  <tr>
                    {config.fields.map((field) => (
                      <th
                        key={field}
                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${styles.text.muted}`}
                      >
                        {field.replace(/([A-Z])/g, " $1")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${styles.divider}`}>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={config.fields.length}
                        className={`px-4 py-10 text-center ${styles.text.secondary}`}
                      >
                        No records yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item._id || item.callSid || index} className={styles.rowHover}>
                        {config.fields.map((field) => (
                          <td key={field} className={`px-4 py-3 align-top ${styles.text.secondary}`}>
                            <span className="line-clamp-2">{formatValue(item[field])}</span>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
}
