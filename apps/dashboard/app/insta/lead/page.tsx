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
  Filter,
  Users,
  MessageCircle,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@clerk/nextjs";
import { Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { useInstaAccount } from "@/context/Instaaccountcontext ";
import { getInstaTemplates } from "@/lib/services/insta-actions.api";

interface Lead {
  _id: string;
  templateId: string;
  templateName: string;
  commenterUserId: string;
  commenterUsername: string;
  automationType: "comments" | "stories" | "dms";
  email?: string;
  phone?: string;
  source: "email_collection" | "phone_collection";
  createdAt: string;
}

const AUTOMATION_ICONS: Record<string, React.ReactNode> = {
  comments: <MessageCircle className="h-3 w-3" />,
  stories: <BookOpen className="h-3 w-3" />,
  dms: <MessageSquare className="h-3 w-3" />,
};

export default function LeadsPage() {
  const { styles, isDark } = useThemeStyles();
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { selectedAccount, isAccLoading } = useInstaAccount();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "email_collection" | "phone_collection"
  >("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [templates, setTemplates] = useState<{ _id: string; name: string }[]>(
    [],
  );

  const limit = 20;

  // Fetch templates for filter dropdown
  useEffect(() => {
    if (!selectedAccount?.instagramId) return;
    getInstaTemplates(apiRequest, {
      accountId: selectedAccount.instagramId,
      filterStatus: "all",
    }).then((res: any) => {
      const list = res?.templates || res?.data?.templates || [];
      setTemplates(list.map((t: any) => ({ _id: t._id, name: t.name })));
    });
  }, [selectedAccount?.instagramId, apiRequest]);

  const fetchLeads = useCallback(async () => {
    if (!selectedAccount?.instagramId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount.instagramId,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (templateFilter !== "all") params.set("templateId", templateFilter);

      const response = await apiRequest(`/insta/leads?${params}`, {
        method: "GET",
      });

      if (response?.success) {
        setLeads(response.leads || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Failed to load leads",
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
    templateFilter,
    apiRequest,
  ]);

  useEffect(() => {
    if (isLoaded && !isAccLoading) {
      fetchLeads();
    }
  }, [isLoaded, isAccLoading, fetchLeads]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/insta/leads?id=${id}`, { method: "DELETE" });
        setLeads((prev) => prev.filter((l) => l._id !== id));
        setTotal((prev) => prev - 1);
        toast({ title: "Lead deleted", duration: 3000 });
      } catch {
        toast({
          title: "Failed to delete",
          variant: "destructive",
          duration: 3000,
        });
      }
    },
    [apiRequest],
  );

  const handleExportCSV = useCallback(() => {
    if (leads.length === 0) return;
    const headers = [
      "Username",
      "Email",
      "Phone",
      "Template",
      "Automation Type",
      "Source",
      "Date",
    ];
    const rows = leads.map((l) => [
      l.commenterUsername || "",
      l.email || "",
      l.phone || "",
      l.templateName || "",
      l.automationType || "",
      l.source === "email_collection" ? "Email" : "Phone",
      new Date(l.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${selectedAccount?.username}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads, selectedAccount?.username]);

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
    <div
      className={
        isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen"
      }
    >
      {isDark && <Orbs />}
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 relative z-10">
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
          <button
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? "bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.09]"
                : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
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
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className={`rounded-2xl p-4 ${
                isDark
                  ? "bg-white/[0.04] border border-white/[0.08]"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  isDark
                    ? `bg-${color}-500/10 text-${color}-400`
                    : `bg-${color}-50 text-${color}-500`
                }`}
              >
                {icon}
              </div>
              <p
                className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
              >
                {value}
              </p>
              <p
                className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-gray-500"}`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div
            className={`relative flex-1 min-w-48 rounded-xl ${styles.input}`}
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
            <option value="all">All Sources</option>
            <option value="email_collection">Email</option>
            <option value="phone_collection">Phone</option>
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
                {searchTerm
                  ? "No leads match your search"
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
                  {filteredLeads.map((lead, i) => (
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
                          onClick={() => handleDelete(lead._id)}
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  );
}
