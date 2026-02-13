"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Instagram, Network } from "lucide-react";
import { instagramFeatures, webChatFeatures } from "@rocketreplai/shared";

function StickyFeaturesSection() {
  const [activeTab, setActiveTab] = useState<"webchat" | "instagram">(
    "webchat",
  );
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      tabBorder: isDark ? "border-gray-800" : "border-gray-300",
      featureText: isDark ? "text-white" : "text-n-5",
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
      borderColor: "rgba(37, 139, 148, 0.4)",
      boxShadow: "0 20px 40px -10px rgba(37, 139, 148, 0.2)",
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

  const features =
    activeTab === "webchat" ? webChatFeatures : instagramFeatures;

  return (
    <motion.div
      id="features"
      className="relative z-50 py-12 lg:py-24  p-5"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-100px" }}
    >
      {/* Sticky Header */}
      <motion.div
        className="text-center mb-2"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
      >
        <motion.div
          className={`inline-flex items-center text-blue-600 border border-blue-400/50} rounded-full px-4 py-1 mb-4`}
          variants={titleVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          <span className="text-sm font-medium"> WHY WE</span>
        </motion.div>

        <motion.h2
          className="text-3xl font-bold mb-4 gradient-text-main"
          variants={titleVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          Why Choose RocketReplai{" "}
        </motion.h2>
        <motion.p
          className={`text-lg ${themeStyles.featureText} max-w-2xl mx-auto font-montserrat `}
          variants={textVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          Set up in minutes and start automating your Instagram comments/Web
          Customer Support
        </motion.p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="flex justify-center pt-12 pb-8 sticky top-8 md:top-12 w-full"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-50px" }}
      >
        <div
          className={`${themeStyles.tabBorder} backdrop-blur-lg rounded-full p-1 border border-gray-500/80`}
        >
          <div className="flex md:space-x-1">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className={` flex items-center justify-center gap-2 px-3 md:px-6 py-1 md:py-3 rounded-full text-sm font-semibold transition-all duration-300 text-nowrap ${
                activeTab === "webchat"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                  : "text-n-4 hover:text-white hover:bg-gray-700/50"
              }`}
              onClick={() => setActiveTab("webchat")}
            >
              <Network className="h-5 w-5" /> Web
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className={`flex items-center justify-center gap-2 px-3 py-1 md:px-6 md:py-3 rounded-full font-semibold transition-all duration-300 text-nowrap text-sm ${
                activeTab === "instagram"
                  ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                  : "text-n-4 hover:text-white hover:bg-gray-700/50"
              }`}
              onClick={() => setActiveTab("instagram")}
            >
              <Instagram className="h-5 w-5" /> Insta
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Features Cards - New Layout with Image and Text Side by Side */}
      <motion.div
        className="pt-12"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-50px" }}
      >
        <div className="flex flex-col gap-12 ">
          {features.map((feature, index) => (
            <motion.div
              id={`sticky-card-${index + 1}`}
              key={feature.id}
              className=" sticky-card w-full mx-auto max-w-6xl sticky top-32 md:top-44 backdrop-blur-2xl bg-gradient-to-t from-[#FF2E9F]/20 to-[#FF2E9F]/5 border-[#FF2E9F]/20 hover:border-[#FF2E9F]/40 rounded-2xl"
              variants={cardVariants}
              whileHover="hover"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              initial="hidden"
            >
              <div
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-4 md:gap-8 items-center justify-between bg-[#0a0a0a]/60 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden p-3 md:p-8 hover:border-[#258b94]/40 transition-colors duration-300`}
              >
                {/* Text Content */}
                <div className="md:w-1/2">
                  <motion.div
                    className="flex items-center gap-3 mb-4"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: false, margin: "-50px" }}
                  >
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-xl flex items-center justify-center"
                      variants={iconVariants}
                      whileInView="visible"
                      viewport={{ once: false }}
                      initial="hidden"
                    >
                      <span className="text-white text-lg">✨</span>
                    </motion.div>
                    <motion.h3
                      className=" md:text-2xl font-bold text-white"
                      variants={titleVariants}
                      whileInView="visible"
                      viewport={{ once: false }}
                      initial="hidden"
                    >
                      {feature.name}
                    </motion.h3>
                  </motion.div>

                  <motion.p
                    className="text-sm md:text-base text-gray-300 mb-2 md:mb-6 font-montserrat leading-relaxed"
                    variants={textVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    {feature.description}
                  </motion.p>

                  <motion.div
                    className="flex flex-wrap gap-1 md:gap-2 mb-1 md:mb-4"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: false, margin: "-50px" }}
                  >
                    {feature.tools.map((tool: string, i: number) => (
                      <motion.span
                        key={i}
                        className="px-2 md:px-3 py-1 bg-[#1a1a1a] border border-gray-700 rounded-full text-sm text-gray-300"
                        variants={iconVariants}
                        whileInView="visible"
                        viewport={{ once: false }}
                        initial="hidden"
                      >
                        {tool}
                      </motion.span>
                    ))}
                  </motion.div>

                  <motion.div
                    variants={textVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    <span className="text-[#00F0FF] font-semibold">
                      {feature.role}
                    </span>
                  </motion.div>
                </div>

                {/* Image/Visual Content */}
                <motion.div
                  className="md:w-1/2 flex justify-center"
                  variants={cardVariants}
                  whileHover="hover"
                  whileInView="visible"
                  viewport={{ once: false, margin: "-50px" }}
                  initial="hidden"
                >
                  <div className="relative w-full max-w-md aspect-video  rounded-xl overflow-hidden flex items-center justify-center">
                    {/* Placeholder for feature image - you can replace this with actual images */}
                    <div className="text-center p-8">
                      <Image
                        src={feature.link}
                        alt={feature.role}
                        fill
                        className="object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CSS for sticky effect */}
      <style jsx>{`
        #sticky-card-1 {
          --index: 1;
        }
        #sticky-card-2 {
          --index: 2;
        }
        #sticky-card-3 {
          --index: 3;
        }
        #sticky-card-4 {
          --index: 4;
        }

        .sticky-card {
          padding-top: calc(var(--index) * 2.5rem);
          top: calc(var(--index) * 4rem);
        }
      `}</style>
    </motion.div>
  );
}

export default StickyFeaturesSection;
