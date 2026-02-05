"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Play,
  AtSign,
  Facebook,
  Inbox,
  Calendar,
  BarChart3,
  Workflow,
  MessageSquare,
  Users,
  Zap,
  Rewind,
  Megaphone,
  Mail,
  BookOpen,
  Gift,
  Shield,
  Infinity,
  Cpu,
  Clock,
  Gauge,
  InstagramIcon,
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
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/40",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      titleText: isDark ? "text-white" : "text-n-8",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      cardBg: isDark ? "bg-white/10" : "bg-white/90",
      cardHoverBorder: isDark ? "border-[#258b94]/40" : "border-[#258b94]/60",
      gradientBg: isDark
        ? "from-[#00F0FF]/5 to-[#B026FF]/5"
        : "from-[#00F0FF]/10 to-[#B026FF]/10",
      filterButtonBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/80",
      filterButtonBorder: isDark
        ? "border-[#00F0FF]/30 text-gray-300 hover:border-[#00F0FF] hover:text-white"
        : "border-[#00F0FF]/50 text-gray-600 hover:border-[#00F0FF] hover:text-gray-900",
      categoryBadgeBg: isDark
        ? "bg-gray-800 text-gray-300"
        : "bg-gray-200 text-n-5",
      ctaText: isDark
        ? "text-[#00F0FF] hover:text-[#B026FF]"
        : "text-[#00F0FF] hover:text-[#B026FF]",
      cardHoverEffect: isDark
        ? "borderColor: 'rgba(37, 139, 148, 0.4)'"
        : "borderColor: 'rgba(37, 139, 148, 0.2)'",
    };
  }, [currentTheme]);
  // EXACT same animation variants as FeatureSection component
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

  const iconVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
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
      description: "Remove AinspireTech branding from DMs sent",
      category: "branding",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Multiple Accounts",
      description:
        "Connect up to 3 Instagram Accounts to your AinspireTech Profile",
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
        "Connect up to 5 Instagram accounts to your AinspireTech profile",
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
    <section className={`w-full bg-transparent text-foreground py-20`}>
      <motion.div
        className=" mx-auto md:px-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-100px" }}
        >
          <motion.div
            className={`inline-flex items-center text-blue-700 border ${themeStyles.badgeBorder} rounded-full px-4 py-1 mb-4`}
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <span className="text-sm font-medium uppercase tracking-widest">
              FEATURE SHOWCASE
            </span>
          </motion.div>
          <motion.h2
            className="text-3xl font-bold mb-6 gradient-text-main"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Unlock The Full Potential
          </motion.h2>
          <motion.p
            className={`text-lg p-2 max-w-3xl mx-auto font-montserrat ${themeStyles.descriptionText}`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Dive deep into AinspireTech capabilities with these standout
            features, each designed to enhance your experience and streamline
            your tasks. Discover what sets us apart.
          </motion.p>

          {/* Divider */}
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full mx-auto mb-12"
            variants={iconVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          />
        </motion.div>

        {/* Category Filters */}
        <motion.div
          className={`flex flex-wrap justify-center gap-1 md:gap-4 mb-4 md:mb-12 ${themeStyles.containerBg} backdrop-blur-sm p-3 rounded`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
        >
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-2 py-1 md:px-6 md:py-3 rounded-full border transition-all ${
                themeStyles.filterButtonBg
              } backdrop-blur-sm duration-300 ${
                activeCategory === category.id
                  ? "bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white border-transparent"
                  : `${themeStyles.filterButtonBorder}`
              }`}
              variants={cardVariants}
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              initial="hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xs md:text-base font-thin md:font-medium">
                {category.name}
              </span>
              <span className="ml-1 md:ml-2 text-sm opacity-80">
                ({category.count})
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto ${themeStyles.containerBg} backdrop-blur-sm md:p-5 rounded`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
        >
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className={`border ${themeStyles.cardBg} rounded-2xl p-3 group relative overflow-hidden flex flex-col items-start justify-center gap-2 hover:${themeStyles.cardHoverBorder} transition-colors duration-300`}
              variants={cardVariants}
              whileHover="hover"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              initial="hidden"
            >
              {/* Background Gradient Effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${themeStyles.gradientBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              ></div>

              <div className="flex items-start justify-center gap-2 relative z-10">
                {/* Icon */}
                <motion.div
                  className="w-14 h-14 px-3 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-xl flex items-center justify-center mb-6"
                  variants={iconVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                  whileHover={{ scale: 1.1 }}
                >
                  <div className="text-white">{feature.icon}</div>
                </motion.div>

                <div className="flex-1">
                  {/* Title */}
                  <motion.h3
                    className={`text-lg font-medium group-hover:text-[#00F0FF] transition-colors duration-300 mb-2 ${themeStyles.titleText}`}
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    {feature.title}
                  </motion.h3>

                  {/* Description */}
                  <motion.p
                    className={`text-sm font-montserrat ${themeStyles.descriptionText}`}
                    variants={textVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    {feature.description}
                  </motion.p>
                </div>
              </div>

              <div className="w-full flex items-center justify-between relative z-10">
                <motion.button
                  onClick={() => {
                    router.push("https://app.ainspiretech.com/signin");
                  }}
                  className={`inline-flex items-center transition-colors duration-300 ${themeStyles.ctaText}`}
                  variants={textVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-sm font-medium">Learn more</span>
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.button>

                <motion.div
                  variants={iconVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                >
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${themeStyles.categoryBadgeBg} capitalize`}
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
