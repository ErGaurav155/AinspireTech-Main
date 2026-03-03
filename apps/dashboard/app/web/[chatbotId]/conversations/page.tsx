"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  MessageSquare,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  Eye,
  RefreshCw,
  Download,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getConversations } from "@/lib/services/web-actions.api";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rocketreplai/ui/components/radix/dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";
import { Spinner } from "@/components/shared/Spinner";

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
  formData?: Array<{
    question: string;
    answer: string;
  }>;
  createdAt: string;
  service?: string;
  tags: string[];
}

export default function LeadConversationsPage() {
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const data = await getConversations(
        apiRequest,
        "chatbot-lead-generation",
      );

      // Transform conversations to extract lead info
      const transformed = (data.conversations || []).map((conv: any) => {
        const formData = conv?.formData || {};
        const name = formData.name || conv.customerName || "Anonymous";
        const email = formData.email || conv.customerEmail || "";
        const phone = formData.phone || "";
        const service = formData.service || "";

        return {
          ...conv,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          service,
        };
      });

      setConversations(transformed);
      setFilteredConversations(transformed);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Filter conversations based on search and status
  useEffect(() => {
    let filtered = conversations;

    if (searchTerm) {
      filtered = filtered.filter(
        (conv) =>
          conv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.customerEmail
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          conv.customerPhone?.includes(searchTerm) ||
          conv.service?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((conv) => conv.status === statusFilter);
    }

    setFilteredConversations(filtered);
  }, [conversations, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span
            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.green}`}
          >
            Active
          </span>
        );
      case "resolved":
        return (
          <span
            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.blue}`}
          >
            Resolved
          </span>
        );
      case "pending":
        return (
          <span
            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
          >
            Pending
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.gray}`}
          >
            Unknown
          </span>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return (
          <div
            className={`w-2 h-2 ${isDark ? "bg-green-400" : "bg-green-500"} rounded-full animate-pulse`}
          />
        );
      case "resolved":
        return (
          <CheckCircle
            className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-500"}`}
          />
        );
      case "pending":
        return (
          <AlertCircle
            className={`h-4 w-4 ${isDark ? "text-yellow-400" : "text-yellow-500"}`}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <Spinner label="Loading conversations..." />;
  }

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
              placeholder="Search by name, email, phone, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            />
          </div>
          <div className="flex gap-2 overflow-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-sm ${styles.input}`}
            >
              <option value="all" className={styles.innerCard}>
                All Status
              </option>
              <option value="active" className={styles.innerCard}>
                Active
              </option>
              <option value="pending" className={styles.innerCard}>
                Pending
              </option>
              <option value="resolved" className={styles.innerCard}>
                Resolved
              </option>
            </select>
          </div>
        </div>
        {/* Conversations List */}
        <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
          {filteredConversations.length > 0 ? (
            <div
              className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-gray-100"}`}
            >
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation?.id || Math.random().toString()}
                  className={`p-5 hover:bg-white/[0.03] transition-colors border-b ${styles.divider}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0`}
                        >
                          <User
                            className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              className={`font-semibold ${styles.text.primary}`}
                            >
                              {conversation.customerName}
                            </h3>
                            {getStatusBadge(conversation.status)}
                          </div>
                          <div
                            className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${styles.text.secondary}`}
                          >
                            {conversation.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {conversation.customerEmail}
                              </span>
                            )}
                            {conversation.customerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {conversation.customerPhone}
                              </span>
                            )}
                            {conversation.service && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {conversation.service}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Last Message Preview */}
                      {conversation.messages &&
                        conversation.messages.length > 0 && (
                          <p
                            className={`text-sm ${styles.text.secondary} truncate max-w-xl ml-13`}
                          >
                            <span
                              className={`font-medium ${styles.text.primary}`}
                            >
                              Last message:
                            </span>{" "}
                            {
                              conversation.messages[
                                conversation.messages.length - 1
                              ].content
                            }
                          </p>
                        )}
                    </div>

                    {/* Meta Info & Actions */}
                    <div className="flex items-center gap-4 ml-13 lg:ml-0">
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-2 text-xs ${styles.text.secondary}`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(
                              new Date(conversation.createdAt),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(conversation.status)}
                          <span
                            className={`text-xs capitalize ${styles.text.muted}`}
                          >
                            {conversation.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedConversation(conversation);
                            setShowViewDialog(true);
                          }}
                          className={`p-1.5 ${styles.text.muted} hover:${styles.text.primary}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`p-1.5 ${styles.text.muted} hover:${styles.text.primary}`}
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

                  {/* Tags */}
                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 ml-13">
                      {conversation.tags.map((tag) => (
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
                href="/web/lead-generation/integration"
                className={`inline-flex items-center gap-2 px-5 py-2.5 ${styles.button.primary} text-white rounded-xl text-sm font-medium transition-colors`}
              >
                View Integration Guide
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* View Conversation Dialog */}
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
                {/* Lead Details */}
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

                {/* Messages */}
                <div>
                  <h4
                    className={`text-sm font-semibold ${styles.text.primary} mb-3`}
                  >
                    Conversation History
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={
                            message.type === "user"
                              ? `max-w-[80%] rounded-2xl px-4 py-2 ${isDark ? "bg-purple-500 text-white" : "bg-purple-500 text-white"}`
                              : `max-w-[80%] rounded-2xl px-4 py-2 ${isDark ? "bg-white/[0.06] text-white/80" : "bg-gray-100 text-gray-800"}`
                          }
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs opacity-70 mt-1 ${isDark ? "text-white/60" : "text-white/80"}`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Data */}
                {selectedConversation.formData &&
                  selectedConversation.formData.length > 0 && (
                    <div className={`border-t pt-4 ${styles.divider}`}>
                      <h4
                        className={`text-sm font-semibold ${styles.text.primary} mb-3`}
                      >
                        Form Submissions
                      </h4>
                      <div className="space-y-2">
                        {selectedConversation.formData.map((field, index) => (
                          <div
                            key={index}
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
