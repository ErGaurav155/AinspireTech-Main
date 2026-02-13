"use client";

import { motion } from "framer-motion";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Card, CardContent } from "@rocketreplai/ui/components/radix/card";
import { Button } from "@rocketreplai/ui/components/radix/button";

function InstaCTASection() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      titleText: isDark ? "text-white" : "text-n-7",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      cardBg: isDark ? "bg-transparent" : "bg-white/50",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      outlineButtonBorder: isDark
        ? "border-[#B026FF]/30"
        : "border-[#B026FF]/50",
      outlineButtonHover: isDark
        ? "hover:bg-[#B026FF]/10"
        : "hover:bg-[#B026FF]/5",
    };
  }, [currentTheme]);
  // EXACT same animation variants as testimonials component
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

  const textVariants = {
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

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
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
    tap: {
      scale: 0.95,
    },
  };

  return (
    <motion.div
      className="text-center pb-5 md:p-10"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-100px" }}
    >
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        whileInView="visible"
        viewport={{ once: false, margin: "-50px" }}
        initial="hidden"
      >
        <Card
          className={`max-w-4xl mx-auto bg-transparent border ${themeStyles.cardBg} ${themeStyles.cardBorder} backdrop-blur-md`}
        >
          <CardContent className="py-12 px-3">
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
                CTA SECTION
              </span>
            </motion.div>
            <motion.h2
              className={`text-3xl font-bold mb-4 gradient-text-main ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Ready to Transform Your Instagram Engagement?
            </motion.h2>
            <motion.p
              className={`mb-8 text-lg font-montserrat max-w-2xl mx-auto ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Join thousands of creators and businesses who have automated their
              Instagram responses and increased their engagement rates by up to
              300%.
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-4 justify-center"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  size="lg"
                  className="btn-gradient-cyan text-lg px-8 hover:opacity-90 transition-opacity"
                  asChild
                >
                  <Link href="https://app.rocketreplai.com/signin">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className={`text-lg px-8 ${themeStyles.outlineButtonBorder} bg-transparent text-[#B026FF] ${themeStyles.outlineButtonHover}`}
                >
                  <Link href="/insta/pricing">View Pricing </Link>
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default InstaCTASection;
