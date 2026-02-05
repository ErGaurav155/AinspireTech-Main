"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Card, CardContent } from "../radix/card";

const Faq = () => {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/50",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      titleText: isDark ? "text-white" : "text-n-7",
      cardBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      cardBorder: isDark ? "border-[#333]" : "border-gray-200",
      cardHoverBorder: isDark
        ? "hover:border-[#258b94]/40"
        : "hover:border-[#258b94]/60",
      questionText: isDark ? "text-[#258b94]" : "text-[#1a6b72]",
      answerText: isDark ? "text-gray-300" : "text-n-5",
      cardShadow: isDark
        ? "0 20px 40px -10px rgba(37, 139, 148, 0.2)"
        : "0 20px 40px -10px rgba(37, 139, 148, 0.1)",
    };
  }, [currentTheme]);

  // Animation variants - remove 'once: true' to replay on every scroll
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 60,
      scale: 0.9,
      rotateX: -10,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      borderColor:
        theme === "dark"
          ? "rgba(37, 139, 148, 0.4)"
          : "rgba(37, 139, 148, 0.2)",
      boxShadow: themeStyles.cardShadow,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const questionVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const answerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        delay: 0.2,
      },
    },
  };

  const faqData = [
    {
      question: "Can I change my plan anytime?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept Razorpay Payment Gateways for our customers.",
    },
    {
      question: "Is there a setup fee?",
      answer:
        "No, there are no setup fees or hidden costs. You only pay the monthly or yearly subscription.",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes, you can cancel your subscription at any time. No questions asked.",
    },
    {
      question: "How quickly can I get started?",
      answer:
        "You can be up and running within 5 minutes of subscribing. No technical setup required.",
    },
  ];

  return (
    <div>
      {/* FAQ Section */}
      <section className={`py-16  rounded`}>
        <motion.div
          className=" mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-100px" }}
        >
          <motion.div
            className="flex items-center justify-center text-blue-700 mb-4"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <span
              className={`text-sm font-medium uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}
            >
              FAQ SECTION
            </span>
          </motion.div>
          <motion.div variants={itemVariants} className="mb-4">
            <h2
              className={`text-3xl font-bold mb-4 gradient-text-main text-center ${themeStyles.titleText}`}
            >
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${themeStyles.containerBg} md:p-5 backdrop-blur-sm rounded-lg`}
          >
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                initial="hidden"
              >
                <Card
                  className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} ${themeStyles.cardHoverBorder} transition-colors duration-300 `}
                >
                  <CardContent className="p-3 md:p-6">
                    <motion.h3
                      className={`font-semibold mb-2 ${themeStyles.questionText}`}
                      variants={questionVariants}
                      whileInView="visible"
                      viewport={{ once: false }}
                      initial="hidden"
                    >
                      {faq.question}
                    </motion.h3>
                    <motion.p
                      className={`font-montserrat ${themeStyles.answerText}`}
                      variants={answerVariants}
                      whileInView="visible"
                      viewport={{ once: false }}
                      initial="hidden"
                    >
                      {faq.answer}
                    </motion.p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Faq;
