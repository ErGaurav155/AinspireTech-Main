"use client";
// apps/dashboard/app/web/[chatbotId]/settings/page.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Settings,
  Bot,
  GraduationCap,
  ExternalLink,
  Save,
  Loader2,
  Palette,
  MessageSquare,
  MapPin,
  Globe,
  Phone,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Upload,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getChatbots,
  updateWebChatbot,
  deleteChatbot,
  scrapeWebsite,
  processScrapedData,
} from "@/lib/services/web-actions.api";
import { Button, Orbs, Switch, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";

interface BotSettings {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  position: "bottom-right" | "bottom-left";
  websiteUrl: string;
  whatsappNumber?: string;
  autoExpand: boolean;
}

const TYPE_CONFIG: Record<
  ChatbotTypeId,
  { label: string; gradient: string; defaultColor: string; buildPath: string }
> = {
  "chatbot-lead-generation": {
    label: "Lead Generation",
    gradient: "from-purple-500 to-pink-500",
    defaultColor: "#8B5CF6",
    buildPath: "/web/chatbot-lead-generation/build",
  },
  "chatbot-education": {
    label: "Education (MCQ)",
    gradient: "from-green-500 to-emerald-500",
    defaultColor: "#10B981",
    buildPath: "/web/chatbot-education/build",
  },
};

const PRESET_COLORS = [
  "#1a56db",
  "#8B5CF6",
  "#DB2777",
  "#10B981",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#4F46E5",
];

function ColorPicker({
  value,
  onChange,
  isDark,
  styles,
}: {
  value: string;
  onChange: (c: string) => void;
  isDark: boolean;
  styles: any;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              background: c,
              borderColor: value === c ? "#fff" : "transparent",
              outline: value === c ? `2.5px solid ${c}` : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex-shrink-0 border border-gray-200"
          style={{ background: value }}
        />
        <div
          className={`flex items-center gap-1 flex-1 px-3 py-2 rounded-lg border ${styles.input}`}
        >
          <span className={`text-sm ${styles.text.muted}`}>#</span>
          <input
            type="text"
            value={value.replace("#", "")}
            onChange={(e) => {
              const hex = e.target.value
                .replace(/[^0-9a-fA-F]/g, "")
                .slice(0, 6);
              if (hex.length === 6) onChange(`#${hex}`);
            }}
            placeholder="1a56db"
            maxLength={6}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "inherit" }}
          />
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
          title="Pick custom colour"
        />
      </div>
    </div>
  );
}

function WidgetPreview({
  settings,
  isDark,
  isLead,
}: {
  settings: BotSettings;
  isDark: boolean;
  isLead: boolean;
}) {
  const pc = settings.primaryColor || "#1a56db";
  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-md ${
        isDark ? "border-white/[0.08]" : "border-gray-200"
      }`}
      style={{ maxWidth: 300 }}
    >
      <div
        style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}
        className="p-3 flex items-center gap-2"
      >
        <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <div>
          <p className="text-white text-xs font-bold leading-none">
            {settings.name || "Chat Support"}
          </p>
          <p className="text-white/70 text-[10px] mt-0.5">
            Usual reply: 2–3 minutes
          </p>
        </div>
      </div>
      <div className="p-3 bg-gray-50 space-y-2">
        <div className="flex items-end gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex-shrink-0"
            style={{ background: pc }}
          />
          <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-2.5 py-1.5 text-[11px] text-gray-700 max-w-[80%]">
            {settings.welcomeMessage || "Hi! How can I help?"}
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="rounded-xl rounded-br-sm px-2.5 py-1.5 text-[11px] text-white max-w-[70%]"
            style={{ background: pc }}
          >
            How do I get started?
          </div>
        </div>
      </div>
      <div className="flex border-t border-gray-200 bg-white">
        {isLead
          ? ["Chat", "FAQ", "Book"].map((t, i) => (
              <div
                key={t}
                className="flex-1 text-center py-1.5 text-[10px] font-medium"
                style={
                  i === 0
                    ? { color: pc, borderTop: `2px solid ${pc}` }
                    : { color: "#9ca3af" }
                }
              >
                {t}
              </div>
            ))
          : ["Chat", "Quiz", "Progress"].map((t, i) => (
              <div
                key={t}
                className="flex-1 text-center py-1.5 text-[10px] font-medium"
                style={
                  i === 0
                    ? { color: pc, borderTop: `2px solid ${pc}` }
                    : { color: "#9ca3af" }
                }
              >
                {t}
              </div>
            ))}
      </div>
    </div>
  );
}

export default function ChatbotSettingsPage() {
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

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "ready"
  >("checking");
  const [chatbot, setChatbot] = useState<any>(null);
  const [settings, setSettings] = useState<BotSettings>({
    name: "",
    welcomeMessage: "Hi! How can I help you today?",
    primaryColor: cfg?.defaultColor || "#8B5CF6",
    position: "bottom-right",
    websiteUrl: "",
    whatsappNumber: "",
    autoExpand: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  // URL update state
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
  const [urlUpdateStatus, setUrlUpdateStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [urlUpdateMessage, setUrlUpdateMessage] = useState("");

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");

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
          return;
        }
        setChatbot(found);
        setSettings({
          name: found.name || "",
          welcomeMessage:
            found.settings?.welcomeMessage || "Hi! How can I help you today?",
          primaryColor:
            found.settings?.primaryColor || cfg?.defaultColor || "#8B5CF6",
          position: found.settings?.position || "bottom-right",
          websiteUrl: found.websiteUrl || "",
          whatsappNumber: found.phone || "",
          autoExpand: found.settings?.autoExpand ?? true,
        });
        setPageStatus("ready");
      } catch {
        setPageStatus("not-built");
      }
    };
    load();
  }, [userId, chatbotType, apiRequest, cfg]);

  function update<K extends keyof BotSettings>(key: K, val: BotSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
    setUrlUpdateStatus("idle");
  }

  async function handleSave() {
    if (!chatbotType) return;
    setIsSaving(true);
    try {
      await updateWebChatbot(apiRequest, chatbotType, {
        name: settings.name.trim(),
        websiteUrl: isLead ? settings.websiteUrl : undefined,
        phone: isLead ? settings.whatsappNumber : undefined,
        settings: {
          welcomeMessage: settings.welcomeMessage.trim(),
          primaryColor: settings.primaryColor,
          position: settings.position,
          autoExpand: settings.autoExpand,
        },
      });
      setIsDirty(false);
      toast({ title: "Settings saved!", duration: 2500 });
    } catch {
      toast({
        title: "Failed to save settings",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Handle website URL update and rescrape
  const handleUpdateAndRescrape = async () => {
    if (!chatbotType || !isLead) return;

    const url = settings.websiteUrl.trim();
    if (!url) {
      toast({
        title: "Please enter a website URL",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      toast({
        title: "URL must start with http:// or https://",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsUpdatingUrl(true);
    setUrlUpdateStatus("idle");
    setUrlUpdateMessage("");

    try {
      // First update the website URL
      await updateWebChatbot(apiRequest, chatbotType, {
        websiteUrl: url,
      });

      // Then rescrape the website
      const scrapeResult = await scrapeWebsite(
        apiRequest,
        url,
        chatbot?._id || chatbotType,
      );

      if (scrapeResult.alreadyScrapped) {
        setUrlUpdateStatus("success");
        setUrlUpdateMessage("Website already scraped, using existing data.");
        toast({ title: "Website already scraped", duration: 3000 });
      } else if (scrapeResult.success) {
        const processResult = await processScrapedData(apiRequest, {
          ...scrapeResult.data,
          chatbotId: chatbot?._id || chatbotType,
        });

        if (processResult.success) {
          setUrlUpdateStatus("success");
          setUrlUpdateMessage(
            "Website scraped and knowledge base updated successfully!",
          );
          toast({ title: "Knowledge base updated!", duration: 3000 });

          // Refresh chatbot data
          const data = await getChatbots(apiRequest);
          const found = (data.chatbots || []).find(
            (b: any) => b.type === chatbotType,
          );
          if (found) {
            setChatbot(found);
          }
        } else {
          throw new Error("Data processing failed");
        }
      } else {
        throw new Error("Scraping failed");
      }
    } catch (err: any) {
      setUrlUpdateStatus("error");
      setUrlUpdateMessage(err.message || "Failed to update knowledge base");
      toast({
        title: "Update failed",
        description: err.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdatingUrl(false);
    }
  };

  // Handle file upload for knowledge base
  const handleFileUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "Please select a file",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("chatbotId", chatbot?._id || chatbotType || "");
      formData.append("userId", userId || "");

      const response = await fetch("/api/misc/upload-knowledge", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus("success");
        setUploadMessage("File uploaded and added to knowledge base!");
        toast({ title: "Knowledge base updated!", duration: 3000 });
        setUploadedFile(null);

        // Refresh chatbot data
        const data = await getChatbots(apiRequest);
        const found = (data.chatbots || []).find(
          (b: any) => b.type === chatbotType,
        );
        if (found) {
          setChatbot(found);
        }
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (err: any) {
      setUploadStatus("error");
      setUploadMessage(err.message || "Failed to upload file");
      toast({
        title: "Upload failed",
        description: err.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteChatbot = async () => {
    if (!chatbot) return;
    setIsDeleting(true);
    try {
      await deleteChatbot(apiRequest, chatbot.type);
      toast({
        title: "Chatbot deleted",
        description: "You can now create a new chatbot of this type",
        duration: 3000,
      });
      setShowDeleteDialog(false);
      setChatbot(null);
      router.push("/web");
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

  if (!isValid || !cfg) return null;

  if (pageStatus === "checking") {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
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
            Create your {cfg.label} chatbot to access its settings.
          </p>
          <Link
            href={cfg.buildPath}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${cfg.gradient} text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}
          >
            Build Chatbot
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
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}
            >
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Chatbot Settings
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>{cfg.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white rounded-xl disabled:opacity-40`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Form */}
          <div className="space-y-5">
            {/* Bot identity */}
            <div className={`${styles.card} p-5 rounded-2xl`}>
              <div className="flex items-center gap-2 mb-4">
                <Bot
                  className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                />
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Bot Identity
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
                  >
                    Bot Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Sales Assistant"
                    maxLength={60}
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${styles.input}`}
                  />
                </div>
                {isLead && (
                  <>
                    <div>
                      <label
                        className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
                      >
                        Website URL
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            isDark
                              ? "bg-white/[0.05] border-white/[0.09]"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <input
                            type="url"
                            value={settings.websiteUrl}
                            onChange={(e) =>
                              update("websiteUrl", e.target.value)
                            }
                            placeholder="https://yourwebsite.com"
                            className={`flex-1 text-sm bg-transparent outline-none ${
                              isDark
                                ? "text-white placeholder-white/30"
                                : "text-gray-700 placeholder-gray-400"
                            }`}
                          />
                        </div>
                        <button
                          onClick={handleUpdateAndRescrape}
                          disabled={isUpdatingUrl}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            isLead
                              ? "bg-purple-500 hover:bg-purple-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          } disabled:opacity-50`}
                        >
                          {isUpdatingUrl ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Update
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {urlUpdateStatus === "success" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="h-3 w-3" />
                            {urlUpdateMessage}
                          </span>
                        )}
                        {urlUpdateStatus === "error" && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <XCircle className="h-3 w-3" />
                            {urlUpdateMessage}
                          </span>
                        )}
                      </div>
                      {chatbot?.isScrapped && (
                        <p className={`text-xs mt-1.5 ${styles.text.muted}`}>
                          ✓ Knowledge base is active with{" "}
                          {chatbot?.scrappedFile ? "website data" : "no data"}
                        </p>
                      )}
                    </div>

                    {/* File Upload Section */}
                    <div className="pt-2 border-t border-gray-200 dark:border-white/[0.08]">
                      <label
                        className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
                      >
                        Upload Knowledge Base File
                      </label>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border overflow-hidden ${
                          isDark
                            ? "bg-white/[0.05] border-white/[0.09]"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="file"
                          accept=".txt,.pdf,.md,.json,.csv"
                          onChange={(e) =>
                            setUploadedFile(e.target.files?.[0] || null)
                          }
                          className="flex-1  text-sm bg-transparent outline-none file:mr-2 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium file:border-0 file:cursor-pointer file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={handleFileUpload}
                          disabled={isUploading || !uploadedFile}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            isLead
                              ? "bg-purple-500 hover:bg-purple-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          } disabled:opacity-50`}
                        >
                          {isUploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          Upload File
                        </button>
                        {uploadStatus === "success" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="h-3 w-3" />
                            {uploadMessage}
                          </span>
                        )}
                        {uploadStatus === "error" && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <XCircle className="h-3 w-3" />
                            {uploadMessage}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1.5 ${styles.text.muted}`}>
                        Supported formats: .txt, .pdf, .md, .json, .csv (Max
                        10MB)
                      </p>
                    </div>

                    <div>
                      <label
                        className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
                      >
                        WhatsApp Number
                      </label>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          isDark
                            ? "bg-white/[0.05] border-white/[0.09]"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="tel"
                          value={settings.whatsappNumber || ""}
                          onChange={(e) =>
                            update("whatsappNumber", e.target.value)
                          }
                          placeholder="+1234567890"
                          className={`flex-1 text-sm bg-transparent outline-none ${
                            isDark
                              ? "text-white placeholder-white/30"
                              : "text-gray-700 placeholder-gray-400"
                          }`}
                        />
                      </div>
                      <p className={`text-xs mt-1.5 ${styles.text.muted}`}>
                        Lead information will be forwarded to this WhatsApp
                        number
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Welcome message */}
            <div className={`${styles.card} p-5 rounded-2xl`}>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare
                  className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-500"}`}
                />
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Welcome Message
                </h2>
              </div>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => update("welcomeMessage", e.target.value)}
                placeholder="Hi! How can I help you today?"
                maxLength={200}
                rows={3}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none resize-none ${styles.input}`}
              />
              <p className={`text-xs mt-1.5 ${styles.text.muted}`}>
                {settings.welcomeMessage.length}/200 — shown as the first bot
                message when someone opens the chat
              </p>
            </div>

            {/* Brand colour */}
            <div className={`${styles.card} p-5 rounded-2xl`}>
              <div className="flex items-center gap-2 mb-4">
                <Palette
                  className={`h-4 w-4 ${isDark ? "text-pink-400" : "text-pink-500"}`}
                />
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Brand Colour
                </h2>
              </div>
              <ColorPicker
                value={settings.primaryColor}
                onChange={(c) => update("primaryColor", c)}
                isDark={isDark}
                styles={styles}
              />
            </div>

            {/* Widget position & Auto-expand */}
            <div className={`${styles.card} p-5 rounded-2xl`}>
              <div className="flex items-center gap-2 mb-4">
                <MapPin
                  className={`h-4 w-4 ${isDark ? "text-orange-400" : "text-orange-500"}`}
                />
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Widget Position
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(["bottom-right", "bottom-left"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => update("position", pos)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      settings.position === pos
                        ? isDark
                          ? `border-${isLead ? "purple-500" : "green-500"} bg-${isLead ? "purple-500/10" : "green-500/10"} text-${isLead ? "purple-400" : "green-400"}`
                          : `border-${isLead ? "purple-500" : "green-500"} bg-${isLead ? "purple-50" : "green-50"} text-${isLead ? "purple-700" : "green-700"}`
                        : isDark
                          ? "border-white/[0.08] text-white/60 hover:bg-white/[0.04]"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-7 rounded border-2 relative ${
                        isDark ? "border-white/20" : "border-gray-300"
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full absolute"
                        style={{
                          background:
                            settings.position === pos
                              ? settings.primaryColor
                              : isDark
                                ? "#6b7280"
                                : "#d1d5db",
                          bottom: 2,
                          [pos === "bottom-right" ? "right" : "left"]: 2,
                        }}
                      />
                    </div>
                    {pos === "bottom-right" ? "Bottom Right" : "Bottom Left"}
                  </button>
                ))}
              </div>

              {/* Auto-expand toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/[0.08]">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Auto-expand widget
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Automatically show chat on page load
                  </p>
                </div>
                <button
                  onClick={() => update("autoExpand", !settings.autoExpand)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoExpand
                      ? isLead
                        ? "bg-purple-500"
                        : "bg-green-500"
                      : "bg-gray-300 dark:bg-white/[0.1]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoExpand ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-6 h-fit space-y-5">
            <div className={`${styles.card} p-4 rounded-2xl`}>
              <div className="flex items-center justify-between mb-4">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${styles.text.secondary}`}
                >
                  Live Preview
                </p>
                <button
                  onClick={() => setPreviewEnabled(!previewEnabled)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  {previewEnabled ? (
                    <Eye className="h-3.5 w-3.5 text-gray-500" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </button>
              </div>
              {previewEnabled ? (
                <WidgetPreview
                  settings={settings}
                  isDark={isDark}
                  isLead={isLead}
                />
              ) : (
                <div
                  className={`rounded-2xl p-6 text-center border ${
                    isDark ? "border-white/[0.08]" : "border-gray-200"
                  }`}
                >
                  <Smartphone className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className={`text-xs ${styles.text.muted}`}>
                    Preview disabled. Click the eye icon to enable.
                  </p>
                </div>
              )}
              <p className={`text-xs mt-3 text-center ${styles.text.muted}`}>
                Updates as you type
              </p>
            </div>

            {/* Knowledge Base Status */}
            {isLead && (
              <div className={`${styles.card} p-4 rounded-2xl`}>
                <h3
                  className={`text-sm font-semibold ${styles.text.primary} mb-3`}
                >
                  Knowledge Base Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${styles.text.secondary}`}>
                      Website URL:
                    </span>
                    <span
                      className={`text-xs font-mono ${styles.text.primary}`}
                    >
                      {settings.websiteUrl ? "✓ Configured" : "❌ Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${styles.text.secondary}`}>
                      Scraped Data:
                    </span>
                    <span className={`text-xs ${styles.text.primary}`}>
                      {chatbot?.isScrapped ? "✓ Active" : "❌ Not scraped"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${styles.text.secondary}`}>
                      Knowledge Base:
                    </span>
                    <span className={`text-xs ${styles.text.primary}`}>
                      {chatbot?.scrappedFile ? "✓ Ready" : "❌ Empty"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div
              className={`rounded-2xl p-5 ${
                isDark
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle
                  className={`h-4 w-4 ${isDark ? "text-red-400" : "text-red-600"}`}
                />
                <h3
                  className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-700"}`}
                >
                  Danger Zone
                </h3>
              </div>
              <p
                className={`text-xs ${isDark ? "text-red-300/70" : "text-red-600"} mb-4`}
              >
                Deleting your chatbot will permanently remove all conversations,
                FAQ questions, and settings. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isDark
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                    : "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                }`}
              >
                <Trash2 className="h-4 w-4" />
                Delete Chatbot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteChatbot}
        title={`Delete "${chatbot?.name || "Chatbot"}"?`}
        description="This will permanently remove all conversations, FAQ questions, and settings. This action cannot be undone."
        confirmText="Yes, delete permanently"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        acknowledgements={[
          {
            id: "chatbot-delete-subscription",
            label:
              "I understand deleting this chatbot permanently removes the chatbot, its settings, and any connected subscription access.",
          },
          {
            id: "chatbot-delete-contacts-emails",
            label:
              "I understand all conversations, contacts, leads, collected emails, FAQ data, and related chatbot data will be permanently lost.",
          },
        ]}
      />
    </div>
  );
}
