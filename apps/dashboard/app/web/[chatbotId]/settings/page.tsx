"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Settings,
  Save,
  RefreshCw,
  Palette,
  MessageSquare,
  Globe,
  Phone,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getChatbots, updateWebChatbot } from "@/lib/services/web-actions.api";
import { Button, Orbs, Switch, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useParams, useRouter } from "next/navigation";

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

export default function LeadSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  // Local styles specific to this component
  const localStyles = useMemo(
    () => ({
      // Header
      headerIcon: isDark
        ? "w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center opacity-90"
        : "w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center",
      headerTitle: isDark
        ? "text-xl font-bold text-white"
        : "text-xl font-bold text-gray-800",
      headerSub: isDark ? "text-sm text-white/40" : "text-sm text-gray-500",

      // Section header
      sectionHeader: isDark
        ? "font-semibold text-white mb-4 flex items-center gap-2"
        : "font-semibold text-gray-800 mb-4 flex items-center gap-2",
      sectionHeaderIcon: isDark ? "text-purple-400" : "text-purple-500",

      // Position buttons
      positionButton: (isSelected: boolean) =>
        isDark
          ? `flex items-center justify-center gap-1 md:gap-2 p-2 md:p-3 border rounded-xl transition-colors ${
              isSelected
                ? "border-purple-500 bg-purple-500/10 text-purple-400"
                : "border-white/[0.08] hover:border-purple-500/50 text-white/60"
            }`
          : `flex items-center justify-center gap-2 p-3 border rounded-xl transition-colors ${
              isSelected
                ? "border-purple-500 bg-purple-50 text-purple-600"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`,

      // Color picker
      colorPicker: isDark
        ? "w-12 h-12 rounded-lg border border-white/[0.08] cursor-pointer bg-transparent"
        : "w-12 h-12 rounded-lg border border-gray-200 cursor-pointer",

      // Preview toggle
      previewButton: (isEnabled: boolean) =>
        isDark
          ? `w-full p-4 rounded-xl border-2 transition-all ${
              isEnabled
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/[0.08] hover:border-purple-500/50"
            }`
          : `w-full p-4 rounded-xl border-2 transition-all ${
              isEnabled
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`,
      previewIcon: isDark ? "text-purple-400" : "text-purple-500",

      // Preview message box
      previewBox: isDark
        ? "mt-4 p-3 bg-white/[0.03] rounded-xl"
        : "mt-4 p-3 bg-gray-50 rounded-xl",
      previewMessage: isDark
        ? "bg-purple-500/20 rounded-2xl rounded-tl-none p-3"
        : "bg-purple-100 rounded-2xl rounded-tl-none p-3",
      previewMessageText: isDark
        ? "text-xs text-white/80"
        : "text-xs text-gray-700",

      // Danger zone
      dangerZone: isDark
        ? "bg-white/[0.04] border border-red-500/30 rounded-2xl p-6"
        : "bg-white border border-red-200 rounded-2xl p-6",
      dangerTitle: isDark ? "text-red-400" : "text-red-600",
      dangerButton: isDark
        ? "w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
        : "w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors",
      dangerText: isDark
        ? "text-xs text-white/40 mt-3"
        : "text-xs text-gray-400 mt-3",

      // Buttons
      buttonSave: (disabled?: boolean) =>
        isDark
          ? `bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`
          : `bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`,

      // Switch track (already in central styles but we can keep if needed)
      switchTrack: isDark
        ? "data-[state=checked]:bg-purple-500/50 data-[state=unchecked]:bg-white/[0.06]"
        : "data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-200",

      // Empty state
      emptyText: isDark ? "text-white/40" : "text-gray-500",

      // Loading
      loadingSpinner: isDark
        ? "w-5 h-5 border-2 border-t-transparent border-purple-400 rounded-full animate-spin"
        : "w-5 h-5 border-2 border-t-transparent border-purple-500 rounded-full animate-spin",

      // Alert dialog
      dialogContent: isDark
        ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl"
        : "bg-white border border-gray-100 rounded-2xl",
      dialogTitle: isDark ? "text-white" : "text-gray-900",
      dialogDesc: isDark ? "text-white/60" : "text-gray-500",
      dialogCancel: isDark
        ? "rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.09]"
        : "rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200",
      dialogAction: "rounded-xl bg-red-500 hover:bg-red-600 text-white",
    }),
    [isDark],
  );

  const loadSettings = useCallback(async () => {
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
      const isChatbot = data.chatbots?.find(
        (bot: any) => bot.type === chatbotId,
      );

      if (isChatbot) {
        setChatbot(isChatbot);
        setSettings({
          welcomeMessage:
            isChatbot.settings?.welcomeMessage ||
            "Hi! How can I help you today?",
          primaryColor: isChatbot.settings?.primaryColor || "#8B5CF6",
          position: isChatbot.settings?.position || "bottom-right",
          autoExpand: isChatbot.settings?.autoExpand ?? true,
          whatsappNumber: isChatbot.phone,
          collectPhone: true,
          collectEmail: true,
          requireName: true,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Failed to load settings",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest, chatbotId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
    } catch (error) {
      console.error("Error saving settings:", error);
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
    // This would need a delete endpoint
    setShowDeleteDialog(false);
    toast({
      title: "Feature coming soon",
      description: "Chatbot deletion will be available soon",
      duration: 3000,
    });
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FA]"}`}
      >
        <div className={localStyles.loadingSpinner} />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="p-12 text-center">
          <p className={localStyles.emptyText}>
            Build your chatbot first to configure settings
          </p>
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
  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={localStyles.headerIcon}>
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={localStyles.headerTitle}>Chatbot Settings</h1>
              <p className={localStyles.headerSub}>
                Configure your lead generation chatbot
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={localStyles.buttonSave(isSaving)}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appearance */}
            <div className={styles.card}>
              <div className="p-4 md:p-6">
                <h3 className={localStyles.sectionHeader}>
                  <Palette
                    className={`h-4 w-4 ${localStyles.sectionHeaderIcon}`}
                  />
                  Appearance
                </h3>

                <div className="space-y-4">
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
                        className={localStyles.colorPicker}
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
                        className={`${styles.input} w-[95%] md:w-[90%]  rounded-lg p-2`}
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>

                  <div className="text-sm md:text-base font-light md:font-normal">
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
                        className={localStyles.positionButton(
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
                        className={localStyles.positionButton(
                          settings.position === "bottom-left",
                        )}
                      >
                        <Smartphone className="h-4 w-4" />
                        Bottom Left
                      </button>
                    </div>
                  </div>

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
                      className={localStyles.switchTrack}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.card}>
              <div className="p-6">
                <h3 className={localStyles.sectionHeader}>
                  <MessageSquare
                    className={`h-4 w-4 ${localStyles.sectionHeaderIcon}`}
                  />
                  Welcome Message
                </h3>

                <div>
                  <textarea
                    value={settings.welcomeMessage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        welcomeMessage: e.target.value,
                      })
                    }
                    rows={3}
                    className={`${styles.input} w-[95%] md:w-[90%]  rounded-lg p-2`}
                    placeholder="Enter welcome message..."
                  />
                  <p
                    className={`text-xs mt-2 ${isDark ? "text-white/40" : "text-gray-400"}`}
                  >
                    {settings.welcomeMessage.length}/200 characters
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Integration */}
            <div className={styles.card}>
              <div className="p-6">
                <h3 className={localStyles.sectionHeader}>
                  <Phone
                    className={`h-4 w-4 ${localStyles.sectionHeaderIcon}`}
                  />
                  WhatsApp Integration
                </h3>

                <div>
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
                    className={`${styles.input} w-[95%] md:w-[90%]  rounded-lg p-2`}
                  />
                  <p
                    className={`text-xs mt-2 ${isDark ? "text-white/40" : "text-gray-400"}`}
                  >
                    Lead information will be forwarded to this WhatsApp number
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Danger Zone */}
          <div className="space-y-6">
            {/* Live Preview Toggle */}
            <div className={styles.card}>
              <div className="p-6">
                <h3
                  className={`font-semibold ${isDark ? "text-white" : "text-gray-800"} mb-4`}
                >
                  Preview
                </h3>

                <button
                  onClick={() => setPreviewEnabled(!previewEnabled)}
                  className={localStyles.previewButton(previewEnabled)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-700"}`}
                    >
                      Chatbot Widget
                    </span>
                    {previewEnabled ? (
                      <Eye className={`h-4 w-4 ${localStyles.previewIcon}`} />
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
                  <div className={localStyles.previewBox}>
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs">
                        AI
                      </div>
                      <div className="flex-1">
                        <div className={localStyles.previewMessage}>
                          <p className={localStyles.previewMessageText}>
                            {settings.welcomeMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className={localStyles.dangerZone}>
              <h3
                className={`font-semibold mb-4 flex items-center gap-2 ${localStyles.dangerTitle}`}
              >
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </h3>

              <button
                onClick={() => setShowDeleteDialog(true)}
                className={localStyles.dangerButton}
              >
                <Trash2 className="h-4 w-4" />
                Delete Chatbot
              </button>
              <p className={localStyles.dangerText}>
                This will permanently delete your chatbot and all associated
                data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => handleDeleteChatbot}
        title="Delete Chatbot"
        description={`Are you sure you want to delete your lead generation chatbot? This
              will permanently remove all conversations, FAQ questions, and
              settings. This action cannot be undone.`}
        confirmText="Delete Permanently"
        isDestructive={true}
      />
    </div>
  );
}
