"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  RefreshCw,
  CalendarDays,
  User,
  Phone,
  Mail,
  MapPin,
  Target,
  MessageSquare,
  Eye,
  AlertTriangle,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { getAppointments, verifyOwner } from "@/lib/services/admin-actions.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";

interface Appointment {
  _id: string;
  name: string;
  phone: string;
  address: string;
  subject: string;
  email: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAppointmentsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Theme styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FC]",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-500",
      textMuted: isDark ? "text-gray-500" : "text-gray-400",
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      cardBorder: isDark ? "border-gray-800" : "border-gray-100",
      inputBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
      tableBg: isDark ? "bg-[#1A1A1E]" : "bg-white",
      tableBorder: isDark ? "border-gray-800" : "border-gray-100",
      tableRowHover: isDark ? "hover:bg-[#252529]" : "hover:bg-gray-50",
    };
  }, [currentTheme]);

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    const unique = new Set(appointments.map((a) => a.subject));
    return Array.from(unique);
  }, [appointments]);

  // Check owner and fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Verify owner
      const ownerVerification = await verifyOwner(apiRequest);

      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      // Fetch appointments
      const appointmentsData = await getAppointments(apiRequest);

      setAppointments(appointmentsData.formattedAppointments || []);
      setFilteredAppointments(appointmentsData.formattedAppointments || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch appointments",
      );
    } finally {
      setLoading(false);
    }
  }, [user, apiRequest]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  // Filter appointments
  useEffect(() => {
    let filtered = appointments;

    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.phone.includes(searchTerm) ||
          apt.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.address.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (subjectFilter !== "all") {
      filtered = filtered.filter((apt) => apt.subject === subjectFilter);
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, subjectFilter]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    const data = filteredAppointments.map((apt) => ({
      Name: apt.name,
      Email: apt.email,
      Phone: apt.phone,
      Subject: apt.subject,
      Address: apt.address,
      Message: apt.message || "",
      Date: new Date(apt.createdAt).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) =>
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = filteredAppointments.filter(
      (apt) => new Date(apt.createdAt).toDateString() === today,
    ).length;

    return {
      total: filteredAppointments.length,
      today: todayCount,
      subjects: subjects.length,
    };
  }, [filteredAppointments, subjects]);

  // Check access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access the admin dashboard.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-500 mb-2">
            You are not authorized to view this page.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Logged in as:{" "}
            <span className="text-purple-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error && error !== "ACCESS_DENIED") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-2xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">Error loading data</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 ">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200/50">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
              <p className="text-sm text-gray-500">
                Manage all appointment bookings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Todays Appointments
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.today}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Unique Subjects</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {stats.subjects}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="flex gap-2 overflow-auto">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option
                    className="overflow-auto"
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Address
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((apt) => (
                  <tr
                    key={apt._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                          {apt.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {apt.name}
                          </p>
                          <p className="text-xs text-gray-400">{apt.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {apt.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nowrap overflow-x-auto">
                      <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                        {apt.subject}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {apt.address}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(apt.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(apt.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowDetailsDialog(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAppointments.length === 0 && (
            <div className="p-12 text-center">
              <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No appointments found</p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              {/* Personal Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-purple-800 mb-3">
                  Personal Information
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-900">
                      {selectedAppointment.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-purple-600" />
                    <a
                      href={`mailto:${selectedAppointment.email}`}
                      className="text-sm text-purple-900 hover:underline"
                    >
                      {selectedAppointment.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-600" />
                    <a
                      href={`tel:${selectedAppointment.phone}`}
                      className="text-sm text-purple-900 hover:underline"
                    >
                      {selectedAppointment.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Appointment Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Subject</p>
                    <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                      {selectedAppointment.subject}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-gray-800 flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      {selectedAppointment.address}
                    </p>
                  </div>
                  {selectedAppointment.message && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Message</p>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                        {selectedAppointment.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-600 mb-1">Created</p>
                  <p className="text-sm font-medium text-green-800">
                    {new Date(selectedAppointment.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-600 mb-1">Last Updated</p>
                  <p className="text-sm font-medium text-blue-800">
                    {new Date(selectedAppointment.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
