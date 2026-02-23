"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Instagram, ArrowRight } from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";

function ChooseProductContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const ref = searchParams.get("ref");
    if (ref) {
      const existingRef = localStorage.getItem("referral_code");
      if (!existingRef) {
        localStorage.setItem("referral_code", ref);
        document.cookie = `referral_code=${ref}; path=/; domain=.rocketreplai.com; max-age=604800`;
      }
    }
  }, [searchParams]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  const handleSelectProduct = (product: "web-chatbot" | "insta-automation") => {
    if (product === "web-chatbot") {
      router.push("/web/dashboard");
    } else {
      router.push("/insta/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your AI Tool
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the product you want to start with. You can always add more
            later.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Web Chatbot Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all group cursor-pointer"
            onClick={() => handleSelectProduct("web-chatbot")}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Web Chatbot
            </h2>
            <p className="text-gray-600 mb-6">
              Create intelligent AI chatbots for your website. Automate customer
              support, lead generation, and more with powerful conversational
              AI.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "24/7 automated support",
                "Lead capture & qualification",
                "Multi-language support",
                "Custom branding & styling",
                "Analytics & insights",
              ].map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm text-gray-700"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-medium group-hover:shadow-lg transition-all">
              Start with Web Chatbot
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Instagram Automation Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-pink-500 hover:shadow-xl transition-all group cursor-pointer"
            onClick={() => handleSelectProduct("insta-automation")}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Instagram className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Instagram Automation
            </h2>
            <p className="text-gray-600 mb-6">
              Automate your Instagram DMs, comments, and engagement. Turn your
              followers into customers with intelligent automation.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Auto-reply to comments & DMs",
                "Keyword-triggered responses",
                "Lead collection via DM",
                "Follow-up sequences",
                "Analytics & reporting",
              ].map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm text-gray-700"
                >
                  <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-pink-600" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded-xl py-6 text-base font-medium group-hover:shadow-lg transition-all">
              Start with Instagram
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-500 text-sm mt-8"
        >
          Not sure which one to choose? You can always switch or use both
          products later.
        </motion.p>
      </div>
    </div>
  );
}

export default function ChooseProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ChooseProductContent />
    </Suspense>
  );
}
