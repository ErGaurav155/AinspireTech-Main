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
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getChatbots } from "@/lib/services/web-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";

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

export default function LeadIntegrationPage() {
  const { userId } = useAuth();
  const { apiRequest } = useApi();

  const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("wordpress");

  const loadChatbot = useCallback(async () => {
    if (!userId) return;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="p-4 md:p-6 lg:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Code className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Build your chatbot first
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            You need to build your lead generation chatbot before integrating it
          </p>
          <Link
            href="/web/lead-generation/build"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Build Chatbot Now
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const instructions = getPlatformInstructions(activeTab);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Code className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Integration</h1>
              <p className="text-sm text-gray-500">
                Add your chatbot to any website in minutes
              </p>
            </div>
          </div>
          <Link
            href={`/web/lead-generation/settings`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Chatbot Settings
          </Link>
        </div>

        {/* Embed Code Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Code2 className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800">
              Universal Embed Code
            </h3>
            <Badge className="bg-green-100 text-green-600 border-green-200 ml-auto">
              <Zap className="h-3 w-3 mr-1" />
              Works everywhere
            </Badge>
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto font-mono">
              <code>{generateEmbedCode()}</code>
            </pre>
            <button
              onClick={handleCopyCode}
              className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
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

          <div className="mt-4 flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Paste this code just before the closing{" "}
              <code className="bg-blue-100 px-1 py-0.5 rounded">
                &lt;/body&gt;
              </code>{" "}
              tag of your website. The widget will automatically appear in the{" "}
              {chatbot.settings?.position?.replace("-", " ")} corner.
            </p>
          </div>
        </div>

        {/* Platform-specific instructions */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Platform Guides</h3>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="bg-gray-100 p-1 rounded-xl">
              <TabsTrigger
                value="wordpress"
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                WordPress
              </TabsTrigger>
              <TabsTrigger value="shopify" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Shopify
              </TabsTrigger>
              <TabsTrigger value="wix" className="flex items-center gap-2">
                <Chrome className="h-4 w-4" />
                Wix
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center gap-2">
                <Laptop className="h-4 w-4" />
                HTML/Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Step-by-Step Guide for{" "}
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h4>
                <ol className="space-y-2">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-gray-600">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <HelpCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
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
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 mb-1">
                Ready to test?
              </h3>
              <p className="text-sm text-green-700">
                After adding the code to your website, visit your site and look
                for the chat widget in the bottom corner. Test it out to make
                sure everything works!
              </p>
            </div>
            <Button
              onClick={() => window.open(chatbot.websiteUrl, "_blank")}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
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
