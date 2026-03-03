"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  X,
  RefreshCw,
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
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  createInstaTemplate,
  getAllInstagramAccounts,
  getInstaMedia,
  getInstaTemplates,
  updateTemplate,
} from "@/lib/services/insta-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";

import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountDataType {
  instagramId: string;
  username: string;
  isActive: boolean;
}

interface MediaItem {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  timestamp: string;
  caption?: string;
}

interface AutomationForm {
  name: string;
  accountUsername: string;
  accountId: string;
  anyPostOrReel: boolean;
  mediaId: string;
  mediaUrl: string;
  mediaType: string;
  anyKeyword: boolean;
  keywords: string[];
  keywordInput: string;
  excludeKeywords: string[];
  excludeKeywordInput: string;
  dmImage: File | null;
  dmImagePreview: string;
  dmMessage: string;
  dmLinks: { url: string; buttonTitle: string }[];
  welcomeMessage: boolean;
  welcomeText: string;
  welcomeButtonTitle: string;
  publicReply: boolean;
  publicReplies: string[];
  tagType: "none" | "user" | "account";
  askFollow: boolean;
  askFollowMessage: string;
  visitProfileBtn: string;
  followingBtn: string;
  askEmail: boolean;
  emailOpeningMessage: string;
  emailRetryMessage: string;
  emailNoValidAction: "send" | "nosend";
  askPhone: boolean;
  phoneOpeningMessage: string;
  phoneRetryMessage: string;
  phoneNoValidAction: "send" | "nosend";
  followUpDMs: boolean;
  followUpMessages: Array<{
    condition: string;
    waitTime: number;
    waitUnit: "minutes" | "hours";
    message: string;
    links: { url: string; buttonTitle: string }[];
  }>;
  delayOption: "immediate" | "3min" | "5min" | "10min";
  isActive: boolean;
  priority: number;
}

// ─── Phone Preview Component ──────────────────────────────────────────────────

function PhonePreview({
  form,
  accountUsername,
  automationType,
  isDark,
}: {
  form: AutomationForm;
  accountUsername: string;
  automationType: string;
  isDark: boolean;
}) {
  const showDMFlow = useMemo(
    () =>
      form.dmMessage ||
      form.welcomeMessage ||
      form.askFollow ||
      form.askEmail ||
      form.askPhone,
    [
      form.dmMessage,
      form.welcomeMessage,
      form.askFollow,
      form.askEmail,
      form.askPhone,
    ],
  );

  const showComments = useMemo(
    () => form.publicReply && form.publicReplies.filter(Boolean).length > 0,
    [form.publicReply, form.publicReplies],
  );

  const isStories = automationType === "stories";

  const screen = useMemo(
    () =>
      showComments && !showDMFlow
        ? "comments"
        : showDMFlow
          ? "dm"
          : isStories
            ? "story"
            : "posts",
    [showComments, showDMFlow, isStories],
  );

  return (
    <div className="fixed top-24">
      <div
        className="relative mx-auto rounded-[3rem] overflow-hidden shadow-2xl"
        style={{ width: 280, height: 560, border: "8px solid #1a1a1a" }}
      >
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

        <div
          className="bg-black flex-1 overflow-hidden"
          style={{ height: "calc(100% - 40px)" }}
        >
          {screen === "posts" && (
            <PostsScreen
              form={form}
              accountUsername={accountUsername}
              isDark={isDark}
            />
          )}
          {screen === "story" && (
            <StoryScreen
              form={form}
              accountUsername={accountUsername}
              isDark={isDark}
            />
          )}
          {screen === "comments" && (
            <CommentsScreen
              form={form}
              accountUsername={accountUsername}
              isDark={isDark}
            />
          )}
          {screen === "dm" && (
            <DMScreen
              form={form}
              accountUsername={accountUsername}
              automationType={automationType}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PostsScreen({
  form,
  accountUsername,
  isDark,
}: {
  form: AutomationForm;
  accountUsername: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`h-full flex flex-col ${isDark ? "bg-[#1A1A1E]" : "bg-white"}`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
      >
        <button className={isDark ? "text-white/60" : "text-gray-800"}>
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <span
          className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}
        >
          Posts
        </span>
        <div className="w-4" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
            {accountUsername?.[0]?.toUpperCase() || "A"}
          </div>
          <span
            className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-800"}`}
          >
            {accountUsername || "your_account"}
          </span>
          <span
            className={`text-xs ml-auto ${isDark ? "text-white/40" : "text-gray-300"}`}
          >
            ···
          </span>
        </div>
        <div
          className={`w-full relative ${isDark ? "bg-white/[0.06]" : "bg-gray-100"}`}
          style={{ height: 200 }}
        >
          {form.mediaUrl ? (
            <Image
              src={form.mediaUrl}
              alt="Post"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <ImageIcon
                  className={`h-8 w-8 mx-auto mb-1 ${isDark ? "text-white/20" : "text-gray-300"}`}
                />
                <p
                  className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}
                >
                  Select a post
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="text-lg">♡</span>
          <span className="text-lg">💬</span>
          <span className="text-lg">↗</span>
          <span className="ml-auto text-lg">🔖</span>
        </div>
        <div className="px-3 pb-2">
          <p
            className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}
          >
            <span className="font-semibold">
              {accountUsername || "your_account"}
            </span>{" "}
            <span className={isDark ? "text-white/40" : "text-gray-500"}>
              {form.mediaUrl
                ? "Click the link in my bio! 🔥"
                : "Select a post to preview"}
            </span>
          </p>
        </div>
      </div>
      <div
        className={`border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"} px-3 py-2 flex items-center gap-2`}
      >
        <div
          className={`flex-1 rounded-full px-3 py-1.5 text-xs ${isDark ? "bg-white/[0.06] text-white/40" : "bg-gray-100 text-gray-400"}`}
        >
          Message...
        </div>
        <span className="text-lg">📷</span>
        <span className="text-lg">+</span>
      </div>
    </div>
  );
}

function StoryScreen({
  form,
  accountUsername,
  isDark,
}: {
  form: AutomationForm;
  accountUsername: string;
  isDark: boolean;
}) {
  return (
    <div className="bg-black h-full flex flex-col relative">
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <div className="w-7 h-7 rounded-full border-2 border-pink-400 p-0.5">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
            {accountUsername?.[0]?.toUpperCase() || "A"}
          </div>
        </div>
        <span className="text-xs font-medium text-white">
          {accountUsername || "your_account"}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center text-white">
        {form.mediaUrl ? (
          <Image
            src={form.mediaUrl}
            alt="Story"
            fill
            className="object-cover"
          />
        ) : (
          <p className="text-sm">Select a specific story</p>
        )}
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
        <div className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-white/60">Send message...</span>
        </div>
        <button className="text-white/80">
          <span className="text-lg">♡</span>
        </button>
        <button className="text-white/80">
          <span className="text-lg">↗</span>
        </button>
      </div>
    </div>
  );
}

function CommentsScreen({
  form,
  accountUsername,
  isDark,
}: {
  form: AutomationForm;
  accountUsername: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`h-full flex flex-col ${isDark ? "bg-[#1A1A1E]" : "bg-white"}`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
      >
        <button className={isDark ? "text-white/60" : "text-gray-800"}>
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <span
          className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}
        >
          Posts
        </span>
        <div className="w-4" />
      </div>
      <div
        className={`w-full ${isDark ? "bg-white/[0.06]" : "bg-gray-100"}`}
        style={{ height: 130 }}
      >
        {form.mediaUrl ? (
          <div className="relative h-full">
            <Image
              src={form.mediaUrl}
              alt="Post"
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <ImageIcon
              className={`h-6 w-6 ${isDark ? "text-white/20" : "text-gray-300"}`}
            />
          </div>
        )}
      </div>
      <div
        className={`px-3 py-1.5 border-b ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
      >
        <p
          className={`text-xs font-semibold ${isDark ? "text-white/80" : "text-gray-700"}`}
        >
          Comments
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <div className="flex items-start gap-2">
          <div
            className={`w-6 h-6 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-gray-200"} flex-shrink-0 flex items-center justify-center`}
          >
            <span
              className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}
            >
              👤
            </span>
          </div>
          <div>
            <p
              className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}
            >
              <span
                className={`font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}
              >
                example_user
              </span>
              <span
                className={`text-xs ml-1 ${isDark ? "text-white/30" : "text-gray-400"}`}
              >
                1h
              </span>
            </p>
            <p
              className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}
            >
              {form.keywords[0] || "Leave a Comment..."}
            </p>
            <p
              className={`text-xs mt-0.5 ${isDark ? "text-white/30" : "text-gray-400"}`}
            >
              Reply
            </p>
          </div>
        </div>
        {form.publicReplies
          .filter(Boolean)
          .slice(0, 2)
          .map((reply, i) => (
            <div key={i} className="flex items-start gap-2 ml-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                {accountUsername?.[0]?.toUpperCase() || "A"}
              </div>
              <div>
                <p
                  className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}
                >
                  <span
                    className={`font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}
                  >
                    {accountUsername || "your_account"}
                  </span>
                  <span
                    className={`text-xs ml-1 ${isDark ? "text-white/30" : "text-gray-400"}`}
                  >
                    1h
                  </span>
                </p>
                <p
                  className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}
                >
                  {reply}
                </p>
                <p
                  className={`text-xs mt-0.5 ${isDark ? "text-white/30" : "text-gray-400"}`}
                >
                  Reply
                </p>
              </div>
            </div>
          ))}
      </div>
      <div
        className={`border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"} px-3 py-2 flex items-center gap-2`}
      >
        <div
          className={`flex-1 rounded-full px-3 py-1.5 text-xs ${isDark ? "bg-white/[0.06] text-white/40" : "bg-gray-100 text-gray-400"}`}
        >
          Add a comment...
        </div>
      </div>
    </div>
  );
}

function DMScreen({
  form,
  accountUsername,
  automationType,
  isDark,
}: {
  form: AutomationForm;
  accountUsername: string;
  automationType: string;
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

    if (automationType === "stories") {
      msgs.push({ from: "user", text: "Leave a keyword", isButton: true });
    }

    if (form.welcomeMessage && form.welcomeText) {
      msgs.push({
        from: "bot",
        text: form.welcomeText,
        isButton: true,
        buttonText: form.welcomeButtonTitle || "Send me the link",
      });
      msgs.push({
        from: "user",
        text: form.welcomeButtonTitle || "Send me the link",
      });
    }

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
      msgs.push({ from: "user", text: "test.gmail.com" });
      if (form.emailRetryMessage) {
        msgs.push({ from: "bot", text: form.emailRetryMessage });
        msgs.push({ from: "user", text: "test@gmail.com" });
      }
    }

    if (form.askPhone && form.phoneOpeningMessage) {
      msgs.push({ from: "bot", text: form.phoneOpeningMessage });
      msgs.push({ from: "user", text: "123456789" });
      if (form.phoneRetryMessage) {
        msgs.push({ from: "bot", text: form.phoneRetryMessage });
        msgs.push({ from: "user", text: "+1234567890" });
      }
    }

    if (form.dmMessage) {
      msgs.push({
        from: "bot",
        text: form.dmMessage,
        isButton: form.dmLinks.length > 0,
        buttonText: form.dmLinks[0]?.buttonTitle || "Get Access",
      });
    }

    if (msgs.length === 0) {
      msgs.push({
        from: "bot",
        text: "Configure your DM message to see the preview...",
      });
    }

    return msgs;
  }, [
    automationType,
    form.welcomeMessage,
    form.welcomeText,
    form.welcomeButtonTitle,
    form.askFollow,
    form.askFollowMessage,
    form.visitProfileBtn,
    form.followingBtn,
    form.askEmail,
    form.emailOpeningMessage,
    form.emailRetryMessage,
    form.askPhone,
    form.phoneOpeningMessage,
    form.phoneRetryMessage,
    form.dmMessage,
    form.dmLinks,
  ]);

  return (
    <div className="bg-[#0a0a0a] h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <button className="text-white/60">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
          {accountUsername?.[0]?.toUpperCase() || "A"}
        </div>
        <span className="text-xs font-medium text-white">
          {accountUsername || "your_account"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-white/60 text-sm">📞</span>
          <span className="text-white/60 text-sm">📹</span>
        </div>
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
                  {accountUsername?.[0]?.toUpperCase() || "A"}
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
              <div
                className={`${msg.isButton ? "bg-[#0088cc]" : "bg-blue-500"} text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%]`}
              >
                {msg.text}
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-start">
          <div className="flex items-end gap-1.5 max-w-[80%]">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex-shrink-0 flex items-center justify-center text-white text-xs">
              {accountUsername?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="bg-[#1a1a1a] text-gray-500 text-xs rounded-2xl rounded-bl-sm px-3 py-2 italic">
              Leave a message...
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2">
        <span className="text-white/60 text-lg">📷</span>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-500">
          Message...
        </div>
        <span className="text-white/60 text-lg">+</span>
      </div>
    </div>
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────

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
        style={{
          width: 18,
          height: 18,
          top: 3,
          left: checked ? 23 : 3,
        }}
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

// ─── Edit Link Modal ──────────────────────────────────────────────────────────

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
  const { styles } = useThemeStyles(); // for modal overlay classes

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`${
          isDark ? "bg-[#1A1A1E]" : "bg-white"
        } rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl`}
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
        <p
          className={`text-sm mb-4 ${isDark ? "text-white/40" : "text-gray-500"}`}
        >
          Set a title and link for your DM button
        </p>
        <div className="space-y-3">
          <div>
            <label
              className={`flex items-center gap-2 text-sm ${isDark ? "text-white/60" : "text-gray-600"} mb-2`}
            >
              <Pencil className="h-3 w-3" />
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
              placeholder="e.g. AInspiretech"
            />
          </div>
          <div>
            <label
              className={`flex items-center gap-2 text-sm ${isDark ? "text-white/60" : "text-gray-600"} mb-2`}
            >
              <LinkIcon className="h-3 w-3" />
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
              placeholder="https://ainspiretech.com"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateAutomationPage() {
  const params = useParams();
  const automationType =
    (params?.type as "comments" | "stories" | "dms") || "comments";
  const editId = (params?.id as string) || null;

  const [form, setForm] = useState<AutomationForm>({
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
    excludeKeywords: [],
    excludeKeywordInput: "",
    dmImage: null,
    dmImagePreview: "",
    dmMessage: "",
    dmLinks: [],
    welcomeMessage: false,
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
    isActive: true,
    priority: 5,
  });

  const [accounts, setAccounts] = useState<AccountDataType[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showMoreMedia, setShowMoreMedia] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkBtn, setNewLinkBtn] = useState("Get Access");
  const [editingPublicReplyIndex, setEditingPublicReplyIndex] = useState<
    number | null
  >(null);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();

  const { styles, isDark } = useThemeStyles();

  // Page‑specific styles (everything that isn’t in the central theme)
  const pageStyles = useMemo(() => {
    return {
      page: isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen",
      container: "flex flex-1",
      leftPreview: isDark
        ? "hidden lg:flex sticky top-28 items-start justify-center w-[320px] xl:w-[420px] flex-shrink-0 pt-12 px-8 h-[calc(100vh-77px)]"
        : "hidden lg:flex sticky top-28 items-start justify-center w-[320px] xl:w-[420px] flex-shrink-0 pt-12 px-8 h-[calc(100vh-77px)]",
      rightContent: "flex-1 overflow-y-auto w-full",
      actionBar:
        "flex items-center justify-end w-full gap-2 px-4 md:px-6 max-w-2xl mx-auto py-4",
      saveButton: (disabled?: boolean) =>
        isDark
          ? `flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
          : `flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      goLiveButton: (disabled?: boolean) =>
        isDark
          ? `flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
          : `flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
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
      mediaGrid: "grid grid-cols-4 gap-2 mb-2",
      mediaItem: (isSelected: boolean) =>
        isDark
          ? `relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
              isSelected
                ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-[#1A1A1E]"
                : "hover:opacity-90"
            }`
          : `relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
              isSelected
                ? "ring-2 ring-pink-500 ring-offset-1"
                : "hover:opacity-90"
            }`,
      mediaVideoBadge:
        "absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded",
      mediaLoadMore: isDark
        ? "aspect-square rounded-xl bg-pink-500/10 border-2 border-dashed border-pink-500/30 flex flex-col items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-colors text-xs text-center"
        : "aspect-square rounded-xl bg-pink-50 border-2 border-dashed border-pink-200 flex flex-col items-center justify-center text-pink-400 hover:bg-pink-100 transition-colors text-xs text-center",
      showMoreButton: isDark
        ? "w-full py-2 text-sm text-pink-400 font-medium hover:text-pink-300 transition-colors"
        : "w-full py-2 text-sm text-pink-500 font-medium hover:text-pink-600 transition-colors",
      accountGrid: "flex gap-2 flex-wrap",
      accountButton: (isSelected: boolean) =>
        isDark
          ? `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
              isSelected
                ? "bg-pink-500/10 border-2 border-pink-500 text-pink-400"
                : "bg-white/[0.06] border border-white/[0.08] text-white/60 hover:border-pink-500/50"
            }`
          : `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
              isSelected
                ? "bg-pink-50 border-2 border-pink-300 text-pink-600"
                : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300"
            }`,
      accountAvatar:
        "w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold",
      keywordInput: isDark
        ? "flex items-center w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white"
        : "flex items-center w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700",
      keywordField: isDark
        ? "w-full bg-transparent border-none text-sm text-white placeholder:text-white/25 focus:outline-none"
        : "w-full bg-gray-50 border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none",
      keywordAddButton: isDark
        ? "p-1 bg-red-500/80 text-white rounded-lg hover:bg-red-500"
        : "p-1 bg-red-400 text-white rounded-lg hover:bg-red-500",
      keywordTag: isDark
        ? "flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm"
        : "flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm",
      keywordRemove: isDark
        ? "text-pink-400/60 hover:text-pink-400"
        : "text-pink-400 hover:text-pink-600",
      uploadArea: isDark
        ? "border-2 border-dashed border-white/[0.08] rounded-xl p-6 text-center cursor-pointer hover:border-pink-500/50 hover:bg-pink-500/10 transition-all mb-4"
        : "border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/50 transition-all mb-4",
      uploadIcon: isDark
        ? "h-5 w-5 text-white/40 mx-auto mb-2"
        : "h-5 w-5 text-gray-400 mx-auto mb-2",
      uploadText: isDark ? "text-sm text-white/60" : "text-sm text-gray-500",
      uploadSubtext: isDark
        ? "text-xs text-white/40 mt-1"
        : "text-xs text-gray-400 mt-1",
      linkItem: isDark
        ? "flex items-center gap-2 mb-2 p-3 bg-white/[0.03] rounded-xl"
        : "flex items-center gap-2 mb-2 p-3 bg-gray-50 rounded-xl",
      linkIcon: isDark
        ? "h-4 w-4 text-white/40 flex-shrink-0"
        : "h-4 w-4 text-gray-400 flex-shrink-0",
      linkUrl: isDark
        ? "text-xs text-white/60 truncate"
        : "text-xs text-gray-600 truncate",
      linkTitle: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      linkAction: (color: string) =>
        isDark
          ? `p-1 text-white/40 hover:text-${color}-400`
          : `p-1 text-gray-400 hover:text-${color}-600`,
      linkForm: isDark
        ? "border border-white/[0.08] rounded-xl p-3 mb-2"
        : "border border-gray-200 rounded-xl p-3 mb-2",
      linkInput: isDark
        ? "w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-pink-500"
        : "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-300",
      addLinkButton: isDark
        ? "flex-1 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600"
        : "flex-1 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600",
      cancelButton: isDark
        ? "px-3 py-2 text-white/60 text-sm rounded-lg hover:bg-white/[0.06]"
        : "px-3 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100",
      addLinkTrigger: isDark
        ? "w-full py-2.5 border border-white/[0.08] rounded-xl text-sm text-pink-400 font-medium hover:bg-pink-500/10 transition-colors flex items-center justify-center gap-2"
        : "w-full py-2.5 border border-gray-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors flex items-center justify-center gap-2",
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
      publicReplyItem: (isEditing: boolean) =>
        isDark
          ? `flex items-center gap-2 border rounded-xl px-3 py-2.5 ${isEditing ? "border-pink-500" : "border-white/[0.08]"}`
          : `flex items-center gap-2 border rounded-xl px-3 py-2.5 ${isEditing ? "border-pink-300" : "border-gray-200"}`,
      tagButton: (isSelected: boolean) =>
        isDark
          ? `flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              isSelected
                ? "border-2 border-pink-400 text-pink-400 bg-pink-500/10"
                : "border border-white/[0.08] text-white/60 hover:border-pink-500/50"
            }`
          : `flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              isSelected
                ? "border-2 border-pink-400 text-pink-600 bg-pink-50"
                : "border border-gray-200 text-gray-600 hover:border-gray-300"
            }`,
      delayButton: (isSelected: boolean) =>
        isDark
          ? `flex-1 p-2 rounded-xl text-nowrap text-xs md:text-sm font-normal md:font-medium transition-colors ${
              isSelected
                ? "bg-pink-500 text-white"
                : "text-white/40 hover:text-white/60"
            }`
          : `flex-1 p-2 rounded-xl text-nowrap text-xs md:text-sm font-normal md:font-medium transition-colors ${
              isSelected
                ? "bg-pink-500 text-white"
                : "text-gray-400 hover:text-gray-600"
            }`,
      crownIcon: isDark ? "h-4 w-4 text-yellow-400" : "h-4 w-4 text-yellow-400",
      loadingContainer: isDark
        ? "min-h-screen flex items-center justify-center bg-[#0F0F11]"
        : "min-h-screen flex items-center justify-center bg-[#F8F9FA]",
      loadingSpinner: isDark
        ? "w-5 h-5 border-2 border-t-transparent border-pink-400 rounded-full animate-spin"
        : "w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin",
      followUpCard: isDark
        ? "border border-white/[0.08] rounded-xl p-4 space-y-3"
        : "border border-gray-200 rounded-xl p-4 space-y-3",
      followUpTitle: isDark
        ? "text-sm font-medium text-white"
        : "text-sm font-medium text-gray-700",
      followUpSelect: isDark
        ? "w-full px-4 py-3 bg-white/[0.05] border-2 border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30 transition-all appearance-none cursor-pointer hover:border-white/[0.12]"
        : "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all appearance-none cursor-pointer hover:border-gray-300",
      followUpGrid: "grid grid-cols-2 gap-2",
      followUpInput: isDark
        ? "px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
        : "px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-200",
      followUpTextarea: isDark
        ? "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none resize-none"
        : "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none",
      followUpAddLink: isDark
        ? "w-full py-2 border border-pink-500/30 rounded-xl text-sm text-pink-400 font-medium hover:bg-pink-500/10 transition-colors flex items-center justify-center gap-2"
        : "w-full py-2 border border-pink-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors flex items-center justify-center gap-2",
      addFollowUpButton: isDark
        ? "w-full py-2.5 border-2 border-dashed border-pink-500/30 rounded-xl text-sm text-pink-400 font-medium hover:bg-pink-500/10 transition-colors"
        : "w-full py-2.5 border-2 border-dashed border-pink-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors",
      // Empty state
      emptyIcon: isDark ? "text-white/20" : "text-gray-300",
      emptyText: isDark ? "text-white/35" : "text-gray-500",
    };
  }, [isDark]);

  // Memoized fetch media function
  const fetchMedia = useCallback(
    async (accountId: string) => {
      if (!accountId || automationType === "dms") return;

      setIsLoadingMedia(true);
      try {
        const data = await getInstaMedia(apiRequest, accountId);
        setMedia(data.media || []);
      } catch (e) {
        console.error("Error fetching media:", e);
        setMedia([]);
      } finally {
        setIsLoadingMedia(false);
      }
    },
    [apiRequest, automationType],
  );

  // Separate effect for fetching accounts - runs once
  useEffect(() => {
    if (!userId || !isLoaded) return;

    const fetchAccounts = async () => {
      try {
        const data = await getAllInstagramAccounts(apiRequest);
        if (data?.accounts) {
          const active = data.accounts.filter((a: any) => a.isActive);
          setAccounts(
            active.map((a: any) => ({
              instagramId: a.instagramId,
              username: a.username,
              isActive: a.isActive,
            })),
          );

          // Set first account only if not already set
          if (active.length > 0 && !form.accountId) {
            const first = active[0];
            setForm((prev) => ({
              ...prev,
              accountUsername: first.username,
              accountId: first.instagramId,
            }));
            // Fetch media for this account
            if (automationType !== "dms") {
              fetchMedia(first.instagramId);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching accounts:", e);
      }
    };

    fetchAccounts();
  }, [
    userId,
    isLoaded,
    apiRequest,
    automationType,
    form.accountId,
    fetchMedia,
  ]);

  // Separate effect for when account changes via dropdown
  useEffect(() => {
    if (form.accountId && automationType !== "dms") {
      fetchMedia(form.accountId);
    }
  }, [form.accountId, automationType, fetchMedia]);

  const handleAccountChange = useCallback((acc: AccountDataType) => {
    setForm((prev) => ({
      ...prev,
      accountUsername: acc.username,
      accountId: acc.instagramId,
      mediaId: "",
      mediaUrl: "",
      mediaType: "",
    }));
  }, []);

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

  const handleKeywordInput = useCallback(
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

  const handleDMImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      const preview = URL.createObjectURL(file);
      setForm((f) => ({ ...f, dmImage: file, dmImagePreview: preview }));
    },
    [],
  );

  const addLink = useCallback(() => {
    if (!newLinkUrl) return;
    setForm((f) => ({
      ...f,
      dmLinks: [...f.dmLinks, { url: newLinkUrl, buttonTitle: newLinkBtn }],
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
          title: "Please select an account",
          variant: "default",
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
        const content = [
          {
            text: form.dmMessage,
            link: form.dmLinks[0]?.url || "",
            buttonTitle: form.dmLinks[0]?.buttonTitle || "Get Access",
          },
          ...form.dmLinks.slice(1).map((l) => ({
            text: "",
            link: l.url,
            buttonTitle: l.buttonTitle,
          })),
        ].filter((c) => c.text || c.link);

        const payload = {
          name: form.name,
          content:
            content.length > 0
              ? content
              : [{ text: form.dmMessage || "", link: "", buttonTitle: "" }],
          reply: form.publicReplies.filter(Boolean),
          triggers:
            automationType === "stories"
              ? []
              : form.anyKeyword
                ? []
                : form.keywords.filter(Boolean),
          excludeKeywords:
            automationType === "stories"
              ? form.excludeKeywords.filter(Boolean)
              : [],
          isFollow: form.askFollow,
          priority: form.priority,
          accountUsername: form.accountUsername,
          mediaId: form.anyPostOrReel ? "" : form.mediaId,
          mediaUrl: form.mediaUrl,
          mediaType: form.mediaType,
          isActive: goLive ? true : form.isActive,
          delaySeconds:
            form.delayOption === "3min"
              ? 180
              : form.delayOption === "5min"
                ? 300
                : form.delayOption === "10min"
                  ? 600
                  : 0,
          automationType,
          welcomeMessage: {
            enabled: form.welcomeMessage,
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
          delayOption: form.delayOption,
        };

        if (editId) {
          await updateTemplate(apiRequest, editId, payload);
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
        toast({
          title: "Failed to save",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setter(false);
      }
    },
    [form, automationType, editId, apiRequest, router],
  );

  const visibleMedia = useMemo(
    () => (showMoreMedia ? media : media.slice(0, 4)),
    [media, showMoreMedia],
  );

  if (!isLoaded) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className={pageStyles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={pageStyles.page}>
      {isDark && <Orbs />}
      <div className={pageStyles.container}>
        {/* Left: Phone preview */}
        <div className={pageStyles.leftPreview}>
          <PhonePreview
            form={form}
            accountUsername={form.accountUsername}
            automationType={automationType}
            isDark={isDark}
          />
        </div>

        {/* Right: Form */}
        <div className={pageStyles.rightContent}>
          <div className={pageStyles.actionBar}>
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || isGoingLive}
              className={pageStyles.saveButton(isSaving || isGoingLive)}
            >
              <Bookmark className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || isGoingLive}
              className={pageStyles.goLiveButton(isSaving || isGoingLive)}
            >
              <Activity className="h-4 w-4" />
              {isGoingLive ? "Going Live..." : "Go Live"}
            </button>
          </div>

          <div className={pageStyles.formContainer}>
            {/* Automation name */}
            <input
              type="text"
              placeholder="Enter Automation Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={pageStyles.input}
            />

            {/* Account selector */}
            {accounts.length > 1 && (
              <div className={pageStyles.card}>
                <p
                  className={`text-xs font-medium mb-3 ${isDark ? "text-white/40" : "text-gray-500"}`}
                >
                  Instagram Account
                </p>
                <div className={pageStyles.accountGrid}>
                  {accounts.map((acc) => (
                    <button
                      key={acc.instagramId}
                      onClick={() => handleAccountChange(acc)}
                      className={pageStyles.accountButton(
                        form.accountUsername === acc.username,
                      )}
                    >
                      <div className={pageStyles.accountAvatar}>
                        {acc.username[0].toUpperCase()}
                      </div>
                      @{acc.username}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Select Post/Story (NOT for DMs) */}
            {automationType !== "dms" && (
              <div className={pageStyles.card}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={pageStyles.stepNumber}>1</div>
                  <h3 className={pageStyles.stepTitle}>
                    {automationType === "stories"
                      ? "Select a Story"
                      : "Select Instagram Posts or Reel"}
                  </h3>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}
                  >
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
                    isDark={isDark}
                  />
                </div>

                {!form.anyPostOrReel && (
                  <>
                    {isLoadingMedia ? (
                      <div className="flex items-center justify-center py-8">
                        <div className={pageStyles.loadingSpinner} />
                      </div>
                    ) : media.length > 0 ? (
                      <>
                        <div className={pageStyles.mediaGrid}>
                          {visibleMedia.map((item) => (
                            <div
                              key={item.id}
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  mediaId: item.id,
                                  mediaUrl: item.media_url,
                                  mediaType: item.media_type,
                                }))
                              }
                              className={pageStyles.mediaItem(
                                form.mediaId === item.id,
                              )}
                            >
                              <Image
                                src={item.media_url}
                                alt=""
                                fill
                                className="object-cover"
                              />
                              {item.media_type === "VIDEO" && (
                                <div className={pageStyles.mediaVideoBadge}>
                                  ▶
                                </div>
                              )}
                            </div>
                          ))}
                          {!showMoreMedia && media.length > 4 && (
                            <button
                              onClick={() => setShowMoreMedia(true)}
                              className={pageStyles.mediaLoadMore}
                            >
                              Next{" "}
                              {automationType === "stories" ? "Story" : "Post"}
                            </button>
                          )}
                        </div>
                        {!showMoreMedia && media.length > 4 && (
                          <button
                            onClick={() => setShowMoreMedia(true)}
                            className={pageStyles.showMoreButton}
                          >
                            Show More
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <ImageIcon
                          className={`h-8 w-8 mx-auto mb-2 ${pageStyles.emptyIcon}`}
                        />
                        <p className={`text-sm ${pageStyles.emptyText}`}>
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

            {/* Step 2: Trigger Keywords (NOT for DMs) */}
            <div className={pageStyles.card}>
              <div className="flex items-center gap-3 mb-4">
                <div className={pageStyles.stepNumber}>
                  {automationType === "dms" ? "1" : "2"}
                </div>
                <h3 className={pageStyles.stepTitle}>Set Trigger Keywords</h3>
              </div>

              {/* ANY KEYWORD TOGGLE */}
              {(automationType === "comments" ||
                automationType === "stories") && (
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}
                  >
                    Any keyword
                  </span>
                  <Toggle
                    checked={form.anyKeyword}
                    onChange={(v) => setForm((f) => ({ ...f, anyKeyword: v }))}
                    isDark={isDark}
                  />
                </div>
              )}

              {/* KEYWORD INPUT SECTION */}
              {(automationType === "dms" ||
                ((automationType === "comments" ||
                  automationType === "stories") &&
                  !form.anyKeyword)) && (
                <>
                  {/* INPUT */}
                  <div className={pageStyles.keywordInput}>
                    <input
                      type="text"
                      placeholder="Type & Hit ↵ Enter to add Keyword"
                      value={form.keywordInput}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          keywordInput: e.target.value,
                        }))
                      }
                      onKeyDown={handleKeywordInput}
                      className={pageStyles.keywordField}
                    />

                    {form.keywordInput && (
                      <button
                        type="button"
                        onClick={addKeyword}
                        className={pageStyles.keywordAddButton}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* KEYWORD TAGS */}
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.keywords.map((kw) => (
                        <span key={kw} className={pageStyles.keywordTag}>
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            className={pageStyles.keywordRemove}
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

            {/* Step 3: Send DM */}
            <div className={pageStyles.card}>
              <div className="flex items-center gap-3 mb-4">
                <div className={pageStyles.stepNumber}>
                  {automationType === "dms" ? "2" : "3"}
                </div>
                <h3 className={pageStyles.stepTitle}>Send DM</h3>
              </div>

              {!form.dmImagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={pageStyles.uploadArea}
                >
                  <Upload className={pageStyles.uploadIcon} />
                  <p className={pageStyles.uploadText}>
                    Drag and drop or click to upload
                  </p>
                  <p className={pageStyles.uploadSubtext}>
                    Max 2 MB • PNG or JPEG only
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleDMImageUpload}
                  />
                </div>
              ) : (
                <div className="relative mb-4 rounded-xl overflow-hidden">
                  <Image
                    src={form.dmImagePreview}
                    alt="DM attachment"
                    width={200}
                    height={120}
                    className="object-cover rounded-xl"
                  />
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        dmImage: null,
                        dmImagePreview: "",
                      }))
                    }
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div
                className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden mb-1`}
              >
                <textarea
                  value={form.dmMessage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dmMessage: e.target.value }))
                  }
                  placeholder="Enter your message here..."
                  maxLength={1000}
                  rows={3}
                  className={pageStyles.textarea}
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

              {form.dmLinks.map((link, i) => (
                <div key={i} className={pageStyles.linkItem}>
                  <LinkIcon className={pageStyles.linkIcon} />
                  <div className="flex-1 min-w-0">
                    <p className={pageStyles.linkUrl}>{link.url}</p>
                    <p className={pageStyles.linkTitle}>{link.buttonTitle}</p>
                  </div>
                  <button
                    onClick={() => setEditingLinkIndex(i)}
                    className={pageStyles.linkAction("gray")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeLink(i)}
                    className={pageStyles.linkAction("red")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {showLinkForm ? (
                <div className={pageStyles.linkForm}>
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://yourlink.com"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className={pageStyles.linkInput}
                    />
                    <input
                      type="text"
                      placeholder="Button title (e.g. Get Access)"
                      value={newLinkBtn}
                      onChange={(e) => setNewLinkBtn(e.target.value)}
                      className={pageStyles.linkInput}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addLink}
                        className={pageStyles.addLinkButton}
                      >
                        Add Link
                      </button>
                      <button
                        onClick={() => setShowLinkForm(false)}
                        className={pageStyles.cancelButton}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkForm(true)}
                  className={pageStyles.addLinkTrigger}
                >
                  <Plus className="h-4 w-4" />
                  Add Link
                </button>
              )}
            </div>

            {/* Welcome Message */}
            <div className={pageStyles.cardNoPadding}>
              <div className={pageStyles.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={pageStyles.sectionLabel}>
                    Welcome Message
                  </span>
                  <Info className={pageStyles.sectionInfoIcon} />
                </div>
                <Toggle
                  checked={form.welcomeMessage}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, welcomeMessage: v }))
                  }
                  isDark={isDark}
                />
              </div>

              {form.welcomeMessage && (
                <div className={pageStyles.sectionContent}>
                  <div
                    className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden`}
                  >
                    <textarea
                      value={form.welcomeText}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, welcomeText: e.target.value }))
                      }
                      maxLength={1000}
                      rows={3}
                      className={pageStyles.textarea}
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
                  <div
                    className={`flex items-center gap-2 border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl px-3 py-2.5`}
                  >
                    <Pencil
                      className={`h-4 w-4 ${isDark ? "text-white/40" : "text-gray-400"} flex-shrink-0`}
                    />
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
                      className={
                        isDark
                          ? "flex-1 text-sm text-white bg-transparent focus:outline-none"
                          : "flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Publicly Reply To Comments */}
            {automationType === "comments" && (
              <div className={pageStyles.cardNoPadding}>
                <div className={pageStyles.sectionToggle}>
                  <div className="flex items-center justify-start gap-2">
                    <span className={pageStyles.sectionLabel}>
                      Publicly Reply To Comments
                    </span>
                    <Info className={pageStyles.sectionInfoIcon} />
                  </div>
                  <Toggle
                    checked={form.publicReply}
                    onChange={(v) => setForm((f) => ({ ...f, publicReply: v }))}
                    isDark={isDark}
                  />
                </div>

                {form.publicReply && (
                  <div className={pageStyles.sectionContent}>
                    {form.publicReplies.map((reply, i) => (
                      <div
                        key={i}
                        className={pageStyles.publicReplyItem(
                          editingPublicReplyIndex === i,
                        )}
                      >
                        <span
                          className={`${isDark ? "text-white/40" : "text-gray-400"} flex-shrink-0`}
                        >
                          💬
                        </span>
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
                          className={
                            isDark
                              ? "flex-1 text-sm text-white bg-transparent focus:outline-none"
                              : "flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
                          }
                          placeholder="Reply text..."
                        />
                        <button
                          onClick={() => removePublicReply(i)}
                          className={
                            isDark
                              ? "text-white/30 hover:text-red-400 flex-shrink-0"
                              : "text-gray-300 hover:text-red-400 flex-shrink-0"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={addPublicReply}
                      className={pageStyles.addLinkTrigger}
                    >
                      <Plus className="h-4 w-4" />
                      Add Public Reply
                    </button>

                    <div>
                      <p
                        className={`text-sm mb-2 mt-2 ${isDark ? "text-white/60" : "text-gray-600"}`}
                      >
                        Tag in public reply?
                      </p>
                      <div className="flex gap-2">
                        {(["none", "user", "account"] as const).map((tag) => (
                          <button
                            key={tag}
                            onClick={() =>
                              setForm((f) => ({ ...f, tagType: tag }))
                            }
                            className={pageStyles.tagButton(
                              form.tagType === tag,
                            )}
                          >
                            {tag === "none"
                              ? "None"
                              : tag === "user"
                                ? "User"
                                : "Account"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ask To Follow */}
            <div className={pageStyles.cardNoPadding}>
              <div className={pageStyles.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={pageStyles.sectionLabel}>
                    Ask To Follow Before Sending DM
                  </span>
                  <Info className={pageStyles.sectionInfoIcon} />
                </div>
                <Toggle
                  checked={form.askFollow}
                  onChange={(v) => setForm((f) => ({ ...f, askFollow: v }))}
                  isDark={isDark}
                />
              </div>

              {form.askFollow && (
                <div className={pageStyles.sectionContent}>
                  <div
                    className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden`}
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
                      className={pageStyles.textarea}
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

                  <div
                    className={`flex items-center gap-2 border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl px-3 py-2.5`}
                  >
                    <Pencil
                      className={`h-4 w-4 ${isDark ? "text-white/40" : "text-gray-400"} flex-shrink-0`}
                    />
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
                      className={
                        isDark
                          ? "flex-1 text-sm text-white bg-transparent focus:outline-none"
                          : "flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
                      }
                    />
                  </div>

                  <div
                    className={`flex items-center gap-2 border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl px-3 py-2.5`}
                  >
                    <Pencil
                      className={`h-4 w-4 ${isDark ? "text-white/40" : "text-gray-400"} flex-shrink-0`}
                    />
                    <input
                      type="text"
                      value={form.followingBtn}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, followingBtn: e.target.value }))
                      }
                      placeholder="I'm following ✅"
                      className={
                        isDark
                          ? "flex-1 text-sm text-white bg-transparent focus:outline-none"
                          : "flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ask Email */}
            <div className={pageStyles.cardNoPadding}>
              <div className={pageStyles.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={pageStyles.sectionLabel}>
                    Ask To Share Their Email
                  </span>
                  <Info className={pageStyles.sectionInfoIcon} />
                  <Crown className={pageStyles.crownIcon} />
                </div>
                <Toggle
                  checked={form.askEmail}
                  onChange={(v) => setForm((f) => ({ ...f, askEmail: v }))}
                  isDark={isDark}
                />
              </div>

              {form.askEmail && (
                <div className={pageStyles.sectionContent}>
                  <div>
                    <p
                      className={`text-xs font-medium mb-2 ${isDark ? "text-white/60" : "text-gray-600"}`}
                    >
                      Opening Message:
                    </p>
                    <div
                      className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden`}
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
                        className={pageStyles.textarea}
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
                    <p
                      className={`text-xs font-medium mb-2 ${isDark ? "text-white/60" : "text-gray-600"}`}
                    >
                      Retry Message if the answer is incorrect:
                    </p>
                    <div
                      className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden`}
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
                        className={pageStyles.textarea}
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
                    <p
                      className={`text-xs mb-2 ${isDark ? "text-white/40" : "text-gray-500"}`}
                    >
                      Retry 3 times and if the user still has not shared valid
                      email:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm((f) => ({ ...f, emailNoValidAction: "send" }))
                        }
                        className={pageStyles.tagButton(
                          form.emailNoValidAction === "send",
                        )}
                      >
                        Send them the DM anyway
                      </button>
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            emailNoValidAction: "nosend",
                          }))
                        }
                        className={pageStyles.tagButton(
                          form.emailNoValidAction === "nosend",
                        )}
                      >
                        Do not send them the DM
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ask Phone (for Stories) */}
            {automationType === "stories" && (
              <div className={pageStyles.cardNoPadding}>
                <div className={pageStyles.sectionToggle}>
                  <div className="flex items-center gap-2">
                    <span className={pageStyles.sectionLabel}>
                      Ask To Share Their Phone
                    </span>
                    <Info className={pageStyles.sectionInfoIcon} />
                    <Crown className={pageStyles.crownIcon} />
                  </div>
                  <Toggle
                    checked={form.askPhone}
                    onChange={(v) => setForm((f) => ({ ...f, askPhone: v }))}
                    isDark={isDark}
                  />
                </div>

                {form.askPhone && (
                  <div className={pageStyles.sectionContent}>
                    <div>
                      <p
                        className={`text-xs font-medium mb-2 ${isDark ? "text-white/60" : "text-gray-600"}`}
                      >
                        Opening Message:
                      </p>
                      <div
                        className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden`}
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
                          className={pageStyles.textarea}
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
                      <p
                        className={`text-xs font-medium mb-2 ${isDark ? "text-white/60" : "text-gray-600"}`}
                      >
                        Retry Message if the answer is incorrect:
                      </p>
                      <div
                        className={`border ${isDark ? "border-white/[0.08]" : "border-gray-200"} rounded-xl overflow-hidden`}
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
                          className={pageStyles.textarea}
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
                      <p
                        className={`text-xs mb-2 ${isDark ? "text-white/40" : "text-gray-500"}`}
                      >
                        After 3 invalid attempts:
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              phoneNoValidAction: "send",
                            }))
                          }
                          className={pageStyles.tagButton(
                            form.phoneNoValidAction === "send",
                          )}
                        >
                          Send them the next DM anyway
                        </button>
                        <button
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              phoneNoValidAction: "nosend",
                            }))
                          }
                          className={pageStyles.tagButton(
                            form.phoneNoValidAction === "nosend",
                          )}
                        >
                          Do not send them the next DM
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Follow-Up DMs */}
            <div className={pageStyles.cardNoPadding}>
              <div className={pageStyles.sectionToggle}>
                <div className="flex items-center gap-2">
                  <span className={pageStyles.sectionLabel}>
                    Send Follow-Up DMs
                  </span>
                  <Info className={pageStyles.sectionInfoIcon} />
                  <Crown className={pageStyles.crownIcon} />
                </div>
                <Toggle
                  checked={form.followUpDMs}
                  onChange={(v) => setForm((f) => ({ ...f, followUpDMs: v }))}
                  isDark={isDark}
                />
              </div>

              {form.followUpDMs && (
                <div className={pageStyles.sectionContent}>
                  {form.followUpMessages.map((msg, i) => (
                    <div key={i} className={pageStyles.followUpCard}>
                      <div className="flex items-center justify-between">
                        <h4 className={pageStyles.followUpTitle}>
                          #{i + 1} Follow-Up Message
                        </h4>
                        <button
                          onClick={() => removeFollowUpMessage(i)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <select
                        value={msg.condition}
                        onChange={(e) => {
                          const updated = [...form.followUpMessages];
                          updated[i] = {
                            ...updated[i],
                            condition: e.target.value,
                          };
                          setForm((f) => ({ ...f, followUpMessages: updated }));
                        }}
                        className={pageStyles.followUpSelect}
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
                      <div className={pageStyles.followUpGrid}>
                        <input
                          type="number"
                          value={msg.waitTime}
                          onChange={(e) => {
                            const updated = [...form.followUpMessages];
                            updated[i] = {
                              ...updated[i],
                              waitTime: parseInt(e.target.value) || 60,
                            };
                            setForm((f) => ({
                              ...f,
                              followUpMessages: updated,
                            }));
                          }}
                          className={pageStyles.followUpInput}
                          placeholder="60"
                        />
                        <select
                          value={msg.waitUnit}
                          onChange={(e) => {
                            const updated = [...form.followUpMessages];
                            updated[i] = {
                              ...updated[i],
                              waitUnit: e.target.value as "minutes" | "hours",
                            };
                            setForm((f) => ({
                              ...f,
                              followUpMessages: updated,
                            }));
                          }}
                          className={pageStyles.followUpInput}
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
                      <p
                        className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}
                      >
                        Between 5 min and 23 hours • Wait for 1 hr
                      </p>

                      <textarea
                        value={msg.message}
                        onChange={(e) => {
                          const updated = [...form.followUpMessages];
                          updated[i] = {
                            ...updated[i],
                            message: e.target.value,
                          };
                          setForm((f) => ({ ...f, followUpMessages: updated }));
                        }}
                        placeholder="Just checking in—did you get a chance to see our previous message?"
                        rows={3}
                        maxLength={1000}
                        className={pageStyles.followUpTextarea}
                      />
                      <CharCounter
                        current={msg.message.length}
                        max={1000}
                        isDark={isDark}
                      />

                      <button className={pageStyles.followUpAddLink}>
                        <Plus className="h-4 w-4" />
                        Add Link
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addFollowUpMessage}
                    className={pageStyles.addFollowUpButton}
                  >
                    Add follow-up message
                  </button>
                </div>
              )}
            </div>

            {/* Delay */}
            <div className={pageStyles.card}>
              <div className="flex items-center gap-2 mb-4">
                <h3
                  className={`text-sm font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}
                >
                  Delay before sending DM
                </h3>
                <Crown className={pageStyles.crownIcon} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["immediate", "3min", "5min", "10min"] as const).map(
                  (opt) => {
                    const labels = {
                      immediate: "Immediate",
                      "3min": "3 min",
                      "5min": "5 min",
                      "10min": "10 min",
                    };
                    return (
                      <button
                        key={opt}
                        onClick={() =>
                          setForm((f) => ({ ...f, delayOption: opt }))
                        }
                        className={pageStyles.delayButton(
                          form.delayOption === opt,
                        )}
                      >
                        {labels[opt]}
                      </button>
                    );
                  },
                )}
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
