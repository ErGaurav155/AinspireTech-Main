"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Bot,
  Globe,
  Sparkles,
  Loader2,
  X,
  CreditCard,
  GraduationCap,
  CheckCircle,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  createWebChatbot,
  scrapeWebsite,
  processScrapedData,
  getChatbots,
  deleteChatbot,
} from "@/lib/services/web-actions.api";
import { Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";
type BuildStep = "details" | "scraping" | "creating";

interface ExistingChatbot {
  id: string;
  name: string;
  type: string;
  websiteUrl?: string;
  createdAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CHATBOT_IDS: ChatbotTypeId[] = [
  "chatbot-lead-generation",
  "chatbot-education",
];

const CONFIG: Record<
  ChatbotTypeId,
  {
    label: string;
    desc: string;
    gradient: string;
    buttonText: string;
    overviewPath: string;
  }
> = {
  "chatbot-lead-generation": {
    label: "Lead Generation Chatbot",
    desc: "Train your chatbot with your website content to capture qualified leads",
    gradient: "from-purple-500 to-pink-500",
    buttonText: "Build Chatbot",
    overviewPath: "/web/chatbot-lead-generation",
  },
  "chatbot-education": {
    label: "Education Chatbot",
    desc: "Create an interactive MCQ education chatbot for students",
    gradient: "from-green-500 to-emerald-500",
    buttonText: "Create Chatbot",
    overviewPath: "/web/chatbot-education",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuildChatbotPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ── Validate chatbot ID immediately ──────────────────────────────────────
  const isValidId = VALID_CHATBOT_IDS.includes(rawId as ChatbotTypeId);
  const chatbotType = isValidId ? (rawId as ChatbotTypeId) : null;
  const cfg = chatbotType ? CONFIG[chatbotType] : null;
  const isLead = chatbotType === "chatbot-lead-generation";

  // ── State ─────────────────────────────────────────────────────────────────
  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "already-built"
  >("checking");
  const [existingChatbot, setExistingChatbot] =
    useState<ExistingChatbot | null>(null);

  const [step, setStep] = useState<BuildStep>("details");
  const [chatbotName, setChatbotName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Redirect if invalid ID ───────────────────────────────────────────────
  useEffect(() => {
    if (!isValidId) {
      router.replace("/web");
    }
  }, [isValidId, router]);

  // ── Check if chatbot already exists ─────────────────────────────────────
  useEffect(() => {
    if (!userId || !chatbotType) return;

    const check = async () => {
      try {
        const data = await getChatbots(apiRequest);
        const found = (data.chatbots || []).find(
          (b: any) => b.type === chatbotType,
        );

        if (found) {
          setExistingChatbot({
            id: found.id || found._id,
            name: found.name,
            type: found.type,
            websiteUrl: found.websiteUrl,
            createdAt: found.createdAt,
          });
          setPageStatus("already-built");
        } else {
          setPageStatus("not-built");
        }
      } catch {
        setPageStatus("not-built");
      }
    };

    check();
  }, [userId, chatbotType, apiRequest]);

  // ── Build handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatbotType || isLoading) return;

    if (!chatbotName.trim()) {
      setError("Please enter a chatbot name");
      return;
    }

    if (isLead) {
      if (!websiteUrl.trim()) {
        setError("Please enter a website URL");
        return;
      }
      if (!/^https?:\/\//i.test(websiteUrl.trim())) {
        setError("URL must start with http:// or https://");
        return;
      }
      try {
        new URL(websiteUrl.trim());
      } catch {
        setError("Invalid URL format");
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setStep(isLead ? "scraping" : "creating");

    try {
      setStep("creating");
      const chatbotData = await createWebChatbot(apiRequest, {
        name: chatbotName.trim(),
        type: chatbotType,
        websiteUrl: isLead ? websiteUrl.trim() : undefined,
      });
      const newId = chatbotData.chatbot.id;

      if (isLead) {
        setStep("scraping");
        const scrapeResult = await scrapeWebsite(
          apiRequest,
          websiteUrl.trim(),
          newId,
        );

        if (!scrapeResult.alreadyScrapped) {
          if (scrapeResult.success) {
            const processResult = await processScrapedData(apiRequest, {
              ...scrapeResult.data,
              chatbotId: newId,
            });
            if (!processResult.success)
              throw new Error("Data processing failed");
          } else {
            throw new Error("Scraping failed");
          }
        }
      }

      toast({
        title: "Chatbot created!",
        description: `Your ${cfg?.label} is now ready`,
        duration: 3000,
      });

      // replace() prevents refresh from re-POSTing
      router.replace(cfg!.overviewPath);
    } catch (err: any) {
      setError(err.message || "Failed to build chatbot");
      setStep("details");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!existingChatbot) return;
    setIsDeleting(true);
    try {
      await deleteChatbot(apiRequest, existingChatbot.type);
      toast({
        title: "Chatbot deleted",
        description: "You can now create a new chatbot of this type",
        duration: 3000,
      });
      setShowDeleteConfirm(false);
      setExistingChatbot(null);
      setPageStatus("not-built");
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Early returns ────────────────────────────────────────────────────────

  if (!isValidId || !cfg) return null; // redirect is in-flight

  if (pageStatus === "checking") {
    return (
      <div className={`${styles.page} flex items-center justify-center`}>
        <Loader2
          className={`h-8 w-8 animate-spin ${
            isDark ? "text-purple-400" : "text-purple-500"
          }`}
        />
      </div>
    );
  }

  // ─── Already built state ──────────────────────────────────────────────────

  if (pageStatus === "already-built" && existingChatbot) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className={styles.container}>
          <div className={`${styles.card} p-6 md:p-8 rounded-3xl`}>
            {/* Status header */}
            <div className="text-center mb-8">
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mx-auto mb-4`}
              >
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h1 className={`text-2xl font-bold ${styles.text.primary} mb-2`}>
                {cfg.label}
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                Already created and active
              </p>
            </div>

            {/* Chatbot info card */}
            <div
              className={`${
                isDark
                  ? "bg-white/[0.04] border border-white/[0.08]"
                  : "bg-gray-50 border border-gray-200"
              } rounded-2xl p-5 mb-6 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${styles.text.secondary}`}
                >
                  Name
                </span>
                <span
                  className={`text-sm font-semibold ${styles.text.primary}`}
                >
                  {existingChatbot.name}
                </span>
              </div>
              <div
                className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
              />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${styles.text.secondary}`}
                >
                  Type
                </span>
                <span className={`text-sm ${styles.text.primary}`}>
                  {isLead ? "Lead Generation" : "Education (MCQ)"}
                </span>
              </div>
              {existingChatbot.websiteUrl && (
                <>
                  <div
                    className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
                  />
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`text-xs font-medium ${styles.text.secondary} flex-shrink-0`}
                    >
                      Website
                    </span>
                    <a
                      href={existingChatbot.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm truncate flex items-center gap-1 ${
                        isDark ? "text-purple-400" : "text-purple-600"
                      } hover:underline`}
                    >
                      {existingChatbot.websiteUrl}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                </>
              )}
              {existingChatbot.createdAt && (
                <>
                  <div
                    className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${styles.text.secondary}`}
                    >
                      Created
                    </span>
                    <span className={`text-sm ${styles.text.muted}`}>
                      {new Date(existingChatbot.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={cfg.overviewPath}
                className={`flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r ${cfg.gradient} text-white font-medium rounded-xl hover:opacity-90 transition-opacity`}
              >
                {isLead ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
                Go to Dashboard
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border transition-colors text-sm font-medium ${
                  isDark
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-red-200 text-red-600 hover:bg-red-50"
                }`}
              >
                <Trash2 className="h-4 w-4" />
                Delete Chatbot
              </button>
            </div>
          </div>
        </div>
        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDelete}
          title={`Delete "${existingChatbot?.name || "Chatbot"}"?`}
          description="This will permanently remove all conversations, FAQ questions, and settings. This action cannot be undone."
          confirmText="Yes, delete permanently"
          cancelText="Cancel"
          isDestructive={true}
          isLoading={isDeleting}
        />
      </div>
    );
  }

  // ─── Build form ───────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className={`${styles.card} p-4 md:p-6 lg:p-8 rounded-3xl`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mx-auto mb-4`}
            >
              {isLead ? (
                <Bot className="h-8 w-8 text-white" />
              ) : (
                <GraduationCap className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className={`text-2xl font-bold ${styles.text.primary} mb-2`}>
              Build {cfg.label}
            </h1>
            <p className={`text-sm ${styles.text.secondary}`}>{cfg.desc}</p>
          </div>

          {/* Form or loading */}
          {step === "details" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Chatbot name */}
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
                    isLead ? "e.g., My Lead Gen Bot" : "e.g., My MCQ Bot"
                  }
                  className={`${styles.input} w-full rounded-lg p-2`}
                  required
                />
              </div>

              {/* Website URL — lead only */}
              {isLead && (
                <div>
                  <label
                    className={`block text-sm font-medium ${styles.text.secondary} mb-2`}
                  >
                    Website URL
                  </label>
                  <div
                    className={`flex items-center gap-2 px-4 py-3 ${
                      isDark
                        ? "bg-white/[0.05] border border-white/[0.09]"
                        : "bg-white border border-gray-200"
                    } rounded-xl focus-within:ring-2 focus-within:ring-purple-500/50`}
                  >
                    <Globe
                      className={`h-5 w-5 flex-shrink-0 ${
                        isDark ? "text-white/40" : "text-gray-400"
                      }`}
                    />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className={`flex-1 text-sm ${
                        isDark
                          ? "text-white placeholder-white/25 bg-transparent"
                          : "text-gray-700 placeholder-gray-400 bg-transparent"
                      } focus:outline-none`}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className={`p-3 ${
                    isDark
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-red-50 border border-red-200"
                  } rounded-xl flex items-center gap-2`}
                >
                  <X
                    className={`h-4 w-4 flex-shrink-0 ${
                      isDark ? "text-red-400" : "text-red-500"
                    }`}
                  />
                  <p
                    className={`text-sm ${
                      isDark ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    {error}
                  </p>
                </div>
              )}

              {/* Info box */}
              <div
                className={`${
                  isDark
                    ? "bg-purple-500/10 border border-purple-500/20"
                    : "bg-purple-50 border border-purple-100"
                } rounded-xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <Sparkles
                    className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      isDark ? "text-purple-400" : "text-purple-500"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isDark ? "text-purple-400" : "text-purple-700"
                      } mb-1`}
                    >
                      What happens next?
                    </p>
                    <ul className="space-y-1">
                      {isLead ? (
                        <>
                          <li
                            className={`text-xs ${
                              isDark ? "text-purple-400/80" : "text-purple-600"
                            } flex items-center gap-2`}
                          >
                            <span className="w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                            We will scrape your website to train the chatbot
                          </li>
                          <li
                            className={`text-xs ${
                              isDark ? "text-purple-400/80" : "text-purple-600"
                            } flex items-center gap-2`}
                          >
                            <span className="w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                            This may take 1-2 minutes
                          </li>
                        </>
                      ) : (
                        <li
                          className={`text-xs ${
                            isDark ? "text-purple-400/80" : "text-purple-600"
                          } flex items-center gap-2`}
                        >
                          <span className="w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                          Your education chatbot will be created immediately
                        </li>
                      )}
                      <li
                        className={`text-xs ${
                          isDark ? "text-purple-400/80" : "text-purple-600"
                        } flex items-center gap-2`}
                      >
                        <span className="w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                        You will get 1000 free tokens to start
                      </li>
                      <li
                        className={`text-xs ${
                          isDark ? "text-purple-400/80" : "text-purple-600"
                        } flex items-center gap-2`}
                      >
                        <span className="w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                        Each chatbot type can only be created once per account
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 bg-gradient-to-r ${cfg.gradient} text-white font-medium rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  cfg.buttonText
                )}
              </button>
            </form>
          ) : (
            /* Loading state */
            <div className="text-center py-8">
              <Loader2
                className={`h-12 w-12 animate-spin mx-auto mb-4 ${
                  isDark ? "text-purple-400" : "text-purple-500"
                }`}
              />
              <h3
                className={`text-lg font-semibold ${styles.text.primary} mb-2`}
              >
                {step === "scraping"
                  ? "Scraping Website..."
                  : `Creating ${isLead ? "" : "Education "}Chatbot...`}
              </h3>
              <p className={`text-sm ${styles.text.secondary} mb-6`}>
                {step === "scraping"
                  ? "Please wait while we analyze your website. This may take 1-2 minutes."
                  : isLead
                    ? "Setting up your chatbot with the scraped data."
                    : "Setting up your education chatbot."}
              </p>
              <div
                className={`flex items-center justify-center gap-2 text-xs ${styles.text.muted}`}
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span>Do not close this window</span>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Pricing note */}
        <div
          className={`mt-6 ${
            isDark
              ? "bg-amber-500/10 border border-amber-500/20"
              : "bg-amber-50 border border-amber-200"
          } rounded-2xl p-4`}
        >
          <div className="flex items-start gap-3">
            <CreditCard
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                isDark ? "text-amber-400" : "text-amber-600"
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  isDark ? "text-amber-400" : "text-amber-800"
                } mb-1`}
              >
                First 1000 tokens are free!
              </p>
              <p
                className={`text-xs ${
                  isDark ? "text-amber-400/80" : "text-amber-700"
                }`}
              >
                After that, tokens are used per conversation. Check our{" "}
                <Link
                  href="/web/pricing"
                  className={`underline font-medium ${
                    isDark
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-amber-700 hover:text-amber-800"
                  }`}
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
