"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import * as Dialog from "@radix-ui/react-dialog";

import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";
import { Spinner } from "@/components/shared/Spinner";
import { GateScreen } from "@/components/shared/GateScreen";
import { AvatarCircle } from "@/components/shared/AvatarCircle";
import { EmptyState } from "@/components/shared/EmptyState";

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
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

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

      const ownerVerification = await verifyOwner(apiRequest);
      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        setLoading(false);
        return;
      }

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

  // Guard screens
  if (!isLoaded) {
    return <Spinner label="Loading..." />;
  }

  if (!user) {
    return (
      <GateScreen
        icon={<Shield className="h-8 w-8 text-blue-400" />}
        title="Authentication Required"
        body="Please sign in to access the admin dashboard."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Sign In <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Access Denied"
        body="You are not authorized to view this page."
        subText={`Logged in as: ${user.primaryEmailAddress?.emailAddress}`}
      >
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Return to Home <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (loading) {
    return <Spinner label="Loading appointments…" />;
  }

  if (error && error !== "ACCESS_DENIED") {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Something went wrong"
        body={error}
      >
        <button
          onClick={fetchData}
          className={`px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Try Again
        </button>
      </GateScreen>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={`p-4 md:p-6 lg:p-8 ${styles.container}`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon.purple}`}
            >
              <CalendarDays className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1
                className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
              >
                Appointments
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Manage all appointment bookings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Total Appointments
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.total}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.purple}`}
              >
                <CalendarDays className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Todays Appointments
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.today}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.green}`}
              >
                <Clock className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 ${styles.card}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs mb-1 ${styles.text.secondary}`}>
                  Unique Subjects
                </p>
                <p className={`text-2xl font-bold ${styles.text.primary}`}>
                  {stats.subjects}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon.cyan}`}
              >
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
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
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            >
              <option value="all" className={styles.innerCard}>
                All Subjects
              </option>
              {subjects.map((subject) => (
                <option
                  key={subject}
                  value={subject}
                  className={styles.innerCard}
                >
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Appointments Table */}
        <div className={`rounded-2xl overflow-hidden ${styles.card}`}>
          <div className="overflow-x-auto no-scrollbar relative z-10">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${styles.divider}`}>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Name
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Contact
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Subject
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Address
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Date
                  </th>
                  <th
                    className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${styles.divider}`}>
                {filteredAppointments.map((apt, idx) => (
                  <tr
                    key={apt._id}
                    className={`transition-colors ${styles.rowHover}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AvatarCircle name={apt.name} idx={idx} />
                        <div>
                          <p
                            className={`text-sm font-medium ${styles.text.primary}`}
                          >
                            {apt.name}
                          </p>
                          <p className={`text-xs ${styles.text.muted}`}>
                            {apt.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p
                          className={`text-sm ${styles.text.secondary} flex items-center gap-1`}
                        >
                          <Phone className="h-3 w-3" />
                          {apt.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nowrap overflow-x-auto">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
                      >
                        {apt.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`text-sm ${styles.text.secondary} max-w-xs truncate flex items-center gap-1`}
                      >
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {apt.address}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm ${styles.text.secondary}`}>
                        {new Date(apt.createdAt).toLocaleDateString()}
                      </p>
                      <p className={`text-xs ${styles.text.muted}`}>
                        {new Date(apt.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowDetailsDialog(true);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${styles.pill}`}
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
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              label="No appointments found"
            />
          )}
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog.Root open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Title className="sr-only">Appointment Details</Dialog.Title>
            <Dialog.Close className={styles.dialogClose}>
              <X className="h-4 w-4" />
            </Dialog.Close>

            {selectedAppointment && (
              <div className="space-y-4 mt-4">
                {/* Personal Info */}
                <div className={`rounded-xl p-4 ${styles.innerCard}`}>
                  <h3
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400" />
                      <span className={`text-sm ${styles.text.primary}`}>
                        {selectedAppointment.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-400" />
                      <a
                        href={`mailto:${selectedAppointment.email}`}
                        className={`text-sm ${styles.text.primary} hover:underline`}
                      >
                        {selectedAppointment.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-purple-400" />
                      <a
                        href={`tel:${selectedAppointment.phone}`}
                        className={`text-sm ${styles.text.primary} hover:underline`}
                      >
                        {selectedAppointment.phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Appointment Info */}
                <div className={`rounded-xl p-4 ${styles.innerCard}`}>
                  <h3
                    className={`text-sm font-semibold mb-3 ${styles.text.primary}`}
                  >
                    Appointment Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Subject
                      </p>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.purple}`}
                      >
                        {selectedAppointment.subject}
                      </span>
                    </div>
                    <div>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Address
                      </p>
                      <p
                        className={`text-sm ${styles.text.secondary} flex items-start gap-1`}
                      >
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        {selectedAppointment.address}
                      </p>
                    </div>
                    {selectedAppointment.message && (
                      <div>
                        <p className={`text-xs mb-1 ${styles.text.muted}`}>
                          Message
                        </p>
                        <p
                          className={`text-sm p-3 rounded-lg border ${styles.input}`}
                        >
                          {selectedAppointment.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl p-3 ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Created
                    </p>
                    <p className={`text-sm font-medium ${styles.text.primary}`}>
                      {new Date(selectedAppointment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}
                  >
                    <p className={`text-xs mb-1 ${styles.text.muted}`}>
                      Last Updated
                    </p>
                    <p className={`text-sm font-medium ${styles.text.primary}`}>
                      {new Date(selectedAppointment.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// We need to import X from lucide-react for the dialog close button
import { X } from "lucide-react";
