"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Code,
  Copy,
  Check,
  Globe,
  Zap,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Laptop,
  Chrome,
  Code2,
  ExternalLink,
  HelpCircle,
  Settings,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getChatbots } from "@/lib/services/web-actions.api";
import {
  Button,
  Orbs,
  Spinner,
  Tabs,
  TabsContent,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useParams, useRouter } from "next/navigation";

interface ChatbotInfo {
  id: string;
  name: string;
  websiteUrl?: string;
  settings: {
    welcomeMessage: string;
    primaryColor: string;
    position: "bottom-right" | "bottom-left";
  };
}

type WebType = "wordpress" | "shopify" | "wix" | "html";

export default function LeadIntegrationPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WebType>("wordpress");
  const loadChatbot = useCallback(async () => {
    if (!userId) return;
    if (
      chatbotId !== "chatbot-lead-generation" &&
      chatbotId !== "chatbot-education"
    ) {
      router.push("/web");
      return;
    }
    try {
      setIsLoading(true);
      const data = await getChatbots(apiRequest);
      const leadChatbot = data.chatbots?.find(
        (bot: any) => bot.type === "chatbot-lead-generation",
      );
      setChatbot(leadChatbot || null);
    } catch (error) {
      console.error("Error loading chatbot:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    loadChatbot();
  }, [loadChatbot]);

  const generateEmbedCode = () => {
    if (!chatbot || !userId) return "";

    return `<script 
  src="https://rocketreplai.com/chatbotembed.js" 
  data-chatbot-config='{
    "userId":"${userId}",
    "isAuthorized":true,
    "filename":"${chatbot.websiteUrl || ""}",
    "chatbotType":"chatbot-lead-generation",
    "apiUrl":"https://rocketreplai.com",
    "primaryColor":"${chatbot.settings?.primaryColor || "#8B5CF6"}",
    "position":"${chatbot.settings?.position || "bottom-right"}",
    "welcomeMessage":"${chatbot.settings?.welcomeMessage || "Hi! How can I help you today?"}",
    "chatbotName":"${chatbot.name || "Lead Generation Bot"}"
  }'>
</script>`;
  };

  const handleCopyCode = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Code copied!",
      description: "Embed code copied to clipboard",
      duration: 3000,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const getPlatformInstructions = (platform: string) => {
    switch (platform) {
      case "wordpress":
        return {
          steps: [
            "Go to your WordPress admin dashboard",
            "Navigate to Appearance → Theme File Editor",
            "Find and open footer.php file",
            "Paste the code just before the closing </body> tag",
            "Click Update File to save changes",
          ],
          video: "https://youtube.com/watch?v=...",
        };
      case "shopify":
        return {
          steps: [
            "From your Shopify admin, go to Online Store → Themes",
            "Find your current theme and click Actions → Edit Code",
            "Look for theme.liquid file under Layout",
            "Paste the code just before the closing </body> tag",
            "Click Save to apply changes",
          ],
          video: "https://youtube.com/watch?v=...",
        };
      case "wix":
        return {
          steps: [
            "In the Wix Editor, click on Settings in the top bar",
            "Select Custom Code under Advanced",
            "Click + Add Custom Code",
            "Paste the code and name it 'Chatbot Widget'",
            "Select 'All pages' and click Apply",
          ],
          video: "https://youtube.com/watch?v=...",
        };
      case "html":
        return {
          steps: [
            "Open your HTML file in a code editor",
            "Find the closing </body> tag",
            "Paste the code just before it",
            "Save the file and upload to your server",
          ],
          video: "https://youtube.com/watch?v=...",
        };
      default:
        return { steps: [] };
    }
  };
  const TAB_LABELS: Record<
    WebType,
    { label: string; icon: React.ElementType }
  > = {
    wordpress: {
      label: "Wordpress",
      icon: Globe,
    },
    shopify: {
      label: `Shopify`,
      icon: Smartphone,
    },
    wix: {
      label: `Wix`,
      icon: Chrome,
    },
    html: {
      label: `HTML/Custom`,
      icon: Laptop,
    },
  };

  if (isLoading) {
    return <Spinner label="Loading integration..." />;
  }

  if (!chatbot) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="p-4 md:p-6 lg:p-8 text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${styles.icon.purple}`}
          >
            <Code
              className={`h-8 w-8 ${isDark ? "text-purple-400" : "text-purple-400"}`}
            />
          </div>
          <h3 className={`text-lg font-semibold ${styles.text.primary} mb-2`}>
            Build your chatbot first
          </h3>
          <p className={`text-sm ${styles.text.secondary} mb-6`}>
            You need to build your lead generation chatbot before integrating it
          </p>
          <Link
            href="/web/lead-generation/build"
            className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-colors`}
          >
            Build Chatbot Now
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }
  if (
    chatbotId !== "chatbot-lead-generation" &&
    chatbotId !== "chatbot-education"
  ) {
    return null;
  }
  const instructions = getPlatformInstructions(activeTab);

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ${isDark ? "opacity-90" : ""}`}
            >
              <Code className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Integration
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                Add your chatbot to any website in minutes
              </p>
            </div>
          </div>
          <Link
            href={`/web/${chatbotId}/settings`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${styles.pill}`}
          >
            <Settings className="h-4 w-4" />
            Chatbot Settings
          </Link>
        </div>

        {/* Embed Code Card */}
        <div className={`${styles.card} p-6`}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div
              className={`w-8 h-8 rounded-full ${styles.icon.purple} flex items-center justify-center`}
            >
              <Code2
                className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
            </div>
            <h3 className={`font-semibold ${styles.text.primary}`}>
              Universal Embed Code
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.green} ml-auto`}
            >
              <Zap className="h-3 w-3 mr-1" />
              Works everywhere
            </span>
          </div>

          <div className="relative">
            <pre
              className={`${isDark ? "bg-[#0a0a16] text-gray-100" : "bg-gray-900 text-gray-100"} p-4 rounded-xl text-xs overflow-x-auto font-mono border ${isDark ? "border-white/[0.08]" : ""}`}
            >
              <code>{generateEmbedCode()}</code>
            </pre>
            <button
              onClick={handleCopyCode}
              className={`absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 ${
                copied
                  ? isDark
                    ? "bg-green-500/80"
                    : "bg-green-500"
                  : isDark
                    ? "bg-purple-500/80 hover:bg-purple-500"
                    : "bg-purple-500 hover:bg-purple-600"
              } text-white rounded-lg text-xs font-medium transition-colors`}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          <div
            className={`mt-4 flex items-start gap-3 ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-100"} rounded-xl p-3`}
          >
            <AlertCircle
              className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-500"} flex-shrink-0 mt-0.5`}
            />
            <p
              className={`text-xs ${isDark ? "text-blue-400/80" : "text-blue-700"}`}
            >
              Paste this code just before the closing{" "}
              <code
                className={`${isDark ? "bg-blue-500/20 px-1 py-0.5 rounded text-blue-400" : "bg-blue-100 px-1 py-0.5 rounded text-blue-700"}`}
              >
                &lt;/body&gt;
              </code>{" "}
              tag of your website. The widget will automatically appear in the{" "}
              {chatbot.settings?.position?.replace("-", " ")} corner.
            </p>
          </div>
        </div>

        {/* Platform-specific instructions */}
        <div className={`${styles.card} p-6`}>
          <h3 className={`font-semibold ${styles.text.primary}`}>
            Platform Guides
          </h3>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as WebType)}
            className="space-y-4 mt-4"
          >
            <div className={` flex items-center justify-center`}>
              <nav className={`flex gap-6 overflow-x-auto p-2 `}>
                {(Object.keys(TAB_LABELS) as WebType[]).map((tab) => {
                  const Icon = TAB_LABELS[tab].icon;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 pb-1 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === tab
                          ? styles.tab.active
                          : styles.tab.inactive
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          activeTab === tab ? "text-blue-500" : "text-gray-400"
                        }`}
                      />
                      {TAB_LABELS[tab].label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <TabsContent value={activeTab} className="space-y-4">
              <div
                className={`${isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-gray-50 border border-gray-200"} rounded-xl p-4`}
              >
                <h4
                  className={`text-sm font-medium ${isDark ? "text-white/80" : "text-gray-700"} mb-3`}
                >
                  Step-by-Step Guide for{" "}
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h4>
                <ol className="space-y-2">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span
                        className={`w-5 h-5 rounded-full ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"} flex items-center justify-center text-xs font-medium flex-shrink-0`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div
                className={`flex items-center gap-3 ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-100"} rounded-xl p-3`}
              >
                <HelpCircle
                  className={`h-4 w-4 ${isDark ? "text-amber-400" : "text-amber-500"} flex-shrink-0`}
                />
                <p
                  className={`text-xs ${isDark ? "text-amber-400/80" : "text-amber-700"}`}
                >
                  Need help? Check out our{" "}
                  <a href="#" className="underline font-medium">
                    video tutorial
                  </a>{" "}
                  or{" "}
                  <a href="/web/support" className="underline font-medium">
                    contact support
                  </a>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Test Integration */}
        <div
          className={`${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"} rounded-xl p-6`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full ${isDark ? "bg-green-500/20" : "bg-green-100"} flex   items-center justify-center`}
            >
              <CheckCircle
                className={`h-6 w-6 ${isDark ? "text-green-400" : "text-green-600"}`}
              />
            </div>
            <div className="flex-1 ">
              <h3
                className={`font-semibold ${isDark ? "text-green-400" : "text-green-800"} mb-1`}
              >
                Ready to test?
              </h3>
              <p
                className={`text-sm ${isDark ? "text-green-400/80" : "text-green-700"}`}
              >
                After adding the code to your website, visit your site and look
                for the chat widget in the bottom corner. Test it out to make
                sure everything works!
              </p>
            </div>
            <Button
              onClick={() => window.open(chatbot.websiteUrl, "_blank")}
              className={`${isDark ? "bg-green-500/80 hover:bg-green-500" : "bg-green-600 hover:bg-green-700"} text-white rounded-xl ${!chatbot.websiteUrl ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!chatbot.websiteUrl}
            >
              Test Your Site
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
