"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { HelpCircle } from "lucide-react";

const faqData = [
  {
    question: "Can I change my plan anytime?",
    answer:
      "Yes. You can upgrade, downgrade, or cancel whenever you need. Plan changes are designed to be simple and transparent.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "RocketReplai supports common online payment methods, including cards, UPI, and other available checkout options.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No. There are no hidden setup fees. You can create an account and start configuring your automation quickly.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes. You can cancel anytime from your account without long contracts or lock-ins.",
  },
  {
    question: "How quickly can I get started?",
    answer:
      "Most teams can get started in a few minutes. Connect your account, choose a workflow, and publish your first automation.",
  },
];

const Faq = () => {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      badge: isDark
        ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
        : "border-blue-200 bg-blue-50 text-blue-700",
      card: isDark
        ? "border-white/10 bg-white/[0.04] hover:border-blue-400/40"
        : "border-slate-200 bg-white hover:border-blue-300",
      icon: isDark ? "bg-blue-500/10 text-blue-200" : "bg-blue-50 text-blue-700",
      title: isDark ? "text-white" : "text-slate-950",
      answer: isDark ? "text-slate-300" : "text-slate-600",
      muted: isDark ? "text-slate-400" : "text-slate-500",
    };
  }, [currentTheme]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.45,
        staggerChildren: 0.07,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
    hover: {
      y: -6,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="w-full px-4 py-16 md:py-24">
      <motion.div
        className="mx-auto max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <motion.div
            variants={cardVariants}
            className={`mb-4 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold uppercase tracking-widest ${themeStyles.badge}`}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            FAQ
          </motion.div>
          <motion.h2
            variants={cardVariants}
            className="text-3xl font-extrabold tracking-normal gradient-text-main md:text-5xl"
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            variants={cardVariants}
            className={`mx-auto mt-4 max-w-2xl text-base leading-7 md:text-lg ${themeStyles.muted}`}
          >
            Everything you need to know before launching your first automation.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {faqData.map((faq) => (
            <motion.div
              key={faq.question}
              variants={cardVariants}
              whileHover="hover"
              className={`group rounded-2xl border p-5 shadow-sm transition-colors duration-300 md:p-6 ${themeStyles.card}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${themeStyles.icon}`}
                >
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${themeStyles.title}`}>
                    {faq.question}
                  </h3>
                  <p
                    className={`mt-3 text-sm leading-6 md:text-base ${themeStyles.answer}`}
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Faq;
