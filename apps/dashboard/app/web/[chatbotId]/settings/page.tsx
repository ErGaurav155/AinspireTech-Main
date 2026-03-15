"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Settings,
  Save,
  Palette,
  MessageSquare,
  Phone,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Bot,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  deleteChatbot,
  getChatbots,
  updateWebChatbot,
} from "@/lib/services/web-actions.api";
import { Button, Orbs, Switch, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useParams, useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";

interface ChatbotSettings {
  welcomeMessage: string;
  primaryColor: string;
  position: "bottom-right" | "bottom-left";
  autoExpand: boolean;
  whatsappNumber?: string;
  collectPhone: boolean;
  collectEmail: boolean;
  requireName: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_IDS: ChatbotTypeId[] = [
  "chatbot-lead-generation",
  "chatbot-education",
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ── validate type ─────────────────────────────────────────────────────────
  const isValidType = VALID_IDS.includes(chatbotId as ChatbotTypeId);
  const chatbotType = isValidType ? (chatbotId as ChatbotTypeId) : null;
  const cfg = chatbotType ? TYPE_CONFIG[chatbotType] : null;
  const isLead = chatbotType === "chatbot-lead-generation";

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "ready"
  >("checking");
  const [chatbot, setChatbot] = useState<any>(null);
  const [settings, setSettings] = useState<ChatbotSettings>({
    welcomeMessage: "Hi! How can I help you today?",
    primaryColor: "#8B5CF6",
    position: "bottom-right",
    autoExpand: true,
    collectPhone: true,
    collectEmail: true,
    requireName: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  // ── local theme styles ────────────────────────────────────────────────────
  const ls = useMemo(
    () => ({
      headerIcon: `w-10 h-10 rounded-xl bg-gradient-to-br ${cfg?.gradient || "from-purple-500 to-pink-500"} flex items-center justify-center`,
      headerTitle: isDark
        ? "text-xl font-bold text-white"
        : "text-xl font-bold text-gray-800",
      headerSub: isDark ? "text-sm text-white/40" : "text-sm text-gray-500",
      sectionHeader: isDark
        ? "font-semibold text-white mb-4 flex items-center gap-2"
        : "font-semibold text-gray-800 mb-4 flex items-center gap-2",
      sectionIcon: isDark
        ? isLead
          ? "text-purple-400"
          : "text-green-400"
        : isLead
          ? "text-purple-500"
          : "text-green-500",
      positionBtn: (selected: boolean) =>
        isDark
          ? `flex items-center justify-center gap-1 md:gap-2 p-2 md:p-3 border rounded-xl transition-colors ${selected ? (isLead ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-green-500 bg-green-500/10 text-green-400") : "border-white/[0.08] hover:border-white/[0.15] text-white/60"}`
          : `flex items-center justify-center gap-2 p-3 border rounded-xl transition-colors ${selected ? (isLead ? "border-purple-500 bg-purple-50 text-purple-600" : "border-green-500 bg-green-50 text-green-600") : "border-gray-200 hover:border-gray-300 text-gray-600"}`,
      colorPicker: isDark
        ? "w-12 h-12 rounded-lg border border-white/[0.08] cursor-pointer bg-transparent"
        : "w-12 h-12 rounded-lg border border-gray-200 cursor-pointer",
      previewBtn: (on: boolean) =>
        isDark
          ? `w-full p-4 rounded-xl border-2 transition-all ${on ? (isLead ? "border-purple-500 bg-purple-500/10" : "border-green-500 bg-green-500/10") : "border-white/[0.08] hover:border-white/[0.15]"}`
          : `w-full p-4 rounded-xl border-2 transition-all ${on ? (isLead ? "border-purple-500 bg-purple-50" : "border-green-500 bg-green-50") : "border-gray-200 hover:border-gray-300"}`,
      previewIcon: isDark
        ? isLead
          ? "text-purple-400"
          : "text-green-400"
        : isLead
          ? "text-purple-500"
          : "text-green-500",
      previewBox: isDark
        ? "mt-4 p-3 bg-white/[0.03] rounded-xl"
        : "mt-4 p-3 bg-gray-50 rounded-xl",
      previewMsg: isDark
        ? isLead
          ? "bg-purple-500/20 rounded-2xl rounded-tl-none p-3"
          : "bg-green-500/20 rounded-2xl rounded-tl-none p-3"
        : isLead
          ? "bg-purple-100 rounded-2xl rounded-tl-none p-3"
          : "bg-green-100 rounded-2xl rounded-tl-none p-3",
      previewMsgText: isDark
        ? "text-xs text-white/80"
        : "text-xs text-gray-700",
      dangerZone: isDark
        ? "bg-white/[0.04] border border-red-500/30 rounded-2xl p-6"
        : "bg-white border border-red-200 rounded-2xl p-6",
      dangerTitle: isDark ? "text-red-400" : "text-red-600",
      dangerBtn: isDark
        ? "w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
        : "w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors",
      dangerText: isDark
        ? "text-xs text-white/40 mt-3"
        : "text-xs text-gray-400 mt-3",
      saveBtn: (disabled: boolean) =>
        `bg-gradient-to-r ${cfg?.gradient || "from-purple-500 to-pink-500"} hover:opacity-90 text-white rounded-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      switchTrack: isDark
        ? isLead
          ? "data-[state=checked]:bg-purple-500/50 data-[state=unchecked]:bg-white/[0.06]"
          : "data-[state=checked]:bg-green-500/50 data-[state=unchecked]:bg-white/[0.06]"
        : isLead
          ? "data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-200"
          : "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200",
    }),
    [isDark, cfg, isLead],
  );

  // ── redirect invalid type ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isValidType) router.replace("/web");
  }, [isValidType, router]);

  // ── check chatbot exists, then populate settings ──────────────────────────
  useEffect(() => {
    if (!userId || !chatbotType || !cfg) return;
    const init = async () => {
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
          welcomeMessage:
            found.settings?.welcomeMessage || "Hi! How can I help you today?",
          primaryColor: found.settings?.primaryColor || cfg.defaultColor,
          position: found.settings?.position || "bottom-right",
          autoExpand: found.settings?.autoExpand ?? true,
          whatsappNumber: found.phone,
          collectPhone: true,
          collectEmail: true,
          requireName: true,
        });
        setPageStatus("ready");
      } catch {
        toast({
          title: "Failed to load settings",
          variant: "destructive",
          duration: 3000,
        });
        setPageStatus("not-built");
      }
    };
    init();
  }, [userId, chatbotType, cfg, apiRequest]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!chatbot) return;
    setIsSaving(true);
    try {
      await updateWebChatbot(apiRequest, chatbotId, {
        settings: {
          welcomeMessage: settings.welcomeMessage,
          primaryColor: settings.primaryColor,
          position: settings.position,
          autoExpand: settings.autoExpand,
        },
        phone: settings.whatsappNumber,
      });
      toast({
        title: "Settings saved",
        description: "Your chatbot settings have been updated",
        duration: 3000,
      });
    } catch {
      toast({
        title: "Failed to save settings",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChatbot = async () => {
    if (!chatbot) return;
    setShowDeleteDialog(true);
    try {
      await deleteChatbot(apiRequest, chatbot.type);
      toast({
        title: "Chatbot deleted",
        description: "You can now create a new chatbot of this type",
        duration: 3000,
      });
      setShowDeleteDialog(false);
      setChatbot(null);
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };
  // ─── early returns ────────────────────────────────────────────────────────
  if (!isValidType || !cfg) return null;

  // spinner while checking
  if (pageStatus === "checking") {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <div
          className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isDark ? (isLead ? "border-purple-400" : "border-green-400") : isLead ? "border-purple-500" : "border-green-500"}`}
        />
      </div>
    );
  }

  // chatbot not built yet ────────────────────────────────────────────────────
  if (pageStatus === "not-built") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mb-6 shadow-lg`}
          >
            {isLead ? (
              <Bot className="h-10 w-10 text-white" />
            ) : (
              <GraduationCap className="h-10 w-10 text-white" />
            )}
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build your {cfg.label} chatbot first
          </h2>
          <p className={`text-sm ${styles.text.secondary} max-w-md mb-8`}>
            You need to create your {cfg.label} chatbot before you can configure
            its settings.
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

  // main settings page ───────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={ls.headerIcon}>
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={ls.headerTitle}>Chatbot Settings</h1>
              <p className={ls.headerSub}>Configure your {cfg.label} chatbot</p>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={ls.saveBtn(isSaving)}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appearance */}
            <div className={styles.card}>
              <div className="p-4 md:p-6">
                <h3 className={ls.sectionHeader}>
                  <Palette className={`h-4 w-4 ${ls.sectionIcon}`} />
                  Appearance
                </h3>
                <div className="space-y-4">
                  {/* Primary color */}
                  <div>
                    <label
                      className={`block text-sm font-medium ${isDark ? "text-white/80" : "text-gray-700"} mb-2`}
                    >
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            primaryColor: e.target.value,
                          })
                        }
                        className={ls.colorPicker}
                      />
                      <input
                        type="text"
                        value={settings.primaryColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            primaryColor: e.target.value,
                          })
                        }
                        className={`${styles.input} w-[95%] md:w-[90%] rounded-lg p-2`}
                        placeholder={cfg.defaultColor}
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div>
                    <label
                      className={`block text-sm font-medium ${isDark ? "text-white/80" : "text-gray-700"} mb-2`}
                    >
                      Widget Position
                    </label>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() =>
                          setSettings({ ...settings, position: "bottom-right" })
                        }
                        className={ls.positionBtn(
                          settings.position === "bottom-right",
                        )}
                      >
                        <Laptop className="h-4 w-4" />
                        Bottom Right
                      </button>
                      <button
                        onClick={() =>
                          setSettings({ ...settings, position: "bottom-left" })
                        }
                        className={ls.positionBtn(
                          settings.position === "bottom-left",
                        )}
                      >
                        <Smartphone className="h-4 w-4" />
                        Bottom Left
                      </button>
                    </div>
                  </div>

                  {/* Auto-expand */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-700"}`}
                      >
                        Auto-expand widget
                      </p>
                      <p
                        className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}
                      >
                        Automatically show chat on page load
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoExpand}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, autoExpand: checked })
                      }
                      className={ls.switchTrack}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Welcome message */}
            <div className={styles.card}>
              <div className="p-6">
                <h3 className={ls.sectionHeader}>
                  <MessageSquare className={`h-4 w-4 ${ls.sectionIcon}`} />
                  Welcome Message
                </h3>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, welcomeMessage: e.target.value })
                  }
                  rows={3}
                  maxLength={200}
                  className={`${styles.input} w-[95%] md:w-[90%] rounded-lg p-2`}
                  placeholder="Enter welcome message..."
                />
                <p
                  className={`text-xs mt-2 ${isDark ? "text-white/40" : "text-gray-400"}`}
                >
                  {settings.welcomeMessage.length}/200 characters
                </p>
              </div>
            </div>

            {/* WhatsApp — lead only */}
            {isLead && (
              <div className={styles.card}>
                <div className="p-6">
                  <h3 className={ls.sectionHeader}>
                    <Phone className={`h-4 w-4 ${ls.sectionIcon}`} />
                    WhatsApp Integration
                  </h3>
                  <label
                    className={`block text-sm font-medium ${isDark ? "text-white/80" : "text-gray-700"} mb-2`}
                  >
                    WhatsApp Number (with country code)
                  </label>
                  <input
                    type="tel"
                    value={settings.whatsappNumber || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsappNumber: e.target.value,
                      })
                    }
                    placeholder="+1234567890"
                    className={`${styles.input} w-[95%] md:w-[90%] rounded-lg p-2`}
                  />
                  <p
                    className={`text-xs mt-2 ${isDark ? "text-white/40" : "text-gray-400"}`}
                  >
                    Lead information will be forwarded to this WhatsApp number
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Preview */}
            <div className={styles.card}>
              <div className="p-6">
                <h3
                  className={`font-semibold ${isDark ? "text-white" : "text-gray-800"} mb-4`}
                >
                  Preview
                </h3>
                <button
                  onClick={() => setPreviewEnabled(!previewEnabled)}
                  className={ls.previewBtn(previewEnabled)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-700"}`}
                    >
                      Chatbot Widget
                    </span>
                    {previewEnabled ? (
                      <Eye className={`h-4 w-4 ${ls.previewIcon}`} />
                    ) : (
                      <EyeOff
                        className={`h-4 w-4 ${isDark ? "text-white/40" : "text-gray-400"}`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-xs text-left ${isDark ? "text-white/40" : "text-gray-500"}`}
                  >
                    {previewEnabled ? "Preview active" : "Click to preview"}
                  </p>
                </button>
                {previewEnabled && (
                  <div className={ls.previewBox}>
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white text-xs flex-shrink-0`}
                      >
                        AI
                      </div>
                      <div className="flex-1">
                        <div className={ls.previewMsg}>
                          <p className={ls.previewMsgText}>
                            {settings.welcomeMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Danger zone */}
            <div className={ls.dangerZone}>
              <h3
                className={`font-semibold mb-4 flex items-center gap-2 ${ls.dangerTitle}`}
              >
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </h3>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className={ls.dangerBtn}
              >
                <Trash2 className="h-4 w-4" />
                Delete Chatbot
              </button>
              <p className={ls.dangerText}>
                This will permanently delete your chatbot and all associated
                data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete dialog — inline confirm to avoid iframe collapse */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteChatbot}
        title="Delete Chatbot"
        description={`Are you sure you want to delete your ${cfg.label} chatbot? This will permanently remove all conversations, FAQ questions, and settings. This action cannot be undone.`}
        confirmText="Delete Permanently"
        isDestructive
      />
    </div>
  );
}
