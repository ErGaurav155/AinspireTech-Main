"use client";
// apps/dashboard/app/web/[chatbotId]/conversations/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  MessageCircle,
  Bot,
  GraduationCap,
  ExternalLink,
  Search,
  Loader2,
  ChevronDown,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  RefreshCw,
  Download,
  Calendar,
  User,
  Zap,
  TrendingUp,
  Filter,
  ChevronRight,
  X,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getChatbots,
  getConversations,
  updateConversationStatus,
} from "@/lib/services/web-actions.api";
import { Orbs, useThemeStyles } from "@rocketreplai/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "active" | "resolved";
type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: string;
}

interface FormField {
  question: string;
  answer: string;
}

interface Conversation {
  _id: string;
  customerName?: string;
  customerEmail?: string;
  messages: Message[];
  formData?: FormField[]; // This should be an array, not an object
  status: Status;
  createdAt: string;
  updatedAt: string;
  type?: "chat" | "appointment";
}

// Helper to normalize formData (handle both array and object formats)
function normalizeFormData(formData: any): FormField[] {
  if (!formData) return [];

  // If it's already an array
  if (Array.isArray(formData)) {
    return formData;
  }

  // If it's an object, convert to array
  if (typeof formData === "object") {
    return Object.entries(formData).map(([question, answer]) => ({
      question,
      answer: String(answer),
    }));
  }

  return [];
}

function normalizeStatus(status: any): Status {
  if (!status || typeof status !== "string") return "active";
  const lower = status.toLowerCase();
  if (lower === "completed" || lower === "resolved") return "resolved";
  if (lower === "active" || lower === "abandoned") return "active";
  return "active";
}

function normalizeMessage(msg: any) {
  const type =
    msg?.type === "user" || msg?.type === "bot"
      ? msg.type
      : msg?.role === "user" || msg?.role === "bot"
        ? msg.role
        : "bot";

  return {
    id:
      msg?.id ||
      `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    content: String(msg?.content || ""),
    timestamp: msg?.timestamp
      ? String(msg.timestamp)
      : new Date().toISOString(),
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  "chatbot-lead-generation": {
    label: "Lead Generation",
    gradient: "from-purple-500 to-pink-500",
    pc: "#8b5cf6",
    buildPath: "/web/chatbot-lead-generation/create",
  },
  "chatbot-education": {
    label: "Education (MCQ)",
    gradient: "from-green-500 to-emerald-500",
    pc: "#10b981",
    buildPath: "/web/chatbot-education/create",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getDuration(conv: Conversation): string {
  if (conv.messages.length < 2) return "< 1 min";
  const first = new Date(conv.messages[0].timestamp).getTime();
  const last = new Date(
    conv.messages[conv.messages.length - 1].timestamp,
  ).getTime();
  const diffMs = last - first;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "< 1 min";
  if (diffMin < 60) return `${diffMin} min`;
  return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
}

function exportToCSV(conversations: Conversation[], chatbotType: string) {
  const rows: string[][] = [
    [
      "ID",
      "Customer Name",
      "Email",
      "Status",
      "Messages",
      "Duration",
      "Has Appointment",
      "Created At",
      "Appointment Data",
    ],
  ];

  conversations.forEach((c) => {
    const normalizedFormData = normalizeFormData(c.formData);
    const apptData =
      normalizedFormData.length > 0
        ? normalizedFormData
            .map((f) => `${f.question}: ${f.answer}`)
            .join(" | ")
        : "";
    rows.push([
      c._id,
      c.customerName || "Anonymous",
      c.customerEmail || "",
      c.status,
      String(c.messages.length),
      getDuration(c),
      normalizedFormData.length > 0 ? "Yes" : "No",
      formatTimestamp(c.createdAt),
      apptData,
    ]);
  });

  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversations-${chatbotType}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string; dot: string }> = {
    active: {
      label: "Active",
      cls: "bg-blue-100 text-blue-700 border border-blue-200",
      dot: "bg-blue-500",
    },
    resolved: {
      label: "Resolved",
      cls: "bg-green-100 text-green-700 border border-green-200",
      dot: "bg-green-500",
    },
  };
  const { label, cls, dot } = map[status] || map.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ─── Conversation detail drawer / expanded view ───────────────────────────────

function ConversationDetail({
  conv,
  isDark,
  styles,
  pc,
  onClose,
  onStatusUpdate,
}: {
  conv: Conversation;
  isDark: boolean;
  styles: any;
  pc: string;
  onClose: () => void;
  onStatusUpdate: (conversationId: string, newStatus: Status) => void;
}) {
  const normalizedFormData = normalizeFormData(conv.formData);
  const hasForm = normalizedFormData.length > 0;

  return (
    <div
      className={`fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 flex flex-col shadow-2xl ${
        isDark ? "bg-[#0e0e12]" : "bg-white"
      }`}
      style={{
        borderLeft: isDark
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid #e5e7eb",
        animation: "slideLeft 0.2s ease",
      }}
    >
      {/* Drawer header */}
      <div
        className={`flex items-center justify-between px-5 py-4 flex-shrink-0 ${
          isDark ? "border-b border-white/[0.07]" : "border-b border-gray-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: pc }}
          >
            {(conv.customerName || "A")[0].toUpperCase()}
          </div>
          <div>
            <p className={`text-sm font-semibold ${styles.text.primary}`}>
              {conv.customerName || "Anonymous"}
            </p>
            <p className={`text-xs ${styles.text.muted}`}>
              {formatTimestamp(conv.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg ${
            isDark
              ? "hover:bg-white/[0.07] text-white/50"
              : "hover:bg-gray-100 text-gray-400"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Info chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={conv.status} />
            <select
              value={conv.status}
              onChange={(e) =>
                onStatusUpdate(conv._id, e.target.value as Status)
              }
              className={`text-xs px-2 py-1 rounded border ${
                isDark
                  ? "bg-white/[0.07] border-white/[0.2] text-white/70"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          {conv.customerEmail && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                isDark
                  ? "bg-white/[0.07] text-white/70"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <Mail className="h-3 w-3" />
              {conv.customerEmail}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
              isDark
                ? "bg-white/[0.07] text-white/70"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <MessageCircle className="h-3 w-3" />
            {conv.messages.length} messages
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
              isDark
                ? "bg-white/[0.07] text-white/70"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <Clock className="h-3 w-3" />
            {getDuration(conv)}
          </span>
        </div>

        {/* Appointment form data */}
        {hasForm && (
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5 ${
                isDark ? "text-purple-400" : "text-purple-600"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Appointment Details
            </p>
            <div
              className={`rounded-2xl p-4 space-y-3 ${
                isDark
                  ? "bg-purple-500/10 border border-purple-500/20"
                  : "bg-purple-50 border border-purple-100"
              }`}
            >
              {normalizedFormData.map((field, i) => (
                <div key={i}>
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${
                      isDark ? "text-purple-300/60" : "text-purple-400"
                    }`}
                  >
                    {field.question}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      isDark ? "text-purple-100" : "text-purple-900"
                    }`}
                  >
                    {field.answer || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat transcript */}
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5 ${styles.text.secondary}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat Transcript ({conv.messages.length})
          </p>
          <div className="space-y-3">
            {conv.messages.map((msg, idx) => {
              const isUser = msg.type === "user";
              return (
                <div
                  key={msg.id || idx}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}
                >
                  {!isUser && (
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: pc }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[80%] space-y-0.5`}>
                    <div
                      className={`px-3 py-2 text-xs leading-relaxed rounded-2xl ${
                        isUser
                          ? "rounded-br-sm text-white"
                          : isDark
                            ? "rounded-bl-sm bg-white/[0.08] text-white/90"
                            : "rounded-bl-sm bg-gray-100 text-gray-800"
                      }`}
                      style={isUser ? { background: pc } : {}}
                    >
                      {msg.content}
                    </div>
                    <p
                      className={`text-[10px] ${
                        isUser ? "text-right" : "text-left"
                      } ${isDark ? "text-white/30" : "text-gray-400"}`}
                    >
                      {msg.timestamp ? formatMsgTime(msg.timestamp) : ""}
                    </p>
                  </div>
                  {isUser && (
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold`}
                      style={{ background: "#6b7280" }}
                    >
                      {(conv.customerName || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  isDark,
  styles,
  pc,
  isSelected,
  onSelect,
}: {
  conv: Conversation;
  isDark: boolean;
  styles: any;
  pc: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const lastMsg = conv.messages[conv.messages.length - 1];
  const normalizedFormData = normalizeFormData(conv.formData);
  const hasForm = normalizedFormData.length > 0;
  const firstUserMsg = conv.messages.find((m) => m.type === "user");

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors ${
        isSelected
          ? isDark
            ? "bg-purple-500/10"
            : "bg-purple-50"
          : isDark
            ? "hover:bg-white/[0.03]"
            : "hover:bg-gray-50/80"
      }`}
    >
      {/* Avatar + name */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: pc }}
          >
            {(conv.customerName || "A")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold truncate max-w-[120px] ${styles.text.primary}`}
            >
              {conv.customerName || "Anonymous"}
            </p>
            {conv.customerEmail && (
              <p
                className={`text-xs truncate max-w-[120px] ${styles.text.muted}`}
              >
                {conv.customerEmail}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* First message preview */}
      <td className="px-4 py-3.5 max-w-[200px]">
        <p className={`text-xs truncate ${styles.text.secondary}`}>
          {firstUserMsg?.content || lastMsg?.content || "No messages"}
        </p>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <StatusBadge status={conv.status} />
      </td>

      {/* Messages count */}
      <td className="px-4 py-3.5 whitespace-nowrap text-center">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isDark
              ? "bg-white/[0.07] text-white/70"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {conv.messages.length}
        </span>
      </td>

      {/* Duration */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span
          className={`text-xs flex items-center gap-1 ${styles.text.muted}`}
        >
          <Clock className="h-3 w-3" />
          {getDuration(conv)}
        </span>
      </td>

      {/* Appointment */}
      <td className="px-4 py-3.5 whitespace-nowrap text-center">
        {hasForm ? (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isDark
                ? "bg-purple-500/20 text-purple-300"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            📅 Booked
          </span>
        ) : (
          <span className={`text-xs ${styles.text.muted}`}>—</span>
        )}
      </td>

      {/* Time */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div>
          <p className={`text-xs font-medium ${styles.text.secondary}`}>
            {relativeTime(conv.createdAt)}
          </p>
          <p className={`text-[10px] ${styles.text.muted}`}>
            {new Date(conv.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            })}
          </p>
        </div>
      </td>

      {/* Arrow */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <ChevronRight
          className={`h-4 w-4 ${
            isSelected
              ? isDark
                ? "text-purple-400"
                : "text-purple-500"
              : styles.text.muted
          }`}
        />
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
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
  const pc = cfg?.pc || "#8b5cf6";

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "ready"
  >("checking");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    if (!isValid) router.replace("/web");
  }, [isValid, router]);

  // Normalize conversations data
  const normalizeConversations = useCallback((convs: any[]): Conversation[] => {
    return convs.map((conv) => ({
      ...conv,
      formData: normalizeFormData(conv.formData),
      status: normalizeStatus(conv.status),
      messages: Array.isArray(conv.messages)
        ? conv.messages.map(normalizeMessage)
        : [],
      type: conv.type || "chat",
    }));
  }, []);

  // ── load ──────────────────────────────────────────────────────────────────

  const load = useCallback(
    async (reset = false) => {
      if (!userId || !chatbotType) return;
      if (reset) setIsLoading(true);
      try {
        const bots = await getChatbots(apiRequest);
        const found = (bots.chatbots || []).find(
          (b: any) => b.type === chatbotType,
        );
        if (!found) {
          setPageStatus("not-built");
          return;
        }
        setPageStatus("ready");

        const data = await getConversations(
          apiRequest,
          chatbotType,
          LIMIT,
          reset ? 0 : offset,
        );

        let convs: Conversation[] = data.conversations || [];
        const tot: number = data.total || 0;
        const more: boolean = data.hasMore || false;
        console.log("Raw conversations data:", convs);
        // Normalize conversations
        convs = normalizeConversations(convs);

        if (reset) {
          setConversations(convs);
          setOffset(LIMIT);
        } else {
          setConversations((prev) => [...prev, ...convs]);
          setOffset((prev) => prev + LIMIT);
        }
        setTotal(tot);
        setHasMore(more);
      } catch (error) {
        console.error("Error loading conversations:", error);
        if (reset) setPageStatus("not-built");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId, chatbotType, apiRequest, offset, normalizeConversations],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, chatbotType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    await load(true);
  };

  const handleStatusUpdate = async (
    conversationId: string,
    newStatus: Status,
  ) => {
    try {
      await updateConversationStatus(
        apiRequest,
        conversationId,
        newStatus === "resolved" ? "completed" : "active",
      );

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, status: newStatus } : conv,
        ),
      );

      // Update selected conversation if it's the one being updated
      if (selectedConv?._id === conversationId) {
        setSelectedConv((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    } catch (error) {
      console.error("Error updating conversation status:", error);
    }
  };

  // ── filter ────────────────────────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    const matchSearch =
      !search ||
      (c.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customerEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      c.messages.some((m) =>
        m.content.toLowerCase().includes(search.toLowerCase()),
      );
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── derived stats ─────────────────────────────────────────────────────────

  const stats = {
    total,
    active: conversations.filter((c) => c.status === "active").length,
    resolved: conversations.filter((c) => c.status === "resolved").length,
    appointments: conversations.filter(
      (c) => normalizeFormData(c.formData).length > 0,
    ).length,
  };

  // ─── early returns ────────────────────────────────────────────────────────

  if (!isValid || !cfg) return null;

  if (pageStatus === "checking" || (isLoading && conversations.length === 0)) {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: pc }} />
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
            {rawId === "chatbot-lead-generation" ? (
              <Bot className="h-10 w-10 text-white" />
            ) : (
              <GraduationCap className="h-10 w-10 text-white" />
            )}
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build your chatbot first
          </h2>
          <p className={`text-sm ${styles.text.secondary} mb-8 max-w-sm`}>
            Create your {cfg.label} chatbot to start seeing conversations here.
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

  // ─── Main UI ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}

      {/* Side drawer */}
      {selectedConv && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedConv(null)}
          />
          <ConversationDetail
            conv={selectedConv}
            isDark={isDark}
            styles={styles}
            pc={pc}
            onClose={() => setSelectedConv(null)}
            onStatusUpdate={handleStatusUpdate}
          />
        </>
      )}

      <div className={styles.container}>
        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}
            >
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Conversations
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {cfg.label} · {total} total
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                isDark
                  ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06] disabled:opacity-40"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              }`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => exportToCSV(filtered, chatbotType || "chatbot")}
              disabled={filtered.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 ${
                isDark
                  ? "bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                label: "Total",
                value: stats.total,
                icon: MessageCircle,
                color: pc,
                sub: "all time",
              },
              {
                label: "Active",
                value: stats.active,
                icon: Clock,
                color: "#3b82f6",
                sub: "in progress",
              },
              {
                label: "Resolved",
                value: stats.resolved,
                icon: CheckCircle,
                color: "#10b981",
                sub: "completed",
              },
              {
                label: "Appointments",
                value: stats.appointments,
                icon: Calendar,
                color: "#8b5cf6",
                sub: "booked",
              },
            ] as const
          ).map(({ label, value, icon: Icon, color, sub }) => (
            <div
              key={label}
              className={`${styles.card} p-4 rounded-2xl flex flex-col sm:flex-row items-start gap-3`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${color}20` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p
                  className={`text-2xl font-bold leading-none ${styles.text.primary}`}
                >
                  {value}
                </p>
                <p
                  className={`text-xs font-medium mt-0.5 ${styles.text.secondary}`}
                >
                  {label}
                </p>
                <p className={`text-[10px] mt-0.5 ${styles.text.muted}`}>
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div
            className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border ${
              isDark
                ? "bg-white/[0.05] border-white/[0.09]"
                : "bg-white border-gray-200"
            }`}
          >
            <Search className={`h-4 w-4 flex-shrink-0 ${styles.text.muted}`} />
            <input
              type="text"
              placeholder="Search name, email, or message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 text-sm bg-transparent outline-none ${
                isDark
                  ? "text-white placeholder-white/30"
                  : "text-gray-700 placeholder-gray-400"
              }`}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className={`h-3.5 w-3.5 ${styles.text.muted}`} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border max-w-min ${
              isDark
                ? "bg-white/[0.05] border-white/[0.09]"
                : "bg-white border-gray-200"
            }`}
          >
            <Filter
              className={`h-3.5 w-3.5 flex-shrink-0 ${styles.text.muted}`}
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as Status | "all")
              }
              className={`text-sm bg-transparent outline-none ${
                isDark ? "text-white/80" : "text-gray-700"
              }`}
            >
              <option
                value="all"
                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
              >
                All Status
              </option>
              <option
                value="active"
                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
              >
                Active
              </option>
              <option
                value="resolved"
                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
              >
                Resolved
              </option>
            </select>
          </div>
        </div>

        {/* ── Result count ── */}
        {(search || statusFilter !== "all") && (
          <p className={`text-xs ${styles.text.muted}`}>
            Showing {filtered.length} of {conversations.length} conversations
          </p>
        )}

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div className={`${styles.card} p-12 text-center rounded-2xl`}>
            <MessageCircle
              className="h-12 w-12 mx-auto mb-4 opacity-20"
              style={{ color: pc }}
            />
            <h3 className={`text-lg font-semibold ${styles.text.primary} mb-2`}>
              No conversations yet
            </h3>
            <p className={`text-sm ${styles.text.secondary}`}>
              {search || statusFilter !== "all"
                ? "No conversations match your filters"
                : "Once visitors start chatting, conversations appear here"}
            </p>
          </div>
        ) : (
          <div className={`${styles.card} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {/* Table head */}
                <thead>
                  <tr
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isDark
                        ? "bg-white/[0.04] text-white/40 border-b border-white/[0.06]"
                        : "bg-gray-50 text-gray-500 border-b border-gray-100"
                    }`}
                  >
                    <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      First Message
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">
                      Msgs
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">
                      Appt
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Time</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>

                {/* Table body */}
                <tbody
                  className={`divide-y ${
                    isDark ? "divide-white/[0.05]" : "divide-gray-100"
                  }`}
                >
                  {filtered.map((conv) => (
                    <ConversationRow
                      key={conv._id}
                      conv={conv}
                      isDark={isDark}
                      styles={styles}
                      pc={pc}
                      isSelected={selectedConv?._id === conv._id}
                      onSelect={() =>
                        setSelectedConv(
                          selectedConv?._id === conv._id ? null : conv,
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && (
              <div
                className={`flex justify-center p-4 border-t ${
                  isDark ? "border-white/[0.06]" : "border-gray-100"
                }`}
              >
                <button
                  onClick={() => load(false)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 ${
                    isDark
                      ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline keyframe for drawer */}
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
