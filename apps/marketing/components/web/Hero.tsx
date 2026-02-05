"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Check,
  BadgeCheck,
  Bot,
  Calendar,
  Rocket,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import Rimg1 from "@ainspiretech/public/assets/img/chatbot.png";
import Rimg2 from "@ainspiretech/public/assets/img/headingimg.png";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [<InstagramSection key={0} />, <WebChatbotSection key={1} />];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="text-foreground px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto py-10">
        <div className="relative">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`transition-opacity duration-500 ${
                currentSlide === index
                  ? "opacity-100"
                  : "opacity-0 absolute top-0 left-0 w-full"
              }`}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Instagram Section Component
function InstagramSection() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      badgeBorder: isDark ? "border-blue-400/30" : "border-blue-400/50",
      badgeText: isDark ? "text-blue-400" : "text-blue-600",
      descriptionText: isDark ? "text-gray-300" : "text-n-800",
      trustBadgeText: isDark ? "text-gray-300" : "text-n-800",
      featureText: isDark ? "text-gray-300" : "text-n-800",
      secondaryText: isDark ? "text-gray-400" : "text-n-800",
      outlineButtonBorder: isDark ? "border-[#00F0FF]" : "border-[#00F0FF]",
      outlineButtonText: isDark ? "text-[#00F0FF]" : "text-n-800",
      outlineButtonHover: isDark
        ? "hover:bg-[#00F0FF]/10"
        : "hover:bg-[#00F0FF]/5",
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

  const badgeVariants = {
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

  const featureVariants = {
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

  const buttonVariants = {
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
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const imageVariants = {
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
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-12 items-center">
        {/* Left Column - Text Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-100px" }}
        >
          <motion.div
            className={`inline-flex items-center ${themeStyles.badgeText} border ${themeStyles.badgeBorder} rounded-full px-4 py-1 mb-4`}
            variants={badgeVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <Zap className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Instagram Automation</span>
          </motion.div>

          <motion.h1
            className="text-2xl md:text-4xl font-bold leading-tight mb-4"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Reply to Instagram
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
              Comments Automatically
            </span>
          </motion.h1>

          <motion.p
            className={`text-xl ${themeStyles.descriptionText} mb-8 max-w-2xl font-montserrat`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Auto-Reply Platform for Creators and Brands. Never miss a customer
            comment again.
          </motion.p>

          {/* Trust Badges */}
          <motion.div
            className="flex flex-col lg:flex-row items-start lg:items-center mb-8 gap-4 font-montserrat"
            variants={containerVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <motion.div
              className="flex items-center space-x-2"
              variants={badgeVariants}
            >
              <BadgeCheck className="h-5 w-5 text-[#00F0FF]" />
              <span className={`text-sm ${themeStyles.trustBadgeText}`}>
                Meta Business Partner
              </span>
            </motion.div>
            <motion.div
              className="flex items-center space-x-2"
              variants={badgeVariants}
            >
              <BadgeCheck className="h-5 w-5 text-[#00F0FF]" />
              <span className={`text-sm ${themeStyles.trustBadgeText}`}>
                500+ creators, brands and agencies!
              </span>
            </motion.div>
          </motion.div>

          {/* Feature List */}
          <motion.div
            className="space-y-1 md:space-y-3 mb-4 md:mb-8"
            variants={containerVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            {[
              "Instant automated replies to comments",
              "Customizable response templates",
              "Advanced spam detection",
              "Multi-account support",
              "Real-time analytics dashboard",
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="flex items-center"
                variants={featureVariants}
              >
                <Check className="h-5 w-5 text-[#FF2E9F] mr-3" />
                <span className={`font-montserrat ${themeStyles.featureText}`}>
                  {feature}
                </span>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className="flex flex-col md:flex-row lg:flex-col xl:flex-row gap-4 mb-4"
            variants={containerVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("https://app.ainspiretech.com/signin")}
              className="bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold py-2 px-2 md:px-4 rounded-2xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
            >
              <Rocket className="h-5 w-5 mr-1 md:mr-2" />
              Start Automating - Free!
              <ArrowRight className="h-5 w-5 ml-1 md:ml-2" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => router.push("/web/pricing")}
              whileTap={{ scale: 0.95 }}
              className={`border-2 ${themeStyles.outlineButtonBorder} ${themeStyles.outlineButtonText} font-semibold py-2 px-4 rounded-2xl ${themeStyles.outlineButtonHover} transition-all duration-300 flex items-center justify-center`}
            >
              <Calendar className="h-5 w-5 mr-2" />
              View Pricing
            </motion.button>
          </motion.div>
          <motion.p
            className={`text-sm ${themeStyles.secondaryText} font-montserrat`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            No credit card required • 7-day free trial • Cancel anytime
          </motion.p>
        </motion.div>

        {/* Right Column - Image */}
        <motion.div
          variants={imageVariants}
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          initial="hidden"
          className="relative m-auto w-full aspect-square"
        >
          <Image
            src={Rimg2}
            alt="Instagram Automation"
            fill
            sizes="100%"
            className="object-cover"
            loading="lazy"
          />
          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] rounded-full opacity-20 blur-xl" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-[#FF2E9F] to-[#B026FF] rounded-full opacity-20 blur-xl" />
        </motion.div>
      </div>
    </div>
  );
}

// Web Chatbot Section Component
function WebChatbotSection() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      badgeBorder: isDark ? "border-blue-400/30" : "border-blue-400/50",
      badgeText: isDark ? "text-blue-400" : "text-blue-600",
      descriptionText: isDark ? "text-gray-300" : "text-n-800",
      trustBadgeText: isDark ? "text-gray-300" : "text-n-800",
      featureText: isDark ? "text-gray-300" : "text-n-800",
      secondaryText: isDark ? "text-gray-400" : "text-n-800",
      outlineButtonBorder: isDark ? "border-[#00F0FF]" : "border-[#00F0FF]",
      outlineButtonText: isDark ? "text-[#00F0FF]" : "text-n-800",
      outlineButtonHover: isDark
        ? "hover:bg-[#00F0FF]/10"
        : "hover:bg-[#00F0FF]/5",
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

  const badgeVariants = {
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

  const featureVariants = {
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

  const buttonVariants = {
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
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const imageVariants = {
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
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-12 items-center">
        {/* Left Column - Text Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-100px" }}
        >
          <motion.div
            className={`inline-flex items-center ${themeStyles.badgeText} border ${themeStyles.badgeBorder} rounded-full px-4 py-1 mb-4`}
            variants={badgeVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <Bot className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium"> Website Chatbot</span>
          </motion.div>

          <motion.h1
            className="text-2xl md:text-4xl font-bold leading-tight mb-4"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Engage Website Visitors
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
              With Smart Chatbots
            </span>
          </motion.h1>

          <motion.p
            className={`text-xl ${themeStyles.descriptionText} mb-8 max-w-2xl font-montserrat`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            AI-powered chatbots that understand customer queries and provide
            instant responses 24/7.
          </motion.p>

          {/* Trust Badges */}
          <motion.div
            className="flex flex-col lg:flex-row items-start lg:items-center mb-8 gap-4 font-montserrat"
            variants={containerVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <motion.div
              className="flex items-center space-x-2 "
              variants={badgeVariants}
            >
              <BadgeCheck className="h-5 w-5 text-[#00F0FF]" />
              <span className={`text-sm ${themeStyles.trustBadgeText}`}>
                AI-Powered Responses
              </span>
            </motion.div>
            <motion.div
              className="flex items-center justify-center gap-1 text-sm"
              variants={badgeVariants}
            >
              <BadgeCheck className="h-5 w-5 text-[#00F0FF]" />
              <p className={themeStyles.trustBadgeText}>
                Used by 500+ businesses worldwide!
              </p>
            </motion.div>
          </motion.div>

          {/* Feature List */}
          <motion.div
            className="space-y-1 md:space-y-3 mb-4 md:mb-8"
            variants={containerVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            {[
              "24/7 customer support automation",
              "AI-powered natural conversations",
              "Easy integration with your website",
              "Lead generation and qualification",
              "Multi-language support",
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="flex items-center"
                variants={featureVariants}
              >
                <Check className="h-5 w-5 text-[#FF2E9F] mr-3" />
                <span className={`font-montserrat ${themeStyles.featureText}`}>
                  {feature}
                </span>
              </motion.div>
            ))}
          </motion.div>
          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col md:flex-row lg:flex-col xl:flex-row gap-4 mb-4"
            variants={containerVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("https://app.ainspiretech.com/signin")}
              className="bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold py-2 px-2 md:px-4 rounded-2xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
            >
              <Rocket className="h-5 w-5 mr-1 md:mr-2" />
              Start Automating - Free!
              <ArrowRight className="h-5 w-5 ml-1 md:ml-2" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => router.push("/insta/pricing")}
              whileTap={{ scale: 0.95 }}
              className={`border-2 ${themeStyles.outlineButtonBorder} ${themeStyles.outlineButtonText} font-semibold py-2 px-4 rounded-2xl ${themeStyles.outlineButtonHover} transition-all duration-300 flex items-center justify-center`}
            >
              <Calendar className="h-5 w-5 mr-2" />
              View Pricing
            </motion.button>
          </motion.div>

          <motion.p
            className={`text-sm ${themeStyles.secondaryText} font-montserrat`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            No coding required • 14-day free trial • Setup in minutes
          </motion.p>
        </motion.div>

        {/* Right Column - Image */}
        <motion.div
          variants={imageVariants}
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          initial="hidden"
          className="relative m-auto  w-full aspect-square "
        >
          <Image
            src={Rimg1}
            alt="AI Chatbot"
            fill
            sizes="100%"
            className="object-cover"
            loading="lazy"
          />

          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] rounded-full opacity-20 blur-xl" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-[#FF2E9F] to-[#B026FF] rounded-full opacity-20 blur-xl" />
        </motion.div>
      </div>
    </div>
  );
}
