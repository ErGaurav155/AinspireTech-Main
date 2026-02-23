"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getChatbots, updateWebChatbot } from "@/lib/services/web-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import { Switch } from "@rocketreplai/ui/components/radix/switch";

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
  const { userId } = useAuth();
  const { apiRequest } = useApi();

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

  const loadSettings = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const data = await getChatbots(apiRequest);
      const leadChatbot = data.chatbots?.find(
        (bot: any) => bot.type === "chatbot-lead-generation",
      );

      if (leadChatbot) {
        setChatbot(leadChatbot);
        setSettings({
          welcomeMessage:
            leadChatbot.settings?.welcomeMessage ||
            "Hi! How can I help you today?",
          primaryColor: leadChatbot.settings?.primaryColor || "#8B5CF6",
          position: leadChatbot.settings?.position || "bottom-right",
          autoExpand: leadChatbot.settings?.autoExpand ?? true,
          whatsappNumber: leadChatbot.phone,
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
  }, [userId, apiRequest]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    if (!chatbot) return;

    setIsSaving(true);
    try {
      await updateWebChatbot(apiRequest, chatbot.id, {
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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="p-12 text-center">
          <p className="text-gray-500">
            Build your chatbot first to configure settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Chatbot Settings
              </h1>
              <p className="text-sm text-gray-500">
                Configure your lead generation chatbot
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
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
            <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-500" />
                Appearance
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
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
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Widget Position
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setSettings({ ...settings, position: "bottom-right" })
                      }
                      className={`flex items-center justify-center gap-2 p-3 border rounded-xl transition-colors ${
                        settings.position === "bottom-right"
                          ? "border-purple-500 bg-purple-50 text-purple-600"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Laptop className="h-4 w-4" />
                      Bottom Right
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, position: "bottom-left" })
                      }
                      className={`flex items-center justify-center gap-2 p-3 border rounded-xl transition-colors ${
                        settings.position === "bottom-left"
                          ? "border-purple-500 bg-purple-50 text-purple-600"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      Bottom Left
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Auto-expand widget
                    </p>
                    <p className="text-xs text-gray-500">
                      Automatically show chat on page load
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoExpand}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoExpand: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Welcome Message
              </h3>

              <div>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, welcomeMessage: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                  placeholder="Enter welcome message..."
                />
                <p className="text-xs text-gray-400 mt-2">
                  {settings.welcomeMessage.length}/200 characters
                </p>
              </div>
            </div>

            {/* WhatsApp Integration */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-500" />
                WhatsApp Integration
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number (with country code)
                </label>
                <input
                  type="tel"
                  value={settings.whatsappNumber || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Lead information will be forwarded to this WhatsApp number
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Danger Zone */}
          <div className="space-y-6">
            {/* Live Preview Toggle */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Preview</h3>

              <button
                onClick={() => setPreviewEnabled(!previewEnabled)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  previewEnabled
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Chatbot Widget</span>
                  {previewEnabled ? (
                    <Eye className="h-4 w-4 text-purple-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500 text-left">
                  {previewEnabled ? "Preview active" : "Click to preview"}
                </p>
              </button>

              {previewEnabled && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs">
                      AI
                    </div>
                    <div className="flex-1">
                      <div className="bg-purple-100 rounded-2xl rounded-tl-none p-3">
                        <p className="text-xs text-gray-700">
                          {settings.welcomeMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white border border-red-200 rounded-2xl p-6">
              <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </h3>

              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Chatbot
              </button>
              <p className="text-xs text-gray-400 mt-3">
                This will permanently delete your chatbot and all associated
                data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chatbot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your lead generation chatbot? This
              will permanently remove all conversations, FAQ questions, and
              settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChatbot}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
