"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  FileText,
  MessageCircle,
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

export default function WhatsAppMarketingPage() {
  return (
    <main className="min-h-screen bg-[#061411] text-white">
      <section className="relative overflow-hidden px-4 py-20 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Business Automation
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              Turn WhatsApp into your always-on sales and support team.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
              RocketReplai helps businesses launch WhatsApp Cloud API agents,
              shared inbox operations, templates, broadcasts, contacts,
              segmentation, and Meta setup from one production dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-xl bg-emerald-500 px-6 py-6 font-bold text-white hover:bg-emerald-600">
                <Link href={dashboardUrl}>
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-white/15 bg-white/5 px-6 py-6 font-bold text-white hover:bg-white/10">
                <Link href="/whatsapp/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur"
          >
            <div className="rounded-2xl bg-emerald-400 p-5 text-emerald-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
                    Live operation
                  </p>
                  <p className="mt-1 text-2xl font-black">WhatsApp Command Center</p>
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
                    <p className="text-xs font-bold uppercase opacity-65">{label}</p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <Icon className="h-6 w-6 text-emerald-300" />
                  <h2 className="mt-4 text-lg font-black">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-14 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div>
            <FileText className="h-7 w-7 text-emerald-300" />
            <h2 className="mt-4 text-3xl font-black">Built for Meta Cloud API</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              The backend includes workspace storage, Cloud API send-message
              support, public webhook verification, inbound message processing,
              contact creation, conversation logging, and plan limits.
            </p>
          </div>
          <div className="grid gap-3">
            {steps.map((step) => (
              <div key={step} className="flex gap-3 rounded-2xl bg-white/[0.05] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                <p className="text-sm leading-6 text-white/70">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black">Use Cases</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {useCases.map((item) => (
              <span key={item} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.05] p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <ShieldCheck className="h-7 w-7 text-emerald-300" />
                <h2 className="mt-3 text-2xl font-black">Launch with compliance controls</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                  Respect opt-ins, separate Meta template categories, monitor
                  message status, and hand conversations to humans when the AI
                  should not continue.
                </p>
              </div>
              <Button asChild className="rounded-xl bg-emerald-500 px-6 py-6 font-bold text-white hover:bg-emerald-600">
                <Link href={dashboardUrl}>Start Setup</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
