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
  "Forward missed calls or a virtual number to RocketReplai",
  "The AI receptionist answers with your business script",
  "Caller details are saved as a lead with transcript and summary",
  "You get notified on WhatsApp, SMS, or email instantly",
];

const pricingRows = [
  ["Monthly price", "₹2,999", "₹7,999", "₹19,999"],
  ["Included minutes", "1,000", "3,000", "10,000"],
  ["Virtual numbers", "1", "3", "10"],
  ["Dashboard access", "Owner", "Owner", "Owner"],
  ["Overage", "₹5/min", "₹4/min", "₹3/min"],
  ["Transcripts", "Basic", "Advanced", "Advanced"],
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
      "Yes. You can forward missed calls from your existing number or use a dedicated virtual number once telephony setup is complete.",
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
    <main className={`min-h-screen max-w-7xl m-auto mt-5 ${themeStyles.page}`}>
      <div className="container mx-auto px-4 pb-20">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="space-y-6"
          >
            <motion.div
              variants={fadeUp}
              className={`inline-flex items-center rounded-full border px-6 py-3 ${themeStyles.badge}`}
            >
              <Sparkles className="h-5 w-5 text-blue-700 mr-2" />
              <span className="text-xs md:text-sm font-medium uppercase tracking-widest text-blue-700">
                AI CALL ASSISTANT
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className={`text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight ${themeStyles.page}`}
            >
              Never miss a customer call again.
              <br />
              <span className={gradientText}>
                Turn calls into qualified leads
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className={`text-base md:text-lg lg:text-xl leading-relaxed font-montserrat ${themeStyles.muted}`}
            >
              RocketReplai AI Call Assistant answers missed calls, qualifies
              callers, captures leads, and sends summaries to the owner on
              WhatsApp, SMS, or email.
            </motion.p>

            <motion.div variants={fadeUp} className="space-y-2 font-montserrat">
              {[
                {
                  icon: <PhoneCall className="h-5 w-5" />,
                  text: "24/7 inbound answering",
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  text: "Caller details and lead capture",
                },
                {
                  icon: <Bell className="h-5 w-5" />,
                  text: "WhatsApp, SMS, and email alerts",
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  text: "Call logs, summaries, and transcripts",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.text}
                  whileHover={{ x: 5 }}
                  className="flex items-center group"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-2xl flex items-center justify-center mr-4 shadow-lg"
                  >
                    {feature.icon}
                  </motion.div>
                  <span className={`font-medium ${themeStyles.muted}`}>
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
              className="flex flex-col sm:flex-row gap-2"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push("https://app.rocketreplai.com/sign-in")
                }
                className="bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold py-2 px-4 rounded-2xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => router.push("/call/pricing")}
                whileTap={{ scale: 0.95 }}
                className={`border-2 border-[#00F0FF] ${themeStyles.textpricing} font-semibold py-2 px-4 md:py-3 md:px-6 rounded-2xl hover:bg-[#00F0FF]/10 transition-all duration-300 flex items-center justify-center`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                View Pricing
              </motion.button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className={`flex flex-wrap items-center gap-3 md:gap-6 text-sm ${themeStyles.soft}`}
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
            initial={{ opacity: 0, scale: 0.92, rotate: -1 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            whileHover={{ scale: 1.015, y: -4 }}
            className={`relative rounded-3xl border p-4 md:p-5 shadow-2xl shadow-[#00F0FF]/10 ${themeStyles.card}`}
          >
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent" />
            <div className="rounded-2xl bg-gradient-to-br from-[#00F0FF] via-[#B026FF] to-[#FF2E9F] p-5 text-black">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold opacity-75 font-montserrat">
                    Live call
                  </p>
                  <p className="text-2xl font-black font-montserrat">
                    AI Receptionist
                  </p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-14 w-14 rounded-full bg-white/30 flex items-center justify-center"
                >
                  <PhoneCall className="h-8 w-8" />
                </motion.div>
              </div>
              <div className="mt-8 rounded-xl bg-white/75 p-4 shadow-sm">
                <p className="text-sm font-semibold font-montserrat">
                  Caller: +91 98765 43210
                </p>
                <p className="mt-2 text-sm font-montserrat">
                  "I want to book an appointment and know your pricing."
                </p>
              </div>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {[
                {
                  label: "Lead saved",
                  icon: CheckCircle2,
                  value: "Amit Sharma",
                },
                { label: "Duration", icon: Clock3, value: "3m 04s" },
                {
                  label: "Language",
                  icon: Languages,
                  value: "Hindi + English",
                },
                { label: "Notification", icon: Bell, value: "WhatsApp sent" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className={`rounded-2xl border p-4 ${themeStyles.inner}`}
                >
                  <item.icon className="h-5 w-5 text-[#00F0FF]" />
                  <p
                    className={`mt-3 text-xs font-montserrat ${themeStyles.soft}`}
                  >
                    {item.label}
                  </p>
                  <p className="text-sm font-bold">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

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
              calls, leads, AI flow, billing, and number settings.
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
              Three clear plans for call volume, permanent numbers, and receptionist
              coverage.
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
                  {["Feature", "Starter", "Growth", "Enterprise"].map(
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
            <h2 className="text-3xl md:text-4xl font-bold">FAQ</h2>
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
                className={`rounded-2xl border p-5 ${themeStyles.card}`}
              >
                <h3 className="font-bold">{faq.question}</h3>
                <p
                  className={`mt-2 font-montserrat text-sm leading-relaxed ${themeStyles.muted}`}
                >
                  {faq.answer}
                </p>
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
            leads from calls you used to miss.
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
