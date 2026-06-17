"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Headphones,
  MessageCircle,
  Plug,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Badge, Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  createWhatsAppCollectionItem,
  getWhatsAppDashboard,
  updateWhatsAppWorkspace,
} from "@/lib/services/whatsapp-actions.api";

type WhatsAppView =
  | "overview"
  | "inbox"
  | "agents"
  | "broadcasts"
  | "appointments"
  | "templates"
  | "contacts"
  | "pricing"
  | "settings";

interface WhatsAppAutomationDashboardProps {
  view?: WhatsAppView;
}

type WhatsAppDashboardData = {
  workspace: any;
  overview: {
    totalContacts: number;
    optedInContacts: number;
    openConversations: number;
    pendingHuman: number;
    activeAgents: number;
    totalCampaigns: number;
    messagesUsed: number;
    messageLimit: number;
    deliveredRate: number;
    readRate: number;
  };
  recentConversations: any[];
  agents: any[];
  templates: any[];
  campaigns: any[];
  appointments: any[];
  appointmentConfig: any;
  contacts: any[];
};

const plans = [
  {
    id: "free",
    name: "WhatsApp Free",
    price: "INR 0",
    period: "/month",
    badge: "Default plan",
    limit: "10 free automations/messages",
    features: [
      "Created automatically after Meta/Facebook setup",
      "1 connected WhatsApp number",
      "1 AI agent",
      "Basic inbox, contacts, and appointments",
      "Upgrade anytime when you need more volume",
    ],
  },
  {
    id: "launch",
    name: "WhatsApp Automation",
    price: "INR 1,999",
    period: "/month",
    badge: "Simple plan",
    limit: "10k business-initiated messages",
    features: [
      "1 connected WhatsApp number",
      "1 team inbox",
      "3 AI agents",
      "Template sync and approvals tracker",
      "Broadcast tracker, appointments, contacts, and analytics",
    ],
  },
];

const metrics = [
  { label: "Open conversations", value: "248", change: "+18%", icon: MessageCircle },
  { label: "AI resolved", value: "71%", change: "+9%", icon: Bot },
  { label: "Avg first reply", value: "7s", change: "-42%", icon: Clock3 },
  { label: "Qualified leads", value: "1,482", change: "+26%", icon: Users },
];

const agentWorkflows = [
  {
    name: "Lead Qualification Agent",
    status: "Live",
    trigger: "New inbound message or ad click",
    goal: "Capture name, requirement, budget, city, and preferred callback time.",
    automation: "Routes hot leads to sales when intent score is above 80.",
  },
  {
    name: "Support Resolution Agent",
    status: "Draft",
    trigger: "Order, refund, warranty, or complaint keywords",
    goal: "Answer FAQs, collect order ID, and escalate unresolved issues.",
    automation: "Creates a ticket when sentiment turns negative or SLA is breached.",
  },
  {
    name: "Abandoned Cart Recovery",
    status: "Ready",
    trigger: "Checkout abandoned for 30 minutes",
    goal: "Send approved utility or marketing template based on consent.",
    automation: "Stops automatically after purchase, opt-out, or 3 attempts.",
  },
];

const templates = [
  ["order_update_v2", "Utility", "Approved", "INR 0.11 est."],
  ["lead_followup_offer", "Marketing", "Approved", "INR 0.78 est."],
  ["otp_login_india", "Authentication", "Approved", "INR 0.12 est."],
  ["support_reopen_case", "Utility", "Needs copy review", "INR 0.11 est."],
];

const conversations = [
  {
    name: "Ananya Sharma",
    topic: "Asked for demo pricing",
    owner: "Sales Agent",
    state: "Needs human",
    time: "2m",
  },
  {
    name: "Vikram Foods",
    topic: "Bulk order follow-up",
    owner: "AI Agent",
    state: "Automated",
    time: "6m",
  },
  {
    name: "Riya Boutique",
    topic: "Catalog and delivery query",
    owner: "Support Agent",
    state: "Resolved",
    time: "14m",
  },
  {
    name: "Apex Classes",
    topic: "Course enquiry from ad",
    owner: "Sales Agent",
    state: "Qualified",
    time: "22m",
  },
];

const broadcasts = [
  {
    title: "June offer for warm leads",
    segment: "Leads with consent, last seen under 30 days",
    status: "Scheduled",
    metric: "12,430 recipients",
  },
  {
    title: "Payment reminder utility flow",
    segment: "Invoices due in 48 hours",
    status: "Running",
    metric: "87.4% delivered",
  },
  {
    title: "Post-demo nurture sequence",
    segment: "Demo completed, no purchase",
    status: "Paused",
    metric: "34.8% replies",
  },
];

const contacts = [
  ["Hot leads", "4,820", "+34%", "Intent score above 80"],
  ["Customers", "18,420", "+11%", "Purchased or booked"],
  ["At risk", "1,106", "-6%", "Negative sentiment or refund keyword"],
  ["Opted out", "329", "+2%", "Excluded from broadcasts"],
];

export default function WhatsAppAutomationDashboard({
  view = "overview",
}: WhatsAppAutomationDashboardProps) {
  const { styles, isDark } = useThemeStyles();
  const { apiRequest } = useApi();
  const [data, setData] = useState<WhatsAppDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getWhatsAppDashboard(apiRequest);
      setData(result as WhatsAppDashboardData);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load WhatsApp dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const mergedData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      recentConversations:
        data.recentConversations?.length > 0
          ? data.recentConversations
          : conversations,
      agents: data.agents?.length > 0 ? data.agents : agentWorkflows,
      templates: data.templates?.length > 0 ? data.templates : templates,
      campaigns: data.campaigns?.length > 0 ? data.campaigns : broadcasts,
      appointments: data.appointments || [],
      appointmentConfig: data.appointmentConfig || data.workspace?.appointmentConfig,
      contacts: data.contacts?.length > 0 ? data.contacts : contacts,
    };
  }, [data]);

  const pageClass = isDark
    ? "min-h-screen bg-[#0F0F11] text-white"
    : "min-h-screen bg-[#F7FAF9] text-gray-950";
  const cardClass = isDark
    ? "border-white/[0.08] bg-white/[0.04]"
    : "border-gray-200 bg-white";
  const softCardClass = isDark
    ? "border-white/[0.08] bg-white/[0.03]"
    : "border-gray-100 bg-gray-50";

  return (
    <div className={pageClass}>
      {isDark && <Orbs />}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <Header view={view} cardClass={cardClass} workspace={data?.workspace} />
        {isLoading && (
          <div className={`rounded-2xl border ${cardClass} p-10`}>
            <Spinner label="Loading WhatsApp workspace..." />
          </div>
        )}
        {!isLoading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}
        {!isLoading && !error && mergedData && (
          <>
        {view === "overview" && (
          <Overview
            cardClass={cardClass}
            softCardClass={softCardClass}
            data={mergedData}
          />
        )}
        {view === "inbox" && <Inbox cardClass={cardClass} data={mergedData} />}
        {view === "agents" && <Agents cardClass={cardClass} data={mergedData} />}
        {view === "broadcasts" && <Broadcasts cardClass={cardClass} data={mergedData} />}
        {view === "appointments" && (
          <Appointments
            cardClass={cardClass}
            softCardClass={softCardClass}
            data={mergedData}
            onCreateAppointment={async (payload) => {
              await createWhatsAppCollectionItem(apiRequest, "appointments", payload);
              toast({
                title: "Appointment created",
                description: "The booking request was saved.",
              });
              await loadDashboard();
            }}
            onSaveConfig={async (appointmentConfig) => {
              await updateWhatsAppWorkspace(apiRequest, { appointmentConfig });
              toast({
                title: "Booking settings saved",
                description: "Clinic booking settings were updated.",
              });
              await loadDashboard();
            }}
          />
        )}
        {view === "templates" && <Templates cardClass={cardClass} data={mergedData} />}
        {view === "contacts" && <Contacts cardClass={cardClass} data={mergedData} />}
        {view === "pricing" && (
          <Pricing
            cardClass={cardClass}
            currentPlan={mergedData.workspace?.subscription?.plan}
            onPlanSelect={async (plan) => {
              await updateWhatsAppWorkspace(apiRequest, {
                subscription: { plan },
              });
              toast({
                title: "Plan updated",
                description: "WhatsApp workspace limits were updated.",
              });
              await loadDashboard();
            }}
          />
        )}
        {view === "settings" && (
          <SettingsView
            cardClass={cardClass}
            softCardClass={softCardClass}
            workspace={mergedData.workspace}
            onSave={async (payload) => {
              await updateWhatsAppWorkspace(apiRequest, payload);
              toast({
                title: "Settings saved",
                description: "WhatsApp workspace configuration was updated.",
              });
              await loadDashboard();
            }}
          />
        )}
          </>
        )}
        <p className={`mt-8 text-xs ${styles.text.muted}`}>
          Market assumptions are based on the WhatsApp Business Platform moving
          to per-message pricing, Meta template categories, and common shared
          inbox/automation capabilities from current WhatsApp BSP products.
        </p>
      </div>
    </div>
  );
}

function Header({
  view,
  cardClass,
  workspace,
}: {
  view: WhatsAppView;
  cardClass: string;
  workspace?: any;
}) {
  const titles: Record<WhatsAppView, string> = {
    overview: "WhatsApp Automation Command Center",
    inbox: "Inbox Operations",
    agents: "AI Agent Builder",
    broadcasts: "Broadcasts & Journeys",
    appointments: "Appointment Booking",
    templates: "Template Library",
    contacts: "Contacts & Segments",
    pricing: "WhatsApp Automation Pricing",
    settings: "Meta Setup & Compliance",
  };

  return (
    <div className={`mb-6 rounded-2xl border ${cardClass} p-5 md:p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
            <MessageCircle className="h-3.5 w-3.5" />
            Admin beta
          </div>
          <h1 className="text-2xl font-black tracking-tight md:text-4xl">
            {titles[view]}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-white/55">
            Built for WhatsApp Cloud API businesses: AI agents, shared inbox,
            approved templates, compliant broadcasts, segmentation, billing, and
            setup status in one workspace.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-3">
          <StatusPill
            label="Meta app"
            value={workspace?.isConfigured ? "Connected" : "Pending IDs"}
            tone={workspace?.isConfigured ? "ok" : "warn"}
          />
          <StatusPill label="Webhook" value="Ready" tone="ok" />
          <StatusPill
            label="Quality"
            value={workspace?.meta?.qualityRating || "Unknown"}
            tone={workspace?.meta?.qualityRating === "low" ? "warn" : "ok"}
          />
          <StatusPill
            label="Plan"
            value={workspace?.subscription?.plan || "Launch"}
            tone="ok"
          />
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold ${
          tone === "ok" ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Overview({
  cardClass,
  softCardClass,
  data,
}: {
  cardClass: string;
  softCardClass: string;
  data: WhatsAppDashboardData;
}) {
  const dynamicMetrics = [
    {
      label: "Open conversations",
      value: String(data.overview.openConversations),
      change: `${data.overview.pendingHuman} human`,
      icon: MessageCircle,
    },
    {
      label: "Active agents",
      value: String(data.overview.activeAgents),
      change: `${data.agents.length} total`,
      icon: Bot,
    },
    {
      label: "Read rate",
      value: `${data.overview.readRate}%`,
      change: `${data.overview.deliveredRate}% delivered`,
      icon: Clock3,
    },
    {
      label: "Contacts",
      value: String(data.overview.totalContacts),
      change: `${data.overview.optedInContacts} opted in`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dynamicMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle icon={Workflow} title="Revenue Automation Pipeline" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Capture", "Ads, QR, site widget, direct message"],
              ["Qualify", "AI asks guided questions and scores intent"],
              ["Convert", "Human handoff, payment links, reminders"],
            ].map(([title, desc], index) => (
              <div key={title} className={`rounded-xl border ${softCardClass} p-4`}>
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-white">
                  {index + 1}
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/50">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle icon={Plug} title="Meta Connection" />
          <div className="mt-5 space-y-3">
            {[
              ["Business Manager ID", "Waiting"],
              ["WABA ID", "Waiting"],
              ["Phone Number ID", "Waiting"],
              ["Permanent Access Token", "Waiting"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
                <span className="text-sm text-gray-500 dark:text-white/55">{label}</span>
                <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/15">
                  {value}
                </Badge>
              </div>
            ))}
          </div>
          <Button asChild className="mt-5 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">
            <Link href="/whatsapp/settings">
              Add Meta IDs
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Agents cardClass={cardClass} compact data={data} />
        <Inbox cardClass={cardClass} compact data={data} />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-emerald-400">{change}</span>
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function Inbox({
  cardClass,
  compact = false,
  data,
}: {
  cardClass: string;
  compact?: boolean;
  data: WhatsAppDashboardData;
}) {
  const items = data.recentConversations;
  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={Headphones} title="Priority Inbox" action={compact ? "/whatsapp/inbox" : undefined} />
      <div className="mt-5 divide-y divide-gray-100 dark:divide-white/[0.06]">
        {items.map((item: any) => (
          <div key={item._id || item.name || item.waId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
            <div>
              <p className="font-bold">{item.contactName || item.name}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
                {item.lastMessage || item.topic}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/[0.06] text-gray-500 dark:text-white/60">
                {item.owner === "ai" ? "AI Agent" : item.owner}
              </Badge>
              <Badge className={item.status === "pending_human" || item.state === "Needs human" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>
                {item.status || item.state}
              </Badge>
              <span className="text-xs text-gray-400">
                {item.messages?.length || item.time || 0} msgs
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Agents({
  cardClass,
  compact = false,
  data,
}: {
  cardClass: string;
  compact?: boolean;
  data: WhatsAppDashboardData;
}) {
  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={Workflow} title="Automation Agents" action={compact ? "/whatsapp/agents" : undefined} />
      <div className="mt-5 grid gap-4">
        {data.agents.map((agent: any) => (
          <div key={agent._id || agent.name} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">{agent.name}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-white/45">{agent.trigger}</p>
              </div>
              <Badge className={agent.status === "live" || agent.status === "Live" ? "bg-emerald-500 text-white" : "bg-white/[0.08] text-gray-500 dark:text-white/70"}>
                {agent.status}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-white/55">{agent.goal}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-500">
              {agent.automation || agent.handoffRules?.join(" | ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Broadcasts({
  cardClass,
  data,
}: {
  cardClass: string;
  data: WhatsAppDashboardData;
}) {
  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={Send} title="Campaigns, Drips, and Utility Reminders" />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {data.campaigns.map((broadcast: any) => (
          <div key={broadcast._id || broadcast.title || broadcast.name} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold">{broadcast.title || broadcast.name}</h3>
              <Badge className="bg-emerald-500/15 text-emerald-300">{broadcast.status}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-white/50">{broadcast.segment}</p>
            <p className="mt-4 text-sm font-bold text-emerald-500">
              {broadcast.metric || `${broadcast.recipients || 0} recipients`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Appointments({
  cardClass,
  softCardClass,
  data,
  onCreateAppointment,
  onSaveConfig,
}: {
  cardClass: string;
  softCardClass: string;
  data: WhatsAppDashboardData;
  onCreateAppointment: (payload: Record<string, any>) => Promise<void>;
  onSaveConfig: (appointmentConfig: Record<string, any>) => Promise<void>;
}) {
  const config = data.appointmentConfig || {};
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    enabled: config.enabled ?? true,
    clinicName: config.clinicName || data.workspace?.organization?.name || "My Clinic",
    slotDurationMinutes: String(config.slotDurationMinutes || 30),
    bufferMinutes: String(config.bufferMinutes || 10),
    bookingWindowDays: String(config.bookingWindowDays || 14),
    servicesText: (config.services || [])
      .map((service: any) => `${service.name}|${service.durationMinutes || 30}|${service.priceInr || 0}|${service.doctor || ""}`)
      .join("\n"),
    emergencyKeywords: (config.emergencyKeywords || []).join(", "),
  });
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: "",
    patientPhone: "",
    service: config.services?.[0]?.name || "General consultation",
    doctor: "",
    symptoms: "",
    preferredDate: "",
    preferredTime: "",
    urgency: "routine",
    notes: "",
  });

  const appointments = data.appointments || [];
  const requested = appointments.filter((item) => item.status === "requested").length;
  const confirmed = appointments.filter((item) => item.status === "confirmed").length;
  const urgent = appointments.filter((item) => ["urgent", "emergency"].includes(item.urgency)).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Requested", requested, "Needs confirmation"],
          ["Confirmed", confirmed, "Scheduled appointments"],
          ["Urgent", urgent, "Needs quick follow-up"],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-5">
            <p className="text-sm text-gray-500 dark:text-white/50">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-400">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle icon={CalendarCheck} title="Booking Settings" />
          <form
            className="mt-5 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSavingConfig(true);
              const services = settingsForm.servicesText
                .split("\n")
                .map((line: string) => line.trim())
                .filter(Boolean)
                .map((line: string) => {
                  const [name, durationMinutes, priceInr, doctor] = line.split("|");
                  return {
                    name: name?.trim() || "Consultation",
                    durationMinutes: Number(durationMinutes) || 30,
                    priceInr: Number(priceInr) || 0,
                    doctor: doctor?.trim() || "",
                    isActive: true,
                  };
                });

              await onSaveConfig({
                enabled: settingsForm.enabled,
                clinicName: settingsForm.clinicName,
                slotDurationMinutes: Number(settingsForm.slotDurationMinutes) || 30,
                bufferMinutes: Number(settingsForm.bufferMinutes) || 0,
                bookingWindowDays: Number(settingsForm.bookingWindowDays) || 14,
                services,
                emergencyKeywords: settingsForm.emergencyKeywords
                  .split(",")
                  .map((keyword: string) => keyword.trim())
                  .filter(Boolean),
              });
              setIsSavingConfig(false);
            }}
          >
            <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <span className="text-sm font-bold">Enable appointment booking</span>
              <input
                type="checkbox"
                checked={settingsForm.enabled}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
              />
            </label>
            <TextInput
              label="Clinic name"
              value={settingsForm.clinicName}
              onChange={(value) =>
                setSettingsForm((current) => ({ ...current, clinicName: value }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput
                label="Slot minutes"
                value={settingsForm.slotDurationMinutes}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, slotDurationMinutes: value }))
                }
              />
              <TextInput
                label="Buffer minutes"
                value={settingsForm.bufferMinutes}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, bufferMinutes: value }))
                }
              />
              <TextInput
                label="Booking window days"
                value={settingsForm.bookingWindowDays}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, bookingWindowDays: value }))
                }
              />
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Services, one per line: name|duration|price|doctor
              </span>
              <textarea
                value={settingsForm.servicesText}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    servicesText: event.target.value,
                  }))
                }
                rows={5}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              />
            </label>
            <TextInput
              label="Emergency keywords"
              value={settingsForm.emergencyKeywords}
              onChange={(value) =>
                setSettingsForm((current) => ({ ...current, emergencyKeywords: value }))
              }
            />
            <Button
              disabled={isSavingConfig}
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {isSavingConfig ? "Saving..." : "Save Booking Settings"}
            </Button>
          </form>
        </section>

        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle icon={CalendarCheck} title="Create Appointment Request" />
          <form
            className="mt-5 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsCreating(true);
              await onCreateAppointment({
                ...appointmentForm,
                patientWaId: appointmentForm.patientPhone,
                source: "manual",
                status: "requested",
              });
              setAppointmentForm((current) => ({
                ...current,
                patientName: "",
                patientPhone: "",
                symptoms: "",
                preferredDate: "",
                preferredTime: "",
                notes: "",
              }));
              setIsCreating(false);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Patient name"
                value={appointmentForm.patientName}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, patientName: value }))
                }
              />
              <TextInput
                label="WhatsApp phone"
                value={appointmentForm.patientPhone}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, patientPhone: value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Service"
                value={appointmentForm.service}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, service: value }))
                }
              />
              <TextInput
                label="Doctor"
                value={appointmentForm.doctor}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, doctor: value }))
                }
              />
            </div>
            <TextInput
              label="Symptoms / reason"
              value={appointmentForm.symptoms}
              onChange={(value) =>
                setAppointmentForm((current) => ({ ...current, symptoms: value }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput
                label="Preferred date"
                value={appointmentForm.preferredDate}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, preferredDate: value }))
                }
              />
              <TextInput
                label="Preferred time"
                value={appointmentForm.preferredTime}
                onChange={(value) =>
                  setAppointmentForm((current) => ({ ...current, preferredTime: value }))
                }
              />
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Urgency
                </span>
                <select
                  value={appointmentForm.urgency}
                  onChange={(event) =>
                    setAppointmentForm((current) => ({
                      ...current,
                      urgency: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
            </div>
            <TextInput
              label="Notes"
              value={appointmentForm.notes}
              onChange={(value) =>
                setAppointmentForm((current) => ({ ...current, notes: value }))
              }
            />
            <Button
              disabled={isCreating}
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {isCreating ? "Creating..." : "Create Request"}
            </Button>
          </form>
        </section>
      </div>

      <section className={`rounded-2xl border ${cardClass} p-5`}>
        <SectionTitle icon={CalendarCheck} title="Appointment Requests" />
        <div className="mt-5 grid gap-3">
          {appointments.length === 0 && (
            <div className={`rounded-xl border ${softCardClass} p-5 text-sm text-gray-500 dark:text-white/55`}>
              No appointment requests yet. WhatsApp messages with booking intent
              will appear here automatically.
            </div>
          )}
          {appointments.map((appointment: any) => (
            <div
              key={appointment._id || `${appointment.patientPhone}-${appointment.createdAt}`}
              className={`rounded-xl border ${softCardClass} p-4`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{appointment.patientName}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-white/55">
                    {appointment.patientPhone} • {appointment.service}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-300">
                    {appointment.status}
                  </Badge>
                  <Badge
                    className={
                      appointment.urgency === "emergency"
                        ? "bg-red-500/15 text-red-300"
                        : appointment.urgency === "urgent"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-white/[0.08] text-gray-500 dark:text-white/70"
                    }
                  >
                    {appointment.urgency}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-white/60">
                {appointment.symptoms || "No symptoms captured"}
              </p>
              <div className="mt-3 grid gap-2 text-xs text-gray-500 dark:text-white/45 sm:grid-cols-3">
                <span>Date: {appointment.preferredDate || "Not captured"}</span>
                <span>Time: {appointment.preferredTime || "Not captured"}</span>
                <span>Source: {appointment.source}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Templates({
  cardClass,
  data,
}: {
  cardClass: string;
  data: WhatsAppDashboardData;
}) {
  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={FileText} title="Meta Template Library" />
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[760px] w-full text-left">
          <thead className="text-xs uppercase tracking-widest text-gray-400">
            <tr>
              <th className="py-3">Template</th>
              <th className="py-3">Category</th>
              <th className="py-3">Status</th>
              <th className="py-3">India Meta cost estimate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm dark:divide-white/[0.06]">
            {data.templates.map((template: any) => {
              const isArray = Array.isArray(template);
              const name = isArray ? template[0] : template.name;
              const category = isArray ? template[1] : template.category;
              const status = isArray ? template[2] : template.status;
              const cost = isArray ? template[3] : "Pass-through Meta rate";
              return (
              <tr key={name}>
                <td className="py-4 font-bold">{name}</td>
                <td className="py-4">{category}</td>
                <td className="py-4">
                  <Badge className={status === "Approved" || status === "approved" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}>
                    {status}
                  </Badge>
                </td>
                <td className="py-4 text-gray-500 dark:text-white/55">{cost}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Contacts({
  cardClass,
  data,
}: {
  cardClass: string;
  data: WhatsAppDashboardData;
}) {
  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={Users} title="Segments and Consent Health" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.contacts.map((contact: any) => {
          const isArray = Array.isArray(contact);
          const name = isArray ? contact[0] : contact.name || contact.phone;
          const count = isArray ? contact[1] : contact.intentScore;
          const trend = isArray ? contact[2] : contact.lifecycleStage;
          const description = isArray
            ? contact[3]
            : `${contact.consentStatus} ${contact.tags?.join(", ") || ""}`;
          return (
          <div key={contact._id || name} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{name}</h3>
              <span className="text-xs font-bold text-emerald-400">{trend}</span>
            </div>
            <p className="mt-3 text-3xl font-black">{count}</p>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/50">{description}</p>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function Pricing({
  cardClass,
  currentPlan,
  onPlanSelect,
}: {
  cardClass: string;
  currentPlan?: string;
  onPlanSelect: (plan: string) => Promise<void>;
}) {
  const [savingPlan, setSavingPlan] = useState("");
  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border ${cardClass} p-5`}>
        <SectionTitle icon={CreditCard} title="Recommended India Pricing" />
        <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-500 dark:text-white/55">
          Plans include RocketReplai platform access. Meta WhatsApp Business
          Platform charges should be passed through separately because Meta now
          prices business-initiated template messages by category and country.
          Service messages inside the customer care window are treated
          differently from paid template sends.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border ${cardClass} p-5 ${plan.id === "launch" ? "ring-2 ring-emerald-400/40" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black">{plan.name}</h3>
                <Badge className={plan.id === "free" ? "bg-gray-500 text-white" : "bg-emerald-500 text-white"}>
                  {plan.badge}
                </Badge>
              </div>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-3xl font-black">{plan.price}</span>
                <span className="pb-1 text-sm text-gray-500 dark:text-white/50">{plan.period}</span>
              </div>
              <p className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400">
                {plan.limit}
              </p>
              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600 dark:text-white/60">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                disabled={currentPlan === plan.id || savingPlan === plan.id}
                onClick={async () => {
                  setSavingPlan(plan.id);
                  await onPlanSelect(plan.id);
                  setSavingPlan("");
                }}
                className="mt-6 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:cursor-default disabled:opacity-80"
              >
                {currentPlan === plan.id
                  ? "Current Plan"
                  : savingPlan === plan.id
                    ? "Saving..."
                    : plan.id === "free"
                      ? "Use Free Plan"
                      : "Configure Plan"}
              </Button>
            </div>
          ))}
        </div>
        <div className={`rounded-2xl border ${cardClass} p-5`}>
          <h3 className="text-lg font-black">Plan limits</h3>
          <div className="mt-5 space-y-3">
            {[
              ["Numbers", "1"],
              ["Inbox", "1"],
              ["AI agents", "3"],
              ["Messages", "10k/mo"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5">
                <span className="text-sm text-gray-500 dark:text-white/55">{label}</span>
                <span className="font-black text-emerald-400">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({
  cardClass,
  softCardClass,
  workspace,
  onSave,
}: {
  cardClass: string;
  softCardClass: string;
  workspace: any;
  onSave: (payload: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    organizationName: workspace?.organization?.name || "",
    industry: workspace?.organization?.industry || "",
    website: workspace?.organization?.website || "",
    businessManagerId: workspace?.meta?.businessManagerId || "",
    wabaId: workspace?.meta?.wabaId || "",
    phoneNumberId: workspace?.meta?.phoneNumberId || "",
    displayPhoneNumber: workspace?.meta?.displayPhoneNumber || "",
    appId: workspace?.meta?.appId || "",
    appSecret: "",
    accessToken: "",
    verifyToken: workspace?.meta?.verifyToken || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const setup = [
    ["Meta Business Manager ID", "Add after Meta app review"],
    ["WhatsApp Business Account ID", "Required to sync templates"],
    ["Phone Number ID", "Required to send messages"],
    ["Permanent Access Token", "Store server-side only"],
    ["Webhook Verify Token", "Ready to generate"],
    ["App Secret", "Required for signature validation"],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section className={`rounded-2xl border ${cardClass} p-5`}>
        <SectionTitle icon={Settings} title="Meta Credentials Checklist" />
        <form
          className="mt-5 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSaving(true);
            await onSave({
              organization: {
                name: form.organizationName,
                industry: form.industry,
                website: form.website,
              },
              meta: {
                businessManagerId: form.businessManagerId,
                wabaId: form.wabaId,
                phoneNumberId: form.phoneNumberId,
                displayPhoneNumber: form.displayPhoneNumber,
                appId: form.appId,
                appSecret: form.appSecret || undefined,
                accessToken: form.accessToken || undefined,
                verifyToken: form.verifyToken,
              },
            });
            setIsSaving(false);
          }}
        >
          {[
            ["organizationName", "Business name"],
            ["industry", "Industry"],
            ["website", "Website"],
            ["businessManagerId", "Meta Business Manager ID"],
            ["wabaId", "WhatsApp Business Account ID"],
            ["phoneNumberId", "Phone Number ID"],
            ["displayPhoneNumber", "Display phone number"],
            ["appId", "Meta App ID"],
            ["appSecret", "App Secret"],
            ["accessToken", "Permanent access token"],
            ["verifyToken", "Webhook verify token"],
          ].map(([key, label]) => (
            <label key={key} className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {label}
              </span>
              <input
                value={(form as any)[key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                type={key === "appSecret" || key === "accessToken" ? "password" : "text"}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              />
            </label>
          ))}
          <Button
            disabled={isSaving}
            className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            {isSaving ? "Saving..." : "Save WhatsApp Setup"}
          </Button>
        </form>
        <div className="mt-5 grid gap-3">
          {setup.map(([label, note]) => (
            <div key={label} className={`rounded-xl border ${softCardClass} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{label}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-white/50">{note}</p>
                </div>
                <Badge className="bg-amber-500/15 text-amber-300">Pending</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-2xl border ${cardClass} p-5`}>
        <SectionTitle icon={ShieldCheck} title="Production Guardrails" />
        <div className="mt-5 space-y-4">
          {[
            ["Opt-in required", "Marketing broadcasts only target consented contacts."],
            ["Template category control", "Marketing, utility, and authentication are priced and reviewed separately."],
            ["Human handoff", "Any negative sentiment, payment issue, or repeated failed answer escalates."],
            ["Rate and quality monitoring", "Dashboard tracks delivery, read, block, and opt-out signals."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-white/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-400" />
        <h2 className="font-black">{title}</h2>
      </div>
      {action && (
        <Link href={action} className="text-xs font-bold text-emerald-400">
          Open
        </Link>
      )}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
      />
    </label>
  );
}
