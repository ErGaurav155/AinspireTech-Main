"use client";

import { useState, useEffect, useCallback } from "react";
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
  GraduationCap,
  Bot,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";
type WebType = "wordpress" | "shopify" | "wix" | "html";

interface ChatbotInfo {
  id: string;
  name: string;
  websiteUrl?: string;
  scrappedFile?: string;
  settings: {
    welcomeMessage: string;
    primaryColor: string;
    position: "bottom-right" | "bottom-left";
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_IDS: ChatbotTypeId[] = [
  "chatbot-lead-generation",
  "chatbot-education",
];

const TYPE_CONFIG: Record<
  ChatbotTypeId,
  {
    label: string;
    gradient: string;
    iconColor: string;
    buildPath: string;
    scriptSrc: string;
    dataAttr: string;
  }
> = {
  "chatbot-lead-generation": {
    label: "Lead Generation",
    gradient: "from-purple-500 to-pink-500",
    iconColor: "text-purple-400",
    buildPath: "/web/chatbot-lead-generation/build",
    scriptSrc: "https://app.rocketreplai.com/chatbotembed.js",
    dataAttr: "data-chatbot-config",
  },
  "chatbot-education": {
    label: "Education (MCQ)",
    gradient: "from-green-500 to-emerald-500",
    iconColor: "text-green-400",
    buildPath: "/web/chatbot-education/build",
    scriptSrc: "https://app.rocketreplai.com/mcqchatbotembed.js",
    dataAttr: "data-mcq-chatbot",
  },
};

const TAB_LABELS: Record<WebType, { label: string; icon: React.ElementType }> =
  {
    wordpress: { label: "WordPress", icon: Globe },
    shopify: { label: "Shopify", icon: Smartphone },
    wix: { label: "Wix", icon: Chrome },
    html: { label: "HTML/Custom", icon: Laptop },
  };

const PLATFORM_STEPS: Record<WebType, string[]> = {
  wordpress: [
    "Go to your WordPress admin dashboard",
    "Navigate to Appearance → Theme File Editor",
    "Find and open footer.php file",
    "Paste the code just before the closing </body> tag",
    "Click Update File to save changes",
  ],
  shopify: [
    "From your Shopify admin, go to Online Store → Themes",
    "Find your current theme and click Actions → Edit Code",
    "Open the theme.liquid file under Layout",
    "Paste the code just before the closing </body> tag",
    "Click Save to apply changes",
  ],
  wix: [
    "In the Wix Editor, click Settings in the top bar",
    "Select Custom Code under Advanced",
    "Click + Add Custom Code",
    "Paste the code and name it 'Chatbot Widget'",
    "Select 'All pages' and click Apply",
  ],
  html: [
    "Open your HTML file in a code editor",
    "Find the closing </body> tag",
    "Paste the code just before it",
    "Save the file and upload to your server",
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntegrationPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ── Validate type ─────────────────────────────────────────────────────────
  const isValidType = VALID_IDS.includes(chatbotId as ChatbotTypeId);
  const chatbotType = isValidType ? (chatbotId as ChatbotTypeId) : null;
  const cfg = chatbotType ? TYPE_CONFIG[chatbotType] : null;
  const isLead = chatbotType === "chatbot-lead-generation";

  const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WebType>("wordpress");

  // ── Redirect invalid type ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isValidType) router.replace("/web");
  }, [isValidType, router]);

  // ── Load the correct chatbot by type ─────────────────────────────────────
  const loadChatbot = useCallback(async () => {
    if (!userId || !chatbotType) return;
    try {
      setIsLoading(true);
      const data = await getChatbots(apiRequest);
      // ✅ Find by the CURRENT chatbotType, not hardcoded
      const found = (data.chatbots || []).find(
        (bot: any) => bot.type === chatbotType,
      );
      setChatbot(
        found
          ? {
              id: found.id || found._id,
              name: found.name,
              websiteUrl: found.websiteUrl,
              scrappedFile: found.scrappedFile,
              settings: found.settings || {
                welcomeMessage: "Hi! How can I help you today?",
                primaryColor: isLead ? "#8B5CF6" : "#10B981",
                position: "bottom-right",
              },
            }
          : null,
      );
    } catch (error) {
      console.error("Error loading chatbot:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, chatbotType, apiRequest, isLead]);

  useEffect(() => {
    loadChatbot();
  }, [loadChatbot]);

  // ── Generate embed code per type ─────────────────────────────────────────
  const generateEmbedCode = (): string => {
    if (!chatbot || !userId || !cfg || !chatbotType) return "";

    const welcomeMsg =
      chatbot.settings?.welcomeMessage || "Hi! How can I help you today?";
    const primaryColor =
      chatbot.settings?.primaryColor || (isLead ? "#8B5CF6" : "#10B981");
    const position = chatbot.settings?.position || "bottom-right";

    if (isLead) {
      // Lead generation uses chatbotembed.js + data-chatbot-config
      return `<script 
  src="${cfg.scriptSrc}" 
  data-chatbot-config='{
    "userId":"${userId}",
    "isAuthorized":true,
    "filename":"${chatbot.scrappedFile || chatbot.websiteUrl || ""}",
    "chatbotType":"${chatbotType}",
    "apiUrl":"https://rocketreplai.com",
    "primaryColor":"${primaryColor}",
    "position":"${position}",
    "welcomeMessage":"${welcomeMsg}",
    "chatbotName":"${chatbot.name}"
  }'>
</script>`;
    } else {
      // Education chatbot uses mcqchatbotembed.js + data-mcq-chatbot
      return `<script 
  src="${cfg.scriptSrc}" 
  data-mcq-chatbot='{
    "userId":"${userId}",
    "isAuthorized":true,
    "chatbotType":"${chatbotType}",
    "apiUrl":"https://rocketreplai.com",
    "primaryColor":"${primaryColor}",
    "position":"${position}",
    "welcomeMessage":"${welcomeMsg}",
    "chatbotName":"${chatbot.name}"
  }'>
</script>`;
    }
  };

  const handleCopyCode = () => {
    const code = generateEmbedCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Code copied!",
      description: "Embed code copied to clipboard",
      duration: 3000,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (!isValidType || !cfg) return null;

  if (isLoading) return <Spinner label="Loading integration..." />;

  // ─── Not built yet ────────────────────────────────────────────────────────

  if (!chatbot) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="p-4 md:p-6 lg:p-8 text-center">
          <div
            className={`w-16 h-16 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mx-auto mb-4`}
          >
            {isLead ? (
              <Bot className="h-8 w-8 text-white" />
            ) : (
              <GraduationCap className="h-8 w-8 text-white" />
            )}
          </div>
          <h3 className={`text-lg font-semibold ${styles.text.primary} mb-2`}>
            Build your {cfg.label} chatbot first
          </h3>
          <p className={`text-sm ${styles.text.secondary} mb-6`}>
            You need to create your {cfg.label} chatbot before you can get the
            integration code.
          </p>
          <Link
            href={cfg.buildPath}
            className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${cfg.gradient} text-white rounded-xl text-sm font-medium transition-opacity hover:opacity-90`}
          >
            Build {cfg.label} Chatbot
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────

  const instructions = PLATFORM_STEPS[activeTab];

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}
            >
              <Code className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Integration
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {cfg.label} — add to any website in minutes
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

        {/* Chatbot type notice */}
        <div
          className={`flex items-start gap-3 p-4 rounded-xl ${
            isLead
              ? isDark
                ? "bg-purple-500/10 border border-purple-500/20"
                : "bg-purple-50 border border-purple-100"
              : isDark
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-green-50 border border-green-100"
          }`}
        >
          {isLead ? (
            <Bot
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                isDark ? "text-purple-400" : "text-purple-600"
              }`}
            />
          ) : (
            <GraduationCap
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                isDark ? "text-green-400" : "text-green-600"
              }`}
            />
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                isLead
                  ? isDark
                    ? "text-purple-400"
                    : "text-purple-700"
                  : isDark
                    ? "text-green-400"
                    : "text-green-700"
              }`}
            >
              {isLead
                ? "Lead Generation Widget — uses chatbotembed.js"
                : "MCQ Education Widget — uses mcqchatbotembed.js"}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                isLead
                  ? isDark
                    ? "text-purple-400/70"
                    : "text-purple-600"
                  : isDark
                    ? "text-green-400/70"
                    : "text-green-600"
              }`}
            >
              {isLead
                ? "Captures visitor information via appointment forms and live chat"
                : "Lets students generate MCQ tests and chat with the AI tutor"}
            </p>
          </div>
        </div>

        {/* Embed Code Card */}
        <div className={`${styles.card} p-6`}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div
              className={`w-8 h-8 rounded-full ${
                isLead ? styles.icon.purple : styles.icon.green
              } flex items-center justify-center`}
            >
              <Code2 className={`h-4 w-4 ${cfg.iconColor}`} />
            </div>
            <h3 className={`font-semibold ${styles.text.primary}`}>
              Embed Code — {chatbot.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.green} ml-auto`}
            >
              <Zap className="h-3 w-3" />
              Works everywhere
            </span>
          </div>

          <div className="relative">
            <pre
              className={`${
                isDark
                  ? "bg-[#0a0a16] text-gray-100"
                  : "bg-gray-900 text-gray-100"
              } p-4 rounded-xl text-xs overflow-x-auto font-mono border ${
                isDark ? "border-white/[0.08]" : ""
              }`}
            >
              <code>{generateEmbedCode()}</code>
            </pre>
            <button
              onClick={handleCopyCode}
              className={`absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white ${
                copied
                  ? "bg-green-500"
                  : isLead
                    ? isDark
                      ? "bg-purple-500/80 hover:bg-purple-500"
                      : "bg-purple-500 hover:bg-purple-600"
                    : isDark
                      ? "bg-green-500/80 hover:bg-green-500"
                      : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy Code
                </>
              )}
            </button>
          </div>

          <div
            className={`mt-4 flex items-start gap-3 ${
              isDark
                ? "bg-blue-500/10 border border-blue-500/20"
                : "bg-blue-50 border border-blue-100"
            } rounded-xl p-3`}
          >
            <AlertCircle
              className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                isDark ? "text-blue-400" : "text-blue-500"
              }`}
            />
            <div
              className={`text-xs ${isDark ? "text-blue-400/80" : "text-blue-700"}`}
            >
              <p>
                Paste this code just before the closing{" "}
                <code
                  className={`${
                    isDark
                      ? "bg-blue-500/20 px-1 py-0.5 rounded text-blue-400"
                      : "bg-blue-100 px-1 py-0.5 rounded text-blue-700"
                  }`}
                >
                  &lt;/body&gt;
                </code>{" "}
                tag of your website.
              </p>
              <p className="mt-1">
                Script:{" "}
                <code
                  className={`${
                    isDark
                      ? "bg-blue-500/20 px-1 py-0.5 rounded text-blue-400"
                      : "bg-blue-100 px-1 py-0.5 rounded text-blue-700"
                  }`}
                >
                  {cfg.scriptSrc.split("/").pop()}
                </code>{" "}
                · Attribute:{" "}
                <code
                  className={`${
                    isDark
                      ? "bg-blue-500/20 px-1 py-0.5 rounded text-blue-400"
                      : "bg-blue-100 px-1 py-0.5 rounded text-blue-700"
                  }`}
                >
                  {cfg.dataAttr}
                </code>
              </p>
            </div>
          </div>

          {/* MCQ-specific note */}
          {!isLead && (
            <div
              className={`mt-3 flex items-start gap-3 ${
                isDark
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-green-50 border border-green-100"
              } rounded-xl p-3`}
            >
              <GraduationCap
                className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                  isDark ? "text-green-400" : "text-green-600"
                }`}
              />
              <p
                className={`text-xs ${
                  isDark ? "text-green-400/80" : "text-green-700"
                }`}
              >
                The MCQ widget includes three tabs: MCQ Test (students fill a
                form to generate a quiz), Chat (AI tutor), and FAQ. No website
                URL scraping needed — all topics are generated on-demand.
              </p>
            </div>
          )}
        </div>

        {/* Platform guides */}
        <div className={`${styles.card} p-6`}>
          <h3 className={`font-semibold ${styles.text.primary} mb-4`}>
            Platform Guides
          </h3>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as WebType)}
            className="space-y-4"
          >
            <nav className="flex gap-6 overflow-x-auto pb-1">
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
                    <Icon className="h-4 w-4" />
                    {TAB_LABELS[tab].label}
                  </button>
                );
              })}
            </nav>

            <TabsContent value={activeTab} className="space-y-4">
              <div
                className={`${
                  isDark
                    ? "bg-white/[0.03] border border-white/[0.06]"
                    : "bg-gray-50 border border-gray-200"
                } rounded-xl p-4`}
              >
                <h4
                  className={`text-sm font-medium ${
                    isDark ? "text-white/80" : "text-gray-700"
                  } mb-3`}
                >
                  Step-by-step guide for {TAB_LABELS[activeTab].label}
                </h4>
                <ol className="space-y-2">
                  {instructions.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          isLead
                            ? isDark
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-purple-100 text-purple-600"
                            : isDark
                              ? "bg-green-500/20 text-green-400"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`text-sm ${
                          isDark ? "text-white/60" : "text-gray-600"
                        }`}
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div
                className={`flex items-center gap-3 ${
                  isDark
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-amber-50 border border-amber-100"
                } rounded-xl p-3`}
              >
                <HelpCircle
                  className={`h-4 w-4 flex-shrink-0 ${
                    isDark ? "text-amber-400" : "text-amber-500"
                  }`}
                />
                <p
                  className={`text-xs ${
                    isDark ? "text-amber-400/80" : "text-amber-700"
                  }`}
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

        {/* Test integration */}
        <div
          className={`${
            isDark
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-green-50 border border-green-200"
          } rounded-xl p-6`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isDark ? "bg-green-500/20" : "bg-green-100"
              }`}
            >
              <CheckCircle
                className={`h-6 w-6 ${
                  isDark ? "text-green-400" : "text-green-600"
                }`}
              />
            </div>
            <div className="flex-1">
              <h3
                className={`font-semibold mb-1 ${
                  isDark ? "text-green-400" : "text-green-800"
                }`}
              >
                Ready to test?
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-green-400/80" : "text-green-700"
                }`}
              >
                {isLead
                  ? "After adding the code, visit your site and look for the chat widget in the corner. Submit a test lead to confirm it works."
                  : "After adding the code, visit your site and open the widget. Click MCQ Test and generate a sample quiz to confirm it works."}
              </p>
            </div>
            {isLead && chatbot.websiteUrl && (
              <Button
                onClick={() => window.open(chatbot.websiteUrl, "_blank")}
                className={`${
                  isDark
                    ? "bg-green-500/80 hover:bg-green-500"
                    : "bg-green-600 hover:bg-green-700"
                } text-white rounded-xl`}
              >
                Test Your Site
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
