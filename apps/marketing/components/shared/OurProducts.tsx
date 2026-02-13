"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeaImg1 from "@rocketreplai/public/assets/img/headingimg.png";
import FeaImg3 from "@rocketreplai/public/assets/img/featureImg1.png";
import FeaImg4 from "@rocketreplai/public/assets/img/featureImg4.png";
import FeaBot1 from "@rocketreplai/public/assets/Feature/FeatChatbot1.png";
import FeaBot2 from "@rocketreplai/public/assets/Feature/FeatChatbot2.png";
import FeaBot3 from "@rocketreplai/public/assets/Feature/FeatChatbot3.png";
import InstaFea5 from "@rocketreplai/public/assets/Feature/InstaFeature5.png";
import InstaFea1 from "@rocketreplai/public/assets/Feature/InstaFeature1.png";
import InstaFea2 from "@rocketreplai/public/assets/Feature/InstaFeature2.png";
import InstaFea3 from "@rocketreplai/public/assets/Feature/InstaFeature3.png";
import InstaFea4 from "@rocketreplai/public/assets/Feature/InstaFeature4.png";
import {
  MessageCircle,
  Instagram,
  Users,
  BookOpen,
  Video,
  Zap,
  Phone,
  Mic,
  ImagePlus,
  ChevronDown,
  Network,
  Sparkles,
  Bot,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";

export function AIVoiceAgentShowcase() {
  const [activePlatform, setActivePlatform] = useState<"web" | "insta">("web");
  const [openWebDropdown, setOpenWebDropdown] = useState<string | null>(
    "support",
  );
  const [openInstaDropdown, setOpenInstaDropdown] = useState<string | null>(
    "reels",
  );
  const [agent, setAgent] = useState(FeaBot3);
  const [instaImage, setInstaImage] = useState(InstaFea2);
  const [instaImage1, setInstaImage1] = useState(FeaImg4);
  const imageRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      sectionBg: isDark ? "bg-transparent" : "bg-transparent",
      tabBg: isDark
        ? "bg-[#1a1a1a]/80 backdrop-blur-sm"
        : "bg-white/80 backdrop-blur-sm",
      tabBorder: isDark ? "border-white/10" : "border-gray-200",
      tabText: isDark ? "text-gray-300" : "text-gray-600",
      activeTabBg: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
      activeInstaTabBg:
        "bg-gradient-to-r from-pink-500 to-purple-500 text-white",
      dropdownBg: isDark
        ? "bg-[#0a0a0a]/60 backdrop-blur-sm"
        : "bg-white/80 backdrop-blur-sm",
      dropdownBorder: isDark ? "border-white/10" : "border-gray-200",
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-300" : "text-gray-600",
      featureBg: isDark ? "bg-white/5" : "bg-gray-50",
      glowEffect: isDark
        ? "shadow-[0_0_40px_rgba(0,242,255,0.15)]"
        : "shadow-[0_0_40px_rgba(0,167,255,0.1)]",
      instaGlowEffect: isDark
        ? "shadow-[0_0_40px_rgba(255,0,128,0.15)]"
        : "shadow-[0_0_40px_rgba(255,0,128,0.1)]",
    };
  }, [currentTheme]);

  const webChatTypes = {
    support: {
      title: "AI Support Agent",
      description: "Streamline support with human-like conversations",
      icon: <Phone className="h-5 w-5" />,
      features: [
        "24/7 voice-based customer support",
        "Natural language processing",
        "Multi-language voice recognition",
        "Seamless handoff to human agents",
      ],
      image: FeaBot3,
      color: "from-cyan-500 to-blue-500",
    },
    education: {
      title: "AI Education Agent",
      description: "Automate education learning process",
      icon: <BookOpen className="h-5 w-5" />,
      features: [
        "Learn what you want",
        "Clarify your doubts",
        "Solve MCQ tests instantly",
      ],
      image: FeaBot1,
      color: "from-emerald-500 to-green-500",
    },
    leadgen: {
      title: "AI Lead Qualification Agent",
      description: "Qualify leads through intelligent human-like conversations",
      icon: <Users className="h-5 w-5" />,
      features: [
        "Chat-based lead scoring",
        "Automated qualification questions",
        "Lead routing intelligence",
        "Conversation analytics",
      ],
      image: FeaBot2,
      color: "from-violet-500 to-purple-500",
    },
  };

  const instaAutomationTypes = {
    reels: {
      title: "Reels Automation",
      description: "Auto-engage with Instagram Reel comments",
      icon: <Video className="h-5 w-5" />,
      features: [
        "Auto-reply to Reel comments with DMs",
        "Keyword-based triggering",
        "Sentiment analysis",
        "Response templates",
      ],
      image: InstaFea2,
      image1: FeaImg4,
      color: "from-pink-500 to-rose-500",
    },
    posts: {
      title: "Posts Automation",
      description: "Automate engagement with Instagram posts",
      icon: <ImagePlus className="h-5 w-5" />,
      features: [
        "Comment response automation",
        "@mention handling",
        "Content moderation",
        "Engagement analytics",
      ],
      image: InstaFea5,
      image1: FeaImg1,
      color: "from-orange-500 to-red-500",
    },
    stories: {
      title: "Stories Automation",
      description: "Auto-respond to story interactions",
      icon: <Zap className="h-5 w-5" />,
      features: [
        "Story reply automation",
        "Poll and question responses",
        "DM automation for engagement",
        "Interactive story features",
      ],
      image: InstaFea1,
      image1: FeaImg3,
      color: "from-yellow-500 to-amber-500",
    },
    dms: {
      title: "DM Automation",
      description: "Automate direct message responses",
      icon: <MessageCircle className="h-5 w-5" />,
      features: [
        "Instant DM response system",
        "FAQ automation",
        "Lead qualification",
        "24/7 message handling",
      ],
      image: InstaFea3,
      image1: InstaFea4,
      color: "from-purple-500 to-indigo-500",
    },
  };

  const toggleWebDropdown = (key: string) => {
    const wasOpen = openWebDropdown === key;
    setOpenWebDropdown(wasOpen ? null : key);
    if (!wasOpen && webChatTypes[key as keyof typeof webChatTypes]) {
      setAgent(webChatTypes[key as keyof typeof webChatTypes].image);
    }
  };

  const toggleInstaDropdown = (key: string) => {
    const wasOpen = openInstaDropdown === key;
    setOpenInstaDropdown(wasOpen ? null : key);
    if (
      !wasOpen &&
      instaAutomationTypes[key as keyof typeof instaAutomationTypes]
    ) {
      const automation =
        instaAutomationTypes[key as keyof typeof instaAutomationTypes];
      setInstaImage(automation.image);
      setInstaImage1(automation.image1);
    }
  };

  return (
    <section
      className={`w-full py-12 md:py-20 ${themeStyles.sectionBg} text-foreground overflow-hidden`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-4"
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              PRODUCT SHOWCASE
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              AI-Powered Solutions
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-lg md:text-xl ${themeStyles.descriptionText} max-w-2xl mx-auto font-medium`}
          >
            Elevate customer experience with intelligent automation across all
            platforms
          </motion.p>
        </div>

        {/* Platform Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mb-8 md:mb-12"
        >
          <div
            className={`${themeStyles.tabBg} border ${themeStyles.tabBorder} rounded-2xl p-1.5 flex gap-1 backdrop-blur-sm`}
          >
            {[
              {
                id: "web",
                label: "Web Auto",
                icon: <MessageSquare className="h-5 w-5" />,
                gradient: "from-cyan-500 to-blue-500",
              },
              {
                id: "insta",
                label: "Insta Auto",
                icon: <Instagram className="h-5 w-5" />,
                gradient: "from-pink-500 to-purple-500",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePlatform(tab.id as any)}
                className={`flex items-center px-5 md:px-7 py-3 rounded-xl transition-all duration-300 ${
                  activePlatform === tab.id
                    ? `${themeStyles.glowEffect} text-white bg-gradient-to-r ${tab.gradient}`
                    : `${themeStyles.tabText} hover:bg-white/10`
                }`}
              >
                <span
                  className={`mr-2 ${
                    activePlatform === tab.id ? "text-white" : "text-current"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="text-sm font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto">
          {/* Web Platform Content */}
          <AnimatePresence mode="wait">
            {activePlatform === "web" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col md:flex-row gap-6 md:gap-8"
              >
                {/* Left Panel - Features */}
                <div className="lg:w-1/2 space-y-4 md:space-y-6">
                  {Object.entries(webChatTypes).map(([key, agentType]) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${themeStyles.dropdownBg} border ${themeStyles.dropdownBorder} rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
                    >
                      <button
                        onClick={() => toggleWebDropdown(key)}
                        className="w-full flex items-center justify-between p-4 md:p-6 text-left group"
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${agentType.color} text-white transform transition-transform group-hover:scale-110`}
                          >
                            {agentType.icon}
                          </div>
                          <div className="flex-1">
                            <h3
                              className={`text-lg md:text-xl font-bold ${themeStyles.titleText}`}
                            >
                              {agentType.title}
                            </h3>
                            <p
                              className={`text-sm ${themeStyles.descriptionText} mt-1 font-medium font-montserrat`}
                            >
                              {agentType.description}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 transition-all duration-300 ${
                            openWebDropdown === key
                              ? "rotate-180 text-blue-400"
                              : "text-gray-400 group-hover:text-blue-400"
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {openWebDropdown === key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-white/10 pt-4 md:pt-6">
                              <div className="flex flex-col gap-4 md:gap-6">
                                <div>
                                  <h4
                                    className={`font-semibold ${themeStyles.titleText} mb-3 flex items-center gap-2`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                                    Key Features
                                  </h4>
                                  <div className="space-y-3">
                                    {agentType.features.map(
                                      (feature, index) => (
                                        <motion.div
                                          key={index}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: index * 0.1 }}
                                          className="flex items-start gap-3"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                                          </div>
                                          <span
                                            className={`text-sm ${themeStyles.descriptionText} font-medium font-montserrat`}
                                          >
                                            {feature}
                                          </span>
                                        </motion.div>
                                      ),
                                    )}
                                  </div>
                                </div>

                                {/* Mobile Image - Only shown in dropdown on mobile */}

                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="relative md:hidden h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"
                                >
                                  <Image
                                    src={agent}
                                    alt="AI Agent Preview"
                                    fill
                                    className="object-contain p-4"
                                    priority
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                {/* Right Panel - Desktop Image */}
                <div
                  ref={imageRef}
                  className="hidden md:flex lg:w-1/2 items-center justify-center "
                >
                  <div className="sticky top-24 h-full">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"
                    >
                      <Image
                        src={agent}
                        alt="AI Agent Preview"
                        fill
                        className="object-contain p-4"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </motion.div>
                    <div className="hidden md:flex mt-4 text-center">
                      <p
                        className={`text-sm ${themeStyles.descriptionText} font-medium`}
                      >
                        Interactive AI interface with real-time responses
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instagram Platform Content */}
          <AnimatePresence mode="wait">
            {activePlatform === "insta" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col md:flex-row gap-6 md:gap-8"
              >
                {/* Left Panel - Features */}
                <div className="md:w-1/3 space-y-4 md:space-y-6">
                  {Object.entries(instaAutomationTypes).map(
                    ([key, automation]) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`${themeStyles.dropdownBg} border ${themeStyles.dropdownBorder} rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
                      >
                        <button
                          onClick={() => toggleInstaDropdown(key)}
                          className="w-full flex items-center justify-between p-4 md:p-6 text-left group"
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${automation.color} text-white transform transition-transform group-hover:scale-110`}
                            >
                              {automation.icon}
                            </div>
                            <div className="flex-1">
                              <h3
                                className={`text-lg md:text-xl font-bold ${themeStyles.titleText}`}
                              >
                                {automation.title}
                              </h3>
                              <p
                                className={`text-sm ${themeStyles.descriptionText} mt-1 font-medium font-montserrat`}
                              >
                                {automation.description}
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 transition-all duration-300 ${
                              openInstaDropdown === key
                                ? "rotate-180 text-pink-400"
                                : "text-gray-400 group-hover:text-pink-400"
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {openInstaDropdown === key && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-white/10 pt-4 md:pt-6">
                                <div className="flex flex-col gap-4 md:gap-6">
                                  <div>
                                    <h4
                                      className={`font-semibold ${themeStyles.titleText} mb-3 flex items-center gap-2`}
                                    >
                                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                                      Key Features
                                    </h4>
                                    <div className="space-y-3">
                                      {automation.features.map(
                                        (feature, index) => (
                                          <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-start gap-3"
                                          >
                                            <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                                            </div>
                                            <span
                                              className={`text-sm ${themeStyles.descriptionText} font-medium font-montserrat`}
                                            >
                                              {feature}
                                            </span>
                                          </motion.div>
                                        ),
                                      )}
                                    </div>
                                  </div>

                                  {/* Mobile Images - Only shown in dropdown on mobile */}

                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-4 md:hidden"
                                  >
                                    <div className="grid grid-cols-1 gap-3">
                                      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                                        <Image
                                          src={automation.image1}
                                          alt={automation.title}
                                          fill
                                          className="object-contain "
                                          priority
                                        />
                                      </div>
                                      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                                        <Image
                                          src={automation.image}
                                          alt={automation.title}
                                          fill
                                          className="object-contain"
                                          priority
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ),
                  )}
                </div>

                {/* Right Panel - Desktop Images */}
                <div ref={imageRef} className="hidden md:flex md:w-2/3 ">
                  <div className="sticky w-full top-24 h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                        <Image
                          src={instaImage1}
                          alt="Instagram Feature Image"
                          fill
                          className="object-contain "
                          priority
                        />
                      </div>
                      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                        <Image
                          src={instaImage}
                          alt="Instagram Feature Image"
                          fill
                          className="object-contain"
                          priority
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
