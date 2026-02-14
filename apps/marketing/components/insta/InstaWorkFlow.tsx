"use client";

import { motion } from "framer-motion";
import instadash from "public/assets/Feature/instadash.png";
import instatemp from "public/assets/Feature/instatemp.png";
import instalogin from "public/assets/Feature/lnstalogin.png";
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

  return (
    <section className=" mx-auto md:px-4 py-16 md:py-24 bg-transparent">
      <motion.div
        className="flex items-center justify-center text-blue-700 mb-4"
        variants={titleVariants}
        whileInView="visible"
        viewport={{ once: false }}
        initial="hidden"
      >
        <span className="text-sm font-medium uppercase tracking-widest border border-blue-800/30 rounded-full px-4 py-1">
          WORKING FLOW
        </span>
      </motion.div>
      <motion.div
        className="text-center mb-16"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
      >
        <motion.h2
          className="text-3xl font-bold mb-4 gradient-text-main"
          variants={titleVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          How CommentFlow Works
        </motion.h2>
        <motion.p
          className={`text-lg max-w-2xl mx-auto font-montserrat ${themeStyles.descriptionText}`}
          variants={textVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          Set up in minutes and start automating your Instagram comments
        </motion.p>
      </motion.div>

      <motion.div
        className={` w-full mx-auto ${themeStyles.containerBg} backdrop-blur-sm p-3 md:p-10 lg:p-20`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-50px" }}
      >
        {/* Step 1 */}
        <motion.div
          className="flex flex-col md:flex-row gap-8 items-center justify-between w-full mb-16 "
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          initial="hidden"
        >
          <div className="md:w-2/3">
            <motion.div
              className={`font-bold text-lg mb-2 ${themeStyles.stepText}`}
              variants={stepVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Step 1
            </motion.div>
            <motion.h3
              className={`text-2xl font-semibold mb-4 ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Connect Your Instagram Account
            </motion.h3>
            <motion.p
              className={`font-montserrat ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Securely connect your Instagram business account with our
              compliant API integration. We never store your password and use
              official Instagram APIs.
            </motion.p>
          </div>
          <motion.div
            className="md:w-1/3 aspect-square md:aspect-auto flex items-center justify-center"
            variants={cardVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            initial="hidden"
          >
            <motion.div
              className="text-center w-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              <motion.div
                className="flex-1 relative m-auto  h-[16rem] md:h-full w-full aspect-[4/5] rounded-lg overflow-hidden"
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <Image
                  src={instalogin}
                  alt="Instagram Login Interface"
                  fill
                  sizes="100%"
                  className="object-fill"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          className="flex flex-col md:flex-row-reverse gap-8 items-center justify-between w-full mb-16"
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          initial="hidden"
        >
          <div className="md:w-2/3">
            <motion.div
              className={`font-bold text-lg mb-2 ${themeStyles.stepText}`}
              variants={stepVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Step 2
            </motion.div>
            <motion.h3
              className={`text-2xl font-semibold mb-4 ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Set Up Response Rules
            </motion.h3>
            <motion.p
              className={`font-montserrat ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Create custom response templates based on keywords, question
              types, or sentiment. Our AI can help suggest responses or you can
              create your own.
            </motion.p>
          </div>
          <motion.div
            className="md:w-1/3 aspect-square md:aspect-auto flex items-center justify-center"
            variants={cardVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            initial="hidden"
          >
            <motion.div
              className="text-center w-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              <motion.div
                className="flex-1 relative m-auto   h-[16rem] md:h-full w-full aspect-[4/5] rounded-lg overflow-hidden"
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <Image
                  src={instatemp}
                  alt="Response Templates Interface"
                  fill
                  sizes="100%"
                  className="object-fill"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          className="flex flex-col md:flex-row gap-8 items-center justify-between w-full"
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          initial="hidden"
        >
          <div className="md:w-2/3">
            <motion.div
              className={`font-bold text-lg mb-2 ${themeStyles.stepText}`}
              variants={stepVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Step 3
            </motion.div>
            <motion.h3
              className={`text-2xl font-semibold mb-4 ${themeStyles.titleText}`}
              variants={titleVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Monitor & Improve
            </motion.h3>
            <motion.p
              className={`font-montserrat ${themeStyles.descriptionText}`}
              variants={textVariants}
              whileInView="visible"
              viewport={{ once: false }}
              initial="hidden"
            >
              Use our dashboard to monitor responses, analyze engagement
              metrics, and continuously improve your automated comment system.
            </motion.p>
          </div>
          <motion.div
            className="md:w-1/3 aspect-square md:aspect-auto flex items-center justify-center"
            variants={cardVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            initial="hidden"
          >
            <motion.div
              className="text-center w-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              <motion.div
                className="flex-1 relative m-auto w-full  h-[16rem] md:h-full aspect-[1/1] rounded-lg overflow-hidden"
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <Image
                  src={instadash}
                  alt="Analytics Dashboard"
                  fill
                  sizes="100%"
                  className="object-fill "
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default InstaHowItWorksSection;
