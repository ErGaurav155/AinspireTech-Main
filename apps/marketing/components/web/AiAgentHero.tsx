"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

import {
  CheckCircle,
  FileText,
  Globe,
  Clock,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Calendar,
  Search,
  CreditCard,
  Zap,
  Rocket,
  Shield,
  Users,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Custom hook for typing animation
const useTypewriter = (text: string, speed: number = 30) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed]);

  const reset = () => {
    setDisplayText("");
    setCurrentIndex(0);
    setIsComplete(false);
  };

  return { displayText, isComplete, reset };
};

// TypingAnimation Component
const TypingAnimation = ({
  text,
  speed = 30,
  className = "text-xs",
}: {
  text: string;
  speed?: number;
  className?: string;
}) => {
  const { displayText, isComplete } = useTypewriter(text, speed);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

// First AI Response Component - Financial Analysis
const FinancialAnalysisResponse = ({
  onComplete,
}: {
  onComplete: () => void;
}) => {
  const [showUserMessage, setShowUserMessage] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [showOutlook, setShowOutlook] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowUserMessage(true), 1000);
    const timer2 = setTimeout(() => setShowResponse(true), 2000);
    const timer3 = setTimeout(() => setShowFile(true), 3500);
    const timer4 = setTimeout(() => setShowSummary(true), 4500);
    const timer5 = setTimeout(() => setShowMetrics(true), 5500);
    const timer6 = setTimeout(() => setShowInsight(true), 6000);
    const timer7 = setTimeout(() => setShowOutlook(true), 7500);
    const timer8 = setTimeout(() => onComplete(), 9000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
      clearTimeout(timer7);
      clearTimeout(timer8);
    };
  }, [onComplete]);

  return (
    <div className="space-y-2">
      <div className="bg-transparent border border-[#00F0FF]/30 rounded-lg p-2 mb-2 w-full h-[34rem] sm:h-[28rem]">
        {/* Initial Response  h-[82vh] */}
        {showUserMessage && (
          <div className="bg-blue-800 text-white rounded-lg p-2 mb-2 max-w-max w-full ml-auto">
            <p className="">
              <TypingAnimation
                text="Can you analyze our Q3 financial report?"
                speed={40}
              />
            </p>
          </div>
        )}
        {showResponse && (
          <p className=" mb-2">
            <TypingAnimation
              text="Revenue increased by 23% YoY with strong performance."
              speed={30}
            />
          </p>
        )}

        {/* File Attachment h-[60vh] lg:h-[59vh]*/}
        {showFile && (
          <div className="border border-gray-700 p-2 rounded-md h-[25rem] sm:h-[22rem]">
            <div className="flex items-center bg-transparent rounded-lg p-3 mb-1">
              <FileText className="h-5 w-5 text-[#00F0FF] mr-2" />
              <span className="text-sm ">Q3_Financial_Report.pdf</span>
            </div>

            {/* Financial Summary */}
            {showSummary && (
              <div className="space-y-2">
                <div>
                  <h4 className="font-bold  text-lg mb-1">
                    QUARTERLY FINANCIAL SUMMARY
                  </h4>
                  <p className=" text-sm">
                    <TypingAnimation
                      text="This report presents the financial performance for Q3 2024..."
                      speed={20}
                    />
                  </p>
                </div>

                {/* Key Metrics */}
                {showMetrics && (
                  <div>
                    <h4 className="font-bold mb-1">Key Performance Metrics:</h4>
                    <ul className=" text-xs space-y-1">
                      <li>
                        •{" "}
                        <TypingAnimation
                          text="Total Revenue: $12.5M (+23% YoY)"
                          speed={15}
                        />
                      </li>
                      <li>
                        •{" "}
                        <TypingAnimation
                          text="Enterprise Growth: +45%"
                          speed={15}
                        />
                      </li>
                      <li>
                        •{" "}
                        <TypingAnimation
                          text="Operating Margin: 18% (up from 14%)"
                          speed={15}
                        />
                      </li>
                      <li>
                        •{" "}
                        <TypingAnimation
                          text="Customer Retention: 92%"
                          speed={15}
                        />
                      </li>
                    </ul>
                  </div>
                )}

                {/* AI Insight */}
                {showInsight && (
                  <div className="bg-gradient-to-r from-[#00F0FF]/10 to-[#B026FF]/10 rounded-lg p-3 border-l-4 border-[#00F0FF]">
                    <div className="flex items-center mb-2">
                      <Sparkles className="h-4 w-4 text-[#00F0FF] mr-2" />
                      <span className="text-sm font-bold text-[#00F0FF]">
                        AI Insight
                      </span>
                    </div>
                    <ul className=" text-xs space-y-1">
                      <li>
                        •{" "}
                        <TypingAnimation
                          text="Market share increased to 8.2%"
                          speed={15}
                        />
                      </li>
                      <li>
                        •{" "}
                        <TypingAnimation
                          text="R&D investment: $1.8M (14% of revenue)"
                          speed={15}
                        />
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Second AI Response Component - Pricing Question
const PricingQuestionResponse = ({
  onComplete,
}: {
  onComplete: () => void;
}) => {
  const [showUserMessage, setShowUserMessage] = useState(false);
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showChecking, setShowChecking] = useState(false);
  const [showSourcesList, setShowSourcesList] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowUserMessage(true), 1000);
    const timer2 = setTimeout(() => setShowAIResponse(true), 2000);
    const timer3 = setTimeout(() => setShowSources(true), 4000);
    const timer4 = setTimeout(() => setShowChecking(true), 4500);
    const timer5 = setTimeout(() => setShowSourcesList(true), 5500);
    const timer6 = setTimeout(() => onComplete(), 7000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
    };
  }, [onComplete]);

  return (
    <div className="space-y-2">
      {/* User Message */}
      {showUserMessage && (
        <div className="bg-blue-800 text-white rounded-lg p-2 mb-2 max-w-max w-full ml-auto">
          <p className="">
            <TypingAnimation text="What are your pricing plans?" speed={40} />
          </p>
        </div>
      )}

      {/* AI Response */}
      {showAIResponse && (
        <div className="bg-transparent border border-[#00F0FF]/30 rounded-lg p-2">
          <p className=" mb-3">
            <TypingAnimation
              text="We offer three main pricing tiers: Starter ($29/month), Standard ($119/month), and Business ($399/month). Each plan includes different features and usage limits."
              speed={20}
            />
          </p>

          {/* Sources Section */}
          {showSources && (
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-400">
                <Search className="h-4 w-4 mr-2" />
                <span>Sources:</span>
              </div>

              {showSourcesList && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm ">
                    <div className="w-2 h-2 bg-[#00F0FF] rounded-full mr-2"></div>
                    <TypingAnimation text="Pricing Page" speed={30} />
                  </div>
                  <div className="flex items-center text-sm ">
                    <div className="w-2 h-2 bg-[#00F0FF] rounded-full mr-2"></div>
                    <TypingAnimation text="Feature Comparison" speed={30} />
                  </div>
                </div>
              )}

              {/* Checking Sources Animation */}
              {showChecking && (
                <div className="flex items-center text-sm text-gray-400 mt-2">
                  <div className="flex space-x-1 mr-2">
                    <div className="w-2 h-2 bg-[#00F0FF] rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-[#00F0FF] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#00F0FF] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <TypingAnimation text="Checking sources..." speed={50} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Third AI Response Component - Pricing Plans
const PricingPlansResponse = ({ onComplete }: { onComplete: () => void }) => {
  const [showHeader, setShowHeader] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showUserMessage, setShowUserMessage] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowUserMessage(true), 1000);
    const timer2 = setTimeout(() => setShowHeader(true), 2000);
    const timer3 = setTimeout(() => setShowPlans(true), 3000);
    const timer4 = setTimeout(() => onComplete(), 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="bg-transparent border border-[#00F0FF]/30 rounded-lg p-3 space-y-4">
      {showUserMessage && (
        <div className="bg-blue-800 text-white rounded-lg p-2 mb-2 max-w-max w-full ml-auto">
          <p className="">
            <TypingAnimation text="What are your pricing plans?" speed={40} />
          </p>
        </div>
      )}
      {showHeader && (
        <div>
          <h3 className="text-xl font-bold  mb-2">
            <TypingAnimation text="rocketreplai Pricing Plans" speed={30} />
          </h3>
          <p className=" text-sm">
            <TypingAnimation
              text="Choose the right plan for your business needs."
              speed={20}
            />
          </p>
        </div>
      )}

      {showPlans && (
        <div className="space-y-2 ">
          <div className="border border-[#00F0FF]/20 rounded-lg p-3 hover:border-[#00F0FF]/50 transition">
            <h4 className="font-semibold ">Starter Plan - $29/month</h4>
            <p className="text-xs text-gray-400">
              Perfect for small businesses getting started with AI chatbots.
            </p>
          </div>

          <div className="border border-[#00F0FF]/20 rounded-lg p-3 hover:border-[#00F0FF]/50 transition">
            <h4 className="font-semibold ">Standard Plan - $119/month</h4>
            <p className="text-xs text-gray-400">
              Includes unlimited chatbots, advanced AI features, priority
              support, and custom integrations.
            </p>
          </div>

          <div className="border border-[#00F0FF]/20 rounded-lg p-3 hover:border-[#00F0FF]/50 transition">
            <h4 className="font-semibold ">Business Plan - $399/month</h4>
            <p className="text-xs text-gray-400">
              Tailored solutions for large organizations with dedicated support.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Code icon component
const CodeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
    />
  </svg>
);

// Chat Demo Carousel
const ChatDemoCarousel = () => {
  const [activeDemo, setActiveDemo] = useState(0);
  const [showUserMessage, setShowUserMessage] = useState(false);
  const [showAIResponse, setShowAIResponse] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-gray-100/50",
      containerBorder: isDark ? "border-gray-800" : "border-gray-300",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-600",
      badgeBg: isDark ? "bg-gray-600" : "bg-gray-400",
    };
  }, [currentTheme]);
  const demos = [
    {
      userMessage: "Can you analyze our Q3 financial report?",
      component: FinancialAnalysisResponse,
      title: "Financial Analysis",
    },
    {
      userMessage: "What are your pricing plans?",
      component: PricingQuestionResponse,
      title: "Pricing Info",
    },
    {
      userMessage: "Show me your pricing tiers",
      component: PricingPlansResponse,
      title: "Pricing Plans",
    },
  ];

  const handleDemoComplete = () => {
    // Reset for next demo after a short delay
    setTimeout(() => {
      setShowUserMessage(false);
      setShowAIResponse(false);
      setActiveDemo((prev) => (prev + 1) % demos.length);

      // Restart the sequence for the new demo
      setTimeout(() => {
        setShowUserMessage(true);
        setTimeout(() => setShowAIResponse(true), 1000);
      }, 1000);
    }, 2000);
  };

  // Start the first demo
  useEffect(() => {
    const timer1 = setTimeout(() => setShowUserMessage(true), 500);
    const timer2 = setTimeout(() => setShowAIResponse(true), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeDemo]);

  const CurrentDemoComponent = demos[activeDemo].component;

  return (
    <div className="relative font-montserrat">
      {/* Demo Indicator */}
      <div className="flex justify-center mb-4 space-x-2">
        {demos.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveDemo(index);
              setShowUserMessage(false);
              setShowAIResponse(false);
              setTimeout(() => {
                setShowUserMessage(true);
                setTimeout(() => setShowAIResponse(true), 1000);
              }, 500);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === activeDemo
                ? "bg-[#00F0FF] w-6"
                : `${themeStyles.badgeBg} hover:bg-gray-400`
            }`}
          />
        ))}
      </div>

      {/* Chat Container */}
      <div
        className={`container ${themeStyles.containerBg} backdrop-blur-sm border ${themeStyles.containerBorder} rounded-2xl p-2 shadow-2xl w-full h-[40rem] sm:h-[33rem]`}
      >
        {/* Chat Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full flex items-center justify-center">
            <MessageCircle className="h-6 w-6 " />
          </div>
          <div>
            <div className={`font-bold ${themeStyles.textPrimary}`}>
              RocketReplai Agent
            </div>
            <div className={`text-sm ${themeStyles.textSecondary}`}>
              {demos[activeDemo].title} • AI-powered assistant
            </div>
          </div>
        </div>

        {/* AI Response */}
        {showAIResponse && (
          <CurrentDemoComponent onComplete={handleDemoComplete} />
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] rounded-full opacity-20 blur-xl"></div>
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-[#FF2E9F] to-[#B026FF] rounded-full opacity-20 blur-xl"></div>
    </div>
  );
};

export function AIAgentHero() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-400" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      badgeBg: isDark
        ? "bg-gradient-to-r from-[#00F0FF]/10 to-[#B026FF]/10"
        : "bg-gradient-to-r from-[#00F0FF]/20 to-[#B026FF]/20",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      textpricing: isDark ? "text-[#00F0FF]" : "text-black",
    };
  }, [currentTheme]);

  const FeatureItem = ({
    icon,
    text,
    delay,
  }: {
    icon: React.ReactNode;
    text: string;
    delay: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ x: 5 }}
      className="flex items-center group"
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="w-12 h-12 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-2xl flex items-center justify-center mr-4 shadow-lg"
      >
        {icon}
      </motion.div>
      <span
        className={`${themeStyles.textSecondary} group-hover:${themeStyles.textPrimary} transition-colors duration-300 font-medium`}
      >
        {text}
      </span>
    </motion.div>
  );

  return (
    <section className={`w-full bg-transparent ${themeStyles.textPrimary}`}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-7xl mx-auto">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4 flex-1"
          >
            {/* Header */}
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`flex justify-center items-center ${themeStyles.badgeBg} backdrop-blur-sm border ${themeStyles.badgeBorder} rounded-full px-6 py-3 mb-4 max-w-min text-nowrap`}
              >
                <Sparkles className="h-5 w-5 text-blue-700 mr-2" />
                <span className="text-sm font-medium uppercase tracking-widest text-blue-700">
                  WEB CHATBOTS
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`text-3xl md:text-4xl font-semibold leading-tight ${themeStyles.textPrimary}`}
              >
                Chatbot that converts website visitor
                <br />
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F]"
                >
                  in to paying Customer
                </motion.span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className={`text-lg lg:text-xl ${themeStyles.textSecondary} leading-relaxed font-montserrat`}
              >
                Train AI on your documents, websites, and data. Get instant,
                verified answers with full citations and context awareness.
              </motion.p>
            </div>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="space-y-2 font-montserrat"
            >
              {[
                {
                  icon: <FileText className="h-4 w-4" />,
                  text: "Train on docs, PDFs, websites",
                },
                {
                  icon: <CheckCircle className="h-4 w-4" />,
                  text: "Verified answers with citations",
                },
                {
                  icon: <Clock className="h-4 w-4" />,
                  text: "24/7 instant support",
                },
                {
                  icon: <Globe className="h-4 w-4" />,
                  text: "Omnichannel Integration",
                },
              ].map((feature, index) => (
                <FeatureItem
                  key={index}
                  icon={feature.icon}
                  text={feature.text}
                  delay={0.7 + index * 0.1}
                />
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push("https://app.rocketreplai.com/signin")
                }
                className="bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold py-2 px-4 rounded-2xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => router.push("/web/pricing")}
                whileTap={{ scale: 0.95 }}
                className={`border-2 border-[#00F0FF] ${themeStyles.textpricing} font-semibold py-2 px-4 md:py-3 md:px-6 rounded-2xl hover:bg-[#00F0FF]/10 transition-all duration-300 flex items-center justify-center`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                View Pricing
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className={`flex items-center space-x-3 md:space-x-6 text-sm ${themeStyles.textMuted}`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span>1,000+ Users</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>4.9/5 Rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - AI Chat Demo Carousel */}
          <ChatDemoCarousel />
        </div>
      </div>
    </section>
  );
}
