"use client";

import {
  ArrowRight,
  Bot,
  Globe2,
  Instagram,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const products = [
  {
    href: "/insta",
    icon: Instagram,
    title: "Instagram Automation",
    description: "Turn comments, reels, and story replies into instant DMs.",
    price: "₹99 then ₹499/mo",
    tag: "Best for creators",
  },
  {
    href: "/web",
    icon: Globe2,
    title: "Website Chatbot",
    description: "Capture leads and answer visitor questions from your site.",
    price: "₹499 then ₹999/mo",
    tag: "Best for websites",
  },
  {
    href: "/call",
    icon: Phone,
    title: "AI Call Assistant",
    description: "Answer missed calls, qualify leads, and send summaries.",
    price: "from ₹2,999/mo",
    tag: "Best for local business",
  },
  {
    href: "/whatsapp",
    icon: MessageCircle,
    title: "WhatsApp Automation",
    description: "Automate replies, lead capture, broadcasts, and appointments.",
    price: "from ₹1,999/mo",
    tag: "Best for clinics & teams",
  },
];

const ProductShowcase = () => {
  return (
    <section className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
            <Sparkles className="mr-2 h-4 w-4" />
            Products
          </div>
          <h2 className="text-3xl font-extrabold tracking-normal gradient-text-main md:text-5xl">
            Choose the automation that fits your growth channel
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
            Start with one product or combine Instagram, website chat, AI
            calls, and WhatsApp into one customer conversation engine.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-5">
          {products.map((product) => (
            <Link
              key={product.title}
              href={product.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/40 dark:hover:shadow-blue-500/10"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-700 opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:scale-105 dark:bg-blue-500/10 dark:text-blue-200">
                  <product.icon className="h-6 w-6" />
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                  {product.price}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {product.tag}
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                  {product.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {product.description}
                </p>
              </div>

              <div className="mt-6 inline-flex items-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                Explore product
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300">
          <Bot className="mx-auto mb-2 h-5 w-5 text-blue-700 dark:text-blue-300" />
          Made in India, designed for fast setup, clear pricing, and practical
          automation for small teams.
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
