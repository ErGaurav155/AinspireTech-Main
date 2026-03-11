"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Bot,
  Globe,
  Sparkles,
  Loader2,
  Check,
  X,
  ArrowLeft,
  CreditCard,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  createWebChatbot,
  scrapeWebsite,
  processScrapedData,
} from "@/lib/services/web-actions.api";
import { Orbs, toast, useThemeStyles } from "@rocketreplai/ui";

export default function BuildChatbotPage() {
  const router = useRouter();
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // Determine chatbot type from URL
  const isLeadGeneration =
    chatbotId === "lead-generation" || chatbotId?.includes("lead");
  const isEducation =
    chatbotId === "education" || chatbotId?.includes("education");

  const [step, setStep] = useState<"details" | "scraping" | "creating">(
    "details",
  );
  const [chatbotName, setChatbotName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set chatbot type specific info
  const chatbotType = isLeadGeneration
    ? "chatbot-lead-generation"
    : "chatbot-education";
  const gradient = isLeadGeneration
    ? "from-purple-500 to-pink-500"
    : "from-green-500 to-emerald-500";
  const headerTitle = isLeadGeneration
    ? "Build Lead Generation Chatbot"
    : "Build Education Chatbot";
  const headerDesc = isLeadGeneration
    ? "Train your chatbot with your website content to capture qualified leads"
    : "Create an interactive MCQ education chatbot for students";
  const buttonText = isLeadGeneration ? "Build Chatbot" : "Create Chatbot";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatbotName.trim()) {
      setError("Please enter a chatbot name");
      return;
    }

    // Only validate URL for lead generation chatbot
    if (isLeadGeneration) {
      if (!websiteUrl.trim()) {
        setError("Please enter a website URL");
        return;
      }

      // URL validation
      if (!/^https?:\/\//i.test(websiteUrl.trim())) {
        setError("URL must start with http:// or https://");
        return;
      }

      try {
        new URL(websiteUrl.trim());
      } catch {
        setError("Invalid URL format. Please enter a valid URL.");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    // For education chatbot, skip to creating directly
    if (isEducation) {
      setStep("creating");
    } else {
      setStep("scraping");
    }

    try {
      // Create chatbot
      setStep("creating");

      const chatbotData = await createWebChatbot(apiRequest, {
        name: chatbotName.trim(),
        type: chatbotType,
        websiteUrl: isLeadGeneration ? websiteUrl.trim() : undefined,
      });

      const chatbotId = chatbotData.chatbot.id;

      // Only do scraping for lead generation chatbot
      if (isLeadGeneration) {
        setStep("scraping");

        const scrapeResult = await scrapeWebsite(
          apiRequest,
          websiteUrl.trim(),
          chatbotId,
        );

        if (scrapeResult.alreadyScrapped) {
          toast({
            title: "Website already scraped",
            description: "Using existing website data",
            duration: 3000,
          });
        } else if (scrapeResult.success) {
          // Process scraped data
          const processResult = await processScrapedData(apiRequest, {
            ...scrapeResult.data,
            chatbotId,
          });

          if (!processResult.success) {
            throw new Error("Data processing failed");
          }
        } else {
          throw new Error("Scraping failed");
        }
      }

      toast({
        title: "Chatbot created successfully!",
        description: isLeadGeneration
          ? "Your lead generation chatbot is now ready"
          : "Your education chatbot is now ready",
        duration: 3000,
      });

      // Redirect to appropriate overview page
      router.push(
        isLeadGeneration
          ? "/web/chatbot-lead-generation/overview"
          : "/web/chatbot-education/overview",
      );
    } catch (err: any) {
      setError(err.message || "Failed to build chatbot");
      setStep("details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Build Card */}
        <div className={`${styles.card} p-4 md:p-6 lg:p-8 rounded-3xl`}>
          <div className="text-center mb-8">
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-4`}
            >
              {isLeadGeneration ? (
                <Bot className="h-8 w-8 text-white" />
              ) : (
                <GraduationCap className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className={`text-2xl font-bold ${styles.text.primary} mb-2`}>
              {headerTitle}
            </h1>
            <p className={`text-sm ${styles.text.secondary}`}>{headerDesc}</p>
          </div>

          {step === "details" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  className={`block text-sm font-medium ${styles.text.secondary} mb-2`}
                >
                  Chatbot Name
                </label>
                <input
                  type="text"
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder={
                    isLeadGeneration
                      ? "e.g., My Lead Gen Bot"
                      : "e.g., My Education Bot"
                  }
                  className={`${styles.input} w-full rounded-lg p-2`}
                  required
                />
              </div>

              {isLeadGeneration && (
                <div>
                  <label
                    className={`block text-sm font-medium ${styles.text.secondary} mb-2`}
                  >
                    Website URL
                  </label>
                  <div
                    className={`flex items-center gap-2 px-4 py-3 ${isDark ? "bg-white/[0.05] border border-white/[0.09]" : "bg-white border border-gray-200"} rounded-xl focus-within:ring-2 focus-within:ring-purple-500/50`}
                  >
                    <Globe
                      className={`h-5 w-5 ${isDark ? "text-white/40" : "text-gray-400"}`}
                    />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className={`flex-1 text-sm ${isDark ? "text-white placeholder-white/25 bg-transparent" : "text-gray-700 placeholder-gray-400 bg-transparent"} focus:outline-none`}
                      required={isLeadGeneration}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  className={`p-3 ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"} rounded-xl flex items-center gap-2`}
                >
                  <X
                    className={`h-4 w-4 ${isDark ? "text-red-400" : "text-red-500"} flex-shrink-0`}
                  />
                  <p
                    className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}
                  >
                    {error}
                  </p>
                </div>
              )}

              <div
                className={`${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-100"} rounded-xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <Sparkles
                    className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-500"} flex-shrink-0 mt-0.5`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${isDark ? "text-purple-400" : "text-purple-700"} mb-1`}
                    >
                      What happens next?
                    </p>
                    <ul className="space-y-1">
                      {isLeadGeneration ? (
                        <>
                          <li
                            className={`text-xs ${isDark ? "text-purple-400/80" : "text-purple-600"} flex items-center gap-2`}
                          >
                            <span
                              className={`w-1 h-1 ${isDark ? "bg-purple-400" : "bg-purple-400"} rounded-full`}
                            />
                            We will scrape your website to train the chatbot
                          </li>
                          <li
                            className={`text-xs ${isDark ? "text-purple-400/80" : "text-purple-600"} flex items-center gap-2`}
                          >
                            <span
                              className={`w-1 h-1 ${isDark ? "bg-purple-400" : "bg-purple-400"} rounded-full`}
                            />
                            This may take 1-2 minutes depending on website size
                          </li>
                        </>
                      ) : (
                        <li
                          className={`text-xs ${isDark ? "text-purple-400/80" : "text-purple-600"} flex items-center gap-2`}
                        >
                          <span
                            className={`w-1 h-1 ${isDark ? "bg-purple-400" : "bg-purple-400"} rounded-full`}
                          />
                          Your education chatbot will be created immediately
                        </li>
                      )}
                      <li
                        className={`text-xs ${isDark ? "text-purple-400/80" : "text-purple-600"} flex items-center gap-2`}
                      >
                        <span
                          className={`w-1 h-1 ${isDark ? "bg-purple-400" : "bg-purple-400"} rounded-full`}
                        />
                        You will get 1000 free tokens to start
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 bg-gradient-to-r ${gradient} hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-colors ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  buttonText
                )}
              </button>
            </form>
          )}

          {(step === "scraping" || step === "creating") && (
            <div className="text-center py-8">
              <Loader2
                className={`h-12 w-12 ${isDark ? "text-purple-400" : "text-purple-500"} animate-spin mx-auto mb-4`}
              />
              <h3
                className={`text-lg font-semibold ${styles.text.primary} mb-2`}
              >
                {step === "scraping"
                  ? "Scraping Website..."
                  : isLeadGeneration
                    ? "Creating Chatbot..."
                    : "Creating Education Chatbot..."}
              </h3>
              <p className={`text-sm ${styles.text.secondary} mb-6`}>
                {step === "scraping"
                  ? "Please wait while we analyze your website content. This may take 1-2 minutes."
                  : isLeadGeneration
                    ? "Setting up your chatbot with the scraped data."
                    : "Setting up your education chatbot with default configuration."}
              </p>
              <div
                className={`flex items-center justify-center gap-2 text-xs ${styles.text.muted}`}
              >
                <div
                  className={`w-2 h-2 ${isDark ? "bg-purple-400" : "bg-purple-400"} rounded-full animate-pulse`}
                />
                <span>Do not close this window</span>
                <div
                  className={`w-2 h-2 ${isDark ? "bg-pink-400" : "bg-pink-400"} rounded-full animate-pulse`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pricing Note */}
        <div
          className={`mt-6 ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"} rounded-2xl p-4`}
        >
          <div className="flex items-start gap-3">
            <CreditCard
              className={`h-5 w-5 ${isDark ? "text-amber-400" : "text-amber-600"} flex-shrink-0 mt-0.5`}
            />
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-amber-400" : "text-amber-800"} mb-1`}
              >
                First 1000 tokens are free!
              </p>
              <p
                className={`text-xs ${isDark ? "text-amber-400/80" : "text-amber-700"}`}
              >
                After that, tokens are used per conversation. Check our{" "}
                <Link
                  href="/web/pricing"
                  className={`underline font-medium ${isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-700 hover:text-amber-800"}`}
                >
                  pricing page
                </Link>{" "}
                for details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
