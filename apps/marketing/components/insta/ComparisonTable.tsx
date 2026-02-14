"use client";

import Image from "next/image";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import cup from "public/assets/img/pricecup.png";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { features } from "@rocketreplai/shared";

const Check = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 13l4 4L19 7"
    ></path>
  </svg>
);

const ComparisonTable: React.FC = () => {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-gray-50/50",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      titleText: isDark ? "text-white" : "text-n-7",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      tableHeaderBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/80",
      tableRowHover: isDark ? "hover:bg-[#1a1a1a]/50" : "hover:bg-gray-100/50",
      tableBorder: isDark ? "border-[#333]" : "border-gray-200",
      tableDivide: isDark ? "divide-[#333]" : "divide-gray-200",
      featureText: isDark ? "text-gray-300" : "text-n-7",
      disabledText: isDark ? "text-gray-500" : "text-n-5",
      comingSoonBg: isDark
        ? "bg-blue-900 text-blue-300"
        : "bg-blue-100 text-blue-900",
    };
  }, [currentTheme]);

  // EXACT same animation variants as FeatureSection component
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
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
      y: -4,
      scale: 1.01,
      backgroundColor:
        theme === "dark" ? "rgba(26, 26, 26, 0.6)" : "rgba(255, 255, 255, 0.6)",
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

  const rowVariants = {
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

  const renderFeatureValue = (
    value: string | boolean | React.ReactNode,
    tool: string,
  ) => {
    if (typeof value === "boolean") {
      return value ? (
        <motion.div
          variants={iconVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          <Check
            className={`h-5 w-5 mx-auto ${
              tool === "comment2DM"
                ? "text-[#00F0FF]"
                : tool === "autoDM"
                  ? "text-[#B026FF]"
                  : tool === "linkplease"
                    ? "text-[#FF2E9F]"
                    : tool === "rapiddm"
                      ? "text-[#00F0FF]"
                      : tool === "zorcha"
                        ? "text-[#B026FF]"
                        : "text-[#FF2E9F]"
            }`}
          />
        </motion.div>
      ) : (
        <motion.span
          className={themeStyles.disabledText}
          variants={textVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          —
        </motion.span>
      );
    }

    if (value === "Coming soon") {
      return (
        <motion.span
          className={`${themeStyles.comingSoonBg} px-2 py-1 rounded-md text-xs`}
          variants={textVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          {value}
        </motion.span>
      );
    }

    return (
      <motion.span
        className={themeStyles.featureText}
        variants={textVariants}
        whileInView="visible"
        viewport={{ once: false }}
        initial="hidden"
      >
        {value}
      </motion.span>
    );
  };

  return (
    <section className={`py-16 bg-transparent ${themeStyles.containerBg}`}>
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
      >
        {/* Header Section */}
        <motion.div
          className="text-center mb-12"
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
              COMPARISON TABLE
            </span>
          </motion.div>

          <motion.h1
            className={`text-3xl font-bold mb-4 gradient-text-main ${themeStyles.titleText}`}
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            The Best Indian Automation Tool
          </motion.h1>

          <motion.p
            className={`text-xl mb-6 font-montserrat ${themeStyles.descriptionText}`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Same features just for 299 INR, switch now
          </motion.p>

          <motion.div
            className="flex flex-col items-center justify-center space-y-4 mb-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
          >
            <motion.div
              className="flex items-center"
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center mr-3">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
              <span className={`text-lg font-medium ${themeStyles.titleText}`}>
                Cheap & Best
              </span>
            </motion.div>
            <motion.div
              className="flex items-center"
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center mr-3">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
              <span className={`text-lg font-medium ${themeStyles.titleText}`}>
                299INR ($3.3) Per month
              </span>
            </motion.div>
          </motion.div>

          <motion.button
            className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF]/90 hover:to-[#B026FF]/90 text-white font-semibold py-3 px-8 rounded-full text-lg transition-colors duration-300"
            variants={cardVariants}
            whileInView="visible"
            viewport={{ once: false }}
            onClick={() => {
              router.push("https://app.rocketreplai.com/signin");
            }}
            initial="hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Signup for free
          </motion.button>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          className={`overflow-x-auto ${themeStyles.tableHeaderBg} backdrop-blur-sm`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
        >
          <table className="w-full border-collapse">
            <thead>
              <motion.tr
                className={`border-b-2 ${themeStyles.tableBorder}`}
                variants={cardVariants}
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <th className="text-left py-4 px-6 font-semibold">
                  <motion.span
                    className={themeStyles.titleText}
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    Features
                  </motion.span>
                </th>
                <th className="relative text-center py-4 px-6 font-semibold text-[#00F0FF] bg-gradient-to-r from-[#0ce05d]/80 to-[#054e29]">
                  <motion.span
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    RocketReplai
                  </motion.span>
                  <motion.div
                    variants={iconVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Image
                      src={cup}
                      alt="pricing cup"
                      width={120}
                      height={120}
                      className="absolute -right-10 top-5 rotate-6 rounded-full"
                    />
                  </motion.div>
                </th>
                <th className="text-center py-4 px-6 font-semibold text-[#B026FF]">
                  <motion.span
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    AutoDM
                  </motion.span>
                </th>
                <th className="text-center py-4 px-6 font-semibold text-[#FF2E9F]">
                  <motion.span
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    Linkplease
                  </motion.span>
                </th>
                <th className="text-center py-4 px-6 font-semibold text-[#00F0FF]">
                  <motion.span
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    Rapiddm
                  </motion.span>
                </th>
                <th className="text-center py-4 px-6 font-semibold text-[#B026FF]">
                  <motion.span
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    Zorcha
                  </motion.span>
                </th>
                <th className="text-center py-4 px-6 font-semibold text-[#FF2E9F]">
                  <motion.span
                    variants={titleVariants}
                    whileInView="visible"
                    viewport={{ once: false }}
                    initial="hidden"
                  >
                    InstantDM
                  </motion.span>
                </th>
              </motion.tr>
            </thead>
            <tbody className={`divide-y ${themeStyles.tableDivide}`}>
              {features.map((feature, index) => (
                <motion.tr
                  key={index}
                  className={themeStyles.tableRowHover}
                  variants={rowVariants}
                  whileInView="visible"
                  viewport={{ once: false, margin: "-20px" }}
                  initial="hidden"
                  whileHover="hover"
                  transition={{ delay: index * 0.1 }}
                >
                  <td className="py-4 px-6 font-medium font-montserrat">
                    <motion.span
                      className={themeStyles.featureText}
                      variants={textVariants}
                      whileInView="visible"
                      viewport={{ once: false }}
                      initial="hidden"
                    >
                      {feature.name}
                    </motion.span>
                  </td>
                  <td className="py-4 px-6 text-center bg-gradient-to-r from-[#0ce05d]/80 to-[#054e29] font-montserrat">
                    {renderFeatureValue(feature.comment2DM, "comment2DM")}
                  </td>
                  <td className="py-4 px-6 text-center font-montserrat">
                    {renderFeatureValue(feature.autoDM, "autoDM")}
                  </td>
                  <td className="py-4 px-6 text-center font-montserrat">
                    {renderFeatureValue(feature.linkplease, "linkplease")}
                  </td>
                  <td className="py-4 px-6 text-center font-montserrat">
                    {renderFeatureValue(feature.rapiddm, "rapiddm")}
                  </td>
                  <td className="py-4 px-6 text-center font-montserrat">
                    {renderFeatureValue(feature.zorcha, "zorcha")}
                  </td>
                  <td className="py-4 px-6 text-center font-montserrat">
                    {renderFeatureValue(feature.instantDM, "instantDM")}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ComparisonTable;
