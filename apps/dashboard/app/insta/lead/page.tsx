"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail,
  Phone,
  Search,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  MessageCircle,
  BookOpen,
  MessageSquare,
  Filter,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { useInstaAccount } from "@/context/Instaaccountcontext ";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  getInstaTemplates,
  getLeads,
  deleteLead,
  exportLeadsToCSV,
  LeadItem,
} from "@/lib/services/insta-actions.api";

const AUTOMATION_ICONS: Record<string, React.ReactNode> = {
  comments: <MessageCircle className="h-3 w-3" />,
  stories: <BookOpen className="h-3 w-3" />,
  dms: <MessageSquare className="h-3 w-3" />,
};

const AUTOMATION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "comments", label: "Comments" },
  { value: "stories", label: "Stories" },
  { value: "dms", label: "DMs" },
];

const SOURCE_TYPES = [
  { value: "all", label: "All Sources" },
  { value: "email_collection", label: "Email" },
  { value: "phone_collection", label: "Phone" },
];

export default function LeadsPage() {
  const { styles, isDark } = useThemeStyles();
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { selectedAccount, isAccLoading } = useInstaAccount();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "email_collection" | "phone_collection"
  >("all");
  const [automationTypeFilter, setAutomationTypeFilter] = useState<
    "all" | "comments" | "stories" | "dms"
  >("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [templates, setTemplates] = useState<{ _id: string; name: string }[]>(
    [],
  );
  const [isExporting, setIsExporting] = useState(false);

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [deletingLeadUsername, setDeletingLeadUsername] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const limit = 20;

  // Fetch templates for filter dropdown
  useEffect(() => {
    if (!selectedAccount?.instagramId) return;

    const fetchTemplates = async () => {
      try {
        const result = await getInstaTemplates(apiRequest, {
          accountId: selectedAccount.instagramId,
          filterStatus: "all",
        });
        const list = result?.templates || [];
        setTemplates(list.map((t: any) => ({ _id: t._id, name: t.name })));
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, [selectedAccount?.instagramId, apiRequest]);

  const fetchLeads = useCallback(async () => {
    if (!selectedAccount?.instagramId) return;
    setIsLoading(true);
    try {
      const response = await getLeads(apiRequest, {
        accountId: selectedAccount.instagramId,
        page,
        limit,
        source: sourceFilter,
        automationType: automationTypeFilter,
        templateId: templateFilter !== "all" ? templateFilter : undefined,
        search: searchTerm || undefined,
      });
      console.log("Fetched leads:", response);

      setLeads(response.leads || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Failed to load leads",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedAccount?.instagramId,
    page,
    sourceFilter,
    automationTypeFilter,
    templateFilter,
    searchTerm,
    apiRequest,
  ]);

  // Debounce search to avoid too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoaded && !isAccLoading && selectedAccount?.instagramId) {
        setPage(1); // Reset to first page when filters change
        fetchLeads();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    searchTerm,
    sourceFilter,
    automationTypeFilter,
    templateFilter,
    isLoaded,
    isAccLoading,
    selectedAccount?.instagramId,
    fetchLeads,
  ]);

  // Fetch leads when page changes
  useEffect(() => {
    if (isLoaded && !isAccLoading && selectedAccount?.instagramId) {
      fetchLeads();
    }
  }, [page, fetchLeads, isLoaded, isAccLoading, selectedAccount?.instagramId]);

  const handleDeleteClick = useCallback((id: string, username: string) => {
    setDeletingLeadId(id);
    setDeletingLeadUsername(username);
    setShowDeleteDialog(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingLeadId) return;

    setIsDeleting(true);
    try {
      const result = await deleteLead(apiRequest, deletingLeadId);
      console.log("Delete lead result:", result);
      setLeads((prev) => prev.filter((l) => l._id !== deletingLeadId));
      setTotal((prev) => prev - 1);
      toast({
        title: "Lead deleted",
        description:
          result.message ||
          `Lead from @${deletingLeadUsername} has been removed`,
        duration: 3000,
      });
      setShowDeleteDialog(false);
      setDeletingLeadId(null);
      setDeletingLeadUsername("");
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [apiRequest, deletingLeadId, deletingLeadUsername]);

  const handleExportCSV = useCallback(async () => {
    if (!selectedAccount?.instagramId) return;
    if (leads.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no leads to export",
        duration: 3000,
      });
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportLeadsToCSV(apiRequest, {
        accountId: selectedAccount.instagramId,
        source: sourceFilter,
        automationType: automationTypeFilter,
        templateId: templateFilter !== "all" ? templateFilter : undefined,
        search: searchTerm || undefined,
      });

      if (result.success) {
        // Create and download the CSV file
        const blob = new Blob(["\uFEFF" + result.csv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export successful",
          description: `${leads.length} leads exported`,
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedAccount?.instagramId,
    sourceFilter,
    automationTypeFilter,
    templateFilter,
    searchTerm,
    apiRequest,
    leads.length,
  ]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setSourceFilter("all");
    setAutomationTypeFilter("all");
    setTemplateFilter("all");
    setPage(1);
  }, []);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter(
      (l) =>
        l.commenterUsername?.toLowerCase().includes(lower) ||
        l.email?.toLowerCase().includes(lower) ||
        l.phone?.toLowerCase().includes(lower) ||
        l.templateName?.toLowerCase().includes(lower),
    );
  }, [leads, searchTerm]);

  const emailCount = leads.filter(
    (l) => l.source === "email_collection",
  ).length;
  const phoneCount = leads.filter(
    (l) => l.source === "phone_collection",
  ).length;
  const commentsCount = leads.filter(
    (l) => l.automationType === "comments",
  ).length;
  const storiesCount = leads.filter(
    (l) => l.automationType === "stories",
  ).length;
  const dmsCount = leads.filter((l) => l.automationType === "dms").length;

  const hasActiveFilters =
    searchTerm !== "" ||
    sourceFilter !== "all" ||
    automationTypeFilter !== "all" ||
    templateFilter !== "all";

  if (!isLoaded || isAccLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? "border-pink-400" : "border-pink-500"
          }`}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={
          isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen"
        }
      >
        {isDark && <Orbs />}
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 relative z-10">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1
                className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
              >
                Collected Leads
              </h1>
              <p
                className={`text-sm mt-1 ${isDark ? "text-white/40" : "text-gray-500"}`}
              >
                {total} total leads from @
                {selectedAccount?.username || "all accounts"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark
                      ? "bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.09]"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Reset Filters
                </button>
              )}
              <button
                onClick={handleExportCSV}
                disabled={leads.length === 0 || isExporting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? "bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.09]"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {isExporting ? (
                  <div className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3  gap-3 mb-5">
            {[
              {
                label: "Total Leads",
                value: total,
                icon: <Users className="h-5 w-5" />,
                color: "pink",
              },
              {
                label: "Emails",
                value: emailCount,
                icon: <Mail className="h-5 w-5" />,
                color: "blue",
              },
              {
                label: "Phones",
                value: phoneCount,
                icon: <Phone className="h-5 w-5" />,
                color: "green",
              },
              {
                label: "Comments",
                value: commentsCount,
                icon: <MessageCircle className="h-5 w-5" />,
                color: "purple",
              },
              {
                label: "Stories",
                value: storiesCount,
                icon: <BookOpen className="h-5 w-5" />,
                color: "orange",
              },
              {
                label: "DMs",
                value: dmsCount,
                icon: <MessageSquare className="h-5 w-5" />,
                color: "cyan",
              },
            ].map(({ label, value, icon, color }) => (
              <div
                key={label}
                className={`rounded-2xl p-3 ${
                  isDark
                    ? "bg-white/[0.04] border border-white/[0.08]"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                    isDark
                      ? `bg-${color}-500/10 text-${color}-400`
                      : `bg-${color}-50 text-${color}-500`
                  }`}
                >
                  {icon}
                </div>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
                >
                  {value}
                </p>
                <p
                  className={`text-[10px] mt-0.5 ${isDark ? "text-white/40" : "text-gray-500"}`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div
              className={`relative flex-1 min-w-[200px] rounded-xl ${styles.input}`}
            >
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${styles.text.muted}`}
              />
              <input
                type="text"
                placeholder="Search by username, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${styles.input}`}
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as any);
                setPage(1);
              }}
              className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none ${
                isDark
                  ? "bg-white/[0.05] border-white/[0.08] text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={automationTypeFilter}
              onChange={(e) => {
                setAutomationTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none ${
                isDark
                  ? "bg-white/[0.05] border-white/[0.08] text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              {AUTOMATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={templateFilter}
              onChange={(e) => {
                setTemplateFilter(e.target.value);
                setPage(1);
              }}
              className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none ${
                isDark
                  ? "bg-white/[0.05] border-white/[0.08] text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <option value="all">All Templates</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div
            className={`rounded-2xl overflow-hidden border ${
              isDark ? "border-white/[0.08]" : "border-gray-100"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div
                  className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
                    isDark ? "border-pink-400" : "border-pink-500"
                  }`}
                />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-16">
                <Users
                  className={`h-10 w-10 mx-auto mb-3 ${isDark ? "text-white/20" : "text-gray-300"}`}
                />
                <p
                  className={`font-medium ${isDark ? "text-white/60" : "text-gray-500"}`}
                >
                  {searchTerm || hasActiveFilters
                    ? "No leads match your filters"
                    : "No leads collected yet"}
                </p>
                <p
                  className={`text-sm mt-1 ${isDark ? "text-white/30" : "text-gray-400"}`}
                >
                  Leads appear here when users share their email or phone number
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className={`text-xs uppercase tracking-wide border-b ${
                        isDark
                          ? "bg-white/[0.02] border-white/[0.06] text-white/40"
                          : "bg-gray-50 border-gray-100 text-gray-500"
                      }`}
                    >
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">Contact</th>
                      <th className="text-left px-4 py-3">Template</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead._id}
                        className={`border-b transition-colors ${
                          isDark
                            ? "border-white/[0.04] hover:bg-white/[0.02]"
                            : "border-gray-50 hover:bg-gray-50/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                isDark
                                  ? "bg-pink-500/20 text-pink-400"
                                  : "bg-pink-100 text-pink-600"
                              }`}
                            >
                              {(lead.commenterUsername || "?")[0].toUpperCase()}
                            </div>
                            <span
                              className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}
                            >
                              {lead.commenterUsername || lead.commenterUserId}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {lead.source === "email_collection" ? (
                            <div className="flex items-center gap-1.5">
                              <Mail
                                className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? "text-blue-400" : "text-blue-500"}`}
                              />
                              <span
                                className={`text-sm ${isDark ? "text-blue-300" : "text-blue-600"}`}
                              >
                                {lead.email}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Phone
                                className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? "text-green-400" : "text-green-500"}`}
                              />
                              <span
                                className={`text-sm ${isDark ? "text-green-300" : "text-green-600"}`}
                              >
                                {lead.phone}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}
                          >
                            {lead.templateName || "Unknown"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              isDark
                                ? "bg-white/[0.06] text-white/60"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {AUTOMATION_ICONS[lead.automationType]}
                            {lead.automationType}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}
                          >
                            {new Date(lead.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              handleDeleteClick(
                                lead._id,
                                lead.commenterUsername || lead.commenterUserId,
                              )
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark
                                ? "text-white/30 hover:text-red-400 hover:bg-red-500/10"
                                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p
                className={`text-sm ${isDark ? "text-white/40" : "text-gray-500"}`}
              >
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{" "}
                of {total} leads
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? "text-white/60 hover:bg-white/[0.06]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-700"}`}
                >
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, page + 1))
                  }
                  disabled={page === totalPages}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? "text-white/60 hover:bg-white/[0.06]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Lead"
        description={`Are you sure you want to delete the lead from @${deletingLeadUsername}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}
