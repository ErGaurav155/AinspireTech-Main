"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Bot,
  CheckCircle,
  Instagram,
  Network,
  Phone,
  Sparkles,
} from "lucide-react";
import { instagramFeatures, webChatFeatures } from "@rocketreplai/shared";

const aiCallFeatures = [
  {
    id: 1,
    name: "24/7 AI Call Receptionist",
    description:
      "Answer missed calls, greet callers, capture intent, and keep your business reachable even outside working hours.",
    tools: ["Inbound calls", "Lead capture", "Call summaries"],
    role: "Always-on front desk",
    link: "/assets/img/customer-support.png",
  },
  {
    id: 2,
    name: "Lead Qualification From Calls",
    description:
      "Ask the right questions on every call and save caller details, service interest, urgency, and follow-up notes.",
    tools: ["Caller details", "Qualification flow", "Transcripts"],
    role: "Call-to-lead automation",
    link: "/assets/img/lead-capture.png",
  },
  {
    id: 3,
    name: "Instant Owner Notifications",
    description:
      "Send call outcomes to WhatsApp, SMS, or email so your team can follow up while the lead is still warm.",
    tools: ["WhatsApp alerts", "SMS updates", "Email summaries"],
    role: "Fast follow-up system",
    link: "/assets/img/customer-support.png",
  },
  {
    id: 4,
    name: "Appointments and Handoff",
    description:
      "Collect booking intent, route hot callers to your team, and keep a clean call log inside the dashboard.",
    tools: ["Booking intent", "Team handoff", "Call logs"],
    role: "Operational call workflow",
    link: "/assets/img/lead-capture.png",
  },
];

const tabs = [
  {
    id: "webchat",
    label: "Web",
    icon: Network,
    gradient: "from-cyan-400 to-blue-600",
    accent: "text-blue-600 dark:text-cyan-200",
  },
  {
    id: "instagram",
    label: "Insta",
    icon: Instagram,
    gradient: "from-pink-500 to-fuchsia-600",
    accent: "text-pink-600 dark:text-pink-200",
  },
  {
    id: "call",
    label: "Calls",
    icon: Phone,
    gradient: "from-blue-500 to-cyan-500",
    accent: "text-cyan-600 dark:text-cyan-200",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

function MiniFlow({ activeTab }: { activeTab: TabId }) {
  const flow =
    activeTab === "instagram"
      ? ["Comment", "Keyword", "DM sent", "Lead saved"]
      : activeTab === "call"
        ? ["Incoming call", "AI answers", "Summary", "Owner alert"]
        : ["Visitor asks", "AI answers", "Source found", "Lead captured"];

  return (
    <div className="grid gap-2">
      {flow.map((item, index) => (
        <motion.div
          key={item}
          initial={{ opacity: 0, x: 18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.35 }}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white dark:bg-cyan-300 dark:text-slate-950">
            {index + 1}
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-100">
            {item}
          </span>
          {index === flow.length - 1 && (
            <CheckCircle className="ml-auto h-4 w-4 fill-emerald-500 text-white" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function StickyFeaturesSection() {
  const [activeTab, setActiveTab] = useState<TabId>("webchat");
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const features =
    activeTab === "webchat"
      ? webChatFeatures
      : activeTab === "instagram"
        ? instagramFeatures
        : aiCallFeatures;

  const styles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      page: isDark ? "bg-[#07111f] text-white" : "bg-[#f8fbff] text-slate-950",
      panel: isDark
        ? "border-white/10 bg-white/[0.07] shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
        : "border-slate-200 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.10)]",
      muted: isDark ? "text-slate-300" : "text-slate-600",
      soft: isDark ? "text-slate-400" : "text-slate-500",
      chip: isDark
        ? "border-white/10 bg-white/10 text-slate-200"
        : "border-slate-200 bg-slate-50 text-slate-700",
    };
  }, [currentTheme]);

  return (
    <section
      id="features"
      className={`relative mx-[calc(50%-50vw)] w-[100vw] lg:w-[99vw] overflow-hidden py-14 transition-colors duration-500 sm:py-20 ${styles.page}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(0,240,255,0.15),transparent_30%),radial-gradient(circle_at_86%_16%,rgba(82, 48, 66, 0.12),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.1 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-4 inline-flex max-w-max items-center rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur dark:border-cyan-300/30 dark:bg-white/10 dark:text-cyan-200"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Growth workflows
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-black leading-tight sm:text-5xl"
          >
            One automation layer for every customer touchpoint.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-lg ${styles.muted}`}
          >
            Switch between web chat, Instagram automation, and AI calls to see
            how RocketReplai turns attention into qualified follow-up.
          </motion.p>
        </motion.div>

        <div className="sticky top-16 z-30 mx-auto mt-8 flex justify-center sm:top-20">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
            <div className="grid grid-cols-3 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-all sm:px-5 sm:py-3 ${
                      isActive
                        ? "text-white"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="feature-tab-pill"
                        className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.gradient}`}
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 34,
                        }}
                      />
                    )}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-start">
          <div className="sticky top-36 hidden lg:block">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`rounded-[1.6rem] border p-5 backdrop-blur-xl ${styles.panel}`}
            >
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r ${activeTabConfig.gradient} text-white shadow-lg`}
              >
                {activeTab === "webchat" ? (
                  <Bot className="h-7 w-7" />
                ) : activeTab === "instagram" ? (
                  <Instagram className="h-7 w-7" />
                ) : (
                  <Phone className="h-7 w-7" />
                )}
              </div>
              <p
                className={`text-xs font-black uppercase tracking-[0.18em] ${activeTabConfig.accent}`}
              >
                {activeTabConfig.label} workflow
              </p>
              <h3 className="mt-2 text-3xl font-black">
                From signal to saved lead.
              </h3>
              <p className={`mt-3 text-sm leading-relaxed ${styles.muted}`}>
                Each workflow captures intent, sends the right response, and
                keeps your team close to the next action.
              </p>
              <div className="mt-6">
                <MiniFlow activeTab={activeTab} />
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            {features.map((feature: any, index: number) => (
              <motion.article
                key={feature.id}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(index * 0.05, 0.18),
                }}
                whileHover={{ y: -5 }}
                className={`group sticky top-36 overflow-hidden rounded-[1.35rem] border p-4 backdrop-blur-xl transition-all duration-300 ${styles.panel}`}
                style={{ top: `${9 + index * 1.35}rem` }}
              >
                <div className="grid gap-5 md:grid-cols-[1fr_0.86fr] md:items-center">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r ${activeTabConfig.gradient} text-white`}
                      >
                        <span className="text-sm font-black">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-black uppercase tracking-[0.16em] ${styles.soft}`}
                        >
                          {feature.role}
                        </p>
                        <h3 className="text-xl font-black sm:text-2xl">
                          {feature.name}
                        </h3>
                      </div>
                    </div>
                    <p
                      className={`text-sm leading-relaxed sm:text-base ${styles.muted}`}
                    >
                      {feature.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {feature.tools.map((tool: string) => (
                        <span
                          key={tool}
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${styles.chip}`}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                    <div
                      className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${activeTabConfig.accent}`}
                    >
                      See workflow
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>

                  <div className="relative min-h-[13rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/60">
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${activeTabConfig.gradient}`}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.7),transparent_28%)] opacity-50 dark:opacity-10" />
                    <Image
                      src={feature.link}
                      alt={feature.role}
                      fill
                      className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StickyFeaturesSection;
