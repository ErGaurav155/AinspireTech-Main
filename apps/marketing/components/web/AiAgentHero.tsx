"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle,
  FileText,
  Globe,
  MessageCircle,
  MousePointerClick,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const flows = [
  {
    visitor: "Do you have pricing for a dental clinic website?",
    bot: "Yes. I found your clinic package page and can explain plans, setup time, and booking options.",
    source: "Pricing page",
    lead: "Clinic owner",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    visitor: "Can I book a demo for tomorrow?",
    bot: "Absolutely. I captured your name, phone, and preferred slot. The team will confirm on WhatsApp.",
    source: "Calendar FAQ",
    lead: "Demo request",
    accent: "from-pink-400 to-rose-500",
  },
  {
    visitor: "Which course is best for beginners?",
    bot: "For beginners, the Foundation track is best. I can share the syllabus and collect your details.",
    source: "Course catalog",
    lead: "Education lead",
    accent: "from-violet-400 to-fuchsia-500",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

function ChatbotFlowMockup({ activeIndex }: { activeIndex: number }) {
  const flow = flows[activeIndex];

  return (
    <div className="relative mx-auto w-full max-w-[34rem]">
      <div className="absolute -left-3 top-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl dark:bg-cyan-300/15" />
      <div className="absolute -right-6 bottom-16 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl dark:bg-pink-300/15" />

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -1 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative rounded-[1.6rem] border border-slate-200 bg-white/88 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur transition-colors duration-500 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-3 transition-colors duration-500 dark:border-white/10 dark:bg-slate-950/70">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  RocketReplai Web Bot
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Trained on website, PDFs, and FAQs
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
              Live
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={flow.visitor}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-3"
            >
              <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-sm bg-blue-700 px-4 py-3 text-sm font-medium text-white shadow-sm">
                {flow.visitor}
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm dark:bg-white/10 dark:text-slate-100">
                {flow.bot}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Search, label: "Source", value: flow.source },
              { icon: Target, label: "Lead", value: flow.lead },
              { icon: Zap, label: "Action", value: "Captured" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-500 dark:border-white/10 dark:bg-white/[0.06]"
              >
                <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-1 top-8 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-900 sm:block"
      >
        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        <p className="mt-2 text-xs font-black text-slate-900 dark:text-white">
          42 pages indexed
        </p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-2 bottom-10 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-900 sm:block"
      >
        <MousePointerClick className="h-5 w-5 text-pink-500" />
        <p className="mt-2 text-xs font-black text-slate-900 dark:text-white">
          Lead sent to inbox
        </p>
      </motion.div>

      <div className="mt-4 flex justify-center gap-4">
        {flows.map((flowItem, index) => (
          <span
            key={flowItem.lead}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index ? "w-8 bg-blue-700" : "w-2 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function AIAgentHero() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % flows.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, []);

  const isDark = currentTheme === "dark";

  return (
    <section className="relative mx-[calc(50%-50vw)] w-[100vw] lg:w-[99.5vw] overflow-hidden bg-[#f8fbff] text-slate-950 transition-colors duration-500 dark:bg-[#07111f] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(0,240,255,0.18),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] opacity-100 transition-opacity duration-500 dark:opacity-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(0,240,255,0.14),transparent_30%),linear-gradient(135deg,#06101d_0%,#0b1730_55%,#050912_100%)] opacity-0 transition-opacity duration-500 dark:opacity-100" />

      <div className="relative mx-auto flex flex-col lg:flex-row gap-3 md:gap-5 max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-14  lg:items-center lg:px-10 lg:py-20 xl:px-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.1 }}
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-4 inline-flex max-w-max items-center rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur dark:border-cyan-300/30 dark:bg-white/10 dark:text-cyan-200 lg:mx-0"
          >
            Website AI Agent
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-[1.9rem] font-black leading-[1.02] text-slate-950 transition-colors duration-500 sm:text-[3.1rem] md:text-[3.7rem] xl:text-[4.25rem] dark:text-white"
          >
            Turn website visits into
            <br />
            <span className="text-blue-700 dark:text-cyan-200">
              qualified conversations.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-700 transition-colors duration-500 sm:text-xl lg:mx-0 dark:text-slate-200"
          >
            RocketReplai reads your website, answers visitors with source-aware
            responses, captures leads, and hands every hot conversation to your
            team.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 grid gap-3 sm:mx-auto sm:max-w-[31rem] sm:grid-cols-2 lg:mx-0"
          >
            <button
              onClick={() =>
                router.push("https://app.rocketreplai.com/sign-in")
              }
              className="rounded-xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(29,78,216,0.25)] transition hover:-translate-y-0.5 hover:bg-blue-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
            >
              Start Free Trial
              <ArrowRight className="ml-2 inline h-5 w-5" />
            </button>
            <button
              onClick={() => router.push("/web/pricing")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              View Pricing
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm lg:justify-start dark:text-slate-300"
          >
            {[
              { label: "2M tokens included", icon: Sparkles },
              { label: "Website trained", icon: Globe },
              { label: "Secure lead capture", icon: Shield },
            ].map(({ label, icon: Icon }) => (
              <span key={label} className="inline-flex items-center gap-2">
                <CheckCircle className="h-4 w-4 fill-blue-600 text-white" />
                <Icon className="hidden h-4 w-4 sm:inline" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <ChatbotFlowMockup activeIndex={activeIndex} />
      </div>
    </section>
  );
}
