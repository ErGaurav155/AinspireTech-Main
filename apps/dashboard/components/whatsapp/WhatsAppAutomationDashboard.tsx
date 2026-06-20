"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Headphones,
  MessageCircle,
  Phone,
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
  connectWhatsAppFacebook,
  createWhatsAppCollectionItem,
  deleteWhatsAppWorkspace,
  getWhatsAppFacebookConfig,
  getWhatsAppDashboard,
  updateWhatsAppWorkspace,
} from "@/lib/services/whatsapp-actions.api";
import {
  createRazorpaySubscription,
  getRazerpayPlanInfo,
} from "@/lib/services/subscription-actions.api";
import { clearStoredReferralCode, getStoredReferralCode } from "@/lib/referral";

declare global {
  interface Window {
    FB?: any;
    Razorpay: any;
    fbAsyncInit?: () => void;
  }
}

const FACEBOOK_SDK_SCRIPT_ID = "facebook-jssdk";
const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const WHATSAPP_PRODUCT_ID = "whatsapp-launch";
const WHATSAPP_FIRST_MONTH_OFFER_ID = "offer_T3WZjvSEGwtewO";

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
    amount: 0,
    firstMonth: 0,
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
    price: "INR 2,999",
    period: "/month",
    amount: 2999,
    firstMonth: 1499,
    badge: "50% first month",
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

const businessCategories = [
  "Automotive",
  "Beauty, Spa and Salon",
  "Clothing and Apparel",
  "Education",
  "Entertainment",
  "Event Planning and Service",
  "Finance and Banking",
  "Food and Grocery",
  "Hotel and Lodging",
  "Medical and Health",
  "Non-profit",
  "Professional Services",
  "Public Service",
  "Shopping and Retail",
  "Travel and Transportation",
  "Restaurant",
  "Others",
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
  const { userId } = useAuth();
  const { user } = useUser();
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
            currentSubscription={mergedData.workspace?.subscription}
            userId={userId || ""}
            email={user?.primaryEmailAddress?.emailAddress || ""}
            onActivated={loadDashboard}
          />
        )}
        {view === "settings" && (
          <SettingsView
            cardClass={cardClass}
            softCardClass={softCardClass}
            workspace={mergedData.workspace}
            onConnected={loadDashboard}
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
            WhatsApp automation
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
            value={workspace?.isConfigured ? "Connected" : "Business login"}
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
              ["Facebook Business", data.workspace?.onboarding?.status || "Not started"],
              ["WABA ID", data.workspace?.meta?.wabaId ? "Connected" : "Waiting"],
              ["Phone Number ID", data.workspace?.meta?.phoneNumberId ? "Connected" : "Waiting"],
              ["Access token", data.workspace?.meta?.accessToken ? "Stored" : "Waiting"],
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
              Connect WhatsApp
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
  currentSubscription,
  userId,
  email,
  onActivated,
}: {
  cardClass: string;
  currentPlan?: string;
  currentSubscription?: any;
  userId: string;
  email: string;
  onActivated: () => Promise<void>;
}) {
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
              {plan.firstMonth > 0 && (
                <p className="mt-2 text-sm font-semibold text-emerald-500">
                  First month INR {plan.firstMonth.toLocaleString("en-IN")} with launch offer, then INR {plan.amount.toLocaleString("en-IN")}/month.
                </p>
              )}
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
              {plan.id === "launch" ? (
                <WhatsAppCheckoutButton
                  userId={userId}
                  email={email}
                  amount={plan.amount}
                  currentSubscription={currentSubscription}
                  disabled={currentPlan === plan.id && currentSubscription?.status === "active"}
                  onActivated={onActivated}
                />
              ) : (
                <Button
                  disabled
                  className="mt-6 w-full rounded-xl bg-gray-500 text-white disabled:cursor-default disabled:opacity-80"
                >
                  {currentPlan === "free" ? "Current Plan" : "Included Free"}
                </Button>
              )}
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

function WhatsAppCheckoutButton({
  userId,
  email,
  amount,
  currentSubscription,
  disabled,
  onActivated,
}: {
  userId: string;
  email: string;
  amount: number;
  currentSubscription?: any;
  disabled: boolean;
  onActivated: () => Promise<void>;
}) {
  const { apiRequest } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRazorpayScript = useCallback((): Promise<void> => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Payment checkout is not available"));
    }

    if (window.Razorpay) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existingScript =
        document.getElementById(RAZORPAY_SCRIPT_ID) ||
        document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);

      const handleLoad = () => resolve();
      const handleError = () =>
        reject(new Error("Payment checkout failed to load"));

      if (existingScript) {
        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.body.appendChild(script);
    });
  }, []);

  const handleCheckout = async () => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in before starting WhatsApp billing.",
        variant: "destructive",
      });
      return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toast({
        title: "Razorpay key missing",
        description: "Add NEXT_PUBLIC_RAZORPAY_KEY_ID before taking payments.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await loadRazorpayScript();

      let planInfo: any;
      try {
        planInfo = await getRazerpayPlanInfo(apiRequest, WHATSAPP_PRODUCT_ID);
      } catch {
        planInfo = await getRazerpayPlanInfo(apiRequest, "launch");
      }

      const razorpayPlanId = planInfo?.razorpaymonthlyplanId;
      if (!razorpayPlanId) {
        throw new Error("Razorpay monthly plan is not configured for WhatsApp");
      }

      const referralCode = getStoredReferralCode();
      const previousSubscriptionId = currentSubscription?.subscriptionId || "";
      const result = await createRazorpaySubscription(apiRequest, {
        amount,
        razorpayplanId: razorpayPlanId,
        buyerId: userId,
        referralCode,
        metadata: {
          productId: WHATSAPP_PRODUCT_ID,
          subscriptionType: "whatsapp",
          billingCycle: "monthly",
          previousSubscriptionId: previousSubscriptionId || undefined,
          previousSubscriptionType: previousSubscriptionId
            ? "whatsapp"
            : undefined,
          email,
          offerId: WHATSAPP_FIRST_MONTH_OFFER_ID || undefined,
          referralCode: referralCode || "",
        },
      });

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "RocketReplai",
        description: "WhatsApp Automation - monthly",
        subscription_id: result.subscriptionId,
        prefill: { email },
        notes: {
          productId: WHATSAPP_PRODUCT_ID,
          subscriptionType: "whatsapp",
          buyerId: userId,
          billingCycle: "monthly",
          offerId: WHATSAPP_FIRST_MONTH_OFFER_ID || "",
        },
        handler: () => {
          clearStoredReferralCode();
          toast({
            title: "Payment received",
            description:
              "WhatsApp Automation will activate after Razorpay confirms the subscription.",
          });
          window.setTimeout(() => {
            void onActivated();
          }, 2000);
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Checkout closed",
              description: "Payment was not completed.",
              variant: "destructive",
            });
          },
        },
        theme: { color: "#10B981" },
      });

      razorpay.open();
    } catch (error: any) {
      console.error("WhatsApp checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error.message || "Could not start WhatsApp payment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      disabled={disabled || isSubmitting}
      onClick={handleCheckout}
      className="mt-6 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:cursor-default disabled:opacity-80"
    >
      {disabled
        ? "Current Plan"
        : isSubmitting
          ? "Opening checkout..."
          : "Subscribe with Razorpay"}
    </Button>
  );
}

function SettingsView({
  cardClass,
  softCardClass,
  workspace,
  onConnected,
  onSave,
}: {
  cardClass: string;
  softCardClass: string;
  workspace: any;
  onConnected: () => Promise<void>;
  onSave: (payload: Record<string, any>) => Promise<void>;
}) {
  const { apiRequest } = useApi();
  const [form, setForm] = useState({
    organizationName: workspace?.organization?.name || "",
    industry: workspace?.organization?.industry || "Professional Services",
    website: workspace?.organization?.website || "",
    phoneSource: workspace?.onboarding?.phoneSource || "official_number",
    requestedPhoneNumber:
      workspace?.onboarding?.requestedPhoneNumber ||
      workspace?.meta?.displayPhoneNumber ||
      "",
    businessDisplayName:
      workspace?.onboarding?.businessDisplayName ||
      workspace?.organization?.name ||
      "",
    businessCategory:
      workspace?.onboarding?.businessCategory ||
      workspace?.organization?.industry ||
      "Professional Services",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [facebookConfig, setFacebookConfig] = useState<any>(null);
  const [embeddedSignupData, setEmbeddedSignupData] = useState<Record<string, any>>({});
  const processedHostedSignupCodeRef = useRef("");

  useEffect(() => {
    setForm({
      organizationName: workspace?.organization?.name || "",
      industry: workspace?.organization?.industry || "Professional Services",
      website: workspace?.organization?.website || "",
      phoneSource: workspace?.onboarding?.phoneSource || "official_number",
      requestedPhoneNumber:
        workspace?.onboarding?.requestedPhoneNumber ||
        workspace?.meta?.displayPhoneNumber ||
        "",
      businessDisplayName:
        workspace?.onboarding?.businessDisplayName ||
        workspace?.organization?.name ||
        "",
      businessCategory:
        workspace?.onboarding?.businessCategory ||
        workspace?.organization?.industry ||
        "Professional Services",
    });
  }, [workspace]);

  useEffect(() => {
    let mounted = true;
    setIsLoadingConfig(true);
    getWhatsAppFacebookConfig(apiRequest)
      .then((config) => {
        if (mounted) setFacebookConfig(config);
      })
      .catch((error) => {
        console.error("Failed to load WhatsApp Facebook config", error);
      })
      .finally(() => {
        if (mounted) setIsLoadingConfig(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiRequest]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("facebook.com")) return;

      let payload: any = event.data;
      if (typeof event.data === "string") {
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
      }

      const data = payload?.data || payload;
      const wabaId = data?.waba_id || data?.wabaId;
      const phoneNumberId = data?.phone_number_id || data?.phoneNumberId;
      const businessId =
        data?.business_id ||
        data?.businessId ||
        data?.business_manager_id ||
        data?.businessManagerId;
      const displayPhoneNumber =
        data?.phone_number ||
        data?.display_phone_number ||
        data?.displayPhoneNumber;

      if (businessId || wabaId || phoneNumberId) {
        setEmbeddedSignupData((current) => ({
          ...current,
          businessId,
          wabaId,
          phoneNumberId,
          displayPhoneNumber,
        }));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || "";
    const errorMessage =
      params.get("error_message") ||
      params.get("error_description") ||
      params.get("error") ||
      "";

    if (errorMessage) {
      toast({
        title: "Meta signup failed",
        description: errorMessage,
        variant: "destructive",
      });
      ["error", "error_message", "error_description"].forEach((key) =>
        params.delete(key),
      );
      const nextSearch = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
      );
    }

    if (!code || processedHostedSignupCodeRef.current === code) return;
    processedHostedSignupCodeRef.current = code;

    const completeHostedSignup = async () => {
      try {
        setIsConnecting(true);
        const result = await connectWhatsAppFacebook(apiRequest, {
          authResponse: { code },
          setup: {
            businessId:
              params.get("business_id") ||
              params.get("businessId") ||
              embeddedSignupData.businessId,
            wabaId:
              params.get("waba_id") ||
              params.get("wabaId") ||
              embeddedSignupData.wabaId,
            phoneNumberId:
              params.get("phone_number_id") ||
              params.get("phoneNumberId") ||
              embeddedSignupData.phoneNumberId,
            displayPhoneNumber:
              params.get("phone_number") ||
              params.get("display_phone_number") ||
              embeddedSignupData.displayPhoneNumber,
            organizationName: form.organizationName,
            businessDisplayName:
              form.businessDisplayName || form.organizationName,
            businessWebsite: form.website,
            businessCategory: form.businessCategory || form.industry,
            phoneSource: form.phoneSource,
            requestedPhoneNumber: form.requestedPhoneNumber,
          },
        });

        toast({
          title: result?.workspace?.isConfigured
            ? "WhatsApp connected"
            : "Meta signup saved",
          description: result?.workspace?.isConfigured
            ? "Your WhatsApp Business account is ready for automation."
            : "Meta login was completed. If WABA or phone IDs are still pending, finish the remaining Meta onboarding steps.",
        });
        await onConnected();
      } catch (error: any) {
        console.error("Hosted WhatsApp signup callback error:", error);
        toast({
          title: "Meta signup callback failed",
          description:
            error.message || "Could not complete WhatsApp Embedded Signup.",
          variant: "destructive",
        });
      } finally {
        setIsConnecting(false);
        [
          "code",
          "state",
          "error",
          "error_message",
          "error_description",
          "business_id",
          "businessId",
          "waba_id",
          "wabaId",
          "phone_number_id",
          "phoneNumberId",
          "phone_number",
          "display_phone_number",
        ].forEach((key) => params.delete(key));
        const nextSearch = params.toString();
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
        );
      }
    };

    void completeHostedSignup();
  }, [apiRequest, embeddedSignupData, form, onConnected]);

  const loadFacebookSdk = useCallback(
    (appId: string, graphApiVersion: string): Promise<void> => {
      if (typeof window === "undefined") {
        return Promise.reject(new Error("Facebook login is not available"));
      }

      if (window.FB) return Promise.resolve();

      return new Promise((resolve, reject) => {
        window.fbAsyncInit = () => {
          window.FB?.init({
            appId,
            cookie: true,
            xfbml: true,
            version: graphApiVersion,
          });
          window.FB?.AppEvents?.logPageView?.();
          resolve();
        };

        const existingScript = document.getElementById(FACEBOOK_SDK_SCRIPT_ID);
        if (existingScript) {
          existingScript.addEventListener(
            "error",
            () => reject(new Error("Facebook SDK failed to load")),
            { once: true },
          );
          return;
        }

        const script = document.createElement("script");
        script.id = FACEBOOK_SDK_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.addEventListener(
          "error",
          () => reject(new Error("Facebook SDK failed to load")),
          { once: true },
        );
        document.body.appendChild(script);
      });
    },
    [],
  );

  const handleFacebookConnect = async () => {
    if (!facebookConfig?.appId) {
      toast({
        title: "Meta app not configured",
        description: "Add WHATSAPP_META_APP_ID on the API server first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      if (facebookConfig?.metaHostedSignupUrl) {
        window.location.href = facebookConfig.metaHostedSignupUrl;
        return;
      }

      await loadFacebookSdk(
        facebookConfig.appId,
        facebookConfig.graphApiVersion || "v23.0",
      );

      const loginOptions = facebookConfig.embeddedSignupConfigId
        ? {
            config_id: facebookConfig.embeddedSignupConfigId,
            response_type: "code",
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: "whatsapp_business_app_onboarding",
              sessionInfoVersion: "3",
            },
          }
        : {
            scope:
              "public_profile,business_management,whatsapp_business_management,whatsapp_business_messaging",
            return_scopes: true,
          };

      const response = await new Promise<any>((resolve) => {
        window.FB?.login((loginResponse: any) => resolve(loginResponse), loginOptions);
      });

      if (response?.status !== "connected" || !response?.authResponse) {
        const metaError =
          response?.error?.message ||
          response?.error_message ||
          response?.errorDescription ||
          response?.message ||
          "";
        const isJavascriptSdkSetupError = /jssdk|javascript sdk|sdk/i.test(
          metaError,
        );
        toast({
          title: isJavascriptSdkSetupError
            ? "Enable JavaScript SDK login in Meta"
            : "Facebook connection cancelled",
          description:
            metaError ||
            "Please approve the business permissions to connect WhatsApp.",
          variant: "destructive",
        });
        return;
      }

      const result = await connectWhatsAppFacebook(apiRequest, {
        authResponse: response.authResponse,
        setup: {
          ...embeddedSignupData,
          organizationName: form.organizationName,
          businessDisplayName:
            form.businessDisplayName || form.organizationName,
          businessWebsite: form.website,
          businessCategory: form.businessCategory || form.industry,
          phoneSource: form.phoneSource,
          requestedPhoneNumber: form.requestedPhoneNumber,
        },
      });

      toast({
        title: result?.workspace?.isConfigured
          ? "WhatsApp connected"
          : "Facebook connected",
        description: result?.workspace?.isConfigured
          ? "Your WABA and phone number are ready for automation."
          : "Facebook login was saved. Complete Meta Embedded Signup if WABA details are still pending.",
      });
      await onConnected();
    } catch (error: any) {
      console.error("Facebook WhatsApp connect error:", error);
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect Facebook Business.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDeleteWhatsAppData = async () => {
    const confirmed = window.confirm(
      "Delete all WhatsApp dashboard data? This will remove the connected Meta/WhatsApp account details, contacts, conversations, appointments, campaigns, templates, and agents from RocketReplai. This does not cancel any Razorpay subscription.",
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteWhatsAppWorkspace(apiRequest);
      setEmbeddedSignupData({});
      toast({
        title: "WhatsApp data deleted",
        description:
          "Your WhatsApp dashboard data was removed. A fresh workspace will be created when the dashboard reloads.",
      });
      await onConnected();
    } catch (error: any) {
      console.error("WhatsApp data delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete WhatsApp dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const setup = [
    [
      "Facebook Business",
      workspace?.onboarding?.facebookUserId ? "Connected" : "Not connected",
      workspace?.onboarding?.facebookName || "Login through Business Connect",
    ],
    [
      "Business ID",
      workspace?.onboarding?.businessId || workspace?.meta?.businessManagerId
        ? "Captured"
        : "Pending",
      workspace?.onboarding?.businessId ||
        workspace?.meta?.businessManagerId ||
        embeddedSignupData.businessId ||
        "Provided by Embedded Signup",
    ],
    [
      "WABA ID",
      workspace?.meta?.wabaId ? "Captured" : "Pending",
      workspace?.meta?.wabaId ||
        embeddedSignupData.wabaId ||
        "Provided by Meta",
    ],
    [
      "Phone Number ID",
      workspace?.meta?.phoneNumberId ? "Captured" : "Pending",
      workspace?.meta?.phoneNumberId ||
        embeddedSignupData.phoneNumberId ||
        "Provided by Meta",
    ],
    [
      "Display Number",
      workspace?.meta?.displayPhoneNumber ? "Ready" : "Pending",
      workspace?.meta?.displayPhoneNumber ||
        form.requestedPhoneNumber ||
        "Business WhatsApp number",
    ],
    [
      "Webhook",
      facebookConfig?.webhookCallbackUrl ? "Configured URL" : "Pending env",
      facebookConfig?.webhookCallbackUrl || "Set PUBLIC_API_URL on API server",
    ],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section className={`rounded-2xl border ${cardClass} p-5`}>
        <SectionTitle icon={Settings} title="Connect WhatsApp Business" />
        <form
          className="mt-5 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSaving(true);
            try {
              await onSave({
                organization: {
                  name: form.organizationName,
                  industry: form.businessCategory || form.industry,
                  website: form.website,
                },
              });
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div className={`rounded-xl border ${softCardClass} p-4`}>
            <div className="flex items-start gap-3">
              <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-400" />
              <div>
                <h3 className="font-bold">Choose your WhatsApp number</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-white/50">
                  Use an official business number that can be registered on WhatsApp Business Platform, or let Meta offer a free number during signup.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                ["official_number", "I have an official number"],
                ["meta_free_number", "Use Meta free number"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                    form.phoneSource === value
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-500"
                      : "border-gray-200 text-gray-600 dark:border-white/[0.08] dark:text-white/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="phoneSource"
                    value={value}
                    checked={form.phoneSource === value}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        phoneSource: value,
                      }))
                    }
                    className="h-4 w-4 accent-emerald-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {[
            ["organizationName", "Business name"],
            ["businessDisplayName", "WhatsApp display name"],
            ["requestedPhoneNumber", "Official WhatsApp number"],
            ["website", "Official website URL"],
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
                type="text"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              />
            </label>
          ))}
          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Business category
            </span>
            <select
              value={form.businessCategory}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  businessCategory: event.target.value,
                  industry: event.target.value,
                }))
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
            >
              {businessCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            disabled={isSaving}
            className="rounded-xl border border-emerald-500 bg-transparent text-emerald-500 hover:bg-emerald-500/10"
          >
            {isSaving ? "Saving..." : "Save Business Profile"}
          </Button>
            <Button
              type="button"
              disabled={isConnecting || isLoadingConfig}
              onClick={handleFacebookConnect}
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-70"
            >
              {isConnecting
                ? "Connecting..."
                : isLoadingConfig
                  ? "Loading Meta config..."
                  : "Continue with Facebook"}
            </Button>
          </div>
        </form>
        <div className="mt-5 grid gap-3">
          {setup.map(([label, status, note]) => (
            <div key={label} className={`rounded-xl border ${softCardClass} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{label}</h3>
                  <p className="mt-1 break-all text-sm text-gray-500 dark:text-white/50">{note}</p>
                </div>
                <Badge
                  className={
                    ["Connected", "Captured", "Ready", "Configured URL"].includes(status)
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-300"
                  }
                >
                  {status}
                </Badge>
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
        <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
          <h3 className="font-black text-red-500">Delete WhatsApp Account Data</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/55">
            Remove the connected Meta account details, WhatsApp contacts,
            conversations, appointments, campaigns, templates, and automation
            agents stored for this WhatsApp dashboard.
          </p>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteWhatsAppData}
            className="mt-4 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:cursor-default disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete WhatsApp Data"}
          </Button>
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
