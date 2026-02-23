"use client";

import { useState, useEffect, useCallback } from "react";
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

        console.log("Form Data for conversation", formData);

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
          <Badge className="bg-green-100 text-green-600 border-green-200">
            Active
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-blue-100 text-blue-600 border-blue-200">
            Resolved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-600 border-yellow-200">
            Pending
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-600">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        );
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap  gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Conversations</h1>
              <p className="text-sm text-gray-500">
                {filteredConversations.length} leads found
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {filteredConversations.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation?.id || Math.random().toString()}
                  className="p-5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800">
                              {conversation.customerName}
                            </h3>
                            {getStatusBadge(conversation.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
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
                          <p className="text-sm text-gray-500 truncate max-w-xl ml-13">
                            <span className="font-medium text-gray-600">
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
                        <div className="flex items-center gap-2 text-xs text-gray-400">
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
                          <span className="text-xs capitalize text-gray-500">
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
                          className="text-gray-400 hover:text-purple-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-400"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl"
                          >
                            <DropdownMenuItem className="text-sm">
                              Mark as Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-sm">
                              Add Tag
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-sm text-red-600">
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
                          className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full"
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
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No conversations yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Integrate your chatbot to start capturing leads
              </p>
              <Link
                href="/web/lead-generation/integration"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              Conversation with {selectedConversation?.customerName}
            </DialogTitle>
          </DialogHeader>

          {selectedConversation && (
            <div className="space-y-6">
              {/* Lead Details */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-purple-800 mb-3">
                  Lead Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedConversation.customerName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-600">
                        {selectedConversation.customerName}
                      </span>
                    </div>
                  )}
                  {selectedConversation.customerEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-purple-500" />
                      <a
                        href={`mailto:${selectedConversation.customerEmail}`}
                        className="text-purple-600 hover:underline"
                      >
                        {selectedConversation.customerEmail}
                      </a>
                    </div>
                  )}
                  {selectedConversation.customerPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-purple-500" />
                      <a
                        href={`tel:${selectedConversation.customerPhone}`}
                        className="text-purple-600 hover:underline"
                      >
                        {selectedConversation.customerPhone}
                      </a>
                    </div>
                  )}
                  {selectedConversation.service && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-600">
                        Interested in: {selectedConversation.service}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Conversation History
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.type === "user"
                            ? "bg-purple-500 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
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
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                      Form Submissions
                    </h4>
                    <div className="space-y-2">
                      {selectedConversation.formData.map((field, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="font-medium text-gray-600 min-w-[120px]">
                            {field.question}:
                          </span>
                          <span className="text-gray-800">{field.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
