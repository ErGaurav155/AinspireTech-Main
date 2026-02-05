"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Card, CardContent } from "@ainspiretech/ui/components/radix/card";
import { Button } from "@ainspiretech/ui/components/radix/button";

export function WebCTASection() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      cardBg: isDark ? "bg-transparent" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-300",
      outlineButtonBorder: isDark
        ? "border-[#B026FF]/30"
        : "border-[#B026FF]/50",
      outlineButtonText: isDark ? "text-[#B026FF]" : "text-[#B026FF]",
      outlineButtonHover: isDark
        ? "hover:bg-[#B026FF]/10"
        : "hover:bg-[#B026FF]/10",
      badgeBg: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      gradientBg: isDark
        ? [
            "linear-gradient(to bottom right, #0a0a0a, #1a1a1a/90)",
            "linear-gradient(to bottom right, #0a0a0a, #1a1a1a/90, rgba(0, 240, 255, 0.05))",
            "linear-gradient(to bottom right, #0a0a0a, #1a1a1a/90)",
          ]
        : [
            "linear-gradient(to bottom right, #ffffff, #f8fafc/90)",
            "linear-gradient(to bottom right, #ffffff, #f8fafc/90, rgba(0, 240, 255, 0.05))",
            "linear-gradient(to bottom right, #ffffff, #f8fafc/90)",
          ],
    };
  }, [currentTheme]);
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.3,
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
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  const outlineButtonVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  const gradientPulseVariants = {
    visible: {
      background: themeStyles.gradientBg,
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
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

  return (
    <motion.div
      className="text-center"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      <motion.div variants={cardVariants} whileHover="hover">
        <motion.div variants={gradientPulseVariants} animate="visible">
          <Card
            className={`max-w-4xl mx-auto ${themeStyles.cardBg} border ${themeStyles.cardBorder} backdrop-blur-lg overflow-hidden`}
          >
            <CardContent className="p-3 pt-12 pb-12 relative">
              {/* Animated background elements */}
              <motion.div
                className="flex items-center justify-center text-blue-700 mb-4"
                variants={titleVariants}
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <span
                  className={`text-sm font-medium uppercase tracking-widest border ${themeStyles.badgeBg} rounded-full px-4 py-1`}
                >
                  CTA SECTION
                </span>
              </motion.div>
              <motion.div
                className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
              />

              <motion.div variants={itemVariants} className="mb-4">
                <h2
                  className={`text-3xl font-bold mb-4 gradient-text-main ${themeStyles.textPrimary}`}
                >
                  🚀 Ready to Convert Your Website Traffic Into Paying Clients?
                </h2>
              </motion.div>

              <motion.div variants={itemVariants} className="mb-8">
                <p
                  className={`${themeStyles.textSecondary} mb-8 text-lg font-montserrat max-w-2xl mx-auto`}
                >
                  Thousands of local businesses are using AI-powered chatbots to
                  automate support, boost engagement, and increase sales.
                </p>
              </motion.div>

              <motion.div
                className="flex flex-wrap gap-4 justify-center"
                variants={itemVariants}
              >
                <motion.div variants={buttonVariants} whileHover="hover">
                  <Button
                    size="lg"
                    className="btn-gradient-cyan text-lg px-8 hover:opacity-90 transition-opacity"
                    asChild
                  >
                    <Link href="https://app.ainspiretech.com/signin">
                      Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={outlineButtonVariants} whileHover="hover">
                  <Button
                    size="lg"
                    variant="outline"
                    className={`text-lg px-8 ${themeStyles.outlineButtonBorder} ${themeStyles.cardBg} ${themeStyles.outlineButtonText} ${themeStyles.outlineButtonHover}`}
                  >
                    <Link href="/web/pricing">View Pricing</Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Floating particles */}
              <motion.div
                className="absolute top-4 right-4 w-2 h-2 bg-[#00F0FF] rounded-full"
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute bottom-4 left-4 w-3 h-3 bg-[#B026FF] rounded-full"
                animate={{
                  y: [0, 10, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
