"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle,
  MessageCircle,
  PhoneCall,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

const products = [
  {
    id: "insta",
    title: "Instagram Automation",
    eyebrow: "Comments to DMs",
    href: "/insta",
    color: "from-pink-400 to-rose-500",
    icon: MessageCircle,
    stat: "₹99 first month",
    line: "Reply to comments, send links, and capture leads automatically.",
  },
  {
    id: "web",
    title: "Website Chatbots",
    eyebrow: "Visitors to leads",
    href: "/web",
    color: "from-cyan-300 to-blue-500",
    icon: Bot,
    stat: "2M tokens included",
    line: "Answer site visitors with trained, source-aware AI conversations.",
  },
  {
    id: "call",
    title: "AI Call Assistant",
    eyebrow: "Calls to summaries",
    href: "/call",
    color: "from-violet-400 to-fuchsia-500",
    icon: PhoneCall,
    stat: "From ₹2,999/mo",
    line: "Answer missed calls, qualify callers, and notify your team instantly.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function ProductOrbit({ activeIndex }: { activeIndex: number }) {
  const active = products[activeIndex];
  const Icon = active.icon;

  return (
    <div className="relative mx-auto w-full max-w-[35rem]">
      <div className="absolute left-1/2 top-1/2 h-[21rem] w-[21rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200 bg-white/35 transition-colors duration-500 dark:border-white/10 dark:bg-white/[0.03]" />
      <div className="absolute left-1/2 top-1/2 h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35 transition-colors duration-500 dark:border-cyan-300/15" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="relative rounded-[1.6rem] border border-slate-200 bg-white/80 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.13)] backdrop-blur-xl transition-colors duration-500 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35 }}
            className="rounded-[1.25rem] bg-slate-50 p-4 transition-colors duration-500 dark:bg-slate-950/80"
          >
            <div
              className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${active.color} text-slate-950 shadow-lg`}
            >
              <Icon className="h-7 w-7" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-cyan-200">
              {active.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {active.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {active.line}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-white/10 dark:shadow-none">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                  <div>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      Automation ready
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {active.stat}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-white/10 dark:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
                    Live workflow
                  </span>
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Send className="h-4 w-4 text-blue-700 dark:text-cyan-200" />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {products.map((product, index) => {
        const MiniIcon = product.icon;
        const positions = [
          "-left-2 top-10",
          "right-0 top-24",
          "left-8 bottom-4",
        ];

        return (
          <motion.div
            key={product.id}
            animate={{ y: [0, index % 2 ? 8 : -8, 0] }}
            transition={{
              duration: 4 + index * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute hidden rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-xl backdrop-blur transition-colors duration-500 sm:block dark:border-white/10 dark:bg-white/[0.09] ${positions[index]}`}
          >
            <MiniIcon className="h-5 w-5 text-blue-700 dark:text-cyan-200" />
            <p className="mt-2 text-xs font-black text-slate-950 dark:text-white">
              {product.eyebrow}
            </p>
          </motion.div>
        );
      })}

      <div className="mt-4 flex justify-center gap-4">
        {products.map((product, index) => (
          <span
            key={product.id}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index
                ? "w-8 bg-blue-700 dark:bg-cyan-300"
                : "w-2 bg-slate-300 dark:bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % products.length);
    }, 3300);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative mx-[calc(50%-50vw)] w-[100vw] lg:w-[99vw] overflow-hidden bg-[#f8fbff] text-slate-950 transition-colors duration-500 dark:bg-[#050912] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,112,255,0.14),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(255,46,159,0.10),transparent_28%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] opacity-100 transition-opacity duration-500 dark:opacity-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,240,255,0.18),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(255,46,159,0.16),transparent_28%),linear-gradient(135deg,#050912_0%,#08152b_52%,#04060d_100%)] opacity-0 transition-opacity duration-500 dark:opacity-100" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-9 px-4 pb-12 pt-10 sm:px-6 sm:pt-8 lg:grid-cols-[0.92fr_1fr] lg:items-center lg:px-10 xl:px-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.1 }}
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-4 inline-flex max-w-max items-center rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur transition-colors duration-500 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 lg:mx-0"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI engagement suite
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-[1.75rem] font-black leading-[1.02] tracking-tight text-slate-950 transition-colors duration-500 sm:text-[2.15rem] md:text-[2.8rem] xl:text-[3.45rem] dark:text-white"
          >
            Capture leads from
            <br />
            <span className="bg-gradient-to-r from-blue-700 via-cyan-500 to-pink-500 bg-clip-text text-transparent dark:from-cyan-200 dark:via-blue-300 dark:to-pink-300">
              comments, chats, and calls.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-700 transition-colors duration-500 sm:text-xl lg:mx-0 dark:text-slate-300"
          >
            One platform for Instagram automation, website chatbots, and AI call
            answering. Less manual follow-up. More qualified conversations.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 grid gap-3 sm:mx-auto sm:max-w-[32rem] sm:grid-cols-2 lg:mx-0"
          >
            <button
              onClick={() =>
                router.push("https://app.rocketreplai.com/sign-in")
              }
              className="rounded-xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(29,78,216,0.24)] transition hover:-translate-y-0.5 hover:bg-blue-800 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-[0_14px_28px_rgba(103,232,249,0.25)] dark:hover:bg-cyan-200"
            >
              Start Free
              <ArrowRight className="ml-2 inline h-5 w-5" />
            </button>
            <button
              onClick={() => router.push("/web/pricing")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              See Pricing
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-500 transition-colors duration-500 sm:text-sm lg:justify-start dark:text-slate-300"
          >
            {["No credit card", "2M chatbot tokens", "Instant setup"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 fill-blue-600 text-white dark:fill-cyan-300 dark:text-slate-950" />
                  {item}
                </span>
              ),
            )}
          </motion.div>
        </motion.div>

        <ProductOrbit activeIndex={activeIndex} />
      </div>
    </section>
  );
}
