"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Headphones,
  Languages,
  MessageSquareText,
  Phone,
  PhoneCall,
  PlugZap,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@rocketreplai/ui";
import { trackMetaEvent } from "@/lib/meta-pixel";
import { useRouter } from "next/navigation";

const dashboardUrl = "https://app.rocketreplai.com";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    title: "24/7 AI receptionist",
    description:
      "Answer inbound calls when the owner is busy, offline, or handling customers.",
    icon: Headphones,
  },
  {
    title: "Lead capture from calls",
    description:
      "Collect caller name, phone, email, interest, and notes directly from the conversation.",
    icon: Users,
  },
  {
    title: "WhatsApp and email alerts",
    description:
      "Send instant summaries to the owner after every lead, missed call, or callback request.",
    icon: Bell,
  },
  {
    title: "AI flow editor",
    description:
      "Set greetings, questions, transfer rules, fallback actions, and supported languages.",
    icon: Workflow,
  },
  {
    title: "Call logs and transcripts",
    description:
      "Review call status, duration, recordings, summaries, and transcripts from the dashboard.",
    icon: MessageSquareText,
  },
  {
    title: "Booking intent capture",
    description:
      "Let the AI gather booking intent and save it with the caller lead record.",
    icon: CalendarDays,
  },
];

const steps = [
  "Route inbound calls from your phone provider to RocketReplai",
  "The AI receptionist answers with your business script",
  "Caller details are saved as a lead with transcript and summary",
  "You get notified on WhatsApp, SMS, or email instantly",
];

const pricingRows = [
  ["Monthly price", "₹0", "₹1,999"],
  ["Yearly price", "₹0", "₹19,990"],
  ["Included minutes", "10", "200"],
  ["Concurrent inbound calls", "1", "3"],
  ["Inbound calls", "Yes", "Yes"],
  ["Outbound calls", "No", "No"],
  ["Dashboard access", "Owner", "Owner"],
  ["Lead capture", "Yes", "Yes"],
];

const reviews = [
  {
    quote:
      "We used to miss enquiries after clinic hours. Now every caller gets answered and our receptionist wakes up to a clean lead list.",
    name: "Dr. Priya N.",
    role: "Dental clinic owner",
  },
  {
    quote:
      "The summaries are the best part. I can call back hot leads without listening to every recording.",
    name: "Rohan M.",
    role: "Real estate consultant",
  },
  {
    quote:
      "Setup felt simple: number, greeting, questions, alerts. It behaves like a proper front desk for our coaching centre.",
    name: "Sneha K.",
    role: "Coaching founder",
  },
];

const faqs = [
  {
    question: "Can I use my existing business number?",
    answer:
      "Yes. Use your existing phone provider and route inbound calls to the RocketReplai call webhook. We do not allocate new phone numbers.",
  },
  {
    question: "Which languages can the assistant support?",
    answer:
      "The dashboard is prepared for Indian-language call flows such as English, Hindi, and regional language scripts.",
  },
  {
    question: "Are calls recorded?",
    answer:
      "Recording and transcript storage can be enabled based on your telephony provider setup and consent requirements.",
  },
  {
    question: "How are extra minutes billed?",
    answer:
      "Each plan includes a monthly minute quota. Extra minutes use the visible overage rate for that plan.",
  },
];

const industries = [
  "Clinics",
  "Real estate",
  "Salons",
  "Coaching",
  "Restaurants",
  "Local services",
];

function CallHeroVisual({ themeStyles }: { themeStyles: any }) {
  const signalBars = [34, 58, 82, 48, 70, 40, 86, 62, 38, 74, 52, 68];

  return (
    <div className="relative mx-auto w-full max-w-[35rem]">
      <div className="absolute -left-6 top-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="absolute -right-5 bottom-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 1 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className={`relative overflow-hidden rounded-[1.6rem] border p-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)] transition-colors duration-500 ${themeStyles.card}`}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-blue-500 to-pink-400" />

        <div className="rounded-[1.2rem] bg-gradient-to-br from-cyan-300 via-blue-500 to-pink-400 p-4 text-slate-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
                Incoming call
              </p>
              <p className="text-2xl font-black">AI Front Desk</p>
            </div>
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30"
            >
              <PhoneCall className="h-7 w-7" />
            </motion.div>
          </div>

          <div className="mt-6 flex h-24 items-end gap-1.5 rounded-2xl bg-white/35 p-3 backdrop-blur">
            {signalBars.map((height, index) => (
              <motion.span
                key={index}
                animate={{
                  height: [
                    `${height * 0.65}%`,
                    `${height}%`,
                    `${height * 0.65}%`,
                  ],
                }}
                transition={{
                  duration: 1.4,
                  delay: index * 0.06,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-full rounded-full bg-white/90"
                style={{ height: `${height}%`, minHeight: 18 }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Caller", value: "Amit Sharma", icon: Users },
            { label: "Intent", value: "Book appointment", icon: CalendarDays },
            {
              label: "Summary",
              value: "Hot lead, callback",
              icon: MessageSquareText,
            },
            { label: "Alert", value: "WhatsApp sent", icon: Bell },
          ].map((item) => (
            <motion.div
              key={item.label}
              whileHover={{ y: -4 }}
              className={`rounded-2xl border p-4 ${themeStyles.inner}`}
            >
              <item.icon className="h-5 w-5 text-[#00F0FF]" />
              <p className={`mt-3 text-xs font-montserrat ${themeStyles.soft}`}>
                {item.label}
              </p>
              <p className="text-sm font-black">{item.value}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -right-1 top-24 hidden rounded-2xl border p-3 shadow-xl sm:block ${themeStyles.inner}`}
        >
          <Clock3 className="h-5 w-5 text-pink-400" />
          <p className="mt-2 text-xs font-black">Answered in 2 sec</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function CallMarketingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  useEffect(() => setMounted(true), []);

  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      page: isDark ? "text-white" : "text-n-8",
      muted: isDark ? "text-gray-300" : "text-n-5",
      soft: isDark ? "text-gray-400" : "text-n-4",
      textpricing: isDark ? "text-[#00F0FF]" : "text-black",
      badge: isDark
        ? "bg-gradient-to-r from-[#00F0FF]/10 to-[#B026FF]/10 border-[#00F0FF]/30"
        : "bg-gradient-to-r from-[#00F0FF]/20 to-[#B026FF]/20 border-blue-700/30",
      card: isDark
        ? "bg-transparent border-white/10 backdrop-blur-sm"
        : "bg-white/80 border-gray-200 backdrop-blur-sm",
      inner: isDark
        ? "bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-white/10"
        : "bg-gradient-to-br from-gray-50 to-white border-gray-200",
      outline: isDark
        ? "border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10"
        : "border-[#00F0FF] text-n-8 hover:bg-[#00F0FF]/5",
    };
  }, [currentTheme]);

  const gradientText =
    "bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F]";

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-[#00F0FF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className={`min-h-screen w-full overflow-x-clip ${themeStyles.page}`}>
      <section className="relative w-full overflow-hidden bg-[#f8fbff] text-slate-950 transition-colors duration-500 dark:bg-[#07111f] dark:text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(0,240,255,0.16),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] opacity-100 transition-opacity duration-500 dark:opacity-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(0,240,255,0.16),transparent_30%),linear-gradient(135deg,#06101d_0%,#0b1730_55%,#050912_100%)] opacity-0 transition-opacity duration-500 dark:opacity-100" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[0.95fr_1fr] lg:items-center lg:px-10 lg:py-20 xl:px-16">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mx-auto max-w-2xl space-y-5 text-center lg:mx-0 lg:text-left"
          >
            <motion.div
              variants={fadeUp}
              className="mx-auto inline-flex max-w-max items-center rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur dark:border-cyan-300/30 dark:bg-white/10 dark:text-cyan-200 lg:mx-0"
            >
              AI Call Assistant
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[1.9rem] font-black leading-[1.02] text-slate-950 transition-colors duration-500 sm:text-[3.1rem] md:text-[3.7rem] xl:text-[4.25rem] dark:text-white"
            >
              Your business phone,
              <br />
              <span className="text-blue-700 dark:text-cyan-200">
                answered by AI.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-xl text-sm leading-relaxed text-slate-700 transition-colors duration-500 sm:text-xl lg:mx-0 dark:text-slate-200"
            >
              RocketReplai answers missed calls, qualifies callers, captures
              leads, and sends clean summaries to the owner before the next
              opportunity goes cold.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="grid gap-2 font-montserrat sm:grid-cols-2"
            >
              {[
                {
                  icon: <PhoneCall className="h-5 w-5" />,
                  text: "24/7 call answering",
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  text: "Lead capture",
                },
                {
                  icon: <Bell className="h-5 w-5" />,
                  text: "Instant alerts",
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  text: "Summaries + transcripts",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.text}
                  whileHover={{ y: -3 }}
                  className="flex items-center rounded-2xl border border-slate-200 bg-white/80 p-3 text-left shadow-sm transition-colors duration-500 dark:border-white/10 dark:bg-white/10"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-slate-950 shadow-lg"
                  >
                    {feature.icon}
                  </motion.div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100">
                    {feature.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="grid gap-3 sm:mx-auto sm:max-w-[31rem] sm:grid-cols-2 lg:mx-0"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push("https://app.rocketreplai.com/sign-in")
                }
                className="rounded-xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(29,78,216,0.25)] transition hover:-translate-y-0.5 hover:bg-blue-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
              >
                Start Setup <ArrowRight className="ml-2 inline h-5 w-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => router.push("/call/pricing")}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                View Pricing
              </motion.button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm lg:justify-start dark:text-slate-300"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-green-400" />
                <span>Secure call records</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span>Built for owner-led SMBs</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>Front desk automation</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="flex items-center justify-center"
          >
            <CallHeroVisual themeStyles={themeStyles} />
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-20">
        <section className="py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Built for real call operations
            </h2>
            <p
              className={`mt-3 text-base md:text-lg font-montserrat ${themeStyles.muted}`}
            >
              The public page sells the promise, the dashboard handles the work:
              calls, leads, AI flow, billing, and inbound routing settings.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ y: -6, scale: 1.01 }}
                className={`rounded-2xl border p-5 transition-all duration-300 ${themeStyles.card}`}
              >
                <div className="h-11 w-11 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 to-[#B026FF]/20 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-[#00F0FF]" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
                <p
                  className={`mt-2 text-sm leading-relaxed font-montserrat ${themeStyles.muted}`}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className={`rounded-2xl border p-6 md:p-8 ${themeStyles.card}`}
          >
            <h2 className="text-3xl font-bold">How it works</h2>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-black flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className={`pt-1 font-montserrat ${themeStyles.muted}`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className={`rounded-2xl border p-6 md:p-8 ${themeStyles.card}`}
          >
            <h2 className="text-3xl font-bold">Use cases</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {industries.map((industry) => (
                <span
                  key={industry}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold font-montserrat ${themeStyles.inner}`}
                >
                  {industry}
                </span>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "Measure call ROI", icon: BarChart3 },
                { title: "Connect Exotel", icon: PlugZap },
                { title: "Protect caller data", icon: ShieldCheck },
                { title: "Forward hot leads", icon: Phone },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`rounded-2xl border p-4 ${themeStyles.inner}`}
                >
                  <item.icon className="h-5 w-5 text-[#00F0FF]" />
                  <p className="mt-3 text-sm font-bold">{item.title}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Pricing comparison
            </h2>
            <p className={`mt-3 font-montserrat ${themeStyles.muted}`}>
              Two clear plans for inbound minutes, concurrent calls, and
              receptionist coverage.
            </p>
          </div>
          <div
            className={`overflow-x-auto rounded-2xl border ${themeStyles.card}`}
          >
            <table className="w-full min-w-[720px] border-collapse">
              <thead
                className={
                  currentTheme === "dark" ? "bg-white/[0.05]" : "bg-gray-50"
                }
              >
                <tr>
                  {["Feature", "Free", "Business"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="border border-white/10 px-5 py-4 text-left"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pricingRows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td
                        key={`${row[0]}-${index}`}
                        className={`border border-white/10 px-5 py-4 font-montserrat ${
                          index === 0 ? "" : themeStyles.muted
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 text-center">
            <Button
              asChild
              className="rounded-2xl bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold"
            >
              <Link href="/call/pricing">See full pricing</Link>
            </Button>
          </div>
        </section>

        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">Customer reviews</h2>
            <p className={`mt-3 font-montserrat ${themeStyles.muted}`}>
              Built for businesses that cannot afford to lose caller intent.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map((review) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className={`rounded-2xl border p-5 ${themeStyles.card}`}
              >
                <p
                  className={`font-montserrat text-sm leading-relaxed ${themeStyles.muted}`}
                >
                  "{review.quote}"
                </p>
                <div className="mt-5">
                  <p className="font-bold">{review.name}</p>
                  <p className={`font-montserrat text-xs ${themeStyles.soft}`}>
                    {review.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
              <HelpCircle className="mr-2 h-4 w-4" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold gradient-text-main">
              Frequently asked questions
            </h2>
            <p className={`mt-3 font-montserrat ${themeStyles.muted}`}>
              Common questions before setting up an AI receptionist.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className={`group rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${themeStyles.card}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-transform duration-300 group-hover:scale-105 dark:bg-blue-500/10 dark:text-blue-200">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{faq.question}</h3>
                    <p
                      className={`mt-3 font-montserrat text-sm leading-relaxed ${themeStyles.muted}`}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`my-12 rounded-3xl border p-6 md:p-10 text-center overflow-hidden ${themeStyles.card}`}
        >
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full border border-[#00F0FF]/30 px-4 py-1 text-sm font-medium uppercase tracking-widest text-blue-700">
            CTA SECTION
          </div>
          <h2 className={`text-3xl md:text-4xl font-bold ${gradientText}`}>
            Ready to answer every call?
          </h2>
          <p
            className={`mt-3 max-w-2xl mx-auto font-montserrat ${themeStyles.muted}`}
          >
            Start with a receptionist flow, connect your number, and capture
            leads from inbound calls you used to miss.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              className="rounded-2xl bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold"
            >
              <Link href={`${dashboardUrl}/call`}>Start Setup</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={`rounded-2xl border-2 ${themeStyles.outline}`}
            >
              <Link href="/contactUs">Request Demo</Link>
            </Button>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
