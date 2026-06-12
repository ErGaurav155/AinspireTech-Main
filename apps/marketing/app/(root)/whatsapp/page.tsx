"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Headphones,
  MessageCircle,
  Megaphone,
  Plug,
  Send,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@rocketreplai/ui";

const dashboardUrl = "https://app.rocketreplai.com/whatsapp";

const features = [
  {
    title: "AI sales and support agents",
    description:
      "Qualify leads, answer FAQs, collect details, and hand off to your team when the conversation needs a human.",
    icon: Bot,
  },
  {
    title: "Shared WhatsApp inbox",
    description:
      "Track open conversations, AI-owned threads, human handoffs, contact intent, and message status in one place.",
    icon: MessageCircle,
  },
  {
    title: "Template and broadcast operations",
    description:
      "Manage marketing, utility, and authentication templates with compliant campaigns and consent-aware segments.",
    icon: Send,
  },
  {
    title: "Meta setup workspace",
    description:
      "Store WABA ID, phone number ID, verify token, app credentials, and Cloud API connection status.",
    icon: Plug,
  },
  {
    title: "Contacts and segments",
    description:
      "Organize leads, customers, opted-out contacts, intent score, lifecycle stage, tags, and last message activity.",
    icon: Users,
  },
  {
    title: "Analytics and guardrails",
    description:
      "Monitor delivery, read rate, opt-ins, handoffs, plan limits, and production compliance checks.",
    icon: BarChart3,
  },
];

const steps = [
  "Add your Meta Business Manager, WABA, phone number ID, token, and app secret",
  "Create AI agents for sales, support, retention, or custom workflows",
  "Sync templates and build consent-aware segments",
  "Receive WhatsApp webhooks, save contacts, and manage conversations",
];

const useCases = [
  "Lead qualification from ads",
  "Abandoned cart recovery",
  "Appointment reminders",
  "Order and payment updates",
  "Support triage",
  "Reactivation campaigns",
];

const comparisonRows = [
  {
    feature: "Instant replies",
    whatsapp: "AI handles FAQs, intent, and lead capture in WhatsApp",
    manual: "Depends on staff availability",
    generic: "Usually form-based or delayed",
  },
  {
    feature: "Appointment capture",
    whatsapp: "Collects name, service, preferred slot, and urgency",
    manual: "Manual back-and-forth in chat",
    generic: "Often needs a separate booking tool",
  },
  {
    feature: "Broadcasts",
    whatsapp: "Template-aware campaigns with segments and status tracking",
    manual: "Hard to track consent and delivery",
    generic: "Lower conversation context",
  },
  {
    feature: "Team handoff",
    whatsapp: "AI can route hot leads to humans from one inbox",
    manual: "Chats get scattered across phones",
    generic: "Needs extra integrations",
  },
];

const workflows = [
  {
    title: "Clinic appointment engine",
    description:
      "Patients ask about timing, doctor availability, consultation fees, or symptoms. The agent captures the request and queues it for confirmation.",
    icon: CalendarCheck,
    items: [
      "Book visit requests",
      "Collect patient details",
      "Route urgent enquiries",
    ],
  },
  {
    title: "Sales qualification engine",
    description:
      "New WhatsApp leads from ads get instant answers, product guidance, budget checks, and human handoff when purchase intent is high.",
    icon: Megaphone,
    items: [
      "Qualify ad leads",
      "Share offer details",
      "Push hot leads to team",
    ],
  },
  {
    title: "Support triage engine",
    description:
      "Customers get quick help for common questions while complex cases are labeled, summarized, and passed to the right person.",
    icon: Headphones,
    items: ["Answer FAQs", "Tag conversation intent", "Escalate complex cases"],
  },
];

const faqs = [
  {
    question: "Can my customers connect their own WhatsApp number?",
    answer:
      "Yes. The dashboard is built around Meta WhatsApp Cloud API setup using the business WABA, phone number ID, app credentials, webhook verification, and access token.",
  },
  {
    question: "Can the AI book appointments directly?",
    answer:
      "It captures booking intent, customer details, service type, preferred date or time, and urgency. Your team can then confirm from the dashboard or connect a calendar workflow later.",
  },
  {
    question: "Can I send marketing broadcasts?",
    answer:
      "Yes, using approved WhatsApp templates and consent-aware segments. The dashboard separates templates, contacts, broadcasts, inbox, and analytics so campaigns stay operationally clear.",
  },
];

export default function WhatsAppMarketingPage() {
  return (
    <main className="min-h-screen text-slate-950 dark:bg-transparent dark:text-white">
      <section className="relative overflow-hidden px-4 py-20 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Business Automation
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              Turn WhatsApp into your always-on sales and support team.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg dark:text-white/65">
              RocketReplai helps businesses launch WhatsApp Cloud API agents,
              shared inbox operations, templates, broadcasts, contacts,
              segmentation, and Meta setup from one production dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="rounded-xl bg-emerald-500 px-6 py-6 font-bold text-white hover:bg-emerald-600"
              >
                <Link href={dashboardUrl}>
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-slate-200 bg-white px-6 py-6 font-bold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <Link href="/whatsapp/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-2xl shadow-emerald-950/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30"
          >
            <div className="rounded-2xl bg-emerald-400 p-5 text-emerald-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
                    Live operation
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    WhatsApp Command Center
                  </p>
                </div>
                <Workflow className="h-9 w-9" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Open chats", "248"],
                  ["AI resolved", "71%"],
                  ["Read rate", "83%"],
                  ["Hot leads", "1,482"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/35 p-4">
                    <p className="text-xs font-bold uppercase opacity-65">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              What you get
            </p>
            <h2 className="mt-3 text-3xl font-black">
              One workspace for WhatsApp growth
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">
              Manage automation, inbox work, contacts, broadcasts, and Meta
              setup without switching between spreadsheets, phones, and
              disconnected tools.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                  <h2 className="mt-4 text-lg font-black">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-14 md:px-8 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Comparison
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Why automate WhatsApp instead of handling every chat manually?
              </h2>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-fit rounded-xl border-slate-200 bg-white px-5 font-bold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <Link href="/whatsapp/pricing">Compare Plans</Link>
            </Button>
          </div>

          <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid min-w-[760px] grid-cols-[1fr_1.25fr_1fr_1fr] border-b border-slate-200 bg-emerald-50 text-sm font-black text-emerald-900 dark:border-white/10 dark:bg-emerald-300/10 dark:text-emerald-100">
              <div className="p-4">Capability</div>
              <div className="p-4">RocketReplai WhatsApp</div>
              <div className="p-4">Manual WhatsApp</div>
              <div className="p-4">Generic forms/email</div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.feature}
                className="grid min-w-[760px] grid-cols-[1fr_1.25fr_1fr_1fr] border-b border-slate-200 last:border-b-0 dark:border-white/10"
              >
                <div className="p-4 text-sm font-black">{row.feature}</div>
                <div className="p-4 text-sm leading-6 text-slate-700 dark:text-white/70">
                  <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  {row.whatsapp}
                </div>
                <div className="p-4 text-sm leading-6 text-slate-600 dark:text-white/55">
                  {row.manual}
                </div>
                <div className="p-4 text-sm leading-6 text-slate-600 dark:text-white/55">
                  {row.generic}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-14 md:px-8 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div>
            <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
            <h2 className="mt-4 text-3xl font-black">
              Built for Meta Cloud API
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">
              The backend includes workspace storage, Cloud API send-message
              support, public webhook verification, inbound message processing,
              contact creation, conversation logging, and plan limits.
            </p>
          </div>
          <div className="grid gap-3">
            {steps.map((step) => (
              <div
                key={step}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-transparent dark:bg-white/[0.05]"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p className="text-sm leading-6 text-slate-700 dark:text-white/70">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Workflows
            </p>
            <h2 className="mt-3 text-3xl font-black">
              Ready-made automation paths for real businesses
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {workflows.map((workflow) => {
              const Icon = workflow.icon;
              return (
                <div
                  key={workflow.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                  <h3 className="mt-4 text-xl font-black">{workflow.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">
                    {workflow.description}
                  </p>
                  <div className="mt-5 space-y-3">
                    {workflow.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-white/70"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black">Use Cases</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {useCases.map((item) => (
              <span
                key={item}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                <h2 className="mt-3 text-2xl font-black">
                  Launch with compliance controls
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60">
                  Respect opt-ins, separate Meta template categories, monitor
                  message status, and hand conversations to humans when the AI
                  should not continue.
                </p>
              </div>
              <Button
                asChild
                className="rounded-xl bg-emerald-500 px-6 py-6 font-bold text-white hover:bg-emerald-600"
              >
                <Link href={dashboardUrl}>Start Setup</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-14 md:px-8 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-black">
              Common WhatsApp automation questions
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <h3 className="text-lg font-black">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
