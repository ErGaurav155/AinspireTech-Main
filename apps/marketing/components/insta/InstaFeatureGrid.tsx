"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import { motion } from "framer-motion";
import { MessageSquare, Users, BarChart3, Shield, Zap } from "lucide-react";

import { useTheme } from "next-themes";
import { useMemo } from "react";

const features = [
  {
    icon: MessageSquare,
    title: "Smart Auto-Replies",
    description:
      "Create intelligent response templates that trigger based on specific keywords and phrases in comments.",
    color: "cyan",
  },
  {
    icon: Users,
    title: "Multi-Account Management",
    description:
      "Manage multiple Instagram accounts from a single dashboard with individual settings and templates.",
    color: "purple",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track reply performance, engagement rates, and optimize your automated responses for better results.",
    color: "pink",
  },
  {
    icon: Shield,
    title: "Safe & Compliant",
    description:
      "Built with Instagram's guidelines in mind, featuring rate limiting and respectful automation practices.",
    color: "cyan",
  },
  {
    icon: Zap,
    title: "Real-time Monitoring",
    description:
      "Monitor comments in real-time and respond instantly with your pre-configured templates and settings.",
    color: "purple",
  },
  {
    icon: MessageSquare,
    title: "Custom Templates",
    description:
      "Design personalized response templates with variables, emojis, and dynamic content for authentic engagement.",
    color: "pink",
  },
];

export function InstaFeaturesGrid() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-gray-50/50",
      cardBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/50",
      titleText: isDark ? "text-white" : "text-n-7",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      iconBg: isDark
        ? "bg-gradient-to-br from-white/10 to-white/5"
        : "bg-gradient-to-br from-gray-100 to-gray-50",
      cardHoverBorder: isDark
        ? "borderColor: 'rgba(37, 139, 148, 0.4)', boxShadow: '0 20px 40px -10px rgba(37, 139, 148, 0.2)'"
        : "borderColor: 'rgba(37, 139, 148, 0.2)', boxShadow: '0 20px 40px -10px rgba(37, 139, 148, 0.1)'",
    };
  }, [currentTheme]);
  const colorClasses = {
    cyan:
      theme === "dark"
        ? "from-[#00F0FF]/10 to-[#00F0FF]/5 border-[#00F0FF]/20 hover:border-[#00F0FF]/40"
        : "from-[#00F0FF]/5 to-[#00F0FF]/2 border-[#00F0FF]/30 hover:border-[#00F0FF]/50",
    purple:
      theme === "dark"
        ? "from-[#B026FF]/20 to-[#B026FF]/5 border-[#B026FF]/20 hover:border-[#B026FF]/40"
        : "from-[#B026FF]/10 to-[#B026FF]/2 border-[#B026FF]/30 hover:border-[#B026FF]/50",
    pink:
      theme === "dark"
        ? "from-[#FF2E9F]/20 to-[#FF2E9F]/5 border-[#FF2E9F]/20 hover:border-[#FF2E9F]/40"
        : "from-[#FF2E9F]/10 to-[#FF2E9F]/2 border-[#FF2E9F]/30 hover:border-[#FF2E9F]/50",
  };

  const iconColors = {
    cyan: "text-[#00F0FF]",
    purple: "text-[#B026FF]",
    pink: "text-[#FF2E9F]",
  };

  // EXACT same animation variants as FAQ component
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
      boxShadow:
        theme === "dark"
          ? "0 20px 40px -10px rgba(37, 139, 148, 0.2)"
          : "0 20px 40px -10px rgba(37, 139, 148, 0.1)",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const titleVariants = {
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

  const descriptionVariants = {
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

  return (
    <>
      <motion.div
        className="flex items-center justify-center text-blue-700 mb-4"
        variants={titleVariants}
        whileInView="visible"
        viewport={{ once: false }}
        initial="hidden"
      >
        <span className="text-sm font-medium uppercase tracking-widest border border-blue-700/30 rounded-full px-4 py-1">
          WHY WE
        </span>
      </motion.div>
      <div className="text-center mb-12">
        <motion.h2
          className="text-3xl font-bold mb-4 gradient-text-main"
          variants={titleVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          Why Choose RocketReplai Automation for Instagram
        </motion.h2>
        <motion.p
          className={`text-xl font-montserrat ${themeStyles.descriptionText}`}
          variants={containerVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          Join thousands of creators who have transformed their Instagram
          engagement
        </motion.p>
      </div>
      <motion.div
        className={`grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 ${themeStyles.containerBg} backdrop-blur-sm`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const colorKey = feature.color as keyof typeof colorClasses;

          return (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover="hover"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              initial="hidden"
            >
              <Card
                className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-br ${
                  themeStyles.cardBg
                } ${
                  colorClasses[feature.color as keyof typeof colorClasses]
                } border h-full`}
              >
                <CardHeader className="p-3 md:p-6">
                  <motion.div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${themeStyles.iconBg}`}
                    variants={iconVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    <Icon className={`h-6 w-6 ${iconColors[colorKey]}`} />
                  </motion.div>

                  <motion.div
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    <CardTitle
                      className={`text-xl mb-2 ${themeStyles.titleText}`}
                    >
                      {feature.title}
                    </CardTitle>
                  </motion.div>

                  <motion.div
                    variants={descriptionVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    <CardDescription
                      className={`font-montserrat ${themeStyles.descriptionText}`}
                    >
                      {feature.description}
                    </CardDescription>
                  </motion.div>
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}

export default InstaFeaturesGrid;
