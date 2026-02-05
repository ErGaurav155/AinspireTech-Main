"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  MessageCircle,
  Heart,
  Users,
  Zap,
  Rocket,
  Shield,
  Star,
  ArrowRight,
  Calendar,
  CheckCircle,
  Instagram,
  Play,
  ShoppingBag,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

// TypingAnimation Component
const TypingAnimation = ({
  text,
  speed = 30,
  className = "",
  onComplete,
  delay = 0,
}: {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  delay?: number;
}) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const startTyping = useCallback(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
      if (onComplete) onComplete();
    }
  }, [currentIndex, onComplete, speed, text]);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        startTyping();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      startTyping();
    }
  }, [delay, startTyping]);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

export function InstagramAutomationHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      badgeBg: isDark
        ? "bg-gradient-to-r from-[#00F0FF]/10 to-[#B026FF]/10 backdrop-blur-sm border border-blue-600"
        : "bg-gradient-to-r from-[#00F0FF]/5 to-[#B026FF]/5 backdrop-blur-sm border border-blue-800",
      titleText: isDark ? "text-white" : "text-n-8",
      descriptionText: isDark ? "text-gray-300" : "text-n-5",
      featureText: isDark
        ? "text-gray-300 group-hover:text-white"
        : "text-n-5 group-hover:text-gray-900",
      outlineButtonBorder: isDark
        ? "border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10"
        : "border-[#00F0FF] text-n-8 hover:bg-[#00F0FF]/5",
      trustBadgeText: isDark ? "text-gray-400" : "text-n-4",
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
        className={`transition-colors duration-300 font-medium ${themeStyles.featureText}`}
      >
        {text}
      </span>
    </motion.div>
  );

  return (
    <section className="w-full bg-transparent text-foreground pb-20">
      <div className=" mx-auto md:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`inline-flex items-center ${themeStyles.badgeBg} rounded-full px-6 py-3`}
              >
                <Zap className="h-5 w-5 text-blue-800 mr-2" />
                <span className="text-xs md:text-sm font-medium text-nowrap uppercase tracking-widest text-blue-800">
                  INSTAGRAM AUTOMATION
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`text-3xl md:text-4xl font-semibold leading-tight ${themeStyles.titleText}`}
              >
                Turn Comments Into
                <br />
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F]"
                >
                  Paying Customers
                </motion.span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className={`text-base md:text-lg lg:text-xl leading-relaxed font-montserrat ${themeStyles.descriptionText}`}
              >
                Automatically reply to Instagram comments with personalized DMs
                that convert followers into subscribers and customers. No coding
                required.
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
                  icon: <MessageCircle className="h-5 w-5" />,
                  text: "Auto-reply to comments",
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  text: "Grow followers automatically",
                },
                {
                  icon: <ShoppingBag className="h-5 w-5" />,
                  text: "Drive sales with DMs",
                },
                {
                  icon: <CheckCircle className="h-5 w-5" />,
                  text: "No coding required",
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
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push("https://app.ainspiretech.com/signin")
                }
                className="bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] text-black font-bold py-2 px-4 rounded-2xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => router.push("/insta/pricing")}
                whileTap={{ scale: 0.95 }}
                className={`border-2 font-semibold py-2 px-4 md:py-3 md:px-6 rounded-2xl transition-all duration-300 flex items-center justify-center ${themeStyles.outlineButtonBorder}`}
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
              className={`flex flex-wrap items-center gap-3 md:gap-6 text-sm ${themeStyles.trustBadgeText}`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Instagram Approved</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span>1,000+ Creators</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>4.8/5 Rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Instagram Demo Video */}
          <motion.div
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{
              duration: 1.2,
              type: "spring",
              stiffness: 50,
              damping: 15,
            }}
            className="relative max-w-max mx-auto"
          >
            {/* Main Video Container with Enhanced Animations */}
            <motion.div
              initial={{ scale: 0.8, rotate: -2 }}
              whileInView={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                scale: 1.02,
                rotate: 0,
                y: -5,
                transition: { duration: 0.3 },
              }}
              className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#00F0FF]/20"
            >
              {/* Video with 8px crop from top and bottom */}
              <div className="relative overflow-hidden">
                <motion.video
                  ref={videoRef}
                  src="/assets/InstaVid.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="w-full h-[30rem] md:h-[38rem] max-w-md mx-auto scale-[1.03] -translate-y-1"
                  style={{
                    clipPath: "inset(8px 0 8px 0)",
                    marginTop: "-8px",
                    marginBottom: "-8px",
                  }}
                />
              </div>

              {/* Animated Border Glow */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="absolute inset-0 rounded-3xl  border-[0.5px] border-transparent bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F] opacity-30"
                style={{
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "exclude",
                  WebkitMaskComposite: "xor",
                  padding: "2px",
                }}
              />

              {/* Floating Play Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 1,
                  type: "spring",
                  stiffness: 200,
                }}
                whileHover={{
                  scale: 1.1,
                  rotate: 5,
                  transition: { duration: 0.2 },
                }}
                className="absolute top-4 right-2 w-16 h-16 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                onClick={() => videoRef.current?.play()}
              >
                <Play className="h-5 w-5 text-white ml-0.5 fill-white" />
              </motion.div>

              {/* Instagram UI Mock Elements */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="absolute bottom-4 left-4 right-4 flex justify-between items-center"
              >
                <div className="flex space-x-3">
                  <Heart className="h-5 w-5 text-white" />
                  <MessageCircle className="h-5 w-5 text-white" />
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <ShoppingBag className="h-5 w-5 text-white" />
              </motion.div>
            </motion.div>

            {/* Enhanced Floating Decorations */}
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.7,
                type: "spring",
                stiffness: 150,
              }}
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0],
              }}
              className="absolute -top-6 -right-6 w-10 h-10 bg-[#FF2E9F] rounded-full z-30 shadow-lg shadow-[#FF2E9F]/50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.9,
                type: "spring",
                stiffness: 150,
              }}
              animate={{
                y: [0, 10, 0],
                rotate: [0, -5, 0],
              }}
              className="absolute -bottom-6 -left-6 w-8 h-8 bg-[#00F0FF] rounded-full z-30 shadow-lg shadow-[#00F0FF]/50"
            />

            {/* Additional Floating Element */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: 1.1,
                type: "spring",
                stiffness: 200,
              }}
              animate={{
                y: [0, -15, 0],
                x: [0, 5, 0],
              }}
              className="absolute -top-4 left-8 w-6 h-6 bg-gradient-to-r from-[#B026FF] to-[#FF2E9F] rounded-full z-20 shadow-lg"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
