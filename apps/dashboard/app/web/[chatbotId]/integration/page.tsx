"use client";
// apps/dashboard/app/web/[chatbotId]/integration/page.tsx

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Copy,
  Check,
  Code2,
  Globe,
  ExternalLink,
  Bot,
  GraduationCap,
  AlertCircle,
  Loader2,
  MonitorSmartphone,
  Megaphone,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getChatbots } from "@/lib/services/web-actions.api";
import { Orbs, toast, useThemeStyles } from "@rocketreplai/ui";

type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";

const CDN_URL =
  process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.rocketreplai.com";

const TYPE_CONFIG: Record<
  ChatbotTypeId,
  { label: string; gradient: string; buildPath: string }
> = {
  "chatbot-lead-generation": {
    label: "Lead Generation",
    gradient: "from-purple-500 to-pink-500",
    buildPath: "/web/chatbot-lead-generation/create",
  },
  "chatbot-education": {
    label: "Education (MCQ)",
    gradient: "from-green-500 to-emerald-500",
    buildPath: "/web/chatbot-education/create",
  },
};

function CopyButton({
  text,
  className = "",
  label = "Copy",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied!", duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive", duration: 2000 });
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

function CodeBlock({ code, isDark }: { code: string; isDark: boolean }) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden border ${
        isDark
          ? "bg-[#0d0d0d] border-white/[0.08]"
          : "bg-gray-950 border-gray-800"
      }`}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#1f2937" }}
      >
        <div className="flex gap-1.5">
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <div
              key={c}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: c }}
            />
          ))}
        </div>
        <CopyButton
          text={code}
          label="Copy"
          className="bg-white/10 hover:bg-white/20 text-white"
        />
      </div>
      <pre
        className="p-4 text-xs leading-relaxed overflow-x-auto text-green-300"
        style={{
          fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function IntegrationPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const isValid = ["chatbot-lead-generation", "chatbot-education"].includes(
    rawId,
  );
  const chatbotType = isValid ? (rawId as ChatbotTypeId) : null;
  const cfg = chatbotType ? TYPE_CONFIG[chatbotType] : null;
  const isLead = chatbotType === "chatbot-lead-generation";
  const scriptName = isLead ? "website-bot.js" : "mcq-bot.js";

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "ready"
  >("checking");
  const [chatbotName, setChatbotName] = useState("");

  useEffect(() => {
    if (!isValid) router.replace("/web");
  }, [isValid, router]);

  useEffect(() => {
    if (!userId || !chatbotType) return;
    const load = async () => {
      try {
        const data = await getChatbots(apiRequest);
        const found = (data.chatbots || []).find(
          (b: any) => b.type === chatbotType,
        );
        if (!found) {
          setPageStatus("not-built");
        } else {
          setChatbotName(found.name || "");
          setPageStatus("ready");
        }
      } catch {
        setPageStatus("not-built");
      }
    };
    load();
  }, [userId, chatbotType, apiRequest]);

  const websiteEmbedCode = userId
    ? `<!-- RocketReplAI Website Chatbot -->
<!-- Paste this just before the closing </body> tag -->
<script
  src="${CDN_URL}/${scriptName}"
  defer
>${userId},${chatbotType}</script>`
    : "";

  const landingPageUrl = userId
    ? `${CDN_URL}${isLead ? "" : "/mcq"}/${userId}/${chatbotType}`
    : "";

  const wordPressCode = userId
    ? `// Add to your theme's functions.php or a custom plugin:
function rocketreplai_chatbot() {
    echo '<script src="${CDN_URL}/${scriptName}" defer>${userId},${chatbotType}</script>';
}
add_action( 'wp_footer', 'rocketreplai_chatbot' );`
    : "";

  const reactCode = userId
    ? `// In your React app layout (e.g. app/layout.tsx or _app.tsx):
import { useEffect } from 'react';

export default function Layout({ children }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${CDN_URL}/${scriptName}';
    script.textContent = '${userId},${chatbotType}';
    script.defer = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);
  return <>{children}</>;
}`
    : "";

  if (!isValid || !cfg) return null;

  if (pageStatus === "checking") {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <Loader2
          className={`h-7 w-7 animate-spin ${
            isDark ? "text-purple-400" : "text-purple-500"
          }`}
        />
      </div>
    );
  }

  if (pageStatus === "not-built") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mb-6`}
          >
            {isLead ? (
              <Bot className="h-10 w-10 text-white" />
            ) : (
              <GraduationCap className="h-10 w-10 text-white" />
            )}
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build your chatbot first
          </h2>
          <p className={`text-sm ${styles.text.secondary} mb-8 max-w-sm`}>
            Create your {cfg.label} chatbot before getting the integration code.
          </p>
          <Link
            href={cfg.buildPath}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${cfg.gradient} text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}
          >
            Build {cfg.label} Chatbot
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}
          >
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${styles.text.primary}`}>
              Integration
            </h1>
            <p className={`text-sm ${styles.text.secondary}`}>
              {cfg.label} · {chatbotName}
            </p>
          </div>
        </div>

        {/* Section 1: Website Embed */}
        <div className={`${styles.card} p-5 rounded-2xl`}>
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDark ? "bg-blue-500/20" : "bg-blue-50"
              }`}
            >
              <MonitorSmartphone
                className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-600"}`}
              />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${styles.text.primary}`}>
                {isLead ? "Website Chatbot" : "Website Education Bot"}
              </h2>
              <p className={`text-xs ${styles.text.secondary} mt-0.5`}>
                Paste before{" "}
                <code
                  className={`px-1 py-0.5 rounded text-xs font-mono ${
                    isDark
                      ? "bg-white/10 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {"</body>"}
                </code>{" "}
                on every page of your website
              </p>
            </div>
          </div>
          <CodeBlock code={websiteEmbedCode} isDark={isDark} />
          <div
            className={`mt-3 flex gap-2 p-3 rounded-xl text-xs ${
              isDark
                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                : "bg-blue-50 border border-blue-100 text-blue-700"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {isLead
                ? "A floating chat button will appear in the bottom-right corner of your website."
                : "A floating education widget will appear in the bottom-right corner with chat, quiz, and FAQ tabs."}
            </span>
          </div>
        </div>

        {/* Section 2: Landing Page URL */}
        <div className={`${styles.card} p-5 rounded-2xl`}>
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDark ? "bg-purple-500/20" : "bg-purple-50"
              }`}
            >
              <Megaphone
                className={`h-4 w-4 ${
                  isDark ? "text-purple-400" : "text-purple-600"
                }`}
              />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${styles.text.primary}`}>
                Landing Page Bot
              </h2>
              <p className={`text-xs ${styles.text.secondary} mt-0.5`}>
                Share this link directly — no website required. Works on social
                media, WhatsApp, business cards, and email campaigns.
              </p>
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${
              isDark
                ? "bg-white/[0.04] border-white/[0.08]"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex flex-wrap gap-2 min-w-0">
              <Globe
                className={`h-4 w-4 flex-shrink-0 ${
                  isDark ? "text-purple-400" : "text-purple-500"
                }`}
              />
              <span
                className={`flex-1 text-sm font-mono truncate break-all ${
                  isDark ? "text-white/80" : "text-gray-700"
                }`}
              >
                {landingPageUrl}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CopyButton
                text={landingPageUrl}
                label="Copy URL"
                className={`${
                  isDark
                    ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
                    : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                }`}
              />
              <a
                href={landingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isDark
                    ? "bg-white/[0.06] hover:bg-white/[0.10] text-white/80"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Test
              </a>
            </div>
          </div>

          <div
            className={`mt-3 flex gap-2 p-3 rounded-xl text-xs ${
              isDark
                ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                : "bg-purple-50 border border-purple-100 text-purple-700"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {isLead
                ? "Visitors will see a full-page chat experience with AI chat, FAQ, and appointment booking — no embed script needed."
                : "Visitors will see a full-page education experience with AI doubt solving, quizzes, and FAQs — no embed script needed."}
            </span>
          </div>
        </div>

        {/* Section 3: WordPress */}
        <div className={`${styles.card} p-5 rounded-2xl`}>
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDark ? "bg-orange-500/20" : "bg-orange-50"
              }`}
            >
              <Code2
                className={`h-4 w-4 ${
                  isDark ? "text-orange-400" : "text-orange-600"
                }`}
              />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${styles.text.primary}`}>
                WordPress
              </h2>
              <p className={`text-xs ${styles.text.secondary} mt-0.5`}>
                Add to{" "}
                <code
                  className={`px-1 py-0.5 rounded text-xs font-mono ${
                    isDark
                      ? "bg-white/10 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  functions.php
                </code>{" "}
                or use a custom plugin
              </p>
            </div>
          </div>
          <CodeBlock code={wordPressCode} isDark={isDark} />
        </div>

        {/* Section 4: React / Next.js */}
        <div className={`${styles.card} p-5 rounded-2xl`}>
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDark ? "bg-cyan-500/20" : "bg-cyan-50"
              }`}
            >
              <Code2
                className={`h-4 w-4 ${
                  isDark ? "text-cyan-400" : "text-cyan-600"
                }`}
              />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${styles.text.primary}`}>
                React / Next.js
              </h2>
              <p className={`text-xs ${styles.text.secondary} mt-0.5`}>
                Load programmatically in your React application
              </p>
            </div>
          </div>
          <CodeBlock code={reactCode} isDark={isDark} />
        </div>

        {/* How it works */}
        <div
          className={`${
            isDark
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-green-50 border border-green-200"
          } rounded-2xl p-5`}
        >
          <h3
            className={`text-sm font-semibold mb-3 ${
              isDark ? "text-green-400" : "text-green-800"
            }`}
          >
            ✅ How it works
          </h3>
          <ul className="space-y-2">
            {[
              "The script loads a lightweight iframe from cdn.rocketreplai.com",
              isLead
                ? "Visitors see a floating chat button in the bottom-right corner"
                : "Visitors see a floating education widget in the bottom-right corner",
              isLead
                ? "3 tabs: Chat (AI Q&A with memory), Knowledge Base (FAQ), Book Appointment"
                : "3 tabs: Chat (doubt solving), Quiz (interactive MCQ generation), FAQs",
              isLead
                ? "The bot remembers the full conversation for natural multi-turn replies"
                : "Students can ask doubts naturally and switch into practice mode instantly",
              isLead
                ? "Appointment bookings are saved to your Conversations dashboard"
                : "Generated quizzes stay interactive inside the widget with instant scoring",
              isLead
                ? "You receive an email notification for each new appointment"
                : "FAQs are searchable so learners can quickly revise common questions",
              "Tokens are deducted per AI response — check your balance in Tokens",
            ].map((item, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 text-xs ${
                  isDark ? "text-green-400/80" : "text-green-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {(isLead
            ? [
                {
                  label: "Manage FAQ",
                  href: `/web/${chatbotType}/faq`,
                  icon: "📚",
                  desc: "Add knowledge base articles",
                },
                {
                  label: "Appointment Questions",
                  href: `/web/${chatbotType}/appointments`,
                  icon: "📅",
                  desc: "Customise booking form fields",
                },
                {
                  label: "Conversations",
                  href: `/web/${chatbotType}/conversations`,
                  icon: "💬",
                  desc: "View leads & bookings",
                },
                {
                  label: "Settings",
                  href: `/web/${chatbotType}/settings`,
                  icon: "⚙️",
                  desc: "Colours, welcome message",
                },
              ]
            : [
                {
                  label: "Manage FAQ",
                  href: `/web/${chatbotType}/faq`,
                  icon: "📚",
                  desc: "Add revision FAQs",
                },
                {
                  label: "Conversations",
                  href: `/web/${chatbotType}/conversations`,
                  icon: "💬",
                  desc: "Review student chats",
                },
                {
                  label: "Settings",
                  href: `/web/${chatbotType}/settings`,
                  icon: "⚙️",
                  desc: "Colours, welcome message",
                },
                {
                  label: "Overview",
                  href: `/web/${chatbotType}`,
                  icon: "📈",
                  desc: "See education bot stats",
                },
              ]
          ).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-wrap gap-1 items-start md:gap-3 p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <span className="text-xl flex">{link.icon}</span>
              <div>
                <div className={`text-sm font-semibold ${styles.text.primary}`}>
                  {link.label}
                </div>
                <div className={`text-xs ${styles.text.secondary} mt-0.5`}>
                  {link.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
