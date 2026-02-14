"use client";

import { motion } from "framer-motion";
import {
  MessageCircle,
  Play,
  AtSign,
  Heart,
  Users,
  Clock,
  ShoppingBag,
  Instagram,
} from "lucide-react";
import Image from "next/image";
import featureImg from "public/assets/img/featureImg4.png";
import featureImg2 from "public/assets/img/featureImg2.png";
import featureImg3 from "public/assets/img/headingimg.png";
import featureImg4 from "public/assets/img/featureImg1.png";
import { useTheme } from "next-themes";
import { useMemo } from "react";

export function FeatureSection() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/50",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      titleText: isDark ? "text-white" : "text-n-7",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      dividerBg: isDark
        ? "bg-gradient-to-r from-[#00F0FF] to-[#B026FF]"
        : "bg-gradient-to-r from-[#00F0FF] to-[#B026FF]",
      ctaText: isDark
        ? "text-[#00F0FF] hover:text-[#B026FF]"
        : "text-[#00F0FF] hover:text-[#B026FF]",
      cardHoverBorder: isDark
        ? "borderColor: 'rgba(37, 139, 148, 0.4)'"
        : "borderColor: 'rgba(37, 139, 148, 0.2)'",
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

  const imageVariants = {
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

  const features = [
    {
      icon: <Play className="h-6 w-6" />,
      title: "Auto-Reply to Instagram Reel Comments",
      url: featureImg,
      description:
        "Reply to Instagram reel comments automatically with a DM sent straight to the users inbox. Add trigger keywords or respond to all comments.",
      post: {
        username: "myveganishindustries",
        hours: "2,091 hours",
        followers: "190k followers",
        following: "1,906 following",
        caption: "GILL takes us to meet my profile\nView my Shop",
        brand: "Abercrombie",
      },
    },
    {
      icon: <Instagram className="h-6 w-6" />,
      title: "Auto-Reply to Instagram Post Comments",
      url: featureImg3,

      description:
        "Reply to Instagram post comments automatically with a DM sent straight to the users inbox.",
      post: {
        username: "fashionblogger",
        hours: "1,542 hours",
        followers: "245k followers",
        following: "892 following",
        caption: "Spring collection is live!\nShop the look",
        brand: "REDENT & FAVOURITE",
      },
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Auto-Respond to Instagram Story Replies",
      url: featureImg4,

      description:
        "Automatically respond to story replies with a DM sent directly to the users inbox. Add trigger keywords or respond to all comments.",
      post: {
        username: "travelwanderer",
        hours: "3,128 hours",
        followers: "178k followers",
        following: "1,245 following",
        caption: "Loved my stay here! Thanks @brandonne!\nBook your stay",
        brand: "Travel & Leisure",
      },
    },
    {
      icon: <AtSign className="h-6 w-6" />,
      title: "Auto-Reply to Instagram Story Mentions",
      url: featureImg2,

      description:
        "Automatically respond to story @mentions with a message sent directly to the users inbox.",
      post: {
        username: "fitnessjourney",
        hours: "956 hours",
        followers: "132k followers",
        following: "567 following",
        caption: "Check out my workout routine!\nGet the program",
        brand: "Fitness Pro",
      },
    },
  ];

  return (
    <section className={`w-full bg-transparent text-foreground py-16`}>
      <motion.div
        className="mx-auto"
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
              FEATURE FOCUS
            </span>
          </motion.div>
          <motion.h2
            className="text-3xl font-bold mb-6 gradient-text-main"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Feature Breakdown
          </motion.h2>
          <motion.p
            className={`text-lg p-2 max-w-3xl mx-auto font-montserrat ${themeStyles.descriptionText}`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Dive into the specifics of each feature, understanding its
            functionality and how it can elevate your Instagram strategy.
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className={`flex flex-col gap-4 sm:gap-8 md:gap-12 max-w-7xl mx-auto items-center justify-center h-full ${themeStyles.containerBg} backdrop-blur-sm rounded`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`flex ${
                index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
              } flex-col items-center justify-between  md:w-[90%] gap-2 sm:gap-4 md:gap-8`}
              variants={cardVariants}
              whileHover="hover"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              initial="hidden"
            >
              {/* Feature Description */}
              <motion.div
                className="flex-1 min-h-[50vh] flex flex-col items-start justify-center p-2 md:p-6"
                variants={cardVariants}
                whileHover="hover"
                whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                initial="hidden"
              >
                {/* Icon */}
                <div className="flex w-full flex-row items-center justify-between gap-3 md:gap-5">
                  <motion.div
                    className="w-14 h-14 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-xl flex items-center justify-center mb-6"
                    variants={iconVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    <div className="text-white p-3">{feature.icon}</div>
                  </motion.div>

                  {/* Title */}
                  <motion.h3
                    className={`text-lg md:text-xl font-semibold mb-4 ${themeStyles.titleText}`}
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    {feature.title}
                  </motion.h3>
                </div>

                {/* Description */}
                <motion.p
                  className={`leading-relaxed mb-6 font-montserrat ${themeStyles.descriptionText}`}
                  variants={textVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                >
                  {feature.description}
                </motion.p>

                {/* Divider */}
                <motion.div
                  className={`w-20 h-1 ${themeStyles.dividerBg} rounded-full mb-6`}
                  variants={iconVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                />

                {/* CTA Button */}
                <motion.button
                  className={`inline-flex items-center transition-colors duration-300 ${themeStyles.ctaText}`}
                  variants={textVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-sm font-medium">Learn More</span>
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
              </motion.div>
              {/* Instagram Post Visual */}
              <motion.div
                className="flex-1 relative m-auto w-full aspect-square overflow-hidden"
                variants={imageVariants}
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <Image
                  src={feature.url}
                  alt={`${feature.title} example`}
                  fill
                  sizes="100%"
                  className="object-cover"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
