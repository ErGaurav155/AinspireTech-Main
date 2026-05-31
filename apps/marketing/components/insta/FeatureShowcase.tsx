"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Play,
  Facebook,
  BarChart3,
  Workflow,
  MessageSquare,
  Users,
  Zap,
  Rewind,
  Shield,
  Infinity,
  Cpu,
  InstagramIcon,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export function FeatureShowcase() {
  const [activeCategory, setActiveCategory] = useState("all");
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      panelBg: isDark
        ? "bg-white/[0.035] border-white/10"
        : "bg-white/75 border-slate-200",
      badge: isDark
        ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
        : "border-blue-200 bg-blue-50 text-blue-700",
      titleText: isDark ? "text-white" : "text-slate-950",
      descriptionText: isDark ? "text-slate-300" : "text-slate-600",
      mutedText: isDark ? "text-slate-400" : "text-slate-500",
      cardBg: isDark
        ? "bg-slate-900/70 border-white/10 hover:border-blue-400/40"
        : "bg-white border-slate-200 hover:border-blue-300",
      iconBg: isDark
        ? "bg-blue-500/10 text-blue-200"
        : "bg-blue-50 text-blue-700",
      filterButtonBg: isDark ? "bg-white/[0.04]" : "bg-white",
      filterButtonBorder: isDark
        ? "border-white/10 text-slate-300 hover:border-blue-400/40 hover:text-white hover:bg-white/[0.07]"
        : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-slate-950 hover:bg-blue-50/70",
      categoryBadgeBg: isDark
        ? "bg-white/[0.06] text-slate-300 border-white/10"
        : "bg-slate-50 text-slate-600 border-slate-200",
    };
  }, [currentTheme]);
  // EXACT same animation variants as FeatureSection component
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.06,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 22,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: "easeOut",
      },
    },
    hover: {
      y: -6,
      scale: 1.01,
      boxShadow:
        currentTheme === "dark"
          ? "0 24px 70px -38px rgba(96, 165, 250, 0.65)"
          : "0 24px 70px -38px rgba(37, 99, 235, 0.45)",
      transition: {
        duration: 0.22,
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
        duration: 0.5,
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
        duration: 0.4,
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
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const features = [
    {
      icon: <InstagramIcon className="h-6 w-6" />,
      title: "Post AutoDM",
      description: "Automatically reply to Instagram Post comments with a DM",
      category: "automation",
    },
    {
      icon: <Play className="h-6 w-6" />,
      title: "Reels AutoDM",
      description: "Automatically reply to Instagram Reel comments with a DM",
      category: "automation",
    },
    {
      icon: <Facebook className="h-6 w-6" />,
      title: "Facebook AutoDM",
      description: "Auto-reply to Facebook comments with a DM",
      category: "automation",
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Story AutoDM",
      description: "Automatically respond to story replies with a DM",
      category: "automation",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Click Analytics",
      description: "Track link click analytics on DMs sent",
      category: "analytics",
    },
    {
      icon: <Workflow className="h-6 w-6" />,
      title: "Flow Automation",
      description: "Schedule a sequence of DMs and reminders after engagement",
      category: "automation",
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Comment Auto-Reply",
      description:
        "Automatically reply to comments with a comment once a DM has been sent",
      category: "automation",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "White Label",
      description: "Remove RocketReplai branding from DMs sent",
      category: "branding",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Multiple Accounts",
      description:
        "Connect up to 3 Instagram Accounts to your RocketReplai Profile",
      category: "management",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Increased DM Send Limit",
      description: "Send up to 25,000 DMs per account/per month",
      category: "limits",
    },
    {
      icon: <Cpu className="h-6 w-6" />,
      title: "Universal Triggers",
      description: "Setup global triggers to use across multiple placements",
      category: "automation",
    },
    {
      icon: <Rewind className="h-6 w-6" />,
      title: "Rewind",
      description: "Backsend DMs to eligible comments",
      category: "automation",
    },
    {
      icon: <Infinity className="h-6 w-6" />,
      title: "DM Send Limit+",
      description: "Send up to 300,000 DMs per account/per month",
      category: "limits",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Accounts+",
      description:
        "Connect up to 5 Instagram accounts to your RocketReplai profile",
      category: "management",
    },
    // {
    //   icon: <Gauge className="h-6 w-6" />,
    //   title: "Slow Down Mode",
    //   description:
    //     "When your Reels are blowing up, Let us slow down your automation",
    //   category: "automation",
    // },
  ];

  const categories = [
    { id: "all", name: "All Features", count: features.length },
    {
      id: "automation",
      name: "Automation",
      count: features.filter((f) => f.category === "automation").length,
    },
    {
      id: "analytics",
      name: "Analytics",
      count: features.filter((f) => f.category === "analytics").length,
    },

    {
      id: "management",
      name: "Account Management",
      count: features.filter((f) => f.category === "management").length,
    },
    {
      id: "limits",
      name: "Limits",
      count: features.filter((f) => f.category === "limits").length,
    },
    {
      id: "branding",
      name: "Branding",
      count: features.filter((f) => f.category === "branding").length,
    },
  ];

  const filteredFeatures =
    activeCategory === "all"
      ? features
      : features.filter((feature) => feature.category === activeCategory);

  return (
    <section className="w-full bg-transparent py-16 md:py-24 text-foreground">
      <motion.div
        className="mx-auto max-w-7xl md:px-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Header */}
        <motion.div
          className="mx-auto mb-10 max-w-3xl text-center md:mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div
            className={`mb-4 inline-flex items-center rounded-full border px-4 py-1.5 ${themeStyles.badge}`}
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: true }}
            initial="hidden"
          >
            <span className="text-sm font-semibold uppercase tracking-widest">
              Feature Showcase
            </span>
          </motion.div>
          <motion.h2
            className="mb-4 text-3xl font-extrabold tracking-normal gradient-text-main md:text-5xl"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: true }}
            initial="hidden"
          >
            Automations built for every Instagram workflow
          </motion.h2>
          <motion.p
            className={`mx-auto max-w-2xl text-base leading-7 font-montserrat md:text-lg ${themeStyles.descriptionText}`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: true }}
            initial="hidden"
          >
            Filter by use case and see how RocketReplai turns comments, stories,
            reels, and accounts into clean automated DM flows.
          </motion.p>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          className={`mx-auto mb-8 flex max-w-5xl flex-wrap justify-center gap-2 backdrop-blur-xl md:mb-10`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`inline-flex items-center rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200 md:px-4 ${
                activeCategory === category.id
                  ? "border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                  : `${themeStyles.filterButtonBg} ${themeStyles.filterButtonBorder}`
              }`}
              variants={cardVariants}
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              initial="hidden"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{category.name}</span>
              <span className="ml-2 rounded-full bg-current/10 px-2 py-0.5 text-xs opacity-90">
                {category.count}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          key={activeCategory}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={`${activeCategory}-${feature.title}`}
              className={`group relative flex min-h-[210px] flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition-colors duration-300 md:p-6 ${themeStyles.cardBg}`}
              variants={cardVariants}
              whileHover="hover"
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.03 }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-blue-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10 flex flex-1 items-start gap-4">
                {/* Icon */}
                <motion.div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${themeStyles.iconBg}`}
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {feature.icon}
                </motion.div>

                <div className="min-w-0 flex-1">
                  {/* Title */}
                  <motion.h3
                    className={`mb-2 text-lg font-bold leading-snug transition-colors duration-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 ${themeStyles.titleText}`}
                    variants={titleVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {feature.title}
                  </motion.h3>

                  {/* Description */}
                  <motion.p
                    className={`text-sm leading-6 font-montserrat ${themeStyles.descriptionText}`}
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {feature.description}
                  </motion.p>
                </div>
              </div>

              <div className="relative z-10 mt-6 flex w-full items-center justify-between gap-3">
                <motion.button
                  onClick={() => {
                    router.push("https://app.rocketreplai.com/sign-in");
                  }}
                  className="inline-flex items-center rounded-full text-sm font-semibold text-blue-700 transition-colors duration-300 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Learn more
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </motion.button>

                <motion.div
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${themeStyles.categoryBadgeBg}`}
                  >
                    {feature.category}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
