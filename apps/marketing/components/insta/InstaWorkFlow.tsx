"use client";

import { motion } from "framer-motion";
import MetaImg from "@/public/assets/img/metaImg.png";
import instadash from "@/public/assets/Feature/instadash.png";
import instatemp from "@/public/assets/Feature/instatemp.png";
import instalogin from "@/public/assets/Feature/lnstalogin.png";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useMemo } from "react";

function InstaHowItWorksSection() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/50",
      titleText: isDark ? "text-white" : "text-n-7",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      stepText: isDark ? "text-cyan-400" : "text-cyan-600",
      cardBorder: isDark ? "border-white/[0.06]" : "border-gray-200",
      cardBg: isDark ? "bg-white/[0.02]" : "bg-white",
      cardHoverBorder: isDark
        ? "rgba(37, 139, 148, 0.4)"
        : "rgba(37, 139, 148, 0.2)",
      imageWrapperBg: isDark ? "bg-white/[0.03]" : "bg-gray-50",
      imageWrapperBorder: isDark ? "border-white/[0.08]" : "border-gray-200",
      stepBadgeBorder: isDark ? "border-cyan-500/30" : "border-cyan-500/30",
      stepBadgeBg: isDark ? "bg-cyan-500/10" : "bg-cyan-50",
      stepBadgeText: isDark ? "text-cyan-400" : "text-cyan-600",
      glowColor: isDark
        ? "rgba(37, 139, 148, 0.15)"
        : "rgba(37, 139, 148, 0.08)",
    };
  }, [currentTheme]);

  // Animation variants
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
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    hover: {
      y: -4,
      scale: 1.01,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut",
        delay: 0.3,
      },
    },
    hover: {
      scale: 1.03,
      transition: {
        duration: 0.4,
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

  const stepVariants = {
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

  const glowVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.05, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <section className="mx-auto md:px-4 py-16 md:py-24 bg-transparent overflow-hidden">
      <div className="flex items-center justify-center w-full mb-5">
        <Image
          src={MetaImg}
          alt="Meta Tech"
          width={220}
          height={800}
          className="object-cover rounded-md"
          loading="lazy"
        />
      </div>
      {/* Section Badge */}
      <motion.div
        className="flex items-center justify-center mb-4"
        variants={titleVariants}
        whileInView="visible"
        viewport={{ once: true }}
        initial="hidden"
      >
        <span
          className={`text-sm font-medium uppercase tracking-widest border rounded-full px-4 py-1 ${themeStyles.stepBadgeBorder} ${themeStyles.stepBadgeBg} ${themeStyles.stepBadgeText}`}
        >
          WORKING FLOW
        </span>
      </motion.div>

      {/* Section Header */}
      <motion.div
        className="text-center mb-16"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 gradient-text-main"
          variants={titleVariants}
          whileInView="visible"
          viewport={{ once: true }}
          initial="hidden"
        >
          How CommentFlow Works
        </motion.h2>
        <motion.p
          className={`text-lg max-w-2xl mx-auto font-montserrat ${themeStyles.descriptionText}`}
          variants={textVariants}
          whileInView="visible"
          viewport={{ once: true }}
          initial="hidden"
        >
          Set up in minutes and start automating your Instagram comments
        </motion.p>
      </motion.div>

      <motion.div
        className={`w-full mx-auto ${themeStyles.containerBg} backdrop-blur-sm p-4 md:p-10 lg:p-20`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Step 1 */}
        <motion.div
          className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-between w-full mb-20 lg:mb-24"
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          initial="hidden"
        >
          {/* Text Content */}
          <div className="lg:w-1/2 order-1">
            <motion.div
              className={`inline-flex items-center gap-2 font-bold text-sm mb-3 px-3 py-1 rounded-full border ${themeStyles.stepBadgeBorder} ${themeStyles.stepBadgeBg} ${themeStyles.stepBadgeText}`}
              variants={stepVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Step 1
            </motion.div>
            <motion.h3
              className={`text-2xl md:text-3xl font-bold mb-4 ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              Connect Your Instagram Account
            </motion.h3>
            <motion.p
              className={`font-montserrat text-base md:text-lg leading-relaxed ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              Securely connect your Instagram business account with our
              compliant API integration. We never store your password and use
              official Instagram APIs.
            </motion.p>
          </div>

          {/* Image - 16:9 Ratio */}
          <motion.div
            className="lg:w-1/2 w-full order-2"
            variants={imageVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            initial="hidden"
          >
            <div className="relative">
              {/* Glow effect */}
              <motion.div
                className="absolute -inset-4 rounded-2xl opacity-0 blur-2xl"
                style={{ background: themeStyles.glowColor }}
                variants={glowVariants}
                animate="visible"
              />
              {/* Image container */}
              <motion.div
                className={`relative w-full rounded-2xl overflow-hidden border ${themeStyles.imageWrapperBorder} ${themeStyles.imageWrapperBg} shadow-2xl`}
                whileHover="hover"
              >
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "16/9" }}
                >
                  <Image
                    src={instalogin}
                    alt="Instagram Login Interface - Connect your account securely"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    className="object-contain p-2"
                    loading="lazy"
                    quality={90}
                  />
                </div>
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          className="flex flex-col lg:flex-row-reverse gap-8 lg:gap-12 items-center justify-between w-full mb-20 lg:mb-24"
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          initial="hidden"
        >
          {/* Text Content */}
          <div className="lg:w-1/2 order-1">
            <motion.div
              className={`inline-flex items-center gap-2 font-bold text-sm mb-3 px-3 py-1 rounded-full border ${themeStyles.stepBadgeBorder} ${themeStyles.stepBadgeBg} ${themeStyles.stepBadgeText}`}
              variants={stepVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Step 2
            </motion.div>
            <motion.h3
              className={`text-2xl md:text-3xl font-bold mb-4 ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              Set Up Response Rules
            </motion.h3>
            <motion.p
              className={`font-montserrat text-base md:text-lg leading-relaxed ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              Create custom response templates based on keywords, question
              types, or sentiment. Our AI can help suggest responses or you can
              create your own.
            </motion.p>
          </div>

          {/* Image - 16:9 Ratio */}
          <motion.div
            className="lg:w-1/2 w-full order-2"
            variants={imageVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            initial="hidden"
          >
            <div className="relative">
              {/* Glow effect */}
              <motion.div
                className="absolute -inset-4 rounded-2xl opacity-0 blur-2xl"
                style={{ background: themeStyles.glowColor }}
                variants={glowVariants}
                animate="visible"
              />
              {/* Image container */}
              <motion.div
                className={`relative w-full rounded-2xl overflow-hidden border ${themeStyles.imageWrapperBorder} ${themeStyles.imageWrapperBg} shadow-2xl`}
                whileHover="hover"
              >
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "16/9" }}
                >
                  <Image
                    src={instatemp}
                    alt="Response Templates Interface - Set up automated replies"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    className="object-contain p-2"
                    loading="lazy"
                    quality={90}
                  />
                </div>
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-between w-full"
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          initial="hidden"
        >
          {/* Text Content */}
          <div className="lg:w-1/2 order-1">
            <motion.div
              className={`inline-flex items-center gap-2 font-bold text-sm mb-3 px-3 py-1 rounded-full border ${themeStyles.stepBadgeBorder} ${themeStyles.stepBadgeBg} ${themeStyles.stepBadgeText}`}
              variants={stepVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Step 3
            </motion.div>
            <motion.h3
              className={`text-2xl md:text-3xl font-bold mb-4 ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              Monitor & Improve
            </motion.h3>
            <motion.p
              className={`font-montserrat text-base md:text-lg leading-relaxed ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: true }}
              initial="hidden"
            >
              Use our dashboard to monitor responses, analyze engagement
              metrics, and continuously improve your automated comment system.
            </motion.p>
          </div>

          {/* Image - 16:9 Ratio */}
          <motion.div
            className="lg:w-1/2 w-full order-2"
            variants={imageVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            initial="hidden"
          >
            <div className="relative">
              {/* Glow effect */}
              <motion.div
                className="absolute -inset-4 rounded-2xl opacity-0 blur-2xl"
                style={{ background: themeStyles.glowColor }}
                variants={glowVariants}
                animate="visible"
              />
              {/* Image container */}
              <motion.div
                className={`relative w-full rounded-2xl overflow-hidden border ${themeStyles.imageWrapperBorder} ${themeStyles.imageWrapperBg} shadow-2xl`}
                whileHover="hover"
              >
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "16/9" }}
                >
                  <Image
                    src={instadash}
                    alt="Analytics Dashboard - Monitor engagement metrics"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    className="object-contain p-2"
                    loading="lazy"
                    quality={90}
                  />
                </div>
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default InstaHowItWorksSection;
