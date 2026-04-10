"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bot,
  Instagram,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { Button, Orbs, useThemeStyles } from "@rocketreplai/ui";
function ChooseProductContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { styles, isDark } = useThemeStyles();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const existingRef = localStorage.getItem("referral_code");
      if (!existingRef) {
        localStorage.setItem("referral_code", ref);
        document.cookie = `referral_code=${ref}; path=/; domain=.rocketreplai.com; max-age=604800`;
      }
    }
    setMounted(true);
  }, [searchParams]);

  const handleSelectProduct = (product: "web-chatbot" | "insta-automation") => {
    if (product === "web-chatbot") {
      router.push("/web");
    } else {
      router.push("/insta");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} ${isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FA]"}`}
    >
      {isDark && <Orbs />}

      <div className={`${styles.container} max-w-6xl mx-auto`}>
        <div className="text-center mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1.5 mb-4"
          >
            <Sparkles
              className={`h-4 w-4 ${isDark ? "text-pink-400" : "text-pink-500"}`}
            />
            <span
              className={`text-sm font-medium ${isDark ? "text-pink-400" : "text-pink-500"}`}
            >
              Welcome to RocketReplai
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl font-bold ${styles.text.primary} mb-4`}
          >
            Choose Your AI Tool
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`text-lg ${styles.text.secondary} max-w-2xl mx-auto`}
          >
            Select the product you want to start with. You can always add more
            later.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Web Chatbot Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`${styles.card} p-8 rounded-3xl cursor-pointer group relative overflow-hidden`}
            onClick={() => handleSelectProduct("web-chatbot")}
          >
            {/* Decorative gradient orb */}
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Bot className="w-8 h-8 text-white" />
                </div>

                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles.badge.purple}`}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered
                </span>
              </div>

              <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
                Web Chatbot
              </h2>

              <p className={`${styles.text.secondary} mb-6`}>
                Create intelligent AI chatbots for your website. Automate
                customer support, lead generation, and more with powerful
                conversational AI.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { icon: MessageCircle, text: "24/7 automated support" },
                  { icon: Target, text: "Lead capture & qualification" },
                  { icon: TrendingUp, text: "Multi-language support" },
                  { icon: Sparkles, text: "Custom branding & styling" },
                  { icon: Zap, text: "Analytics & insights" },
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full ${styles.icon.purple} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon
                          className={`h-3 w-3 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                        />
                      </div>
                      <span className={`text-sm ${styles.text.secondary}`}>
                        {feature.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button
                className={`w-full ${styles.button.primary} py-6 text-base font-medium group-hover:shadow-lg transition-all`}
              >
                Start with Web Chatbot
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          {/* Instagram Automation Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`${styles.card} p-8 rounded-3xl cursor-pointer group relative overflow-hidden`}
            onClick={() => handleSelectProduct("insta-automation")}
          >
            {/* Decorative gradient orb */}
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Instagram className="w-8 h-8 text-white" />
                </div>

                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles.badge.pink}`}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Automation
                </span>
              </div>

              <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
                Instagram Automation
              </h2>

              <p className={`${styles.text.secondary} mb-6`}>
                Automate your Instagram DMs, comments, and engagement. Turn your
                followers into customers with intelligent automation.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { icon: MessageCircle, text: "Auto-reply to comments & DMs" },
                  { icon: Target, text: "Keyword-triggered responses" },
                  { icon: TrendingUp, text: "Lead collection via DM" },
                  { icon: Zap, text: "Follow-up sequences" },
                  { icon: Sparkles, text: "Analytics & reporting" },
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full ${styles.icon.pink} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon
                          className={`h-3 w-3 ${isDark ? "text-pink-400" : "text-pink-600"}`}
                        />
                      </div>
                      <span className={`text-sm ${styles.text.secondary}`}>
                        {feature.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button
                className={`w-full ${styles.button.primary} py-6 text-base font-medium group-hover:shadow-lg transition-all`}
              >
                Start with Instagram
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <div
            className={`inline-flex items-center gap-2 ${styles.innerCard} px-6 py-3 rounded-full`}
          >
            <Sparkles
              className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
            />
            <p className={`text-sm ${styles.text.secondary}`}>
              Not sure which one to choose? You can always switch or use both
              products later.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ChooseProductPage() {
  const { isDark } = useThemeStyles();

  return (
    <Suspense
      fallback={
        <div
          className={`min-h-screen ${isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FA]"} flex items-center justify-center`}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-8 h-8 border-3 ${isDark ? "border-pink-200/30 border-t-pink-400" : "border-pink-200 border-t-pink-500"} rounded-full animate-spin`}
            />
            <p
              className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}
            >
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <ChooseProductContent />
    </Suspense>
  );
}
