"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Zap,
  Crown,
  Sparkles,
  ArrowRight,
  Search,
  Filter,
  Trophy,
  Award,
  Check,
  X,
  Clock,
  MessageCircle,
  Globe,
  BarChart3,
  Bot,
  Users,
  Workflow,
  Target,
  Mail,
  Shield,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

const comparisonData = [
  {
    name: "AinSpireTech",
    bestFor: "Best for No-Code AI Chatbots Trained on Your Content",
    pricing: "Starts at $29/month",
    rating: 5,
    category: "ai",
    highlight: true,
    featured: true,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: true,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: true,
    userData: true,
    personalizedLearning: true,
    interactiveQuizzes: true,
  },
  {
    name: "ProProfs Chat",
    bestFor: "24/7 Delightful Customer Support with AI Chatbots",
    pricing: " starts at $19.99/ope/month",
    rating: 4.5,
    category: "support",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: false,
    analytics: true,
    workflows: false,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: false,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "HubSpot",
    bestFor: "Growing Sales and Engaging Customers with Live Chat",
    pricing: "Starts at $800/month",
    rating: 4.5,
    category: "sales",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: true,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: true,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Kommunicate",
    bestFor: "Omnichannel Integrations",
    pricing: "Starts at $83.33/month",
    rating: 4.6,
    category: "omnichannel",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: false,
    leadQualification: false,
    emailNotifications: true,
    prioritySupport: false,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Tidio",
    bestFor: "Live Chat With Ticketing Functionality",
    pricing: "Starts at $29/month",
    rating: 4.7,
    category: "support",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: false,
    analytics: true,
    workflows: false,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: false,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Intercom",
    bestFor: "All-in-One Conversational Support Platform",
    pricing: "Starts at $39/month",
    rating: 4.5,
    category: "support",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: true,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: true,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Freshchat",
    bestFor: "Personalized Messaging With AI Support",
    pricing: "Starts at $17.87/month",
    rating: 4.4,
    category: "ai",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: false,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: false,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Chatfuel",
    bestFor: "Social Media Support on Facebook & Instagram",
    pricing: "Starts at $10.13/month",
    rating: 4.5,
    category: "social",
    highlight: false,
    availability: false,
    liveChat: true,
    multiLanguage: false,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: false,
    analytics: true,
    workflows: false,
    leadQualification: false,
    emailNotifications: true,
    prioritySupport: false,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Botsify",
    bestFor: "Multilingual Support for Educational Use Cases",
    pricing: "Starts at $49/month",
    rating: 4.3,
    category: "education",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: false,
    analytics: false,
    workflows: false,
    leadQualification: false,
    emailNotifications: true,
    prioritySupport: false,
    userData: true,
    personalizedLearning: true,
    interactiveQuizzes: true,
  },
  {
    name: "Zendesk",
    bestFor: "AI Chatbot for Streamlining Customer Support",
    pricing: "Starts at $55/user/month",
    rating: 4.3,
    category: "support",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: true,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: true,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
  {
    name: "Ada",
    bestFor: "Multilingual Support and Round-the-Clock Automation",
    pricing: "Custom pricing",
    rating: 4.6,
    category: "ai",
    highlight: false,
    availability: true,
    liveChat: true,
    multiLanguage: true,
    dashboard: true,
    automatedResponses: true,
    crmIntegration: true,
    analytics: true,
    workflows: true,
    leadQualification: true,
    emailNotifications: true,
    prioritySupport: true,
    userData: true,
    personalizedLearning: false,
    interactiveQuizzes: false,
  },
];

const features = [
  {
    key: "availability",
    label: "24/7 Availability",
    icon: Clock,
    description: "Round-the-clock customer support",
  },
  {
    key: "liveChat",
    label: "Live Chat Interface",
    icon: MessageCircle,
    description: "Real-time chat capabilities",
  },
  {
    key: "multiLanguage",
    label: "Multi-language Support",
    icon: Globe,
    description: "Multiple language support",
  },
  {
    key: "dashboard",
    label: "Dashboard Availability",
    icon: BarChart3,
    description: "Analytics dashboard",
  },
  {
    key: "automatedResponses",
    label: "Automated Responses",
    icon: Bot,
    description: "AI-powered auto responses",
  },
  {
    key: "crmIntegration",
    label: "CRM Integration",
    icon: Users,
    description: "CRM system integration",
  },
  {
    key: "analytics",
    label: "Advanced Analytics",
    icon: BarChart3,
    description: "Detailed analytics reporting",
  },
  {
    key: "workflows",
    label: "Custom Workflows",
    icon: Workflow,
    description: "Customizable workflow automation",
  },
  {
    key: "leadQualification",
    label: "Lead Qualification",
    icon: Target,
    description: "Automated lead scoring",
  },
  {
    key: "emailNotifications",
    label: "Email Notifications",
    icon: Mail,
    description: "Email alert system",
  },
  {
    key: "prioritySupport",
    label: "Priority Support",
    icon: Shield,
    description: "Premium support tier",
  },
  {
    key: "userData",
    label: "User Data Collection",
    icon: Users,
    description: "User data gathering",
  },
  {
    key: "personalizedLearning",
    label: "Personalized Learning",
    icon: BookOpen,
    description: "Adaptive learning paths",
  },
  {
    key: "interactiveQuizzes",
    label: "Interactive Quizzes",
    icon: HelpCircle,
    description: "Interactive assessment tools",
  },
];

const FeatureComparisonTable = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [expandedFeatures, setExpandedFeatures] = useState(false);
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      containerBg: isDark ? "bg-gray-900/30" : "bg-gray-100/50",
      containerBorder: isDark ? "border-gray-800" : "border-gray-300",
      tableHeaderBg: isDark ? "bg-gray-800/50" : "bg-gray-200/50",
      tableBorder: isDark ? "border-gray-800" : "border-gray-300",
      tableRowHover: isDark ? "hover:bg-gray-800/30" : "hover:bg-gray-100/50",
      badgeBg: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      featureCardBg: isDark
        ? "bg-gradient-to-r from-[#00F0FF]/10 to-[#00F0FF]/5"
        : "bg-gradient-to-r from-[#00F0FF]/20 to-[#00F0FF]/10",
      featureCardBorder: isDark ? "border-[#00F0FF]/20" : "border-[#00F0FF]/30",
    };
  }, [currentTheme]);

  const filteredData = comparisonData
    .filter(
      (item) =>
        (selectedCategory === "all" || item.category === selectedCategory) &&
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.bestFor.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price") {
        const getPrice = (pricing: string) => {
          const match = pricing.match(/\$?(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : Infinity;
        };
        return getPrice(a.pricing) - getPrice(b.pricing);
      }
      return 0;
    });

  const visibleFeatures = expandedFeatures ? features : features.slice(0, 6);

  const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "text-yellow-400 fill-current"
              : theme === "dark"
                ? "text-gray-600"
                : "text-gray-400"
          }`}
        />
      ))}
      <span
        className={`text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-600"
        } ml-1`}
      >
        {rating}
      </span>
    </div>
  );

  const PricingBadge = ({
    pricing,
    highlight,
  }: {
    pricing: string;
    highlight?: boolean;
  }) => {
    const isFree = pricing.toLowerCase().includes("free");
    const isCustom = pricing.toLowerCase().includes("custom");

    return (
      <motion.span
        whileHover={{ scale: highlight ? 1.05 : 1 }}
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          highlight
            ? "bg-gradient-to-r from-[#0ce05d] to-[#054e29] text-white shadow-lg"
            : isFree
              ? "bg-green-500/20 text-green-400"
              : isCustom
                ? "bg-purple-500/20 text-purple-400"
                : "bg-blue-500/20 text-blue-400"
        }`}
      >
        {highlight && <Trophy className="h-3 w-3 mr-1" />}
        {isFree && <Zap className="h-3 w-3 mr-1" />}
        {pricing}
      </motion.span>
    );
  };

  const titleVariants = {
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

  return (
    <section
      className={`w-full py-20 bg-transparent ${themeStyles.textPrimary} relative overflow-hidden`}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-[#00F0FF]/10 to-[#B026FF]/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-[#0ce05d]/10 to-[#054e29]/10 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto sm:px-3 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            className="flex items-center justify-center text-blue-700 mb-4"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <span
              className={`text-sm font-medium uppercase tracking-widest border ${themeStyles.badgeBg} rounded-full px-4 py-1`}
            >
              Feature Comparison
            </span>
          </motion.div>
          <h2
            className={`text-3xl font-bold mb-4 gradient-text-main text-center ${themeStyles.textPrimary}`}
          >
            Compare AI Chatbot Features
          </h2>
          <p
            className={`text-xl ${themeStyles.textSecondary} max-w-3xl mx-auto leading-relaxed font-montserrat`}
          >
            Detailed feature comparison of top AI chatbot platforms to help you
            choose the perfect solution
          </p>
        </motion.div>

        {/* Featured Banner - AinSpireTech */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-[#0ce05d]/20 to-[#054e29]/20 backdrop-blur-sm border-2 border-[#0ce05d]/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Crown className="h-8 w-8 text-yellow-400" />
                </motion.div>
                <div>
                  <h3
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    AinSpireTech
                  </h3>
                  <p className={`${themeStyles.textSecondary} font-montserrat`}>
                    The only platform with all 14 essential features
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between w-full space-x-2 md:space-x-4">
                <div className="text-right flex flex-col md:flex-row items-center justify-center gap-0 md:gap-2">
                  <div className="text-xl md:text-2xl font-bold text-[#0ce05d]">
                    14/14
                  </div>
                  <div className={`${themeStyles.textSecondary} text-sm`}>
                    Features Available
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    router.push("https://app.ainspiretech.com/signin")
                  }
                  className="bg-gradient-to-r from-[#0ce05d] to-[#054e29] text-white font-semibold px-6 py-3 rounded-lg"
                >
                  Try Free
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpandedFeatures(!expandedFeatures)}
            className={`flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#B026FF]/20 to-[#FF2E9F]/20 backdrop-blur-sm border border-[#B026FF]/30 rounded-full ${themeStyles.textSecondary} hover:${themeStyles.textPrimary} transition-colors`}
          >
            <span>
              {expandedFeatures ? "Show Less Features" : "Show All Features"}
            </span>
            <motion.div
              animate={{ rotate: expandedFeatures ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={`${themeStyles.containerBg} backdrop-blur-sm border ${themeStyles.containerBorder} rounded-2xl overflow-hidden shadow-xl font-montserrat`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg}`}
                >
                  <th
                    className={`text-left py-6 px-6 font-semibold ${themeStyles.textSecondary} min-w-[200px]`}
                  >
                    Software & Pricing
                  </th>
                  {visibleFeatures.map((feature) => (
                    <th
                      key={feature.key}
                      className={`text-center py-6 px-4 font-semibold ${themeStyles.textSecondary} min-w-[120px]`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <feature.icon className="h-5 w-5 text-[#00F0FF]" />
                        <span className="text-xs">{feature.label}</span>
                      </div>
                    </th>
                  ))}
                  <th
                    className={`text-left py-6 px-6 font-semibold ${themeStyles.textSecondary} min-w-[120px]`}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${themeStyles.tableBorder}`}>
                <AnimatePresence>
                  {filteredData.map((item, index) => (
                    <motion.tr
                      key={item.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className={`group transition-all duration-300 ${
                        item.highlight
                          ? "bg-gradient-to-r from-[#0ce05d]/10 to-[#054e29]/10 hover:from-[#0ce05d]/20 hover:to-[#054e29]/20"
                          : themeStyles.tableRowHover
                      }`}
                    >
                      {/* Software & Pricing Column */}
                      <td className="py-6 px-6">
                        <div className="flex items-center space-x-3 mb-3">
                          {item.highlight && (
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Crown className="h-5 w-5 text-yellow-400" />
                            </motion.div>
                          )}
                          <span
                            className={`font-semibold ${
                              item.highlight
                                ? "text-transparent bg-clip-text bg-gradient-to-r from-[#0ce05d] to-[#054e29] text-lg"
                                : themeStyles.textPrimary
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.highlight && (
                            <span className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium text-nowrap">
                              #1 Rated
                            </span>
                          )}
                        </div>
                        <PricingBadge
                          pricing={item.pricing}
                          highlight={item.highlight}
                        />
                        <div className="mt-2">
                          <RatingStars rating={item.rating} />
                        </div>
                      </td>

                      {/* Feature Columns */}
                      {visibleFeatures.map((feature) => (
                        <td key={feature.key} className="py-6 px-4 text-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="flex justify-center"
                          >
                            {item[feature.key as keyof typeof item] ? (
                              <div className="flex flex-col items-center space-y-1">
                                <div className="bg-gradient-to-r from-[#0ce05d]/20 to-[#054e29]/20 p-2 rounded-full">
                                  <Check className="h-5 w-5 text-[#0ce05d]" />
                                </div>
                                <span
                                  className={`text-xs ${themeStyles.textMuted}`}
                                >
                                  Available
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center space-y-1">
                                <div
                                  className={`${
                                    theme === "dark"
                                      ? "bg-gray-800/50"
                                      : "bg-gray-200/50"
                                  } p-2 rounded-full`}
                                >
                                  <X
                                    className={`h-5 w-5 ${
                                      theme === "dark"
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                    }`}
                                  />
                                </div>
                                <span
                                  className={`text-xs ${
                                    theme === "dark"
                                      ? "text-gray-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  Not Available
                                </span>
                              </div>
                            )}
                          </motion.div>
                        </td>
                      ))}

                      {/* Action Column */}
                      <td className="py-6 px-6">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            item.highlight
                              ? router.push("/web/pricing")
                              : setExpandedFeatures(!expandedFeatures)
                          }
                          className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                            item.highlight
                              ? "bg-gradient-to-r from-[#0ce05d] to-[#054e29] text-white shadow-lg"
                              : "bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-black"
                          } hover:shadow-xl`}
                        >
                          {item.highlight
                            ? "Get Started"
                            : expandedFeatures
                              ? "Learn Less"
                              : "Learn More"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredData.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Filter
                className={`h-12 w-12 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-400"
                } mx-auto mb-4`}
              />
              <p className={`${themeStyles.textMuted} text-lg`}>
                No solutions found matching your criteria
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Feature Summary */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 font-montserrat"
        >
          <h3
            className={`text-2xl font-bold ${themeStyles.textPrimary} mb-6 text-center`}
          >
            Feature Availability Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {features.map((feature, index) => {
              const availableCount = comparisonData.filter(
                (item) => item[feature.key as keyof typeof item],
              ).length;
              const percentage = Math.round(
                (availableCount / comparisonData.length) * 100,
              );

              return (
                <motion.div
                  key={feature.key}
                  whileHover={{ scale: 1.05 }}
                  className={`${themeStyles.featureCardBg} backdrop-blur-sm border ${themeStyles.featureCardBorder} rounded-xl p-6 text-center`}
                >
                  <feature.icon className="h-6 w-6 text-[#00F0FF] mx-auto mb-2" />
                  <div
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {percentage}%
                  </div>
                  <div className={`text-xs ${themeStyles.textMuted}`}>
                    {feature.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureComparisonTable;
