"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageCircle,
  Plug,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Button,
  Orbs,
  Spinner,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  connectWhatsAppFacebook,
  deleteWhatsAppWorkspace,
  getWhatsAppFacebookConfig,
  getWhatsAppDashboard,
  publishWhatsAppAppointmentFlow,
  syncWhatsAppAppointmentFlow,
  submitWhatsAppGreetingTemplate,
  updateWhatsAppWorkspace,
} from "@/lib/services/whatsapp-actions.api";
import {
  createRazorpaySubscription,
  getRazerpayPlanInfo,
} from "@/lib/services/subscription-actions.api";
import { clearStoredReferralCode, getStoredReferralCode } from "@/lib/referral";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

declare global {
  interface Window {
    FB?: any;
    Razorpay: any;
    fbAsyncInit?: () => void;
  }
}

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const WHATSAPP_PRODUCT_ID = "whatsapp-launch";
const WHATSAPP_FIRST_MONTH_OFFER_ID = "offer_T3WZjvSEGwtewO";

type WhatsAppView =
  | "overview"
  | "appointments"
  | "business-info"
  | "templates"
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
    totalAppointments: number;
    requestedAppointments: number;
    messagesUsed: number;
    messageLimit: number;
    deliveredRate: number;
    readRate: number;
  };
  recentConversations: any[];
  appointments: any[];
  appointmentConfig: any;
  appointmentFlow: any;
  businessInfo: any;
  greetingTemplate: any;
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
      "Appointment booking flow",
      "Business info replies",
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
      "Appointment booking flow",
      "Business info replies from saved website/file notes",
      "Greeting template review tracker",
      "Owner alerts by email and WhatsApp",
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
      recentConversations: data.recentConversations || [],
      appointments: data.appointments || [],
      appointmentConfig:
        data.appointmentConfig || data.workspace?.appointmentConfig,
      appointmentFlow:
        data.appointmentFlow || data.workspace?.appointmentFlow || {},
      businessInfo: data.businessInfo || data.workspace?.businessInfo || {},
      greetingTemplate:
        data.greetingTemplate || data.workspace?.greetingTemplate || {},
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
            {view === "appointments" && (
              <Appointments
                cardClass={cardClass}
                softCardClass={softCardClass}
                data={mergedData}
                onSaveFlow={async (payload) => {
                  await updateWhatsAppWorkspace(apiRequest, {
                    appointmentFlow: payload.appointmentFlow,
                    appointmentConfig: payload.appointmentConfig,
                  });
                  toast({
                    title: "Flow setup saved",
                    description:
                      "Sync the WhatsApp Flow with Meta before publishing it.",
                  });
                  await loadDashboard();
                }}
                onSyncFlow={async (publish = false) => {
                  await syncWhatsAppAppointmentFlow(apiRequest, { publish });
                  toast({
                    title: publish
                      ? "Flow synced and published"
                      : "Flow synced",
                    description: publish
                      ? "Meta accepted the appointment Flow for publishing."
                      : "Meta validation status has been refreshed.",
                  });
                  await loadDashboard();
                }}
                onPublishFlow={async () => {
                  await publishWhatsAppAppointmentFlow(apiRequest);
                  toast({
                    title: "Flow published",
                    description:
                      "Customers can now open the native WhatsApp appointment form.",
                  });
                  await loadDashboard();
                }}
              />
            )}
            {view === "business-info" && (
              <BusinessInfo
                cardClass={cardClass}
                softCardClass={softCardClass}
                data={mergedData}
                onSave={async (businessInfo) => {
                  await updateWhatsAppWorkspace(apiRequest, { businessInfo });
                  toast({
                    title: "Business info saved",
                    description:
                      "WhatsApp replies will use the saved business details.",
                  });
                  await loadDashboard();
                }}
              />
            )}
            {view === "templates" && (
              <Templates
                cardClass={cardClass}
                data={mergedData}
                onSave={async (greetingTemplate) => {
                  await updateWhatsAppWorkspace(apiRequest, {
                    greetingTemplate,
                  });
                  toast({
                    title: "Greeting template saved",
                    description:
                      "Submit it for Meta review when the copy is ready.",
                  });
                  await loadDashboard();
                }}
                onSubmit={async (greetingTemplate) => {
                  await submitWhatsAppGreetingTemplate(
                    apiRequest,
                    greetingTemplate,
                  );
                  toast({
                    title: "Submitted to Meta",
                    description:
                      "Template status will update after Meta review.",
                  });
                  await loadDashboard();
                }}
              />
            )}
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
                    description:
                      "WhatsApp workspace configuration was updated.",
                  });
                  await loadDashboard();
                }}
              />
            )}
          </>
        )}
        <p className={`mt-8 text-xs ${styles.text.muted}`}>
          WhatsApp automation currently supports appointment booking, business
          info replies, greeting template tracking, Meta setup, and billing.
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
    overview: "WhatsApp Automation",
    appointments: "Appointment Booking",
    "business-info": "Business Info Replies",
    templates: "Greeting Template",
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
            Built for local businesses that need WhatsApp appointment booking,
            owner alerts, business-info replies, greeting template review, and
            Meta setup status in one workspace.
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
      label: "Appointment requests",
      value: String(
        data.overview.totalAppointments || data.appointments.length,
      ),
      change: `${data.overview.requestedAppointments || 0} new`,
      icon: CalendarCheck,
    },
    {
      label: "Messages used",
      value: String(data.overview.messagesUsed),
      change: `${data.overview.messageLimit} limit`,
      icon: MessageCircle,
    },
    {
      label: "Greeting template",
      value: data.greetingTemplate?.status || "draft",
      change: data.greetingTemplate?.name || "default",
      icon: FileText,
    },
    {
      label: "Business info",
      value:
        data.businessInfo?.knowledgeBaseUrl || data.businessInfo?.summary
          ? "Ready"
          : "Missing",
      change: data.businessInfo?.knowledgeBaseUrl
        ? "Cloudinary saved"
        : data.businessInfo?.websiteUrl
          ? "Website saved"
          : "Add info",
      icon: Building2,
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
          <SectionTitle icon={CalendarCheck} title="WhatsApp Booking Flow" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              [
                "Greet",
                "Customer sends a WhatsApp message and sees your greeting.",
              ],
              [
                "Collect",
                "Customer chooses appointment booking and shares required details.",
              ],
              [
                "Notify",
                "Owner receives appointment details and the customer gets confirmation.",
              ],
            ].map(([title, desc], index) => (
              <div
                key={title}
                className={`rounded-xl border ${softCardClass} p-4`}
              >
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
              [
                "Facebook Business",
                data.workspace?.onboarding?.status || "Not started",
              ],
              [
                "WABA ID",
                data.workspace?.meta?.wabaId ? "Connected" : "Waiting",
              ],
              [
                "Phone Number ID",
                data.workspace?.meta?.phoneNumberId ? "Connected" : "Waiting",
              ],
              [
                "Access token",
                data.workspace?.meta?.accessToken ? "Stored" : "Waiting",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5"
              >
                <span className="text-sm text-gray-500 dark:text-white/55">
                  {label}
                </span>
                <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/15">
                  {value}
                </Badge>
              </div>
            ))}
          </div>
          <Button
            asChild
            className="mt-5 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Link href="/whatsapp/settings">
              Connect WhatsApp
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle
            icon={FileText}
            title="Business Info Replies"
            action="/whatsapp/business-info"
          />
          <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-white/55">
            Save a website link, business notes, or a text file up to 10 MB.
            WhatsApp replies use this information when customers ask general
            questions.
          </p>
          <div className={`mt-4 rounded-xl border ${softCardClass} p-4`}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Current source
            </p>
            <p className="mt-2 text-sm font-semibold">
              {data.businessInfo?.knowledgeBaseUrl ||
                data.businessInfo?.fileName ||
                data.businessInfo?.websiteUrl ||
                "No business info saved yet"}
            </p>
          </div>
        </section>
        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle
            icon={MessageCircle}
            title="Greeting Template"
            action="/whatsapp/templates"
          />
          <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-white/55">
            Keep one greeting template for Meta review. Approved copy can be
            used as the first reply when customers message the business.
          </p>
          <Badge className="mt-4 bg-emerald-500/15 text-emerald-300">
            {data.greetingTemplate?.status || "draft"}
          </Badge>
        </section>
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

function Appointments({
  cardClass,
  softCardClass,
  data,
  onSaveFlow,
  onSyncFlow,
  onPublishFlow,
}: {
  cardClass: string;
  softCardClass: string;
  data: WhatsAppDashboardData;
  onSaveFlow: (payload: {
    appointmentFlow: Record<string, any>;
    appointmentConfig: Record<string, any>;
  }) => Promise<void>;
  onSyncFlow: (publish?: boolean) => Promise<void>;
  onPublishFlow: () => Promise<void>;
}) {
  const config = data.appointmentConfig || {};
  const appointmentFlow = data.appointmentFlow || {};
  const buildFlowFormState = () => {
    const services = Array.isArray(config.services) && config.services.length
      ? config.services
      : [
          {
            name: "General consultation",
            durationMinutes: 30,
            priceInr: 0,
            doctor: "",
            isActive: true,
          },
        ];
    const chatQuestions = Object.fromEntries(
      (Array.isArray(appointmentFlow.chatQuestions)
        ? appointmentFlow.chatQuestions
        : []
      ).map((item: any) => [item.field, item.question]),
    );
    return {
      enabled: appointmentFlow.enabled !== false,
      name: appointmentFlow.name || "RocketReplai Appointment Booking",
      clinicName:
        config.clinicName ||
        data.workspace?.organization?.name ||
        "My Business",
      endpointUri: appointmentFlow.endpointUri || "",
      publicKey: appointmentFlow.publicKey || "",
      departmentLabel: appointmentFlow.departmentLabel || "Department",
      locationLabel: appointmentFlow.locationLabel || "Location",
      serviceLabel: appointmentFlow.serviceLabel || "Service",
      customerNameLabel: appointmentFlow.customerNameLabel || "Full name",
      phoneLabel: appointmentFlow.phoneLabel || "Phone number",
      requirementLabel: appointmentFlow.requirementLabel || "Requirement",
      dateLabel: appointmentFlow.dateLabel || "Preferred date",
      timeLabel: appointmentFlow.timeLabel || "Preferred time",
      submitButtonLabel:
        appointmentFlow.submitButtonLabel || "Book appointment",
      successMessage:
        appointmentFlow.successMessage ||
        "Thanks. Your appointment request has been sent. The business team will confirm availability soon.",
      departmentOptionsText: (
        appointmentFlow.departmentOptions?.length
          ? appointmentFlow.departmentOptions
          : ["General", "Sales", "Support"]
      ).join("\n"),
      locationOptionsText: (
        appointmentFlow.locationOptions?.length
          ? appointmentFlow.locationOptions
          : ["Main branch", "Online consultation"]
      ).join("\n"),
      servicesText: services
        .map(
          (service: any) =>
            `${service.name}|${service.durationMinutes || 30}|${service.priceInr || 0}|${service.doctor || ""}`,
        )
        .join("\n"),
      chatNameQuestion:
        chatQuestions.patientName || "What is your full name?",
      chatPhoneQuestion:
        chatQuestions.patientPhone || "What phone number should we use?",
      chatServiceQuestion:
        chatQuestions.service || "Which service do you want to book?",
      chatDateQuestion:
        chatQuestions.preferredDate || "Which date do you prefer?",
      chatTimeQuestion:
        chatQuestions.preferredTime || "Which time do you prefer?",
      chatRequirementQuestion:
        chatQuestions.symptoms || "Please describe your requirement.",
    };
  };
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [isSyncingFlow, setIsSyncingFlow] = useState(false);
  const [isPublishingFlow, setIsPublishingFlow] = useState(false);
  const [flowForm, setFlowForm] = useState(buildFlowFormState);

  useEffect(() => {
    setFlowForm(buildFlowFormState());
  }, [data.workspace?._id, appointmentFlow.updatedAt, appointmentFlow.flowId]);

  const appointments = data.appointments || [];
  const requested = appointments.filter(
    (item) => item.status === "requested",
  ).length;
  const confirmed = appointments.filter(
    (item) => item.status === "confirmed",
  ).length;
  const urgent = appointments.filter((item) =>
    ["urgent", "emergency"].includes(item.urgency),
  ).length;
  const flowStatus = appointmentFlow.status || "draft";
  const flowValidationErrors = appointmentFlow.validationErrors || [];
  const flowReady = flowStatus === "published";
  const splitLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  const previewDepartments = splitLines(flowForm.departmentOptionsText);
  const previewLocations = splitLines(flowForm.locationOptionsText);
  const previewServices = splitLines(flowForm.servicesText).map(
    (line) => line.split("|")[0]?.trim() || "General consultation",
  );
  const setupSteps = [
    {
      label: "Endpoint URI",
      detail: flowForm.endpointUri || "Set PUBLIC_API_URL or enter endpoint",
      ready: Boolean(flowForm.endpointUri),
    },
    {
      label: "Add phone number",
      detail: data.workspace?.meta?.displayPhoneNumber || "Connect WABA number",
      ready:
        appointmentFlow.phoneNumberStatus === "added" ||
        Boolean(data.workspace?.meta?.phoneNumberId),
    },
    {
      label: "Sign public key",
      detail:
        appointmentFlow.publicKeyStatus === "signed"
          ? "Public key signed with Meta"
          : flowForm.publicKey
            ? "Public key saved, sync to sign with Meta"
            : "Add the Flow public key generated from your server private key",
      ready: appointmentFlow.publicKeyStatus === "signed",
    },
    {
      label: "Connect Meta app",
      detail: data.workspace?.meta?.wabaId || "Connect through Facebook",
      ready:
        appointmentFlow.metaAppStatus === "connected" ||
        Boolean(data.workspace?.meta?.wabaId),
    },
    {
      label: "Health check",
      detail:
        appointmentFlow.endpointStatus === "healthy"
          ? "Endpoint healthy"
          : appointmentFlow.endpointStatus === "configured"
            ? "Ready for Meta health check"
            : "Waiting for endpoint",
      ready:
        appointmentFlow.endpointStatus === "healthy" ||
        appointmentFlow.endpointStatus === "configured",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Requested", requested, "Needs confirmation"],
          ["Confirmed", confirmed, "Scheduled appointments"],
          ["Urgent", urgent, "Needs quick follow-up"],
        ].map(([label, value, note]) => (
          <div
            key={label}
            className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-5"
          >
            <p className="text-sm text-gray-500 dark:text-white/50">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-400">
              {note}
            </p>
          </div>
        ))}
      </div>

      <section className={`rounded-2xl border ${cardClass} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <SectionTitle
              icon={FileText}
              title="Native WhatsApp Appointment Flow"
            />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-white/55">
              These booking settings generate a real WhatsApp Flow form under
              the connected WABA. Sync validates the form with Meta. Publish
              makes it available to customers when they ask to book.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Badge
                className={
                  flowReady
                    ? "bg-emerald-500/15 text-emerald-300"
                    : flowStatus === "validation_error" ||
                        flowStatus === "error"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-amber-500/15 text-amber-300"
                }
              >
                {flowStatus}
              </Badge>
              <span className="text-gray-500 dark:text-white/50">
                {appointmentFlow.flowId
                  ? `Flow ID: ${appointmentFlow.flowId}`
                  : "No Flow created yet"}
              </span>
              {appointmentFlow.lastSyncedAt && (
                <span className="text-gray-500 dark:text-white/50">
                  Synced{" "}
                  {new Date(appointmentFlow.lastSyncedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[260px]">
            <Button
              type="button"
              disabled={isSyncingFlow}
              onClick={async () => {
                setIsSyncingFlow(true);
                try {
                  await onSyncFlow(false);
                } finally {
                  setIsSyncingFlow(false);
                }
              }}
              className="rounded-xl border border-emerald-500 bg-transparent text-emerald-500 hover:bg-emerald-500/10"
            >
              {isSyncingFlow ? "Syncing..." : "Sync Draft with Meta"}
            </Button>
            <Button
              type="button"
              disabled={isPublishingFlow || flowValidationErrors.length > 0}
              onClick={async () => {
                setIsPublishingFlow(true);
                try {
                  await onPublishFlow();
                } finally {
                  setIsPublishingFlow(false);
                }
              }}
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {isPublishingFlow ? "Publishing..." : "Publish Flow"}
            </Button>
          </div>
        </div>
        {appointmentFlow.lastError && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {appointmentFlow.lastError}
          </div>
        )}
        {flowValidationErrors.length > 0 && (
          <div className="mt-4 grid gap-2">
            {flowValidationErrors
              .slice(0, 5)
              .map((error: any, index: number) => (
                <div
                  key={`${error?.message || "flow-error"}-${index}`}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {error?.message || JSON.stringify(error)}
                </div>
              ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle icon={CalendarCheck} title="Flow Setup" />
          <div className="mt-5 grid gap-3">
            {setupSteps.map((step) => (
              <div
                key={step.label}
                className={`flex items-start gap-3 rounded-xl border ${softCardClass} p-3`}
              >
                <span
                  className={
                    step.ready
                      ? "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                      : "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"
                  }
                >
                  {step.ready ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black">{step.label}</p>
                  <p className="mt-0.5 break-words text-xs text-gray-500 dark:text-white/50">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form
            className="mt-6 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSavingFlow(true);
              try {
                const services = splitLines(flowForm.servicesText)
                  .map((line: string) => {
                    const [name, durationMinutes, priceInr, doctor] =
                      line.split("|");
                    return {
                      name: name?.trim() || "Consultation",
                      durationMinutes: Number(durationMinutes) || 30,
                      priceInr: Number(priceInr) || 0,
                      doctor: doctor?.trim() || "",
                      isActive: true,
                    };
                  })
                  .slice(0, 10);
                await onSaveFlow({
                  appointmentFlow: {
                    enabled: flowForm.enabled,
                    name: flowForm.name,
                    endpointUri: flowForm.endpointUri,
                    publicKey: flowForm.publicKey,
                    departmentLabel: flowForm.departmentLabel,
                    locationLabel: flowForm.locationLabel,
                    serviceLabel: flowForm.serviceLabel,
                    customerNameLabel: flowForm.customerNameLabel,
                    phoneLabel: flowForm.phoneLabel,
                    requirementLabel: flowForm.requirementLabel,
                    dateLabel: flowForm.dateLabel,
                    timeLabel: flowForm.timeLabel,
                    submitButtonLabel: flowForm.submitButtonLabel,
                    successMessage: flowForm.successMessage,
                    departmentOptions: splitLines(flowForm.departmentOptionsText),
                    locationOptions: splitLines(flowForm.locationOptionsText),
                    chatQuestions: [
                      {
                        field: "patientName",
                        question: flowForm.chatNameQuestion,
                        required: true,
                      },
                      {
                        field: "patientPhone",
                        question: flowForm.chatPhoneQuestion,
                        required: true,
                      },
                      {
                        field: "service",
                        question: flowForm.chatServiceQuestion,
                        required: true,
                      },
                      {
                        field: "preferredDate",
                        question: flowForm.chatDateQuestion,
                        required: true,
                      },
                      {
                        field: "preferredTime",
                        question: flowForm.chatTimeQuestion,
                        required: true,
                      },
                      {
                        field: "symptoms",
                        question: flowForm.chatRequirementQuestion,
                        required: true,
                      },
                    ],
                  },
                  appointmentConfig: {
                    enabled: flowForm.enabled,
                    clinicName: flowForm.clinicName,
                    services,
                    requiredFields: [
                      "patient_name",
                      "phone",
                      "symptoms",
                      "preferred_date",
                      "preferred_time",
                    ],
                  },
                });
              } finally {
                setIsSavingFlow(false);
              }
            }}
          >
            <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <span className="text-sm font-bold">Enable WhatsApp Flow booking</span>
              <input
                type="checkbox"
                checked={flowForm.enabled}
                onChange={(event) =>
                  setFlowForm((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-emerald-500"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Flow name"
                value={flowForm.name}
                onChange={(value) =>
                  setFlowForm((current) => ({ ...current, name: value }))
                }
              />
              <TextInput
                label="Business / clinic name"
                value={flowForm.clinicName}
                onChange={(value) =>
                  setFlowForm((current) => ({ ...current, clinicName: value }))
                }
              />
            </div>
            <TextInput
              label="Endpoint URI"
              value={flowForm.endpointUri}
              onChange={(value) =>
                setFlowForm((current) => ({ ...current, endpointUri: value }))
              }
            />
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Flow public key to sign with Meta
              </span>
              <textarea
                value={flowForm.publicKey}
                onChange={(event) =>
                  setFlowForm((current) => ({
                    ...current,
                    publicKey: event.target.value,
                  }))
                }
                rows={4}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput
                label="Department label"
                value={flowForm.departmentLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({
                    ...current,
                    departmentLabel: value,
                  }))
                }
              />
              <TextInput
                label="Location label"
                value={flowForm.locationLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({
                    ...current,
                    locationLabel: value,
                  }))
                }
              />
              <TextInput
                label="Service label"
                value={flowForm.serviceLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({
                    ...current,
                    serviceLabel: value,
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Customer name label"
                value={flowForm.customerNameLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({
                    ...current,
                    customerNameLabel: value,
                  }))
                }
              />
              <TextInput
                label="Phone label"
                value={flowForm.phoneLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({ ...current, phoneLabel: value }))
                }
              />
              <TextInput
                label="Requirement label"
                value={flowForm.requirementLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({
                    ...current,
                    requirementLabel: value,
                  }))
                }
              />
              <TextInput
                label="Submit button label"
                value={flowForm.submitButtonLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({
                    ...current,
                    submitButtonLabel: value,
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Date label"
                value={flowForm.dateLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({ ...current, dateLabel: value }))
                }
              />
              <TextInput
                label="Time label"
                value={flowForm.timeLabel}
                onChange={(value) =>
                  setFlowForm((current) => ({ ...current, timeLabel: value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Departments, one per line
                </span>
                <textarea
                  value={flowForm.departmentOptionsText}
                  onChange={(event) =>
                    setFlowForm((current) => ({
                      ...current,
                      departmentOptionsText: event.target.value,
                    }))
                  }
                  rows={4}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Locations, one per line
                </span>
                <textarea
                  value={flowForm.locationOptionsText}
                  onChange={(event) =>
                    setFlowForm((current) => ({
                      ...current,
                      locationOptionsText: event.target.value,
                    }))
                  }
                  rows={4}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Services, one per line: name|duration|price|doctor
              </span>
              <textarea
                value={flowForm.servicesText}
                onChange={(event) =>
                  setFlowForm((current) => ({
                    ...current,
                    servicesText: event.target.value,
                  }))
                }
                rows={5}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              />
            </label>
            <div className="border-t border-gray-200 pt-4 dark:border-white/[0.08]">
              <p className="text-sm font-black">Chat appointment questions</p>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-white/50">
                These questions are asked one at a time when a customer chooses
                Book in chat. Answers are saved with the appointment request.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Customer name question"
                  value={flowForm.chatNameQuestion}
                  onChange={(value) =>
                    setFlowForm((current) => ({
                      ...current,
                      chatNameQuestion: value,
                    }))
                  }
                />
                <TextInput
                  label="Phone question"
                  value={flowForm.chatPhoneQuestion}
                  onChange={(value) =>
                    setFlowForm((current) => ({
                      ...current,
                      chatPhoneQuestion: value,
                    }))
                  }
                />
                <TextInput
                  label="Service question"
                  value={flowForm.chatServiceQuestion}
                  onChange={(value) =>
                    setFlowForm((current) => ({
                      ...current,
                      chatServiceQuestion: value,
                    }))
                  }
                />
                <TextInput
                  label="Preferred date question"
                  value={flowForm.chatDateQuestion}
                  onChange={(value) =>
                    setFlowForm((current) => ({
                      ...current,
                      chatDateQuestion: value,
                    }))
                  }
                />
                <TextInput
                  label="Preferred time question"
                  value={flowForm.chatTimeQuestion}
                  onChange={(value) =>
                    setFlowForm((current) => ({
                      ...current,
                      chatTimeQuestion: value,
                    }))
                  }
                />
                <TextInput
                  label="Requirement question"
                  value={flowForm.chatRequirementQuestion}
                  onChange={(value) =>
                    setFlowForm((current) => ({
                      ...current,
                      chatRequirementQuestion: value,
                    }))
                  }
                />
              </div>
            </div>
            <TextInput
              label="Customer success message"
              value={flowForm.successMessage}
              onChange={(value) =>
                setFlowForm((current) => ({
                  ...current,
                  successMessage: value,
                }))
              }
            />
            <Button
              disabled={isSavingFlow}
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {isSavingFlow ? "Saving..." : "Save Flow Setup"}
            </Button>
          </form>
        </section>

        <section className={`rounded-2xl border ${cardClass} p-5`}>
          <SectionTitle icon={FileText} title="Customer Preview" />
          <div className={`mt-5 rounded-[2rem] border ${softCardClass} p-4`}>
            <div className="mx-auto max-w-sm rounded-[1.7rem] border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#101214]">
              <div className="rounded-t-[1.35rem] bg-emerald-500 px-4 py-3 text-sm font-black text-white">
                {flowForm.name || "Appointment Booking"}
              </div>
              <div className="space-y-3 rounded-b-[1.35rem] border border-t-0 border-gray-100 p-4 dark:border-white/[0.08]">
                <div>
                  <p className="text-base font-black">
                    Book appointment with {flowForm.clinicName || "this business"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-white/50">
                    Share your appointment details. The business team will confirm availability.
                  </p>
                </div>
                {[
                  [
                    flowForm.departmentLabel,
                    previewDepartments[0] || "General",
                  ],
                  [
                    flowForm.locationLabel,
                    previewLocations[0] || "Main branch",
                  ],
                  [
                    flowForm.serviceLabel,
                    previewServices[0] || "General consultation",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-gray-200 px-3 py-2 dark:border-white/[0.08]"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
                {[
                  flowForm.customerNameLabel,
                  flowForm.phoneLabel,
                  flowForm.requirementLabel,
                  flowForm.dateLabel,
                  flowForm.timeLabel,
                ].map((label) => (
                  <div
                    key={label}
                    className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400 dark:border-white/[0.08]"
                  >
                    {label}
                  </div>
                ))}
                <div className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-white">
                  {flowForm.submitButtonLabel || "Book appointment"}
                </div>
              </div>
            </div>
          </div>
          <div className={`mt-4 rounded-xl border ${softCardClass} p-4`}>
            <p className="text-sm font-black">After submit</p>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/55">
              {flowForm.successMessage}
            </p>
            <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-white/45">
              The Flow endpoint saves the booking in this dashboard and sends
              owner alerts through the existing appointment notification system.
            </p>
          </div>
        </section>
      </div>

      <section className={`rounded-2xl border ${cardClass} p-5`}>
        <SectionTitle icon={CalendarCheck} title="Appointment Requests" />
        <div className="mt-5 grid gap-3">
          {appointments.length === 0 && (
            <div
              className={`rounded-xl border ${softCardClass} p-5 text-sm text-gray-500 dark:text-white/55`}
            >
              No appointment requests yet. WhatsApp messages with booking intent
              will appear here automatically.
            </div>
          )}
          {appointments.map((appointment: any) => (
            <div
              key={
                appointment._id ||
                `${appointment.patientPhone}-${appointment.createdAt}`
              }
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

function BusinessInfo({
  cardClass,
  softCardClass,
  data,
  onSave,
}: {
  cardClass: string;
  softCardClass: string;
  data: WhatsAppDashboardData;
  onSave: (businessInfo: Record<string, any>) => Promise<void>;
}) {
  const info = data.businessInfo || {};
  const [form, setForm] = useState({
    websiteUrl: info.websiteUrl || data.workspace?.organization?.website || "",
    summary: info.summary || "",
    fileName: info.fileName || "",
    fileType: info.fileType || "",
    fileSize: Number(info.fileSize || 0),
    fileText: info.fileText || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [fileError, setFileError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const handleFile = async (file?: File) => {
    setFileError("");
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File must be 10 MB or smaller.");
      return;
    }
    const text = await file.text();
    setForm((current) => ({
      ...current,
      fileName: file.name,
      fileType: file.type || "text/plain",
      fileSize: file.size,
      fileText: text,
    }));
  };

  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={FileText} title="Business Info Replies" />
      <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-white/55">
        Save the business facts WhatsApp should use for customer questions. The
        website scrape and file knowledge are uploaded to Cloudinary, and only
        the Cloudinary link plus metadata are stored in the dashboard database.
      </p>
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          setSaveStatus(
            form.websiteUrl
              ? "Scraping website and uploading knowledge to Cloudinary. This can take 1-2 minutes. Please do not close this page."
              : form.fileText
                ? "Uploading file knowledge to Cloudinary. Please do not close this page."
                : "Saving business information.",
          );
          try {
            await onSave(form);
          } finally {
            setIsSaving(false);
            setSaveStatus("");
          }
        }}
      >
        <TextInput
          label="Website link"
          value={form.websiteUrl}
          onChange={(value) =>
            setForm((current) => ({ ...current, websiteUrl: value }))
          }
        />
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Business information
          </span>
          <textarea
            value={form.summary}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                summary: event.target.value,
              }))
            }
            rows={8}
            placeholder="Services, pricing, address, opening hours, FAQs, policies, and anything customers commonly ask."
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
          />
        </label>
        <div className={`rounded-xl border ${softCardClass} p-4`}>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Upload business info file, max 10 MB
            </span>
            <input
              type="file"
              accept=".txt,.md,.csv,.json,.html,.log"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              className="text-sm"
            />
          </label>
          {fileError && (
            <p className="mt-2 text-sm text-red-400">{fileError}</p>
          )}
          {form.fileName && (
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              Loaded {form.fileName} ({Math.ceil(form.fileSize / 1024)} KB)
            </p>
          )}
          {info.knowledgeBaseUrl && (
            <p className="mt-2 break-all text-xs text-emerald-500">
              Cloudinary knowledge: {info.knowledgeBaseUrl}
            </p>
          )}
        </div>
        {isSaving && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 max-h-max">
            <Spinner
              label={saveStatus || "Processing business information..."}
            />
            <p className="mt-3 text-sm font-semibold text-amber-500">
              Keep this tab open while we scrape and store the knowledge base.
            </p>
          </div>
        )}
        <Button
          disabled={isSaving}
          className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {isSaving ? "Processing..." : "Save Business Info"}
        </Button>
      </form>
    </section>
  );
}

function Templates({
  cardClass,
  data,
  onSave,
  onSubmit,
}: {
  cardClass: string;
  data: WhatsAppDashboardData;
  onSave: (greetingTemplate: Record<string, any>) => Promise<void>;
  onSubmit: (greetingTemplate: Record<string, any>) => Promise<void>;
}) {
  const template = data.greetingTemplate || {};
  const [form, setForm] = useState({
    name: template.name || "rocket_whatsapp_greeting",
    language: template.language || "en_US",
    body:
      template.body ||
      "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.",
    example:
      template.example ||
      "Hi, thanks for messaging Ainspiretech. Please choose an option or share what you need help with.",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const status = template.status || "draft";
  const isApproved = status === "approved";

  return (
    <section className={`rounded-2xl border ${cardClass} p-5`}>
      <SectionTitle icon={MessageCircle} title="Greeting Template" />
      <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-white/55">
        Keep one greeting template. Edit the default copy, submit it for Meta
        review, and use it as the first customer reply once approved. To create
        a different greeting later, reset this one, edit the default again, and
        resubmit it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Badge
          className={
            isApproved
              ? "bg-emerald-500/15 text-emerald-300"
              : status === "rejected"
                ? "bg-red-500/15 text-red-300"
                : "bg-amber-500/15 text-amber-300"
          }
        >
          {status}
        </Badge>
        {template.lastError && (
          <span className="text-sm text-red-400">{template.lastError}</span>
        )}
      </div>
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          try {
            await onSave(form);
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <TextInput
          label="Template name"
          value={form.name}
          onChange={(value) =>
            setForm((current) => ({ ...current, name: value }))
          }
        />
        <TextInput
          label="Language"
          value={form.language}
          onChange={(value) =>
            setForm((current) => ({ ...current, language: value }))
          }
        />
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Greeting body
          </span>
          <textarea
            value={form.body}
            onChange={(event) =>
              setForm((current) => ({ ...current, body: event.target.value }))
            }
            rows={5}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
          />
          <span className="text-xs text-gray-400">
            Use {"{{1}}"} for business name. Meta requires examples for
            variables.
          </span>
        </label>
        <TextInput
          label="Example preview"
          value={form.example}
          onChange={(value) =>
            setForm((current) => ({ ...current, example: value }))
          }
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            disabled={isSaving}
            className="rounded-xl border border-emerald-500 bg-transparent text-emerald-500 hover:bg-emerald-500/10"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onSubmit(form);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </Button>
          <Button
            type="button"
            disabled={isSaving || isSubmitting}
            onClick={async () => {
              const defaultTemplate = {
                name: "rocket_whatsapp_greeting",
                language: "en_US",
                body: "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.",
                example:
                  "Hi, thanks for messaging Ainspiretech. Please choose an option or share what you need help with.",
              };
              setForm(defaultTemplate);
              setIsSaving(true);
              try {
                await onSave(defaultTemplate);
              } finally {
                setIsSaving(false);
              }
            }}
            className="rounded-xl bg-gray-600 text-white hover:bg-gray-700"
          >
            Reset Template
          </Button>
        </div>
      </form>
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
            <div
              key={plan.name}
              className={`rounded-2xl border ${cardClass} p-5 ${plan.id === "launch" ? "ring-2 ring-emerald-400/40" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black">{plan.name}</h3>
                <Badge
                  className={
                    plan.id === "free"
                      ? "bg-gray-500 text-white"
                      : "bg-emerald-500 text-white"
                  }
                >
                  {plan.badge}
                </Badge>
              </div>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-3xl font-black">{plan.price}</span>
                <span className="pb-1 text-sm text-gray-500 dark:text-white/50">
                  {plan.period}
                </span>
              </div>
              {plan.firstMonth > 0 && (
                <p className="mt-2 text-sm font-semibold text-emerald-500">
                  First month INR {plan.firstMonth.toLocaleString("en-IN")} with
                  launch offer, then INR {plan.amount.toLocaleString("en-IN")}
                  /month.
                </p>
              )}
              <p className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400">
                {plan.limit}
              </p>
              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-gray-600 dark:text-white/60"
                  >
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
                  disabled={
                    currentPlan === plan.id &&
                    currentSubscription?.status === "active"
                  }
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
              ["Booking flow", "1"],
              ["Greeting template", "1"],
              ["Messages", "10k/mo"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5"
              >
                <span className="text-sm text-gray-500 dark:text-white/55">
                  {label}
                </span>
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
  const { user } = useUser();
  const defaultAlertEmail = user?.primaryEmailAddress?.emailAddress || "";
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
    alertEmail: workspace?.notificationSettings?.email || defaultAlertEmail,
    alertWhatsAppNumber: workspace?.notificationSettings?.whatsappNumber || "",
    emailAlertsEnabled: workspace?.notificationSettings?.emailEnabled !== false,
    whatsappAlertsEnabled:
      workspace?.notificationSettings?.whatsappEnabled !== false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [facebookConfig, setFacebookConfig] = useState<any>(null);
  const [embeddedSignupData, setEmbeddedSignupData] = useState<
    Record<string, any>
  >({});
  const processedHostedSignupCodeRef = useRef("");
  const isWhatsAppConnected = Boolean(
    workspace?.isConfigured ||
    (workspace?.meta?.wabaId && workspace?.meta?.phoneNumberId),
  );

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
      alertEmail: workspace?.notificationSettings?.email || defaultAlertEmail,
      alertWhatsAppNumber:
        workspace?.notificationSettings?.whatsappNumber || "",
      emailAlertsEnabled:
        workspace?.notificationSettings?.emailEnabled !== false,
      whatsappAlertsEnabled:
        workspace?.notificationSettings?.whatsappEnabled !== false,
    });
  }, [defaultAlertEmail, workspace]);

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
      let payload: any = event.data;
      if (typeof event.data === "string") {
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
      }

      if (event.origin === window.location.origin) {
        if (payload?.type === "rocket-whatsapp-signup:complete") {
          setIsConnecting(false);
          toast({
            title: payload?.isConfigured
              ? "WhatsApp connected"
              : "Meta signup saved",
            description: payload?.isConfigured
              ? "Your WhatsApp Business account is ready for automation."
              : "Meta login was completed. If WABA or phone IDs are still pending, finish the remaining Meta onboarding steps.",
          });
          void onConnected();
          return;
        }

        if (payload?.type === "rocket-whatsapp-signup:error") {
          setIsConnecting(false);
          toast({
            title: "Meta signup callback failed",
            description:
              payload?.message ||
              "Could not complete WhatsApp Embedded Signup.",
            variant: "destructive",
          });
          return;
        }
      }

      if (!event.origin.includes("facebook.com")) return;

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
  }, [onConnected]);

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
          authResponse: {
            code,
            redirectUri: `${window.location.origin}/whatsapp/settings`,
          },
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
            notificationSettings: {
              email: form.alertEmail,
              whatsappNumber: form.alertWhatsAppNumber,
              emailEnabled: form.emailAlertsEnabled,
              whatsappEnabled: form.whatsappAlertsEnabled,
            },
          },
        });

        const hasOpener = Boolean(window.opener && window.opener !== window);
        if (hasOpener) {
          window.opener.postMessage(
            {
              type: "rocket-whatsapp-signup:complete",
              isConfigured: Boolean(result?.workspace?.isConfigured),
            },
            window.location.origin,
          );
          window.setTimeout(() => window.close(), 250);
          return;
        }

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
        const hasOpener = Boolean(window.opener && window.opener !== window);
        if (hasOpener) {
          window.opener.postMessage(
            {
              type: "rocket-whatsapp-signup:error",
              message:
                error.message || "Could not complete WhatsApp Embedded Signup.",
            },
            window.location.origin,
          );
          window.setTimeout(() => window.close(), 500);
          return;
        }

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

  const resolveMetaBusinessCategory = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized.includes("automotive")) return "AUTO";
    if (normalized.includes("beauty")) return "BEAUTY";
    if (normalized.includes("clothing")) return "APPAREL";
    if (normalized.includes("education")) return "EDU";
    if (normalized.includes("entertainment")) return "ENTERTAIN";
    if (normalized.includes("event")) return "EVENT_PLAN";
    if (normalized.includes("finance")) return "FINANCE";
    if (normalized.includes("food") || normalized.includes("grocery")) {
      return "GROCERY";
    }
    if (normalized.includes("hotel")) return "HOTEL";
    if (normalized.includes("medical") || normalized.includes("health")) {
      return "MEDICAL_HEALTH";
    }
    if (normalized.includes("restaurant")) return "RESTAURANT";
    if (normalized.includes("shopping") || normalized.includes("retail")) {
      return "SHOPPING";
    }
    if (normalized.includes("travel")) return "TRAVEL";
    if (normalized.includes("non-profit")) return "NONPROFIT";
    return "PROF_SERVICES";
  };

  const buildDirectEmbeddedSignupUrl = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !facebookConfig?.appId ||
      !facebookConfig?.embeddedSignupConfigId
    ) {
      return "";
    }

    const redirectUri = `${window.location.origin}/whatsapp/settings`;
    const version = facebookConfig.graphApiVersion || "v25.0";
    const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
    const loggerId =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const phoneDigits = form.requestedPhoneNumber.replace(/\D/g, "");
    const phoneWithoutCountry =
      phoneDigits.startsWith("91") && phoneDigits.length > 10
        ? phoneDigits.slice(2)
        : phoneDigits;

    url.searchParams.set("client_id", facebookConfig.appId);
    url.searchParams.set("app_id", facebookConfig.appId);
    url.searchParams.set("config_id", facebookConfig.embeddedSignupConfigId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("override_default_response_type", "true");
    url.searchParams.set("display", "page");
    url.searchParams.set("domain", window.location.hostname);
    url.searchParams.set("fallback_redirect_uri", redirectUri);
    url.searchParams.set("locale", "en_US");
    url.searchParams.set("origin", "1");
    url.searchParams.set("sdk", "joey");
    url.searchParams.set("version", version);
    url.searchParams.set("cbt", Date.now().toString());
    url.searchParams.set("logger_id", loggerId);
    url.searchParams.set("e2e", JSON.stringify({}));
    url.searchParams.set("is_business_login", "1");
    url.searchParams.set(
      "scope",
      "business_management,whatsapp_business_management,whatsapp_business_messaging",
    );
    url.searchParams.set(
      "extras",
      JSON.stringify({
        setup: {
          business: {
            name: form.organizationName || form.businessDisplayName,
            email: user?.primaryEmailAddress?.emailAddress || "",
            phone: phoneWithoutCountry
              ? { code: 91, number: phoneWithoutCountry }
              : undefined,
            website: form.website || undefined,
          },
          phone: {
            category: resolveMetaBusinessCategory(form.businessCategory),
            displayName: form.businessDisplayName || form.organizationName,
          },
        },
        version: "v3",
        sessionInfoVersion: "3",
        featureType: "whatsapp_business_app_onboarding",
      }),
    );

    return url.toString();
  }, [facebookConfig, form, user?.primaryEmailAddress?.emailAddress]);

  const getCurrentWhatsAppRedirectUri = () =>
    typeof window === "undefined"
      ? facebookConfig?.oauthRedirectUri || ""
      : `${window.location.origin}/whatsapp/settings`;

  const handleFacebookConnect = async () => {
    if (isWhatsAppConnected) {
      toast({
        title: "WhatsApp already connected",
        description:
          "Delete the existing WhatsApp account data before connecting a different WhatsApp account.",
        variant: "destructive",
      });
      return;
    }

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
      const directSignupUrl = buildDirectEmbeddedSignupUrl();
      if (directSignupUrl) {
        window.location.assign(directSignupUrl);
        return;
      }

      if (facebookConfig?.metaHostedSignupUrl) {
        const hostedUrl = new URL(facebookConfig.metaHostedSignupUrl);
        hostedUrl.searchParams.set(
          "redirect_uri",
          getCurrentWhatsAppRedirectUri(),
        );
        const hostedSignupUrl = hostedUrl.toString();
        window.location.assign(hostedSignupUrl);
        return;
      }

      toast({
        title: "Embedded Signup not configured",
        description:
          "Add the WhatsApp Embedded Signup config ID or Meta-hosted signup URL on the API server.",
        variant: "destructive",
      });
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
    try {
      setIsDeleting(true);
      await deleteWhatsAppWorkspace(apiRequest);
      setEmbeddedSignupData({});
      setIsDeleteDialogOpen(false);
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
        description:
          error.message || "Could not delete WhatsApp dashboard data.",
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
  const hasWhatsAppAccountData = Boolean(
    workspace?.isConfigured ||
    workspace?.onboarding?.facebookUserId ||
    workspace?.onboarding?.businessId ||
    workspace?.meta?.businessManagerId ||
    workspace?.meta?.wabaId ||
    workspace?.meta?.phoneNumberId ||
    workspace?.meta?.displayPhoneNumber ||
    workspace?.meta?.accessToken,
  );
  const businessProfileFields: Array<[string, string]> = [
    ["organizationName", "Business name"],
    ["businessDisplayName", "WhatsApp display name"],
    ...(!isWhatsAppConnected
      ? ([["requestedPhoneNumber", "Official WhatsApp number"]] as Array<
          [string, string]
        >)
      : []),
    ["website", "Official website URL"],
  ];

  return (
    <>
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
                  notificationSettings: {
                    email: form.alertEmail,
                    whatsappNumber: form.alertWhatsAppNumber,
                    emailEnabled: form.emailAlertsEnabled,
                    whatsappEnabled: form.whatsappAlertsEnabled,
                  },
                });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isWhatsAppConnected && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                WhatsApp is connected for this workspace. To connect a different
                WhatsApp account, delete the existing WhatsApp account data
                first.
              </div>
            )}
            {businessProfileFields.map(([key, label]) => (
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
            <div className={`rounded-xl border ${softCardClass} p-4`}>
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-bold">Appointment Alerts</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-white/50">
                    Send new appointment requests to the owner by email and
                    WhatsApp using RocketReplai's approved WhatsApp template.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Alert email
                  </span>
                  <input
                    value={form.alertEmail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        alertEmail: event.target.value,
                      }))
                    }
                    type="email"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Alert WhatsApp number
                  </span>
                  <input
                    value={form.alertWhatsAppNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        alertWhatsAppNumber: event.target.value,
                      }))
                    }
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["emailAlertsEnabled", "Email alerts"],
                  ["whatsappAlertsEnabled", "WhatsApp alerts"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 dark:border-white/[0.08] dark:text-white/70"
                  >
                    {label}
                    <input
                      type="checkbox"
                      checked={Boolean((form as any)[key])}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                disabled={isSaving}
                className="rounded-xl border border-emerald-500 bg-transparent text-emerald-500 hover:bg-emerald-500/10"
              >
                {isSaving ? "Saving..." : "Save Business Profile"}
              </Button>
              {isWhatsAppConnected ? (
                <Button
                  type="button"
                  disabled
                  className="rounded-xl bg-emerald-600 text-white disabled:cursor-default disabled:opacity-80"
                >
                  WhatsApp Connected
                </Button>
              ) : (
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
              )}
            </div>
          </form>
          <div className="mt-5 grid gap-3">
            {setup.map(([label, status, note]) => (
              <div
                key={label}
                className={`rounded-xl border ${softCardClass} p-4`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{label}</h3>
                    <p className="mt-1 break-all text-sm text-gray-500 dark:text-white/50">
                      {note}
                    </p>
                  </div>
                  <Badge
                    className={
                      [
                        "Connected",
                        "Captured",
                        "Ready",
                        "Configured URL",
                      ].includes(status)
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
              [
                "Booking consent",
                "Customers request appointments by messaging or choosing the booking option.",
              ],
              [
                "Template review",
                "Greeting templates must be approved by Meta before template-based use.",
              ],
              [
                "Owner alerts",
                "New appointment details are sent to configured email and WhatsApp alert numbers.",
              ],
              [
                "Rate monitoring",
                "Dashboard tracks message usage against the current plan limit.",
              ],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-white/50">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {hasWhatsAppAccountData && (
            <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
              <h3 className="font-black text-red-500">
                Delete WhatsApp Account Data
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/55">
                Remove the connected Meta account details, saved business info,
                conversations, appointments, and greeting template stored for
                this WhatsApp dashboard.
              </p>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(true)}
                className="mt-4 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:cursor-default disabled:opacity-70"
              >
                {isDeleting ? "Deleting..." : "Delete WhatsApp Data"}
              </Button>
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteWhatsAppData}
        title="Delete WhatsApp Account Data"
        description="This will permanently delete the WhatsApp dashboard workspace stored in RocketReplai, including Meta connection details, business info, conversations, appointments, and greeting template. Razorpay billing is not cancelled by this action."
        confirmText="Delete WhatsApp Data"
        cancelText="Keep Data"
        isDestructive
        isLoading={isDeleting}
        acknowledgements={[
          {
            id: "delete-whatsapp-dashboard-data",
            label:
              "I understand this removes all WhatsApp dashboard data stored in RocketReplai.",
          },
          {
            id: "delete-whatsapp-keeps-billing",
            label:
              "I understand this does not cancel any active Razorpay subscription.",
          },
        ]}
      />
    </>
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
