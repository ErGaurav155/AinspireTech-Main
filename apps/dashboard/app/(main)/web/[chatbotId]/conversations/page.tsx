"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  MessageSquare,
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Download,
  MoreHorizontal,
  Bot,
  ExternalLink,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getConversations, getChatbots } from "@/lib/services/web-actions.api";
import { formatDistanceToNow } from "date-fns";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Orbs,
  Spinner,
  useThemeStyles,
} from "@rocketreplai/ui";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useParams, useRouter } from "next/navigation";

interface Conversation {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: "active" | "resolved" | "pending";
  messages: Array<{
    id: string;
    type: "user" | "bot";
    content: string;
    timestamp: string;
  }>;
  formData?: Array<{ question: string; answer: string }>;
  createdAt: string;
  service?: string;
  tags: string[];
}

// Conversations only exist for lead-generation — MCQ doesn't collect leads
const LEAD_TYPE = "chatbot-lead-generation";

export default function ConversationsPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "wrong-type" | "ready"
  >("checking");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── guard: this page is lead-gen only ────────────────────────────────────
  useEffect(() => {
    if (chatbotId !== LEAD_TYPE && chatbotId !== "chatbot-education") {
      router.replace("/web");
    }
  }, [chatbotId, router]);

  // ── check chatbot exists, then load conversations ─────────────────────────
  useEffect(() => {
    if (!userId || !chatbotId) return;
    // MCQ has no conversations page — show friendly message
    if (chatbotId === "chatbot-education") {
      setPageStatus("wrong-type");
      return;
    }
    if (chatbotId !== LEAD_TYPE) return;

    const init = async () => {
      try {
        const data = await getChatbots(apiRequest);
        const found = (data.chatbots || []).find(
          (b: any) => b.type === LEAD_TYPE,
        );
        if (!found) {
          setPageStatus("not-built");
          return;
        }
        setPageStatus("ready");
        setIsLoading(true);
        await loadConversations();
      } catch {
        /* handled inside loadConversations */
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, chatbotId, apiRequest]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const data = await getConversations(apiRequest, LEAD_TYPE);
      const transformed = (data.conversations || []).map((conv: any) => {
        const fd = conv?.formData || {};
        return {
          ...conv,
          customerName: fd.name || conv.customerName || "Anonymous",
          customerEmail: fd.email || conv.customerEmail || "",
          customerPhone: fd.phone || "",
          service: fd.service || "",
        };
      });
      setConversations(transformed);
      setFilteredConversations(transformed);
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    let f = conversations;
    if (searchTerm)
      f = f.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.customerPhone?.includes(searchTerm) ||
          c.service?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    if (statusFilter !== "all") f = f.filter((c) => c.status === statusFilter);
    setFilteredConversations(f);
  }, [conversations, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: styles.badge.green,
      resolved: styles.badge.blue,
      pending: styles.badge.purple,
    };
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${map[status] || styles.badge.gray}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    if (status === "active")
      return (
        <div
          className={`w-2 h-2 ${isDark ? "bg-green-400" : "bg-green-500"} rounded-full animate-pulse`}
        />
      );
    if (status === "resolved")
      return (
        <CheckCircle
          className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-500"}`}
        />
      );
    if (status === "pending")
      return (
        <AlertCircle
          className={`h-4 w-4 ${isDark ? "text-yellow-400" : "text-yellow-500"}`}
        />
      );
    return null;
  };

  // ─── early returns ────────────────────────────────────────────────────────
  if (pageStatus === "checking") {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <div
          className={`w-5 h-5 border-2 border-t-transparent border-purple-400 rounded-full animate-spin`}
        />
      </div>
    );
  }

  // MCQ chatbot trying to access this page
  if (pageStatus === "wrong-type") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Not available for MCQ chatbot
          </h2>
          <p className={`text-sm ${styles.text.secondary} max-w-md mb-8`}>
            The Conversations page is for the Lead Generation chatbot only. MCQ
            chatbot tracks student responses separately.
          </p>
          <Link
            href="/web/chatbot-education/overview"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to MCQ Overview <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // lead chatbot not built yet
  if (pageStatus === "not-built") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build your Lead Generation chatbot first
          </h2>
          <p className={`text-sm ${styles.text.secondary} max-w-md mb-8`}>
            You need to create your Lead Generation chatbot before conversations
            start appearing here.
          </p>
          <Link
            href="/web/chatbot-lead-generation/build"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Build Lead Generation Chatbot <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <Spinner label="Loading conversations..." />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon.purple}`}
            >
              <MessageSquare
                className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Conversations
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {filteredConversations.length} leads found
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${styles.pill} ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${styles.pill}`}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="flex-1 relative">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
            />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-sm ${styles.input}`}
          >
            {["all", "active", "pending", "resolved"].map((s) => (
              <option key={s} value={s} className={styles.innerCard}>
                {s === "all"
                  ? "All Status"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Conversations list */}
        <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
          {filteredConversations.length > 0 ? (
            <div
              className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-gray-100"}`}
            >
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id || Math.random().toString()}
                  className={`p-5 hover:bg-white/[0.03] transition-colors border-b ${styles.divider}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                          <User
                            className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              className={`font-semibold ${styles.text.primary}`}
                            >
                              {conv.customerName}
                            </h3>
                            {getStatusBadge(conv.status)}
                          </div>
                          <div
                            className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${styles.text.secondary}`}
                          >
                            {conv.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {conv.customerEmail}
                              </span>
                            )}
                            {conv.customerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {conv.customerPhone}
                              </span>
                            )}
                            {conv.service && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {conv.service}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {conv.messages?.length > 0 && (
                        <p
                          className={`text-sm ${styles.text.secondary} truncate max-w-xl`}
                        >
                          <span
                            className={`font-medium ${styles.text.primary}`}
                          >
                            Last:
                          </span>{" "}
                          {conv.messages[conv.messages.length - 1].content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-2 text-xs ${styles.text.secondary}`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(conv.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(conv.status)}
                          <span
                            className={`text-xs capitalize ${styles.text.muted}`}
                          >
                            {conv.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedConversation(conv);
                            setShowViewDialog(true);
                          }}
                          className={`p-1.5 ${styles.text.muted}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`p-1.5 ${styles.text.muted}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={`rounded-xl ${isDark ? "bg-[#1A1A1E] border-white/[0.08] text-white" : "bg-white border-gray-100"}`}
                          >
                            <DropdownMenuItem
                              className={`text-sm ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}
                            >
                              Mark as Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={`text-sm ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}
                            >
                              Add Tag
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={`text-sm ${isDark ? "text-red-400 hover:bg-white/[0.06]" : "text-red-600 hover:bg-red-50"}`}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                  {conv.tags?.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      {conv.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 ${styles.badge.purple} rounded-full`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${styles.icon.purple}`}
              >
                <MessageSquare
                  className={`h-8 w-8 ${isDark ? "text-purple-400" : "text-purple-400"}`}
                />
              </div>
              <h3
                className={`text-lg font-semibold ${styles.text.primary} mb-2`}
              >
                No conversations yet
              </h3>
              <p className={`text-sm ${styles.text.secondary} mb-6`}>
                Integrate your chatbot to start capturing leads
              </p>
              <Link
                href="/web/chatbot-lead-generation/integration"
                className={`inline-flex items-center gap-2 px-5 py-2.5 ${styles.button.primary} text-white rounded-xl text-sm font-medium transition-colors`}
              >
                View Integration Guide <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* View dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <DialogContent
            className={`${isDark ? "bg-[#1A1A1E] border border-white/[0.08]" : "bg-white border border-gray-100"} rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto`}
          >
            <DialogHeader>
              <DialogTitle
                className={`flex items-center gap-2 ${styles.text.primary}`}
              >
                <User className="h-5 w-5 text-purple-400" />
                Conversation with {selectedConversation?.customerName}
              </DialogTitle>
            </DialogHeader>
            {selectedConversation && (
              <div className="space-y-6">
                <div
                  className={`${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-100"} rounded-xl p-4`}
                >
                  <h4
                    className={`text-sm font-semibold ${isDark ? "text-purple-400" : "text-purple-800"} mb-3`}
                  >
                    Lead Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedConversation.customerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User
                          className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                        />
                        <span
                          className={isDark ? "text-white/60" : "text-gray-600"}
                        >
                          {selectedConversation.customerName}
                        </span>
                      </div>
                    )}
                    {selectedConversation.customerEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail
                          className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                        />
                        <a
                          href={`mailto:${selectedConversation.customerEmail}`}
                          className={
                            isDark
                              ? "text-purple-400 hover:underline"
                              : "text-purple-600 hover:underline"
                          }
                        >
                          {selectedConversation.customerEmail}
                        </a>
                      </div>
                    )}
                    {selectedConversation.customerPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone
                          className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                        />
                        <a
                          href={`tel:${selectedConversation.customerPhone}`}
                          className={
                            isDark
                              ? "text-purple-400 hover:underline"
                              : "text-purple-600 hover:underline"
                          }
                        >
                          {selectedConversation.customerPhone}
                        </a>
                      </div>
                    )}
                    {selectedConversation.service && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar
                          className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-500"}`}
                        />
                        <span
                          className={isDark ? "text-white/60" : "text-gray-600"}
                        >
                          Interested in: {selectedConversation.service}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4
                    className={`text-sm font-semibold ${styles.text.primary} mb-3`}
                  >
                    Conversation History
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                    {selectedConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.type === "user" ? "bg-purple-500 text-white" : isDark ? "bg-white/[0.06] text-white/80" : "bg-gray-100 text-gray-800"}`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedConversation?.formData &&
                  selectedConversation?.formData?.length > 0 && (
                    <div className={`border-t pt-4 ${styles.divider}`}>
                      <h4
                        className={`text-sm font-semibold ${styles.text.primary} mb-3`}
                      >
                        Form Submissions
                      </h4>
                      <div className="space-y-2">
                        {selectedConversation?.formData.map((field, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span
                              className={`font-medium ${isDark ? "text-white/60" : "text-gray-600"} min-w-[120px]`}
                            >
                              {field.question}:
                            </span>
                            <span
                              className={
                                isDark ? "text-white" : "text-gray-800"
                              }
                            >
                              {field.answer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </DialogPrimitive.Portal>
      </Dialog>
    </div>
  );
}
