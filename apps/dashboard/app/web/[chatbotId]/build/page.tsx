"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Bot,
  Globe,
  Sparkles,
  Loader2,
  Check,
  X,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import {
  createWebChatbot,
  scrapeWebsite,
  processScrapedData,
} from "@/lib/services/web-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";

export default function BuildLeadGenerationPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();

  const [step, setStep] = useState<"details" | "scraping" | "creating">(
    "details",
  );
  const [chatbotName, setChatbotName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatbotName.trim()) {
      setError("Please enter a chatbot name");
      return;
    }

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

    setIsLoading(true);
    setError(null);
    setStep("scraping");

    try {
      // Create chatbot first
      setStep("creating");

      const chatbotData = await createWebChatbot(apiRequest, {
        name: chatbotName.trim(),
        type: "chatbot-lead-generation",
        websiteUrl: websiteUrl.trim(),
      });

      const chatbotId = chatbotData.chatbot.id;

      // Now scrape the website
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

      toast({
        title: "Chatbot built successfully!",
        description: "Your lead generation chatbot is now ready",
        duration: 3000,
      });

      router.push("/web/lead-generation/overview");
    } catch (err: any) {
      setError(err.message || "Failed to build chatbot");
      setStep("details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Build Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-4 md:p-6 lg:p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Build Lead Generation Chatbot
            </h1>
            <p className="text-sm text-gray-500">
              Train your chatbot with your website content to capture qualified
              leads
            </p>
          </div>

          {step === "details" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder="e.g., My Lead Gen Bot"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-purple-200 focus-within:border-purple-300">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">
                      What happens next?
                    </p>
                    <ul className="space-y-1">
                      <li className="text-xs text-purple-600 flex items-center gap-2">
                        <span className="w-1 h-1 bg-purple-400 rounded-full" />
                        We will scrape your website to train the chatbot
                      </li>
                      <li className="text-xs text-purple-600 flex items-center gap-2">
                        <span className="w-1 h-1 bg-purple-400 rounded-full" />
                        This may take 1-2 minutes depending on website size
                      </li>
                      <li className="text-xs text-purple-600 flex items-center gap-2">
                        <span className="w-1 h-1 bg-purple-400 rounded-full" />
                        You will get 1000 free tokens to start
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Build Chatbot"
                )}
              </button>
            </form>
          )}

          {(step === "scraping" || step === "creating") && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {step === "scraping"
                  ? "Scraping Website..."
                  : "Creating Chatbot..."}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {step === "scraping"
                  ? "Please wait while we analyze your website content. This may take 1-2 minutes."
                  : "Setting up your chatbot with the scraped data."}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span>Do not close this window</span>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Pricing Note */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">
                First 1000 tokens are free!
              </p>
              <p className="text-xs text-amber-700">
                After that, tokens are used per conversation. Check our{" "}
                <Link href="/web/pricing" className="underline font-medium">
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
