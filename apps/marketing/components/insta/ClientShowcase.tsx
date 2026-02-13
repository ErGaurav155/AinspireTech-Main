"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Users,
  Building2,
  Tag,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "next-themes";

export function ClientShowcase() {
  const [activeTab, setActiveTab] = useState("creators");
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      tabBg: isDark ? "bg-[#1a1a1a]" : "bg-white/80",
      tabBorder: isDark ? "border-gray-800" : "border-gray-300",
      tabText: isDark
        ? "text-gray-300 hover:text-white"
        : "text-n-5 hover:text-gray-900",
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/40",
      cardBg: isDark ? "bg-[#1a1a1a]" : "bg-white/90",
      cardBorder: isDark ? "border-gray-800" : "border-gray-200",
      cardHoverBorder: isDark ? "border-[#00F0FF]/50" : "border-[#00F0FF]/70",
      statsBg: isDark
        ? "bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] border-[#00F0FF]/30"
        : "bg-gradient-to-r from-white/50 to-white/60 border-[#00F0FF]/50",
      statsText: isDark ? "text-gray-300" : "text-n-6",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      cardHoverEffect: isDark
        ? "borderColor: 'rgba(37, 139, 148, 0.4)', boxShadow: '0 20px 40px -10px rgba(37, 139, 148, 0.2)'"
        : "borderColor: 'rgba(37, 139, 148, 0.2)', boxShadow: '0 20px 40px -10px rgba(37, 139, 148, 0.1)'",
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

  const itemVariants = {
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

  const creators = [
    "@madeline_devaux",
    "@snipestwins",
    "@im_lola__",
    "@getschooledinfashion",
    "@beautyxdanaplum",
    "@mytexashouse",
    "@rachaelsgoodeats",
    "@the_pastaqueen",
    "@linenoaksinteriors",
    "@eatingbirdfood",
    "@sammymontgoms",
    "@msgoldgirl",
    "@maciejade",
    "@the_broadmoor_house",
    "@justglow011",
    "@danielle.donohue",
    "@interiordesignerella",
    "@nicoles_outfit_inspirations",
    "@palmettoporchathome",
    "@everyday.holly",
    "@laurajaneillustrations",
    "@yvetteg23",
  ];

  const brands = [
    "@nbcselect",
    "@homebeautiful",
    "@elleaus",
    "@enews",
    "@kinedu",
    "@shop.ltk",
    "@fandango",
    "@dillards",
    "@recetasnestlecl",
    "@dkbooksus",
    "@patpat_clothing",
    "@solidstarts",
    "@randomhouse",
    "@bondisands",
    "@bhgaus",
  ];

  const niches = [
    { name: "Mavely Creators", count: "2.5K+" },
    { name: "Fashion Creators", count: "1.8K+" },
    { name: "Amazon Creators", count: "3.2K+" },
    { name: "LTK Creators", count: "2.1K+" },
    { name: "Food Creators", count: "1.5K+" },
    { name: "Beauty Creators", count: "2.3K+" },
    { name: "Travel Creators", count: "1.2K+" },
    { name: "DIY Home Creators", count: "1.7K+" },
    { name: "Designers", count: "900+" },
    { name: "Musicians", count: "600+" },
    { name: "Podcasters", count: "500+" },
    { name: "Photography", count: "1.1K+" },
    { name: "Health & Fitness Creators", count: "2.0K+" },
    { name: "Realtors", count: "800+" },
    { name: "Education Creators", count: "700+" },
    { name: "Non-Profit Organisations", count: "400+" },
  ];

  const pattern = [2, 3, 4, 5, 4, 3, 2];

  // Function to create rows with pattern
  const createRows = (items: any[]) => {
    const rows = [];
    let currentIndex = 0;
    let patternIndex = 0;

    while (currentIndex < items.length) {
      const columnCount = pattern[patternIndex % pattern.length];
      const rowItems = items.slice(currentIndex, currentIndex + columnCount);

      rows.push({
        columnCount,
        items: rowItems,
      });

      currentIndex += columnCount;
      patternIndex++;
    }

    return rows;
  };

  // For mobile/tablet, show only half the items
  const getDisplayItems = (items: any[]) => {
    if (typeof window === "undefined") return items;

    // Show all items on large screens, half on smaller screens
    if (window.innerWidth >= 768) {
      return items;
    }
    return items.slice(0, Math.ceil(items.length / 2));
  };

  const displayCreators = getDisplayItems(creators);
  const displayBrands = getDisplayItems(brands);
  const displayNiches = getDisplayItems(niches);

  const creatorRows = createRows(displayCreators);
  const brandRows = createRows(displayBrands);
  const nicheRows = createRows(displayNiches);

  return (
    <motion.section
      className="w-full py-20 bg-transparent text-foreground"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-100px" }}
    >
      <div className=" mx-auto md:px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-100px" }}
        >
          <motion.div
            className="inline-flex items-center text-blue-700 border border-blue-700/30 rounded-full px-4 py-1 mb-4"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <span className="text-sm font-medium uppercase tracking-widest">
              OUR COMMUNITY
            </span>
          </motion.div>

          <motion.h2
            className="text-3xl font-bold mb-6 gradient-text-main"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Who is Using{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
              RocketReplai
            </span>
            ?
          </motion.h2>

          <motion.p
            className={`text-xl max-w-3xl mx-auto font-montserrat ${themeStyles.descriptionText}`}
            variants={textVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            Join thousands of creators, brands, and businesses that trust
            RocketReplai to automate their engagement and grow their audience.
          </motion.p>

          {/* Divider */}
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full mx-auto mt-8"
            variants={iconVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          />
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="flex justify-center mb-5 md:mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
        >
          <div
            className={`${themeStyles.tabBg} border ${themeStyles.tabBorder} rounded-full p-1 flex backdrop-blur-sm`}
          >
            {[
              {
                id: "creators",
                label: "Creators",
                icon: <Users className="h-3 w-3 md:h-5 md:w-5" />,
              },
              {
                id: "brands",
                label: "Brands",
                icon: <Building2 className="h-3 w-3 md:h-5 md:w-5" />,
              },
              {
                id: "niches",
                label: "Niches",
                icon: <Tag className="h-3 w-3 md:h-5 md:w-5" />,
              },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-2 py-1 md:px-6 md:py-3 rounded-full transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white"
                    : `${themeStyles.tabText}`
                }`}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.icon}
                <span className="ml-1 md:ml-2 text-sm md:text-base font-medium">
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className={`max-w-6xl mx-auto ${themeStyles.containerBg} backdrop-blur-sm p-3`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
        >
          {/* Creators Tab */}
          {activeTab === "creators" && (
            <motion.div
              className="space-y-2 md:space-y-4 w-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              {creatorRows.map((row, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  className={`flex flex-wrap items-center justify-center gap-2 md:gap-4 w-full`}
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, margin: "-50px" }}
                >
                  {row.items.map((creator: string, index: number) => (
                    <motion.div
                      key={index}
                      className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-3xl p-2 hover:${themeStyles.cardHoverBorder} transition-all duration-300 group flex items-center justify-center flex-shrink-0 backdrop-blur-sm`}
                      variants={cardVariants}
                      whileHover="hover"
                      whileInView="visible"
                      viewport={{ once: false, margin: "-50px" }}
                      initial="hidden"
                    >
                      <div className="flex items-center justify-center">
                        <motion.div
                          className="w-5 h-5 md:w-10 md:h-10 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full flex items-center justify-center p-2 mr-3"
                          variants={iconVariants}
                          whileInView="visible"
                          viewport={{ once: false }}
                          initial="hidden"
                        >
                          <Instagram className="h-5 w-5 text-white" />
                        </motion.div>
                        <span className="text-xs md:text-base font-thin md:font-medium group-hover:text-[#00F0FF] transition-colors font-montserrat">
                          {creator}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Brands Tab */}
          {activeTab === "brands" && (
            <motion.div
              className="space-y-2 md:space-y-4 w-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              {brandRows.map((row, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  className={`flex flex-wrap items-center justify-center gap-2 md:gap-4 w-full`}
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, margin: "-50px" }}
                >
                  {row.items.map((brand: string, index: number) => (
                    <motion.div
                      key={index}
                      className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-3xl overflow-hidden p-2 hover:${themeStyles.cardHoverBorder} transition-all duration-300 group flex items-center justify-center flex-shrink-0 backdrop-blur-sm`}
                      variants={cardVariants}
                      whileHover="hover"
                      whileInView="visible"
                      viewport={{ once: false, margin: "-50px" }}
                      initial="hidden"
                    >
                      <div className="flex items-center justify-center">
                        <motion.div
                          className="w-5 h-5 md:w-10 md:h-10 bg-gradient-to-r from-[#FF2E9F] to-[#B026FF] rounded-full flex items-center justify-center p-2 mr-3"
                          variants={iconVariants}
                          whileInView="visible"
                          viewport={{ once: false }}
                          initial="hidden"
                        >
                          <Building2 className="h-5 w-5 text-white" />
                        </motion.div>
                        <span className="text-xs md:text-base font-thin md:font-medium font-montserrat group-hover:text-[#FF2E9F] transition-colors">
                          {brand}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Niches Tab */}
          {activeTab === "niches" && (
            <motion.div
              className="space-y-2 md:space-y-4 w-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
            >
              {nicheRows.map((row, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  className={`flex flex-wrap items-center justify-center gap-2 md:gap-4 w-full`}
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, margin: "-50px" }}
                >
                  {row.items.map(
                    (niche: { name: string; count: string }, index: number) => (
                      <motion.div
                        key={index}
                        className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-3xl p-2 md:p-4 hover:${themeStyles.cardHoverBorder} transition-all duration-300 group flex items-center justify-between flex-shrink-0 min-w-[200px] backdrop-blur-sm`}
                        variants={cardVariants}
                        whileHover="hover"
                        whileInView="visible"
                        viewport={{ once: false, margin: "-50px" }}
                        initial="hidden"
                      >
                        <div className="flex items-center justify-center w-full">
                          <motion.div
                            variants={iconVariants}
                            whileInView="visible"
                            viewport={{ once: false }}
                            initial="hidden"
                          >
                            <CheckCircle className="h-5 w-5 text-[#00F0FF] mr-3" />
                          </motion.div>
                          <span className="text-xs md:text-base font-thin md:font-medium font-montserrat group-hover:text-[#00F0FF] transition-colors">
                            {niche.name}
                          </span>
                        </div>
                        <span className="hidden sm:flex text-xs bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-transparent bg-clip-text font-bold">
                          {niche.count}
                        </span>
                      </motion.div>
                    ),
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className={`mt-16 ${themeStyles.statsBg} rounded-2xl p-3 md:p-6 max-w-4xl mx-auto backdrop-blur-sm`}
          variants={cardVariants}
          whileHover="hover"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          initial="hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
            {[
              {
                number: "50K+",
                label: "Active Users",
                gradient: "from-[#00F0FF] to-[#B026FF]",
              },
              {
                number: "2M+",
                label: "DMs Sent Daily",
                gradient: "from-[#FF2E9F] to-[#B026FF]",
              },
              {
                number: "95%",
                label: "Satisfaction Rate",
                gradient: "from-[#00F0FF] to-[#FF2E9F]",
              },
              {
                number: "24/7",
                label: "Support",
                gradient: "from-[#B026FF] to-[#FF2E9F]",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileInView="visible"
                viewport={{ once: false }}
                initial="hidden"
              >
                <div
                  className={`text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${stat.gradient}`}
                >
                  {stat.number}
                </div>
                <div className={`mt-2 ${themeStyles.statsText}`}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
