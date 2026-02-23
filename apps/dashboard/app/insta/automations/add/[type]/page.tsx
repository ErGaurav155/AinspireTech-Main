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
}: {
  form: AutomationForm;
  accountUsername: string;
  automationType: string;
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
    <div className="fixed top-24 ">
      <div
        className="relative mx-auto rounded-[3rem] overflow-hidden shadow-2xl bg-black"
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
            <PostsScreen form={form} accountUsername={accountUsername} />
          )}
          {screen === "story" && (
            <StoryScreen form={form} accountUsername={accountUsername} />
          )}
          {screen === "comments" && (
            <CommentsScreen form={form} accountUsername={accountUsername} />
          )}
          {screen === "dm" && (
            <DMScreen
              form={form}
              accountUsername={accountUsername}
              automationType={automationType}
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
}: {
  form: AutomationForm;
  accountUsername: string;
}) {
  return (
    <div className="bg-white h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <button className="text-gray-800">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <span className="text-sm font-semibold text-gray-800">Posts</span>
        <div className="w-4" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
            {accountUsername?.[0]?.toUpperCase() || "A"}
          </div>
          <span className="text-xs font-medium text-gray-800">
            {accountUsername || "your_account"}
          </span>
          <span className="text-gray-300 text-xs ml-auto">···</span>
        </div>
        <div className="bg-gray-100 w-full relative" style={{ height: 200 }}>
          {form.mediaUrl ? (
            <Image
              src={form.mediaUrl}
              alt="Post"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Select a post</p>
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
          <p className="text-xs text-gray-600">
            <span className="font-semibold">
              {accountUsername || "your_account"}
            </span>{" "}
            <span className="text-gray-500 truncate">
              {form.mediaUrl
                ? "Click the link in my bio! 🔥"
                : "Select a post to preview"}
            </span>
          </p>
        </div>
      </div>
      <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-400">
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
}: {
  form: AutomationForm;
  accountUsername: string;
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
}: {
  form: AutomationForm;
  accountUsername: string;
}) {
  return (
    <div className="bg-white h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <button className="text-gray-800">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <span className="text-sm font-semibold text-gray-800">Posts</span>
        <div className="w-4" />
      </div>
      <div className="bg-gray-100 w-full" style={{ height: 130 }}>
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
            <ImageIcon className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700">Comments</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
            <span className="text-xs text-gray-500">👤</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">example_user</span>
              <span className="text-gray-400 text-xs ml-1">1h</span>
            </p>
            <p className="text-xs text-gray-600">
              {form.keywords[0] || "Leave a Comment..."}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Reply</p>
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
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {accountUsername || "your_account"}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">1h</span>
                </p>
                <p className="text-xs text-gray-600">{reply}</p>
                <p className="text-xs text-gray-400 mt-0.5">Reply</p>
              </div>
            </div>
          ))}
      </div>
      <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-400">
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
}: {
  form: AutomationForm;
  accountUsername: string;
  automationType: string;
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative rounded-full transition-colors flex-shrink-0 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${checked ? "bg-pink-500" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="absolute bg-white rounded-full shadow-sm transition-all"
        style={{
          width: 18,
          height: 18,
          top: 3,
          left: checked ? 23 : 3,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100;
  const r = 8;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#d1d5db";

  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20">
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="#e5e7eb"
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
      <span className="text-xs text-gray-400">
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
}: {
  link: { url: string; buttonTitle: string };
  onSave: (url: string, title: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.buttonTitle);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Edit Link</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Set a title and link for your DM button
        </p>
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Pencil className="h-3 w-3" />
              Button Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
              placeholder="e.g. AInspiretech"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <LinkIcon className="h-3 w-3" />
              Link URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
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
  const { apiRequest } = useApi();

  // Memoized fetch media function - NO dependencies to prevent recreation
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
    [apiRequest, automationType], // Only depends on these
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
  ]); // Added proper dependencies

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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <div className="flex flex-1 ">
        {/* Left: Phone preview */}
        <div
          className="hidden lg:flex sticky top-28 items-start justify-center w-[320px] xl:w-[420px] flex-shrink-0 pt-12 px-8 h-[calc(100vh-77px)]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundColor: "#F8F9FA",
          }}
        >
          <PhonePreview
            form={form}
            accountUsername={form.accountUsername}
            automationType={automationType}
          />
        </div>

        {/* Right: Form */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="flex items-center justify-end w-full gap-2 px-4 md:px-6 max-w-2xl mx-auto py-4">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || isGoingLive}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Bookmark className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || isGoingLive}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Activity className="h-4 w-4" />
              {isGoingLive ? "Going Live..." : "Go Live"}
            </button>
          </div>

          <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-4">
            {/* Automation name */}
            <input
              type="text"
              placeholder="Enter Automation Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
            />

            {/* Account selector */}
            {accounts.length > 1 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  Instagram Account
                </p>
                <div className="flex gap-2 flex-wrap">
                  {accounts.map((acc) => (
                    <button
                      key={acc.instagramId}
                      onClick={() => handleAccountChange(acc)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                        form.accountUsername === acc.username
                          ? "bg-pink-50 border-2 border-pink-300 text-pink-600"
                          : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
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
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    {automationType === "stories"
                      ? "Select a Story"
                      : "Select Instagram Posts or Reel"}
                  </h3>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">
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
                  />
                </div>

                {!form.anyPostOrReel && (
                  <>
                    {isLoadingMedia ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
                      </div>
                    ) : media.length > 0 ? (
                      <>
                        <div className="grid grid-cols-4 gap-2 mb-2">
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
                              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${form.mediaId === item.id ? "ring-2 ring-pink-500 ring-offset-1" : "hover:opacity-90"}`}
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
                            </div>
                          ))}
                          {!showMoreMedia && media.length > 4 && (
                            <button
                              onClick={() => setShowMoreMedia(true)}
                              className="aspect-square rounded-xl bg-pink-50 border-2 border-dashed border-pink-200 flex flex-col items-center justify-center text-pink-400 hover:bg-pink-100 transition-colors text-xs text-center"
                            >
                              Next{" "}
                              {automationType === "stories" ? "Story" : "Post"}
                            </button>
                          )}
                        </div>
                        {!showMoreMedia && media.length > 4 && (
                          <button
                            onClick={() => setShowMoreMedia(true)}
                            className="w-full py-2 text-sm text-pink-500 font-medium hover:text-pink-600 transition-colors"
                          >
                            Show More
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
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

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <h3 className="font-semibold text-gray-800">
                  Set Trigger Keywords
                </h3>
              </div>

              {/* ANY KEYWORD TOGGLE */}
              {(automationType === "comments" ||
                automationType === "stories") && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Any keyword</span>
                  <Toggle
                    checked={form.anyKeyword}
                    onChange={(v) => setForm((f) => ({ ...f, anyKeyword: v }))}
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
                  <div className="flex items-center w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
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
                      className="w-full bg-gray-50 border-none text-sm text-gray-700 focus:outline-none"
                    />

                    {form.keywordInput && (
                      <button type="button" onClick={addKeyword}>
                        <Plus className="h-6 w-6 text-red-400 border rounded-lg p-1" />
                      </button>
                    )}
                  </div>

                  {/* KEYWORD TAGS */}
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm"
                        >
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            className="text-pink-400 hover:text-pink-600"
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
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {automationType === "dms" ? "1" : "3"}
                </div>
                <h3 className="font-semibold text-gray-800">Send DM</h3>
              </div>

              {!form.dmImagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/50 transition-all mb-4"
                >
                  <Upload className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
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

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-1">
                <textarea
                  value={form.dmMessage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dmMessage: e.target.value }))
                  }
                  placeholder="Enter your message here..."
                  maxLength={1000}
                  rows={3}
                  className="w-full px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none border-0"
                />
                <div className="flex items-center px-4 py-2 border-t border-gray-100">
                  <CharCounter current={form.dmMessage.length} max={1000} />
                </div>
              </div>

              {form.dmLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 mb-2 p-3 bg-gray-50 rounded-xl"
                >
                  <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">{link.url}</p>
                    <p className="text-xs text-gray-400">{link.buttonTitle}</p>
                  </div>
                  <button
                    onClick={() => setEditingLinkIndex(i)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeLink(i)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {showLinkForm ? (
                <div className="border border-gray-200 rounded-xl p-3 mb-2">
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://yourlink.com"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-pink-300"
                    />
                    <input
                      type="text"
                      placeholder="Button title (e.g. Get Access)"
                      value={newLinkBtn}
                      onChange={(e) => setNewLinkBtn(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-pink-300"
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
                        className="px-3 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkForm(true)}
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Link
                </button>
              )}
            </div>

            {/* Welcome Message */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Welcome Message
                  </span>
                  <Info className="h-4 w-4 text-gray-300" />
                </div>
                <Toggle
                  checked={form.welcomeMessage}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, welcomeMessage: v }))
                  }
                />
              </div>

              {form.welcomeMessage && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <textarea
                      value={form.welcomeText}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, welcomeText: e.target.value }))
                      }
                      maxLength={1000}
                      rows={3}
                      className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none"
                    />
                    <div className="flex items-center px-4 py-2 border-t border-gray-100">
                      <CharCounter
                        current={form.welcomeText.length}
                        max={1000}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
                    <Pencil className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
                      className="flex-1 text-sm text-gray-700 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Publicly Reply To Comments */}
            {automationType === "comments" && (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 gap-3">
                  <div className="flex items-center justify-start gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Publicly Reply To Comments
                    </span>
                    <Info className="h-4 w-4 text-gray-300" />
                  </div>
                  <Toggle
                    checked={form.publicReply}
                    onChange={(v) => setForm((f) => ({ ...f, publicReply: v }))}
                  />
                </div>

                {form.publicReply && (
                  <div className="px-5 pb-5 space-y-2 border-t border-gray-50 pt-4">
                    {form.publicReplies.map((reply, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 ${editingPublicReplyIndex === i ? "border-pink-300" : "border-gray-200"}`}
                      >
                        <span className="text-gray-400 flex-shrink-0">💬</span>
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
                          className="flex-1 text-sm text-gray-700 focus:outline-none"
                          placeholder="Reply text..."
                        />
                        <button
                          onClick={() => removePublicReply(i)}
                          className="text-gray-300 hover:text-red-400 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={addPublicReply}
                      className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Public Reply
                    </button>

                    <div>
                      <p className="text-sm text-gray-600 mb-2 mt-2">
                        Tag in public reply?
                      </p>
                      <div className="flex gap-2">
                        {(["none", "user", "account"] as const).map((tag) => (
                          <button
                            key={tag}
                            onClick={() =>
                              setForm((f) => ({ ...f, tagType: tag }))
                            }
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                              form.tagType === tag
                                ? "border-2 border-pink-400 text-pink-600 bg-pink-50"
                                : "border border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
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
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Ask To Follow Before Sending DM
                  </span>
                  <Info className="h-4 w-4 text-gray-300" />
                </div>
                <Toggle
                  checked={form.askFollow}
                  onChange={(v) => setForm((f) => ({ ...f, askFollow: v }))}
                />
              </div>

              {form.askFollow && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                      className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none"
                    />
                    <div className="flex items-center px-4 py-2 border-t border-gray-100">
                      <CharCounter
                        current={form.askFollowMessage.length}
                        max={500}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
                    <Pencil className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
                      className="flex-1 text-sm text-gray-700 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
                    <Pencil className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={form.followingBtn}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, followingBtn: e.target.value }))
                      }
                      placeholder="I'm following ✅"
                      className="flex-1 text-sm text-gray-700 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ask Email */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Ask To Share Their Email
                  </span>
                  <Info className="h-4 w-4 text-gray-300" />
                  <Crown className="h-4 w-4 text-yellow-400" />
                </div>
                <Toggle
                  checked={form.askEmail}
                  onChange={(v) => setForm((f) => ({ ...f, askEmail: v }))}
                />
              </div>

              {form.askEmail && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Opening Message:
                    </p>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                        className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none"
                      />
                      <div className="flex items-center px-4 py-2 border-t border-gray-100">
                        <CharCounter
                          current={form.emailOpeningMessage.length}
                          max={1000}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Retry Message if the answer is incorrect:
                    </p>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                        className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none"
                      />
                      <div className="flex items-center px-4 py-2 border-t border-gray-100">
                        <CharCounter
                          current={form.emailRetryMessage.length}
                          max={500}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      Retry 3 times and if the user still has not shared valid
                      email:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm((f) => ({ ...f, emailNoValidAction: "send" }))
                        }
                        className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${
                          form.emailNoValidAction === "send"
                            ? "border-2 border-pink-400 text-pink-600 font-medium"
                            : "border border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
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
                        className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${
                          form.emailNoValidAction === "nosend"
                            ? "border-2 border-pink-400 text-pink-600 font-medium"
                            : "border border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        Do not send them the DM
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ask Phone (NEW - for Stories primarily) */}
            {automationType === "stories" && (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Ask To Share Their Phone
                    </span>
                    <Info className="h-4 w-4 text-gray-300" />
                    <Crown className="h-4 w-4 text-yellow-400" />
                  </div>
                  <Toggle
                    checked={form.askPhone}
                    onChange={(v) => setForm((f) => ({ ...f, askPhone: v }))}
                  />
                </div>

                {form.askPhone && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Opening Message:
                      </p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                          className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none"
                        />
                        <div className="flex items-center px-4 py-2 border-t border-gray-100">
                          <CharCounter
                            current={form.phoneOpeningMessage.length}
                            max={1000}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Retry Message if the answer is incorrect:
                      </p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                          className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none"
                        />
                        <div className="flex items-center px-4 py-2 border-t border-gray-100">
                          <CharCounter
                            current={form.phoneRetryMessage.length}
                            max={500}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-2">
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
                          className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${
                            form.phoneNoValidAction === "send"
                              ? "border-2 border-pink-400 text-pink-600 font-medium"
                              : "border border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
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
                          className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${
                            form.phoneNoValidAction === "nosend"
                              ? "border-2 border-pink-400 text-pink-600 font-medium"
                              : "border border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
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
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Send Follow-Up DMs
                  </span>
                  <Info className="h-4 w-4 text-gray-300" />
                  <Crown className="h-4 w-4 text-yellow-400" />
                </div>
                <Toggle
                  checked={form.followUpDMs}
                  onChange={(v) => setForm((f) => ({ ...f, followUpDMs: v }))}
                />
              </div>

              {form.followUpDMs && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
                  {form.followUpMessages.map((msg, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
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
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm 
    focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900/30 
    transition-all duration-200 appearance-none cursor-pointer
    hover:border-gray-300 dark:hover:border-gray-600
    text-gray-700 dark:text-gray-200 font-medium 
    bg-no-repeat bg-[right_1rem_center] bg-[length:16px] pr-10"
                      >
                        <option
                          value=""
                          className="text-gray-400 dark:text-gray-500"
                        >
                          Select a condition
                        </option>
                        <option
                          value="no_reply"
                          className="text-gray-700 dark:text-gray-200 py-2"
                        >
                          💬 If user has not replied
                        </option>
                        <option
                          value="no_action"
                          className="text-gray-700 dark:text-gray-200 py-2"
                        >
                          🔄 If user has not taken action
                        </option>
                      </select>
                      <div className="grid grid-cols-2 gap-2">
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
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-pink-200"
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
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-pink-200"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      </div>
                      <p className="text-xs text-gray-400">
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
                        className="w-full px-4 py-3 text-sm text-gray-700 border border-gray-200 rounded-xl focus:outline-none resize-none"
                      />
                      <CharCounter current={msg.message.length} max={1000} />

                      <button className="w-full py-2 border border-pink-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Link
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addFollowUpMessage}
                    className="w-full py-2.5 border-2 border-dashed border-pink-200 rounded-xl text-sm text-pink-500 font-medium hover:bg-pink-50 transition-colors"
                  >
                    Add follow-up message
                  </button>
                </div>
              )}
            </div>

            {/* Delay */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Delay before sending DM
                </h3>
                <Crown className="h-4 w-4 text-yellow-400" />
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
                        className={`flex-1 p-2 rounded-xl text-nowrap text-xs md:text-sm font-normal md:font-medium transition-colors ${
                          form.delayOption === opt
                            ? "bg-pink-500 text-white"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
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
        />
      )}
    </div>
  );
}
