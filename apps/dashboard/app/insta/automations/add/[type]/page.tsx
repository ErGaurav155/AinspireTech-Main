"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  X,
  Link as LinkIcon,
  Info,
  Crown,
  Upload,
  ChevronRight,
  Bookmark,
  Activity,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Lock,
  Loader2,
  FileText,
  Video,
  Instagram,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  createInstaTemplate,
  getInstaMedia,
  getInstaTemplateById,
  updateTemplate,
  uploadMedia,
  type MediaItem,
  type TemplateType,
} from "@/lib/services/insta-actions.api";
import { Button, Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { useInstaAccount } from "@/context/Instaaccountcontext ";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpLink {
  url: string;
  buttonTitle: string;
}

interface FollowUpMessage {
  condition: string;
  waitTime: number;
  waitUnit: "minutes" | "hours";
  message: string;
  links: FollowUpLink[];
}

interface AutomationForm {
  name: string;
  accountUsername: string;
  accountId: string;
  // Post/story selection
  anyPostOrReel: boolean;
  mediaId: string;
  mediaUrl: string;
  mediaType: string;
  // Keyword triggers
  anyKeyword: boolean;
  keywords: string[];
  keywordInput: string;
  // DM content (the final link message)
  dmMessage: string;
  dmLinks: { url: string; buttonTitle: string }[];
  // DM media attachment (Cloudinary)
  dmMediaUrl: string;
  dmMediaType: string;
  dmMediaPublicId: string;
  // Welcome message
  welcomeText: string;
  welcomeButtonTitle: string;
  // Public reply (comments only)
  publicReply: boolean;
  publicReplies: string[];
  tagType: "none" | "user" | "account";
  // Ask follow
  askFollow: boolean;
  askFollowMessage: string;
  visitProfileBtn: string;
  followingBtn: string;
  // Ask email (all types)
  askEmail: boolean;
  emailOpeningMessage: string;
  emailRetryMessage: string;
  emailNoValidAction: "send" | "nosend";
  // Ask phone (all types)
  askPhone: boolean;
  phoneOpeningMessage: string;
  phoneRetryMessage: string;
  phoneNoValidAction: "send" | "nosend";
  // Follow-up DMs
  followUpDMs: boolean;
  followUpMessages: FollowUpMessage[];
  // Settings
  delayOption: "immediate" | "3min" | "5min" | "10min";
  isActive: boolean;
  priority: number;
}

const DEFAULT_FORM: AutomationForm = {
  name: "",
  accountUsername: "",
  accountId: "",
  anyPostOrReel: false,
  mediaId: "",
  mediaUrl: "",
  mediaType: "",
  anyKeyword: false,
  keywords: [],
  keywordInput: "",
  dmMessage: "",
  dmLinks: [],
  dmMediaUrl: "",
  dmMediaType: "",
  dmMediaPublicId: "",
  welcomeText:
    "Hi {{username}}! So glad you're interested 🎉\nClick below and I'll share the link with you in a moment 🧲",
  welcomeButtonTitle: "Send me the link",
  publicReply: false,
  publicReplies: [
    "Replied in DMs 📨",
    "Coming your way 🧲",
    "Check your DM 📩",
  ],
  tagType: "none",
  askFollow: false,
  askFollowMessage:
    "Hey! It seems you haven't followed me yet 🙂\n\nHit the follow button on my profile, then tap 'I'm following' below to get your link 🧲",
  visitProfileBtn: "Visit Profile",
  followingBtn: "I'm following ✅",
  askEmail: false,
  emailOpeningMessage:
    "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your email address first. Please share it in the chat.",
  emailRetryMessage:
    "Please enter a correct email address, e.g. info@gmail.com",
  emailNoValidAction: "send",
  askPhone: false,
  phoneOpeningMessage:
    "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your phone number first. Please share it in the chat.",
  phoneRetryMessage: "Please enter a correct phone number, e.g. +1234567890",
  phoneNoValidAction: "send",
  followUpDMs: false,
  followUpMessages: [],
  delayOption: "immediate",
  isActive: false,
  priority: 5,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
  isDark,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative rounded-full transition-colors flex-shrink-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-pink-500" : isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="absolute bg-white rounded-full shadow-sm transition-all"
        style={{ width: 18, height: 18, top: 3, left: checked ? 23 : 3 }}
      />
    </button>
  );
}

function CharCounter({
  current,
  max,
  isDark,
}: {
  current: number;
  max: number;
  isDark: boolean;
}) {
  const pct = (current / max) * 100;
  const r = 8;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  const color =
    pct > 90
      ? "#ef4444"
      : pct > 70
        ? "#f59e0b"
        : isDark
          ? "#4B5563"
          : "#d1d5db";
  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20">
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={isDark ? "#374151" : "#e5e7eb"}
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
        />
      </svg>
      <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
        {current} / {max}
      </span>
    </div>
  );
}

function EditLinkModal({
  link,
  onSave,
  onClose,
  isDark,
}: {
  link: { url: string; buttonTitle: string };
  onSave: (url: string, title: string) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.buttonTitle);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`${isDark ? "bg-[#1A1A1E]" : "bg-white"} rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}
          >
            Edit Link
          </h3>
          <button
            onClick={onClose}
            className={
              isDark
                ? "text-white/40 hover:text-white/60"
                : "text-gray-400 hover:text-gray-600"
            }
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label
              className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"} mb-2 block`}
            >
              Button Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 focus:ring-pink-500/50"
                  : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:ring-pink-200"
              }`}
              placeholder="e.g. Get Access"
            />
          </div>
          <div>
            <label
              className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"} mb-2 block`}
            >
              Link URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 focus:ring-pink-500/50"
                  : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:ring-pink-200"
              }`}
              placeholder="https://example.com"
            />
          </div>
        </div>
        <button
          onClick={() => {
            onSave(url, title);
            onClose();
          }}
          className="w-full mt-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Phone Preview ────────────────────────────────────────────────────────────

function PhonePreview({
  form,
  accountUsername,
  isDark,
}: {
  form: AutomationForm;
  accountUsername: string;
  isDark: boolean;
}) {
  const messages = useMemo(() => {
    const msgs: {
      from: "bot" | "user";
      text: string;
      isButton?: boolean;
      buttonText?: string;
      isDoubleButton?: boolean;
    }[] = [];

    // Welcome message always first
    msgs.push({
      from: "bot",
      text: form.welcomeText || "Hi! So glad you're interested 🎉",
      isButton: true,
      buttonText: form.welcomeButtonTitle || "Send me the link",
    });
    msgs.push({
      from: "user",
      text: form.welcomeButtonTitle || "Send me the link",
    });

    // Priority chain preview
    if (form.askFollow && form.askFollowMessage) {
      msgs.push({
        from: "bot",
        text: form.askFollowMessage,
        isButton: true,
        buttonText: form.visitProfileBtn || "Visit Profile",
        isDoubleButton: true,
      });
      msgs.push({
        from: "user",
        text: form.followingBtn || "I'm following ✅",
      });
    }
    if (form.askEmail && form.emailOpeningMessage) {
      msgs.push({ from: "bot", text: form.emailOpeningMessage });
      msgs.push({ from: "user", text: "test@gmail.com" });
    }
    if (form.askPhone && form.phoneOpeningMessage) {
      msgs.push({ from: "bot", text: form.phoneOpeningMessage });
      msgs.push({ from: "user", text: "+1234567890" });
    }
    if (form.dmMessage || form.dmLinks.length > 0) {
      msgs.push({
        from: "bot",
        text: form.dmMessage || "Here's your link!",
        isButton: form.dmLinks.length > 0,
        buttonText: form.dmLinks[0]?.buttonTitle || "Get Access",
      });
    }
    return msgs;
  }, [form]);

  return (
    <div className="fixed top-24">
      <div
        className="relative mx-auto rounded-[3rem] overflow-hidden shadow-2xl"
        style={{ width: 280, height: 560, border: "8px solid #1a1a1a" }}
      >
        {/* Status bar */}
        <div className="bg-black text-white flex items-center justify-between px-6 pt-3 pb-1">
          <span className="text-xs font-medium">9:41</span>
          <div
            className="w-24 h-5 bg-black rounded-full absolute top-0 left-1/2 -translate-x-1/2 border-4 border-black"
            style={{ width: 100 }}
          />
          <div className="flex items-center gap-1">
            <div className="w-4 h-2.5 border border-white/80 rounded-sm relative">
              <div
                className="absolute inset-0.5 right-0.5 bg-white/80 rounded-sm"
                style={{ right: "25%" }}
              />
            </div>
          </div>
        </div>
        {/* DM screen */}
        <div
          className="bg-[#0a0a0a] flex flex-col"
          style={{ height: "calc(100% - 40px)" }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <button className="text-white/60">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
              {(accountUsername || "A")[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium text-white">
              {accountUsername || "your_account"}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.from === "bot" && (
                  <div className="flex items-end gap-1.5 max-w-[80%]">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex-shrink-0 flex items-center justify-center text-white text-xs">
                      {(accountUsername || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="bg-[#1a1a1a] text-white text-xs rounded-2xl rounded-bl-sm px-3 py-2 leading-relaxed">
                        {msg.text}
                      </div>
                      {msg.isButton && msg.buttonText && (
                        <div className="mt-1.5 bg-[#1a1a1a] border border-white/20 text-white text-xs rounded-xl px-3 py-2 text-center">
                          {msg.buttonText}
                        </div>
                      )}
                      {msg.isDoubleButton && (
                        <div className="mt-1 bg-[#1a1a1a] border border-white/20 text-white text-xs rounded-xl px-3 py-2 text-center">
                          {form.followingBtn || "I'm following ✅"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {msg.from === "user" && (
                  <div className="bg-blue-500 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%]">
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-500">
              Message...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateAutomationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const automationType =
    (params?.type as "comments" | "stories" | "dms") || "comments";
  const editId = searchParams?.get("id") || null;
  const isEditMode = !!editId;

  const { selectedAccount, isAccLoading } = useInstaAccount();
  const [form, setForm] = useState<AutomationForm>(DEFAULT_FORM);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showMoreMedia, setShowMoreMedia] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkBtn, setNewLinkBtn] = useState("Get Access");
  const [editingPublicReplyIndex, setEditingPublicReplyIndex] = useState<
    number | null
  >(null);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  // Follow-up link form state
  const [followUpLinkForms, setFollowUpLinkForms] = useState<
    Record<number, { url: string; title: string; open: boolean }>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ─── Styles ───────────────────────────────────────────────────────────────

  const S = useMemo(
    () => ({
      page: isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen",
      container: "flex flex-1",
      leftPreview:
        "hidden lg:flex sticky top-28 items-start justify-center w-[320px] xl:w-[420px] flex-shrink-0 pt-12 px-8 h-[calc(100vh-77px)]",
      rightContent: "flex-1 overflow-y-auto w-full",
      actionBar:
        "flex items-center justify-end w-full gap-2 px-4 md:px-6 max-w-2xl mx-auto py-4",
      formContainer: "p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-4",
      input: isDark
        ? "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/25 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
        : "w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 placeholder-gray-400 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300",
      textarea: isDark
        ? "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl text-sm focus:outline-none resize-none"
        : "w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 placeholder-gray-400 rounded-xl text-sm focus:outline-none resize-none",
      card: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5"
        : "bg-white border border-gray-100 rounded-2xl p-5",
      cardNoPadding: isDark
        ? "bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden"
        : "bg-white border border-gray-100 rounded-2xl overflow-hidden",
      stepNumber: isDark
        ? "w-7 h-7 rounded-full bg-gray-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
        : "w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0",
      stepTitle: isDark
        ? "font-semibold text-white"
        : "font-semibold text-gray-800",
      sectionToggle: "flex items-center justify-between p-5",
      sectionLabel: isDark
        ? "text-sm font-medium text-white/80"
        : "text-sm font-medium text-gray-700",
      sectionInfoIcon: isDark
        ? "h-4 w-4 text-white/30"
        : "h-4 w-4 text-gray-300",
      sectionContent: isDark
        ? "px-5 pb-5 space-y-3 border-t border-white/[0.06] pt-4"
        : "px-5 pb-5 space-y-3 border-t border-gray-50 pt-4",
      inlineInput: isDark
        ? "flex-1 text-sm text-white bg-transparent focus:outline-none"
        : "flex-1 text-sm text-gray-700 bg-transparent focus:outline-none",
      borderedInput: (active?: boolean) =>
        isDark
          ? `flex items-center gap-2 border rounded-xl px-3 py-2.5 ${active ? "border-pink-500" : "border-white/[0.08]"}`
          : `flex items-center gap-2 border rounded-xl px-3 py-2.5 ${active ? "border-pink-300" : "border-gray-200"}`,
      tagButton: (isSelected: boolean) =>
        isDark
          ? `flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${isSelected ? "border-2 border-pink-400 text-pink-400 bg-pink-500/10" : "border border-white/[0.08] text-white/60 hover:border-pink-500/50"}`
          : `flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${isSelected ? "border-2 border-pink-400 text-pink-600 bg-pink-50" : "border border-gray-200 text-gray-600 hover:border-gray-300"}`,
      delayButton: (isSelected: boolean) =>
        isDark
          ? `flex-1 p-2 rounded-xl text-nowrap text-xs md:text-sm font-medium transition-colors ${isSelected ? "bg-pink-500 text-white" : "text-white/40 hover:text-white/60"}`
          : `flex-1 p-2 rounded-xl text-nowrap text-xs md:text-sm font-medium transition-colors ${isSelected ? "bg-pink-500 text-white" : "text-gray-400 hover:text-gray-600"}`,
      addLinkTrigger: isDark
        ? "w-full py-2.5 border border-white/[0.08] rounded-xl text-sm text-pink-400 font-medium hover:bg-pink-500/10 transition-colors flex items-center justify-center gap-2"
        : "w-full py-2.5 border border-gray-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors flex items-center justify-center gap-2",
      linkItem: isDark
        ? "flex items-center gap-2 mb-2 p-3 bg-white/[0.03] rounded-xl"
        : "flex items-center gap-2 mb-2 p-3 bg-gray-50 rounded-xl",
      linkInput: isDark
        ? "w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-pink-500"
        : "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-300",
      mediaItem: (isSelected: boolean) =>
        isDark
          ? `relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-[#1A1A1E]" : "hover:opacity-90"}`
          : `relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? "ring-2 ring-pink-500 ring-offset-1" : "hover:opacity-90"}`,
      mediaItemLocked: isDark
        ? "relative aspect-square rounded-xl overflow-hidden opacity-70 transition-all"
        : "relative aspect-square rounded-xl overflow-hidden opacity-70 transition-all",
      uploadArea: isDark
        ? "border-2 border-dashed border-white/[0.08] rounded-xl p-6 text-center cursor-pointer hover:border-pink-500/50 hover:bg-pink-500/10 transition-all"
        : "border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/50 transition-all",
      keywordTag: isDark
        ? "flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm"
        : "flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm",
      followUpCard: isDark
        ? "border border-white/[0.08] rounded-xl p-4 space-y-3"
        : "border border-gray-200 rounded-xl p-4 space-y-3",
      followUpSelect: isDark
        ? "w-full px-4 py-3 bg-white/[0.05] border-2 border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 appearance-none cursor-pointer"
        : "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-pink-400 appearance-none cursor-pointer",
      followUpInput: isDark
        ? "px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none w-full"
        : "px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none w-full",
      addFollowUpButton: isDark
        ? "w-full py-2.5 border-2 border-dashed border-pink-500/30 rounded-xl text-sm text-pink-400 font-medium hover:bg-pink-500/10 transition-colors"
        : "w-full py-2.5 border-2 border-dashed border-pink-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors",
      saveButton: (disabled?: boolean) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          isDark
            ? "bg-gray-800 hover:bg-gray-700 text-white"
            : "bg-gray-900 hover:bg-black text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      goLiveButton: (disabled?: boolean) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          isDark
            ? "bg-green-600 hover:bg-green-500 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      editBadge: isDark
        ? "text-xs px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400"
        : "text-xs px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600",
      lockedBadge: isDark
        ? "text-xs px-2 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 flex items-center gap-1"
        : "text-xs px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 flex items-center gap-1",
      loadingSpinner: isDark
        ? "w-5 h-5 border-2 border-t-transparent border-pink-400 rounded-full animate-spin"
        : "w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin",
      crownIcon: "h-4 w-4 text-yellow-400",
      muted: isDark ? "text-white/40" : "text-gray-400",
      label: isDark ? "text-white/60" : "text-gray-600",
    }),
    [isDark],
  );

  // ─── Fetch media ───────────────────────────────────────────────────────────

  const fetchMedia = useCallback(
    async (accountId: string) => {
      if (!accountId || automationType === "dms") return;
      setIsLoadingMedia(true);
      try {
        const data = await getInstaMedia(apiRequest, accountId);
        let mediaList: MediaItem[] = [];
        if (data?.media && Array.isArray(data.media)) mediaList = data.media;
        else if (Array.isArray(data)) mediaList = data as any;
        setMedia(mediaList);
      } catch (e) {
        console.error("Error fetching media:", e);
        setMedia([]);
      } finally {
        setIsLoadingMedia(false);
      }
    },
    [apiRequest, automationType],
  );

  // ─── Fetch template for edit ───────────────────────────────────────────────

  const fetchTemplateForEdit = useCallback(async () => {
    if (!editId) return;
    setIsLoadingTemplate(true);
    try {
      const response = await getInstaTemplateById(apiRequest, editId);
      const t = (response?.template || response) as TemplateType & {
        askPhone?: any;
        followUpDMs?: any;
        dmMediaUrl?: string;
        dmMediaType?: string;
      };

      setForm({
        name: t.name || "",
        accountUsername: t.accountUsername || "",
        accountId: t.accountId || "",
        anyPostOrReel: t.anyPostOrReel || false,
        mediaId: t.mediaId || "",
        mediaUrl: t.mediaUrl || "",
        mediaType: t.mediaType || "",
        anyKeyword: t.anyKeyword || false,
        keywords: t.triggers || [],
        keywordInput: "",
        dmMessage: t.content?.[0]?.text || "",
        dmLinks:
          t.content
            ?.map((c: any) => ({
              url: c.link || "",
              buttonTitle: c.buttonTitle || "Get Access",
            }))
            .filter((l: any) => l.url) || [],
        dmMediaUrl: t.content?.[0]?.mediaUrl || "",
        dmMediaType: t.content?.[0]?.mediaType || "",
        dmMediaPublicId: "",
        welcomeText:
          t.welcomeMessage?.text ||
          "Hi {{username}}! So glad you're interested 🎉\nClick below and I'll share the link with you in a moment 🧲",
        welcomeButtonTitle: t.welcomeMessage?.buttonTitle || "Send me the link",
        publicReply: t.publicReply?.enabled || false,
        publicReplies: t.publicReply?.replies?.length
          ? t.publicReply.replies
          : ["Replied in DMs 📨", "Coming your way 🧲", "Check your DM 📩"],
        tagType: t.publicReply?.tagType || "none",
        askFollow: t.askFollow?.enabled || false,
        askFollowMessage:
          t.askFollow?.message ||
          "Hey! It seems you haven't followed me yet 🙂\n\nHit the follow button on my profile, then tap 'I'm following' below to get your link 🧲",
        visitProfileBtn: t.askFollow?.visitProfileBtn || "Visit Profile",
        followingBtn: t.askFollow?.followingBtn || "I'm following ✅",
        askEmail: t.askEmail?.enabled || false,
        emailOpeningMessage:
          t.askEmail?.openingMessage ||
          "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your email address first. Please share it in the chat.",
        emailRetryMessage:
          t.askEmail?.retryMessage ||
          "Please enter a correct email address, e.g. info@gmail.com",
        emailNoValidAction: t.askEmail?.sendDmIfNoEmail ? "send" : "nosend",
        askPhone: (t as any).askPhone?.enabled || false,
        phoneOpeningMessage:
          (t as any).askPhone?.openingMessage ||
          "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your phone number first. Please share it in the chat.",
        phoneRetryMessage:
          (t as any).askPhone?.retryMessage ||
          "Please enter a correct phone number, e.g. +1234567890",
        phoneNoValidAction: (t as any).askPhone?.sendDmIfNoPhone
          ? "send"
          : "nosend",
        followUpDMs: (t as any).followUpDMs?.enabled || false,
        followUpMessages: (t as any).followUpDMs?.messages || [],
        delayOption: t.delayOption || "immediate",
        isActive: t.isActive || false,
        priority: t.priority || 5,
      });

      if (t.accountId && automationType !== "dms") {
        await fetchMedia(t.accountId);
      }
    } catch (error) {
      console.error("Error loading template for edit:", error);
      toast({
        title: "Failed to load automation",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  }, [editId, apiRequest, automationType, fetchMedia]);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId || !isLoaded || isAccLoading) return;
    if (selectedAccount && !isEditMode) {
      setForm((prev) => ({
        ...prev,
        accountUsername: selectedAccount.username,
        accountId: selectedAccount.instagramId,
      }));
      if (automationType !== "dms") {
        fetchMedia(selectedAccount.instagramId);
      }
      setIsLoading(false);
    } else if (!selectedAccount && !isEditMode) {
      setIsLoading(false);
    } else if (isEditMode) {
      setIsLoading(false);
    }
  }, [
    userId,
    isLoaded,
    isAccLoading,
    selectedAccount,
    isEditMode,
    automationType,
    fetchMedia,
  ]);

  useEffect(() => {
    if (isEditMode) {
      fetchTemplateForEdit();
    }
  }, [isEditMode, fetchTemplateForEdit]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const addKeyword = useCallback(() => {
    if (form.keywordInput.trim()) {
      const kw = form.keywordInput.trim().toLowerCase();
      if (!form.keywords.includes(kw)) {
        setForm((f) => ({
          ...f,
          keywords: [...f.keywords, kw],
          keywordInput: "",
        }));
      } else {
        setForm((f) => ({ ...f, keywordInput: "" }));
      }
    }
  }, [form.keywordInput, form.keywords]);

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addKeyword();
      }
    },
    [addKeyword],
  );

  const removeKeyword = useCallback((kw: string) => {
    setForm((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }));
  }, []);

  // Upload DM media to Cloudinary
  const handleDMMediaUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large. Max 10 MB.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      setIsUploadingMedia(true);
      try {
        // ✅ Same pattern as createInstaTemplate(apiRequest, ...) etc.
        const result = await uploadMedia(apiRequest, file);

        let mediaType = "image";
        if (file.type.startsWith("video/")) mediaType = "video";
        else if (file.type === "application/pdf") mediaType = "document";

        setForm((f) => ({
          ...f,
          dmMediaUrl: result.url,
          dmMediaType: mediaType,
          dmMediaPublicId: result.publicId,
        }));

        toast({ title: "Media uploaded successfully ✅", duration: 3000 });
      } catch (error) {
        toast({
          title: error instanceof Error ? error.message : "Upload failed",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [apiRequest], // same dep pattern as all other handlers
  );

  const addLink = useCallback(() => {
    if (!newLinkUrl.trim()) return;
    setForm((f) => ({
      ...f,
      dmLinks: [
        ...f.dmLinks,
        { url: newLinkUrl.trim(), buttonTitle: newLinkBtn || "Get Access" },
      ],
    }));
    setNewLinkUrl("");
    setNewLinkBtn("Get Access");
    setShowLinkForm(false);
  }, [newLinkUrl, newLinkBtn]);

  const removeLink = useCallback((i: number) => {
    setForm((f) => ({
      ...f,
      dmLinks: f.dmLinks.filter((_, idx) => idx !== i),
    }));
  }, []);

  const addPublicReply = useCallback(() => {
    setForm((f) => ({ ...f, publicReplies: [...f.publicReplies, ""] }));
    setEditingPublicReplyIndex(form.publicReplies.length);
  }, [form.publicReplies.length]);

  const removePublicReply = useCallback((i: number) => {
    setForm((f) => ({
      ...f,
      publicReplies: f.publicReplies.filter((_, idx) => idx !== i),
    }));
  }, []);

  const addFollowUpMessage = useCallback(() => {
    setForm((f) => ({
      ...f,
      followUpMessages: [
        ...f.followUpMessages,
        {
          condition: "",
          waitTime: 60,
          waitUnit: "minutes",
          message: "",
          links: [],
        },
      ],
    }));
  }, []);

  const removeFollowUpMessage = useCallback((i: number) => {
    setForm((f) => ({
      ...f,
      followUpMessages: f.followUpMessages.filter((_, idx) => idx !== i),
    }));
  }, []);

  const updateFollowUpMessage = useCallback(
    (i: number, key: keyof FollowUpMessage, value: any) => {
      setForm((f) => {
        const updated = [...f.followUpMessages];
        updated[i] = { ...updated[i], [key]: value };
        return { ...f, followUpMessages: updated };
      });
    },
    [],
  );

  const addFollowUpLink = useCallback(
    (msgIndex: number, url: string, title: string) => {
      setForm((f) => {
        const updated = [...f.followUpMessages];
        updated[msgIndex] = {
          ...updated[msgIndex],
          links: [
            ...updated[msgIndex].links,
            { url, buttonTitle: title || "Get Access" },
          ],
        };
        return { ...f, followUpMessages: updated };
      });
    },
    [],
  );

  const removeFollowUpLink = useCallback(
    (msgIndex: number, linkIndex: number) => {
      setForm((f) => {
        const updated = [...f.followUpMessages];
        updated[msgIndex] = {
          ...updated[msgIndex],
          links: updated[msgIndex].links.filter((_, i) => i !== linkIndex),
        };
        return { ...f, followUpMessages: updated };
      });
    },
    [],
  );

  const handleMediaSelect = useCallback(
    (item: MediaItem) => {
      if (isEditMode) return;
      setForm((f) => ({
        ...f,
        mediaId: item.id,
        mediaUrl: item.media_url,
        mediaType: item.media_type,
      }));
    },
    [isEditMode],
  );

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (goLive = false) => {
      if (!form.name.trim()) {
        toast({
          title: "Please enter automation name",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      if (!form.accountId) {
        toast({
          title: "No account selected",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      if (automationType !== "dms" && !form.anyPostOrReel && !form.mediaId) {
        toast({
          title: "Please select a post/story or enable 'Any post or reel'",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      const setter = goLive ? setIsGoingLive : setIsSaving;
      setter(true);

      try {
        // Build content array — include cloudinary media if set
        const content =
          form.dmMessage || form.dmLinks.length > 0 || form.dmMediaUrl
            ? [
                {
                  text: form.dmMessage || "",
                  link: form.dmLinks[0]?.url || "",
                  buttonTitle: form.dmLinks[0]?.buttonTitle || "Get Access",
                  mediaUrl: form.dmMediaUrl || "",
                  mediaType: form.dmMediaType || "",
                },
                ...form.dmLinks.slice(1).map((l) => ({
                  text: "",
                  link: l.url,
                  buttonTitle: l.buttonTitle,
                  mediaUrl: "",
                  mediaType: "",
                })),
              ].filter((c) => c.text || c.link || c.mediaUrl)
            : [];

        // For DM automations, generate a unique mediaId so there are no
        // duplicate key errors and we can still look up the template from payloads.
        let mediaId = form.anyPostOrReel ? "any" : form.mediaId;
        if (automationType === "dms" && !isEditMode) {
          // Unique ID scoped to account + automation type + timestamp
          mediaId = `dm_${form.accountId}_${Date.now()}`;
        } else if (automationType === "dms" && isEditMode) {
          // Keep existing mediaId in edit mode
          mediaId = form.mediaId || `dm_${form.accountId}_${Date.now()}`;
        }

        const payload = {
          name: form.name,
          content,
          reply: form.publicReplies.filter(Boolean),
          triggers:
            automationType === "stories"
              ? []
              : form.anyKeyword
                ? []
                : form.keywords.filter(Boolean),
          isFollow: form.askFollow,
          priority: form.priority,
          mediaId,
          mediaUrl: form.mediaUrl,
          mediaType: form.mediaType,
          delaySeconds:
            form.delayOption === "3min"
              ? 180
              : form.delayOption === "5min"
                ? 300
                : form.delayOption === "10min"
                  ? 600
                  : 0,
          delayOption: form.delayOption,
          automationType,
          anyPostOrReel: form.anyPostOrReel,
          anyKeyword: form.anyKeyword,
          isActive: goLive ? true : form.isActive,
          welcomeMessage: {
            text: form.welcomeText,
            buttonTitle: form.welcomeButtonTitle,
          },
          publicReply: {
            enabled: form.publicReply,
            replies: form.publicReplies.filter(Boolean),
            tagType: form.tagType,
          },
          askFollow: {
            enabled: form.askFollow,
            message: form.askFollowMessage,
            visitProfileBtn: form.visitProfileBtn,
            followingBtn: form.followingBtn,
          },
          askEmail: {
            enabled: form.askEmail,
            openingMessage: form.emailOpeningMessage,
            retryMessage: form.emailRetryMessage,
            sendDmIfNoEmail: form.emailNoValidAction === "send",
          },
          askPhone: {
            enabled: form.askPhone,
            openingMessage: form.phoneOpeningMessage,
            retryMessage: form.phoneRetryMessage,
            sendDmIfNoPhone: form.phoneNoValidAction === "send",
          },
          followUpDMs: {
            enabled: form.followUpDMs,
            messages: form.followUpMessages,
          },
        };

        if (isEditMode && editId) {
          await updateTemplate(apiRequest, editId, payload as any);
          toast({ title: "Automation updated!", duration: 3000 });
        } else {
          await createInstaTemplate(
            apiRequest,
            form.accountId,
            form.accountUsername,
            payload,
          );
          toast({
            title: goLive ? "Automation is now live! 🚀" : "Automation saved!",
            duration: 3000,
          });
        }

        router.push("/insta/automations");
      } catch (error) {
        console.error("Error saving template:", error);
        toast({
          title: "Failed to save",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setter(false);
      }
    },
    [form, automationType, isEditMode, editId, apiRequest, router],
  );

  const visibleMedia = useMemo(
    () => (showMoreMedia ? media : media.slice(0, 8)),
    [media, showMoreMedia],
  );

  // ─── Loading gates ─────────────────────────────────────────────────────────

  if (!isLoaded || isAccLoading || isLoading || isLoadingTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={S.loadingSpinner} />
      </div>
    );
  }

  if (!selectedAccount && !isEditMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 md:p-10">
        <div
          className={`rounded-2xl border ${styles.card} p-5 md:p-10 text-center  w-full`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDark
                ? "bg-pink-500/20 border border-pink-500/30"
                : "bg-pink-100"
            }`}
          >
            <Instagram className={`h-8 w-8 text-pink-400`} />
          </div>
          <h3 className={`text-base font-bold ${styles.text.primary} mb-2`}>
            No accounts connected yet
          </h3>
          <p
            className={`text-sm ${isDark ? "text-white/40" : "text-gray-500"} mb-5`}
          >
            Connect your Instagram Business account to start automating
          </p>
          <Button
            asChild
            className={`bg-gradient-to-r from-pink-500 to-pink-300 text-white rounded-full font-bold px-7 shadow-md ${
              isDark ? "shadow-pink-500/20" : "shadow-pink-200/50"
            }`}
          >
            <Link href="/insta/accounts/add">
              <Plus className="h-4 w-4 mr-2" />
              Connect Your Account
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const stepOffset = automationType === "dms" ? 0 : 1;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={S.page}>
      {isDark && <Orbs />}
      <div className={S.container}>
        {/* Left: Phone preview */}
        <div className={S.leftPreview}>
          <PhonePreview
            form={form}
            accountUsername={form.accountUsername}
            isDark={isDark}
          />
        </div>

        {/* Right: Form */}
        <div className={S.rightContent}>
          {/* Action bar */}
          <div className={`${S.actionBar} flex-wrap gap-3`}>
            {isEditMode && (
              <>
                <span className={S.editBadge}>
                  ✏️ Editing existing automation
                </span>
                <span className={S.lockedBadge}>
                  <Lock className="h-3 w-3" />
                  Account & Media locked
                </span>
              </>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || isGoingLive}
              className={S.saveButton(isSaving || isGoingLive)}
            >
              <Bookmark className="h-4 w-4" />
              {isSaving ? "Saving..." : isEditMode ? "Update" : "Save"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || isGoingLive}
              className={S.goLiveButton(isSaving || isGoingLive)}
            >
              <Activity className="h-4 w-4" />
              {isGoingLive
                ? "Going Live..."
                : isEditMode
                  ? "Update & Go Live"
                  : "Go Live"}
            </button>
          </div>

          <div className={S.formContainer}>
            {/* Name */}
            <input
              type="text"
              placeholder="Enter Automation Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={S.input}
            />

            {/* Account banner */}
            {selectedAccount && !isEditMode && (
              <div
                className={
                  isDark
                    ? "bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4"
                    : "bg-pink-50 border border-pink-200 rounded-2xl p-4"
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                    {selectedAccount.profilePicture ? (
                      <Image
                        src={selectedAccount.profilePicture}
                        alt={selectedAccount.username}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      selectedAccount.username[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p
                      className={
                        isDark
                          ? "text-sm font-medium text-pink-400"
                          : "text-sm font-medium text-pink-600"
                      }
                    >
                      Creating automation for:
                    </p>
                    <p
                      className={
                        isDark
                          ? "text-white font-semibold"
                          : "text-gray-900 font-semibold"
                      }
                    >
                      @{selectedAccount.username}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Message — always shown */}
            <div className={S.card}>
              <div className="flex items-center gap-2 mb-4">
                <span className={S.sectionLabel}>Welcome Message</span>
                <Info className={S.sectionInfoIcon} />
              </div>
              <div className="space-y-3">
                <div
                  className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                >
                  <textarea
                    value={form.welcomeText}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, welcomeText: e.target.value }))
                    }
                    maxLength={1000}
                    rows={3}
                    className={S.textarea}
                    placeholder="Welcome message..."
                  />
                  <div
                    className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                  >
                    <CharCounter
                      current={form.welcomeText.length}
                      max={1000}
                      isDark={isDark}
                    />
                  </div>
                </div>
                <div className={S.borderedInput()}>
                  <Pencil className={`h-4 w-4 flex-shrink-0 ${S.muted}`} />
                  <input
                    type="text"
                    value={form.welcomeButtonTitle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        welcomeButtonTitle: e.target.value,
                      }))
                    }
                    placeholder="Button title..."
                    className={S.inlineInput}
                  />
                </div>
              </div>
            </div>

            {/* Step 1: Select Post/Story (hidden for DMs) */}
            {automationType !== "dms" && (
              <div className={S.card}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={S.stepNumber}>1</div>
                  <h3 className={S.stepTitle}>
                    {automationType === "stories"
                      ? "Select a Story"
                      : "Select Instagram Post or Reel"}
                  </h3>
                  {isEditMode && (
                    <span className={S.lockedBadge}>
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm ${S.label}`}>
                    {automationType === "stories"
                      ? "Any story"
                      : "Any post or reel"}
                  </span>
                  <Toggle
                    checked={form.anyPostOrReel}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        anyPostOrReel: v,
                        mediaId: v ? "" : f.mediaId,
                      }))
                    }
                    disabled={isEditMode}
                    isDark={isDark}
                  />
                </div>
                {!form.anyPostOrReel && (
                  <>
                    {isLoadingMedia ? (
                      <div className="flex items-center justify-center py-8">
                        <div className={S.loadingSpinner} />
                      </div>
                    ) : media.length > 0 ? (
                      <>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {visibleMedia.map((item) => (
                            <div
                              key={item.id}
                              onClick={() =>
                                !isEditMode && handleMediaSelect(item)
                              }
                              className={
                                isEditMode
                                  ? S.mediaItemLocked
                                  : S.mediaItem(form.mediaId === item.id)
                              }
                            >
                              <Image
                                src={item.media_url}
                                alt=""
                                fill
                                className="object-cover"
                              />
                              {item.media_type === "VIDEO" && (
                                <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                                  ▶
                                </div>
                              )}
                              {isEditMode && form.mediaId === item.id && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">
                                    Current
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {!showMoreMedia && media.length > 8 && (
                          <button
                            onClick={() =>
                              !isEditMode && setShowMoreMedia(true)
                            }
                            className={`w-full py-2 text-sm font-medium transition-colors ${isDark ? "text-pink-400 hover:text-pink-300" : "text-pink-500 hover:text-pink-600"}`}
                            disabled={isEditMode}
                          >
                            Show More ({media.length - 8} more)
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <ImageIcon
                          className={`h-8 w-8 mx-auto mb-2 ${S.muted}`}
                        />
                        <p className={`text-sm ${S.muted}`}>
                          No{" "}
                          {automationType === "stories" ? "stories" : "posts"}{" "}
                          found
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 2 / 1: Trigger Keywords */}
            <div className={S.card}>
              <div className="flex items-center gap-3 mb-4">
                <div className={S.stepNumber}>
                  {automationType === "dms" ? "1" : "2"}
                </div>
                <h3 className={S.stepTitle}>Set Trigger Keywords</h3>
              </div>
              {automationType !== "stories" && (
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm ${S.label}`}>Any keyword</span>
                  <Toggle
                    checked={form.anyKeyword}
                    onChange={(v) => setForm((f) => ({ ...f, anyKeyword: v }))}
                    isDark={isDark}
                  />
                </div>
              )}
              {(automationType === "stories" || !form.anyKeyword) && (
                <>
                  <div
                    className={`flex items-center w-full px-4 py-2.5 rounded-xl text-sm ${isDark ? "bg-white/[0.05] border border-white/[0.08] text-white" : "bg-gray-50 border border-gray-200 text-gray-700"}`}
                  >
                    <input
                      type="text"
                      placeholder={
                        automationType === "stories"
                          ? "Keywords not used for stories"
                          : "Type & Hit ↵ Enter to add keyword"
                      }
                      value={form.keywordInput}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          keywordInput: e.target.value,
                        }))
                      }
                      onKeyDown={handleKeywordKeyDown}
                      disabled={automationType === "stories"}
                      className={`w-full bg-transparent border-none text-sm focus:outline-none ${
                        isDark
                          ? "text-white placeholder:text-white/25"
                          : "text-gray-700 placeholder-gray-400"
                      } ${automationType === "stories" ? "opacity-40 cursor-not-allowed" : ""}`}
                    />
                    {form.keywordInput && (
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="p-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.keywords.map((kw) => (
                        <span key={kw} className={S.keywordTag}>
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            className={
                              isDark
                                ? "text-pink-400/60 hover:text-pink-400"
                                : "text-pink-400 hover:text-pink-600"
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Step 3 / 2: Send DM (final link message) */}
            <div className={S.card}>
              <div className="flex items-center gap-3 mb-4">
                <div className={S.stepNumber}>
                  {automationType === "dms" ? "2" : "3"}
                </div>
                <h3 className={S.stepTitle}>Final DM Message & Link</h3>
              </div>

              {/* Media upload */}
              {form.dmMediaUrl ? (
                <div className="relative mb-4 rounded-xl overflow-hidden border border-pink-500/30">
                  <div
                    className={`flex items-center gap-3 p-3 ${isDark ? "bg-white/[0.04]" : "bg-gray-50"}`}
                  >
                    {form.dmMediaType === "image" ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={form.dmMediaUrl}
                          alt="Attachment"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : form.dmMediaType === "video" ? (
                      <div
                        className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
                      >
                        <Video className={`h-6 w-6 ${S.muted}`} />
                      </div>
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-gray-200"}`}
                      >
                        <FileText className={`h-6 w-6 ${S.muted}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-800"}`}
                      >
                        {form.dmMediaType || "Attachment"} uploaded
                      </p>
                      <p className={`text-xs ${S.muted}`}>
                        Sent before the final message
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          dmMediaUrl: "",
                          dmMediaType: "",
                          dmMediaPublicId: "",
                        }))
                      }
                      className={`p-1.5 rounded-lg ${isDark ? "text-white/40 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() =>
                    !isUploadingMedia && fileInputRef.current?.click()
                  }
                  className={`${S.uploadArea} mb-4`}
                >
                  {isUploadingMedia ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2
                        className={`h-5 w-5 animate-spin ${isDark ? "text-pink-400" : "text-pink-500"}`}
                      />
                      <p className={`text-sm ${S.muted}`}>Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className={`h-5 w-5 mx-auto mb-2 ${S.muted}`} />
                      <p
                        className={`text-sm ${isDark ? "text-white/60" : "text-gray-500"}`}
                      >
                        Attach image, video or PDF (optional)
                      </p>
                      <p className={`text-xs ${S.muted} mt-1`}>
                        Max 10 MB • Sent before the message
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,application/pdf"
                    className="hidden"
                    onChange={handleDMMediaUpload}
                  />
                </div>
              )}

              {/* Message textarea */}
              <div
                className={`border rounded-xl overflow-hidden mb-1 ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
              >
                <textarea
                  value={form.dmMessage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dmMessage: e.target.value }))
                  }
                  placeholder="Enter your final message here..."
                  maxLength={1000}
                  rows={3}
                  className={S.textarea}
                />
                <div
                  className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                >
                  <CharCounter
                    current={form.dmMessage.length}
                    max={1000}
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* Links */}
              {form.dmLinks.map((link, i) => (
                <div key={i} className={S.linkItem}>
                  <LinkIcon className={`h-4 w-4 flex-shrink-0 ${S.muted}`} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs truncate ${isDark ? "text-white/60" : "text-gray-600"}`}
                    >
                      {link.url}
                    </p>
                    <p className={`text-xs ${S.muted}`}>{link.buttonTitle}</p>
                  </div>
                  <button
                    onClick={() => setEditingLinkIndex(i)}
                    className={`p-1 ${S.muted} hover:${isDark ? "text-white" : "text-gray-800"}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeLink(i)}
                    className={`p-1 ${isDark ? "text-white/40 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {showLinkForm ? (
                <div
                  className={`border rounded-xl p-3 mb-2 ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                >
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://yourlink.com"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className={S.linkInput}
                    />
                    <input
                      type="text"
                      placeholder="Button title (e.g. Get Access)"
                      value={newLinkBtn}
                      onChange={(e) => setNewLinkBtn(e.target.value)}
                      className={S.linkInput}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addLink}
                        className="flex-1 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600"
                      >
                        Add Link
                      </button>
                      <button
                        onClick={() => setShowLinkForm(false)}
                        className={`px-3 py-2 text-sm rounded-lg ${isDark ? "text-white/60 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkForm(true)}
                  className={S.addLinkTrigger}
                >
                  <Plus className="h-4 w-4" />
                  Add Link Button
                </button>
              )}
            </div>

            {/* Public Reply (comments only) */}
            {automationType === "comments" && (
              <div className={S.cardNoPadding}>
                <div className={S.sectionToggle}>
                  <div className="flex items-center gap-2">
                    <span className={S.sectionLabel}>
                      Publicly Reply To Comments
                    </span>
                    <Info className={S.sectionInfoIcon} />
                  </div>
                  <Toggle
                    checked={form.publicReply}
                    onChange={(v) => setForm((f) => ({ ...f, publicReply: v }))}
                    isDark={isDark}
                  />
                </div>
                {form.publicReply && (
                  <div className={S.sectionContent}>
                    {form.publicReplies.map((reply, i) => (
                      <div
                        key={i}
                        className={S.borderedInput(
                          editingPublicReplyIndex === i,
                        )}
                      >
                        <span className={`flex-shrink-0 ${S.muted}`}>💬</span>
                        <input
                          type="text"
                          value={reply}
                          onChange={(e) => {
                            const updated = [...form.publicReplies];
                            updated[i] = e.target.value;
                            setForm((f) => ({ ...f, publicReplies: updated }));
                          }}
                          onFocus={() => setEditingPublicReplyIndex(i)}
                          onBlur={() => setEditingPublicReplyIndex(null)}
                          className={S.inlineInput}
                          placeholder="Reply text..."
                        />
                        <button
                          onClick={() => removePublicReply(i)}
                          className={`flex-shrink-0 ${isDark ? "text-white/30 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addPublicReply}
                      className={S.addLinkTrigger}
                    >
                      <Plus className="h-4 w-4" />
                      Add Public Reply
                    </button>
                    <div>
                      <p className={`text-sm mb-2 mt-2 ${S.label}`}>
                        Tag in public reply?
                      </p>
                      <div className="flex gap-2">
                        {(["none", "user", "account"] as const).map((tag) => (
                          <button
                            key={tag}
                            onClick={() =>
                              setForm((f) => ({ ...f, tagType: tag }))
                            }
                            className={S.tagButton(form.tagType === tag)}
                          >
                            {tag === "none"
                              ? "None"
                              : tag === "user"
                                ? "Tag User"
                                : "Tag Account"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ask To Follow — all types */}
            <div className={S.cardNoPadding}>
              <div className={S.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={S.sectionLabel}>
                    Ask To Follow Before Sending DM
                  </span>
                  <Info className={S.sectionInfoIcon} />
                </div>
                <Toggle
                  checked={form.askFollow}
                  onChange={(v) => setForm((f) => ({ ...f, askFollow: v }))}
                  isDark={isDark}
                />
              </div>
              {form.askFollow && (
                <div className={S.sectionContent}>
                  <div
                    className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                  >
                    <textarea
                      value={form.askFollowMessage}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          askFollowMessage: e.target.value,
                        }))
                      }
                      maxLength={500}
                      rows={3}
                      className={S.textarea}
                    />
                    <div
                      className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                    >
                      <CharCounter
                        current={form.askFollowMessage.length}
                        max={500}
                        isDark={isDark}
                      />
                    </div>
                  </div>
                  <div className={S.borderedInput()}>
                    <Pencil className={`h-4 w-4 flex-shrink-0 ${S.muted}`} />
                    <input
                      type="text"
                      value={form.visitProfileBtn}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          visitProfileBtn: e.target.value,
                        }))
                      }
                      placeholder="Visit Profile"
                      className={S.inlineInput}
                    />
                  </div>
                  <div className={S.borderedInput()}>
                    <Pencil className={`h-4 w-4 flex-shrink-0 ${S.muted}`} />
                    <input
                      type="text"
                      value={form.followingBtn}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          followingBtn: e.target.value,
                        }))
                      }
                      placeholder="I'm following ✅"
                      className={S.inlineInput}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ask Email — all types */}
            <div className={S.cardNoPadding}>
              <div className={S.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={S.sectionLabel}>
                    Ask To Share Their Email
                  </span>
                  <Info className={S.sectionInfoIcon} />
                  <Crown className={S.crownIcon} />
                </div>
                <Toggle
                  checked={form.askEmail}
                  onChange={(v) => setForm((f) => ({ ...f, askEmail: v }))}
                  isDark={isDark}
                />
              </div>
              {form.askEmail && (
                <div className={S.sectionContent}>
                  <div>
                    <p className={`text-xs font-medium mb-2 ${S.label}`}>
                      Opening Message:
                    </p>
                    <div
                      className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                    >
                      <textarea
                        value={form.emailOpeningMessage}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            emailOpeningMessage: e.target.value,
                          }))
                        }
                        maxLength={1000}
                        rows={3}
                        className={S.textarea}
                      />
                      <div
                        className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                      >
                        <CharCounter
                          current={form.emailOpeningMessage.length}
                          max={1000}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-medium mb-2 ${S.label}`}>
                      Retry Message (if invalid email):
                    </p>
                    <div
                      className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                    >
                      <textarea
                        value={form.emailRetryMessage}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            emailRetryMessage: e.target.value,
                          }))
                        }
                        maxLength={500}
                        rows={2}
                        className={S.textarea}
                      />
                      <div
                        className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                      >
                        <CharCounter
                          current={form.emailRetryMessage.length}
                          max={500}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs mb-2 ${S.muted}`}>
                      After 3 failed attempts:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            emailNoValidAction: "send",
                          }))
                        }
                        className={S.tagButton(
                          form.emailNoValidAction === "send",
                        )}
                      >
                        Send DM anyway
                      </button>
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            emailNoValidAction: "nosend",
                          }))
                        }
                        className={S.tagButton(
                          form.emailNoValidAction === "nosend",
                        )}
                      >
                        Do not send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ask Phone — all types */}
            <div className={S.cardNoPadding}>
              <div className={S.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={S.sectionLabel}>
                    Ask To Share Their Phone
                  </span>
                  <Info className={S.sectionInfoIcon} />
                  <Crown className={S.crownIcon} />
                </div>
                <Toggle
                  checked={form.askPhone}
                  onChange={(v) => setForm((f) => ({ ...f, askPhone: v }))}
                  isDark={isDark}
                />
              </div>
              {form.askPhone && (
                <div className={S.sectionContent}>
                  <div>
                    <p className={`text-xs font-medium mb-2 ${S.label}`}>
                      Opening Message:
                    </p>
                    <div
                      className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                    >
                      <textarea
                        value={form.phoneOpeningMessage}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            phoneOpeningMessage: e.target.value,
                          }))
                        }
                        maxLength={1000}
                        rows={3}
                        className={S.textarea}
                      />
                      <div
                        className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                      >
                        <CharCounter
                          current={form.phoneOpeningMessage.length}
                          max={1000}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-medium mb-2 ${S.label}`}>
                      Retry Message (if invalid phone):
                    </p>
                    <div
                      className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                    >
                      <textarea
                        value={form.phoneRetryMessage}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            phoneRetryMessage: e.target.value,
                          }))
                        }
                        maxLength={500}
                        rows={2}
                        className={S.textarea}
                      />
                      <div
                        className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                      >
                        <CharCounter
                          current={form.phoneRetryMessage.length}
                          max={500}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs mb-2 ${S.muted}`}>
                      After 3 failed attempts:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            phoneNoValidAction: "send",
                          }))
                        }
                        className={S.tagButton(
                          form.phoneNoValidAction === "send",
                        )}
                      >
                        Send DM anyway
                      </button>
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            phoneNoValidAction: "nosend",
                          }))
                        }
                        className={S.tagButton(
                          form.phoneNoValidAction === "nosend",
                        )}
                      >
                        Do not send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-Up DMs — all types */}
            <div className={S.cardNoPadding}>
              <div className={S.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={S.sectionLabel}>Send Follow-Up DMs</span>
                  <Info className={S.sectionInfoIcon} />
                  <Crown className={S.crownIcon} />
                </div>
                <Toggle
                  checked={form.followUpDMs}
                  onChange={(v) => setForm((f) => ({ ...f, followUpDMs: v }))}
                  isDark={isDark}
                />
              </div>
              {form.followUpDMs && (
                <div className={S.sectionContent}>
                  {form.followUpMessages.map((msg, i) => (
                    <div key={i} className={S.followUpCard}>
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-700"}`}
                        >
                          #{i + 1} Follow-Up Message
                        </h4>
                        <button
                          onClick={() => removeFollowUpMessage(i)}
                          className={`${isDark ? "text-white/40 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <select
                        value={msg.condition}
                        onChange={(e) =>
                          updateFollowUpMessage(i, "condition", e.target.value)
                        }
                        className={S.followUpSelect}
                      >
                        <option
                          value=""
                          className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                        >
                          Select a condition
                        </option>
                        <option
                          value="no_reply"
                          className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                        >
                          💬 If user has not replied
                        </option>
                        <option
                          value="no_action"
                          className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                        >
                          🔄 If user has not taken action
                        </option>
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={msg.waitTime}
                          min={5}
                          onChange={(e) =>
                            updateFollowUpMessage(
                              i,
                              "waitTime",
                              parseInt(e.target.value) || 60,
                            )
                          }
                          className={S.followUpInput}
                          placeholder="60"
                        />
                        <select
                          value={msg.waitUnit}
                          onChange={(e) =>
                            updateFollowUpMessage(
                              i,
                              "waitUnit",
                              e.target.value as "minutes" | "hours",
                            )
                          }
                          className={S.followUpInput}
                        >
                          <option
                            value="minutes"
                            className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                          >
                            Minutes
                          </option>
                          <option
                            value="hours"
                            className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                          >
                            Hours
                          </option>
                        </select>
                      </div>
                      <p className={`text-xs ${S.muted}`}>
                        Min 5 minutes · Max 23 hours
                      </p>

                      <div
                        className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                      >
                        <textarea
                          value={msg.message}
                          onChange={(e) =>
                            updateFollowUpMessage(i, "message", e.target.value)
                          }
                          placeholder="Just checking in — did you get a chance to see our last message?"
                          rows={3}
                          maxLength={1000}
                          className={`w-full px-4 py-3 text-sm focus:outline-none resize-none ${isDark ? "bg-white/[0.05] text-white placeholder:text-white/25" : "bg-white text-gray-700 placeholder-gray-400"}`}
                        />
                        <div
                          className={`flex items-center px-4 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                        >
                          <CharCounter
                            current={msg.message.length}
                            max={1000}
                            isDark={isDark}
                          />
                        </div>
                      </div>

                      {/* Follow-up links */}
                      {msg.links.map((link, li) => (
                        <div key={li} className={S.linkItem}>
                          <LinkIcon
                            className={`h-4 w-4 flex-shrink-0 ${S.muted}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs truncate ${isDark ? "text-white/60" : "text-gray-600"}`}
                            >
                              {link.url}
                            </p>
                            <p className={`text-xs ${S.muted}`}>
                              {link.buttonTitle}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFollowUpLink(i, li)}
                            className={`p-1 ${isDark ? "text-white/40 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {/* Add follow-up link inline form */}
                      {followUpLinkForms[i]?.open ? (
                        <div
                          className={`border rounded-xl p-3 ${isDark ? "border-white/[0.08]" : "border-gray-200"}`}
                        >
                          <div className="space-y-2">
                            <input
                              type="url"
                              placeholder="https://yourlink.com"
                              value={followUpLinkForms[i]?.url || ""}
                              onChange={(e) =>
                                setFollowUpLinkForms((prev) => ({
                                  ...prev,
                                  [i]: {
                                    ...prev[i],
                                    url: e.target.value,
                                  },
                                }))
                              }
                              className={S.linkInput}
                            />
                            <input
                              type="text"
                              placeholder="Button title"
                              value={followUpLinkForms[i]?.title || ""}
                              onChange={(e) =>
                                setFollowUpLinkForms((prev) => ({
                                  ...prev,
                                  [i]: {
                                    ...prev[i],
                                    title: e.target.value,
                                  },
                                }))
                              }
                              className={S.linkInput}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const lf = followUpLinkForms[i];
                                  if (lf?.url) {
                                    addFollowUpLink(
                                      i,
                                      lf.url,
                                      lf.title || "Get Access",
                                    );
                                  }
                                  setFollowUpLinkForms((prev) => ({
                                    ...prev,
                                    [i]: { url: "", title: "", open: false },
                                  }));
                                }}
                                className="flex-1 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600"
                              >
                                Add Link
                              </button>
                              <button
                                onClick={() =>
                                  setFollowUpLinkForms((prev) => ({
                                    ...prev,
                                    [i]: {
                                      ...prev[i],
                                      open: false,
                                    },
                                  }))
                                }
                                className={`px-3 py-2 text-sm rounded-lg ${isDark ? "text-white/60 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        msg.links.length < 3 && (
                          <button
                            onClick={() =>
                              setFollowUpLinkForms((prev) => ({
                                ...prev,
                                [i]: { url: "", title: "", open: true },
                              }))
                            }
                            className={`w-full py-2 border rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${isDark ? "border-pink-500/30 text-pink-400 hover:bg-pink-500/10" : "border-pink-200 text-pink-500 hover:bg-pink-50"}`}
                          >
                            <Plus className="h-4 w-4" />
                            Add Link to Follow-Up
                          </button>
                        )
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addFollowUpMessage}
                    className={S.addFollowUpButton}
                  >
                    + Add Follow-Up Message
                  </button>
                </div>
              )}
            </div>

            {/* Delay */}
            <div className={S.card}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className={S.sectionLabel}>Delay Before Sending DM</h3>
                <Crown className={S.crownIcon} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "immediate", label: "Immediate" },
                    { value: "3min", label: "3 min" },
                    { value: "5min", label: "5 min" },
                    { value: "10min", label: "10 min" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() =>
                      setForm((f) => ({ ...f, delayOption: value }))
                    }
                    className={S.delayButton(form.delayOption === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-8" />
          </div>
        </div>
      </div>

      {/* Edit Link Modal */}
      {editingLinkIndex !== null && (
        <EditLinkModal
          link={form.dmLinks[editingLinkIndex]}
          onSave={(url, title) => {
            const updated = [...form.dmLinks];
            updated[editingLinkIndex] = { url, buttonTitle: title };
            setForm((f) => ({ ...f, dmLinks: updated }));
            setEditingLinkIndex(null);
          }}
          onClose={() => setEditingLinkIndex(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
