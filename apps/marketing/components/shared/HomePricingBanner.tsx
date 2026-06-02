"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  Globe2,
  Instagram,
} from "lucide-react";

const comparisons = [
  {
    href: "/insta",
    icon: Instagram,
    label: "Instagram Automation",
    competitor: "ManyChat",
    competitorPrice: "₹12,999/yr",
    rocketPrice: "₹99 first month, then ₹499/mo",
    note: "Comment-to-DM automation for Indian brands",
  },
  {
    href: "/web",
    icon: Globe2,
    label: "Website AI Chatbot",
    competitor: "Intercom",
    competitorPrice: "$39/mo",
    rocketPrice: "₹499 first month, then ₹999/mo",
    note: "Lead capture, support, and forms on your website",
  },
  {
    href: "/web",
    icon: Bot,
    label: "AI Chat Assistant",
    competitor: "Tidio",
    competitorPrice: "$29/mo",
    rocketPrice: "₹499 first month, then ₹999/mo",
    note: "Simple chat automation with fast setup",
  },
];

export function HomePricingBanner() {
  return (
    <section className="w-full px-4 pt-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-blue-200 bg-white/85 shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-blue-400/20 dark:bg-white/[0.04]">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_2.1fr]">
          <div className="border-b border-blue-100 bg-blue-700 p-5 text-white dark:border-white/10 lg:border-b-0 lg:border-r">
            <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              <BadgeIndianRupee className="mr-2 h-4 w-4" />
              Made in India Pricing
            </div>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight md:text-3xl">
              Better automation pricing, built for local businesses.
            </h2>
            <p className="mt-3 text-sm leading-6 text-blue-50">
              Compare popular global tools with RocketReplai plans and pick the
              product that fits your workflow.
            </p>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {comparisons.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group grid gap-4 p-4 transition hover:bg-blue-50/70 dark:hover:bg-white/[0.06] md:grid-cols-[1fr_auto_auto] md:items-center md:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:scale-105 dark:bg-blue-500/10 dark:text-blue-200">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-950 dark:text-white">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {item.note}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm sm:max-w-sm md:w-72">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.competitor}
                    </p>
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      {item.competitorPrice}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-400/20 dark:bg-blue-500/10">
                    <p className="text-xs text-blue-700 dark:text-blue-200">
                      RocketReplai
                    </p>
                    <p className="font-extrabold text-blue-700 dark:text-blue-200">
                      {item.rocketPrice}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                  View
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
