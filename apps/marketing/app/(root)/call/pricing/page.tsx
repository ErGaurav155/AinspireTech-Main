"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { ArrowRight, Check, CreditCard, Phone, Rocket, Sparkles, X, Zap } from "lucide-react";
import { Button, Switch } from "@rocketreplai/ui";

const dashboardUrl = "https://app.rocketreplai.com";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const plans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    minutes: "10 min",
    overage: "No overage",
    access: "Owner-only",
    concurrent: "1 concurrent",
    highlight: false,
    features: [
      "Inbound AI receptionist",
      "10 included minutes",
      "1 concurrent inbound call",
      "Lead capture",
      "Owner dashboard",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: 1999,
    yearly: 19990,
    minutes: "200 min",
    overage: "₹5/min",
    access: "Owner-only",
    concurrent: "3 concurrent",
    highlight: true,
    features: [
      "Everything in Free",
      "200 included minutes",
      "3 concurrent inbound calls",
      "Call transcripts and recordings",
      "WhatsApp and email alerts",
      "Priority support",
    ],
  },
];

const comparison = [
  ["Feature", "Free", "Business"],
  ["Included minutes", "10", "200"],
  ["Concurrent inbound calls", "1", "3"],
  ["Inbound calls", "Yes", "Yes"],
  ["Outbound calls", "", ""],
  ["Owner alerts", "Yes", "Yes"],
  ["Call transcripts", "", "Yes"],
  ["Support", "Email", "Priority"],
];

export default function CallPricingPage() {
  const [mounted, setMounted] = useState(false);
  const [yearly, setYearly] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  useEffect(() => setMounted(true), []);

  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      page: isDark ? "text-white" : "text-n-8",
      muted: isDark ? "text-gray-300" : "text-n-5",
      soft: isDark ? "text-gray-400" : "text-n-4",
      badge: isDark
        ? "bg-blue-500/10 border-blue-400/30 text-blue-200"
        : "bg-blue-50 border-blue-200 text-blue-700",
      card: isDark
        ? "bg-white/[0.04] border-white/10 backdrop-blur-sm"
        : "bg-white border-slate-200 backdrop-blur-sm",
      inner: isDark
        ? "bg-white/[0.04] border-white/10"
        : "bg-slate-50 border-slate-200",
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
    <main className={`min-h-screen max-w-7xl mx-auto px-4 py-10 ${themeStyles.page}`}>
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center max-w-4xl mx-auto py-10"
      >
        <motion.div
          variants={fadeUp}
          className={`inline-flex items-center rounded-full border px-6 py-3 ${themeStyles.badge}`}
        >
          <CreditCard className="h-5 w-5 text-blue-700 mr-2" />
          <span className="text-xs md:text-sm font-medium uppercase tracking-widest">
            CALL ASSISTANT PRICING
          </span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="mt-5 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight"
        >
          AI receptionist plans
          <br />
          <span className={gradientText}>for inbound call volume</span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className={`mt-4 text-base md:text-lg font-montserrat ${themeStyles.muted}`}
        >
          Start with included inbound minutes, upgrade as call volume grows, and keep
          overage pricing visible from day one.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-4">
          <span className={!yearly ? "font-bold text-[#00F0FF]" : themeStyles.soft}>
            Monthly
          </span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={yearly ? "font-bold text-[#00F0FF]" : themeStyles.soft}>
            Yearly
          </span>
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">
            Save 16%
          </span>
        </motion.div>
      </motion.section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {plans.map((plan, index) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.01 }}
              className={`relative rounded-3xl border p-6 transition-all duration-300 ${
                plan.highlight
                    ? "border-blue-300 bg-blue-50/80 shadow-xl shadow-blue-950/10 dark:border-blue-400/40 dark:bg-blue-500/10 dark:shadow-blue-500/10"
                  : themeStyles.card
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-0 right-0 text-center">
                  <span className="rounded-full bg-blue-700 px-4 py-1 text-xs font-black text-white shadow-sm shadow-blue-700/20">
                    Most popular
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <div className="h-12 w-12 rounded-2xl bg-blue-700 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="mt-5">
                <p className={`text-4xl font-black ${gradientText}`}>
                  ₹{price.toLocaleString("en-IN")}
                  <span className={`text-base font-semibold ${themeStyles.soft}`}>
                    /{yearly ? "yr" : "mo"}
                  </span>
                </p>
                <p className={`mt-2 text-sm font-montserrat ${themeStyles.soft}`}>
                  GST extra where applicable
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {[plan.minutes, plan.overage, plan.access, plan.concurrent].map((item) => (
                  <div key={item} className={`rounded-2xl border p-3 font-montserrat ${themeStyles.inner}`}>
                    {item}
                  </div>
                ))}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className={`flex gap-3 text-sm font-montserrat ${themeStyles.muted}`}>
                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-300 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  asChild
                  className="mt-7 w-full rounded-2xl bg-blue-700 font-bold text-white hover:bg-blue-800"
                >
                  <Link href={`${dashboardUrl}/call/pricing`}>
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          );
        })}
      </section>

      <section className="py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Compare plans</h2>
          <p className={`mt-2 font-montserrat ${themeStyles.muted}`}>
            Choose based on monthly inbound minutes and concurrent call needs.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`overflow-x-auto rounded-3xl border ${themeStyles.card}`}
        >
          <table className="w-full min-w-[720px] border-collapse">
            <tbody>
              {comparison.map((row, rowIndex) => (
                <tr
                  key={row[0]}
                  className={rowIndex === 0 ? (currentTheme === "dark" ? "bg-white/[0.05]" : "bg-gray-50") : ""}
                >
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className={`border border-white/10 px-5 py-4 ${
                        rowIndex === 0 || index === 0 ? "font-bold" : `font-montserrat ${themeStyles.muted}`
                      }`}
                    >
                      {cell === "Yes" ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : cell === "" ? (
                        <X className="h-5 w-5 text-gray-400" />
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className={`mb-12 rounded-3xl border p-8 text-center overflow-hidden ${themeStyles.card}`}
      >
        <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full border border-[#00F0FF]/30 px-4 py-1 text-sm font-medium uppercase tracking-widest text-blue-700">
          CTA SECTION
        </div>
        <Sparkles className="mx-auto h-8 w-8 text-[#00F0FF]" />
        <h2 className={`mt-4 text-3xl font-bold ${gradientText}`}>
          Need inbound routing setup?
        </h2>
        <p className={`mt-3 max-w-2xl mx-auto font-montserrat ${themeStyles.muted}`}>
          We can help with Exotel routing, call forwarding, notification templates, and
          launch configuration.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-2xl bg-blue-700 text-white font-bold hover:bg-blue-800">
            <Link href="/contactUs">
              Request Setup Help
              <Zap className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className={`rounded-2xl border-2 ${themeStyles.outline}`}>
            <Link href={`${dashboardUrl}/call/pricing`}>
              Start Now
              <Rocket className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
