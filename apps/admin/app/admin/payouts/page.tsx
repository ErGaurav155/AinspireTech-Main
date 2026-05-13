"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { isAdminOwnerEmail } from "@/lib/admin-owner";
import {
  getPayouts,
  updatePayoutStatus,
  verifyOwner,
  type AdminAffiliateSummary,
  type PayoutRecord,
  type PayoutStatus,
} from "@/lib/services/admin-actions.api";
import {
  EmptyState,
  GateScreen,
  Orbs,
  Spinner,
  useThemeStyles,
} from "@rocketreplai/ui";

function getAffiliateSummary(affiliateId: PayoutRecord["affiliateId"]) {
  if (!affiliateId || typeof affiliateId === "string") {
    return null;
  }

  return affiliateId as AdminAffiliateSummary;
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const map: Record<PayoutStatus, { label: string; cls: string; icon: ReactNode }> = {
    processing: {
      label: "Processing",
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    completed: {
      label: "Completed",
      cls: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      cls: "bg-red-100 text-red-700 border border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const config = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${config.cls}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function PaymentMethodBadge({ method }: { method: PayoutRecord["paymentMethod"] }) {
  const label =
    method === "bank" ? "Bank" : method === "upi" ? "UPI" : "PayPal";

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      <CreditCard className="h-3 w-3" />
      {label}
    </span>
  );
}

function getPaymentDestination(payout: PayoutRecord) {
  if (payout.paymentMethod === "upi") return payout.paymentDetails?.upiId || "—";
  if (payout.paymentMethod === "paypal")
    return payout.paymentDetails?.paypalEmail || "—";
  return payout.paymentDetails?.accountNumber || "—";
}

export default function AdminPayoutsPage() {
  const { user, isLoaded } = useUser();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const ownerVerification = await verifyOwner(apiRequest);
      setIsOwner(ownerVerification.isOwner);

      if (!ownerVerification.isOwner) {
        setError("ACCESS_DENIED");
        return;
      }

      const response = await getPayouts(apiRequest, "all");
      setPayouts(response.payouts || []);
    } catch (err) {
      console.error("Error fetching payouts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch payouts");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, user]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [fetchData, isLoaded, user]);

  const filteredPayouts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return payouts.filter((payout) => {
      const affiliate = getAffiliateSummary(payout.affiliateId);
      const matchesStatus =
        statusFilter === "all" || payout.status === statusFilter;

      const matchesSearch =
        query.length === 0 ||
        payout._id.toLowerCase().includes(query) ||
        payout.transactionId?.toLowerCase().includes(query) ||
        payout.paymentDetails?.accountName?.toLowerCase().includes(query) ||
        payout.paymentDetails?.upiId?.toLowerCase().includes(query) ||
        payout.paymentDetails?.paypalEmail?.toLowerCase().includes(query) ||
        affiliate?.userId?.toLowerCase().includes(query) ||
        affiliate?.affiliateCode?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [payouts, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: filteredPayouts.length,
      processing: filteredPayouts.filter((item) => item.status === "processing")
        .length,
      completedAmount: filteredPayouts
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + item.amount, 0),
    }),
    [filteredPayouts],
  );

  const openPayout = (payout: PayoutRecord) => {
    setSelectedPayout(payout);
    setTransactionId(payout.transactionId || "");
    setNotes(payout.notes || "");
    setShowDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedPayout) return;

    setSubmitting(true);
    try {
      await updatePayoutStatus(
        apiRequest,
        selectedPayout._id,
        transactionId || undefined,
        notes || undefined,
      );
      setShowDialog(false);
      setSelectedPayout(null);
      setTransactionId("");
      setNotes("");
      await fetchData();
    } catch (err) {
      console.error("Error approving payout:", err);
      setError(err instanceof Error ? err.message : "Failed to approve payout");
    } finally {
      setSubmitting(false);
    }
  };

  const isUserOwner = isAdminOwnerEmail(
    user?.primaryEmailAddress?.emailAddress,
  );

  if (!isLoaded) return <Spinner label="Loading..." />;

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

  if (loading) return <Spinner label="Loading payouts…" />;

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
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon.purple}`}
            >
              <Wallet className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className={`text-lg font-bold md:text-xl ${styles.text.primary}`}>
                Payout Requests
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Review affiliate payout requests using the current backend flow.
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm ${styles.pill}`}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`${styles.card} rounded-2xl p-5`}>
            <p className={`mb-1 text-xs ${styles.text.secondary}`}>Total Requests</p>
            <p className={`text-2xl font-bold ${styles.text.primary}`}>{stats.total}</p>
          </div>
          <div className={`${styles.card} rounded-2xl p-5`}>
            <p className={`mb-1 text-xs ${styles.text.secondary}`}>Processing</p>
            <p className={`text-2xl font-bold ${styles.text.primary}`}>
              {stats.processing}
            </p>
          </div>
          <div className={`${styles.card} rounded-2xl p-5`}>
            <p className={`mb-1 text-xs ${styles.text.secondary}`}>Completed Amount</p>
            <p className={`text-2xl font-bold ${styles.text.primary}`}>
              ₹{stats.completedAmount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by affiliate code, user ID, UPI, PayPal, transaction ID..."
              className={`w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-all ${styles.input}`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | "all")}
            className={`rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${styles.input}`}
          >
            <option value="all">All Status</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className={`overflow-hidden rounded-2xl ${styles.card}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${styles.divider}`}>
                  {[
                    "Affiliate",
                    "Amount",
                    "Method",
                    "Destination",
                    "Status",
                    "Requested",
                    "Action",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${styles.divider}`}>
                {filteredPayouts.map((payout) => {
                  const affiliate = getAffiliateSummary(payout.affiliateId);

                  return (
                    <tr key={payout._id} className={styles.rowHover}>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`text-sm font-medium ${styles.text.primary}`}>
                            {affiliate?.affiliateCode || "Affiliate"}
                          </p>
                          <p className={`text-xs ${styles.text.muted}`}>
                            {affiliate?.userId || String(payout.affiliateId)}
                          </p>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold ${styles.text.primary}`}>
                        ₹{payout.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <PaymentMethodBadge method={payout.paymentMethod} />
                      </td>
                      <td className={`px-6 py-4 text-sm ${styles.text.secondary}`}>
                        {getPaymentDestination(payout)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={payout.status} />
                      </td>
                      <td className={`px-6 py-4 text-sm ${styles.text.secondary}`}>
                        {new Date(payout.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openPayout(payout)}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${styles.pill}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPayouts.length === 0 && (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              label="No payout requests found"
            />
          )}
        </div>
      </div>

      <Dialog.Root open={showDialog} onOpenChange={setShowDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Title className={`mb-1 text-base font-bold ${styles.text.primary}`}>
              Payout Request
            </Dialog.Title>
            <Dialog.Description className={`mb-4 text-xs ${styles.text.muted}`}>
              Review the current payout details before marking it completed.
            </Dialog.Description>
            <Dialog.Close className={styles.dialogClose}>
              <X className="h-4 w-4" />
            </Dialog.Close>

            {selectedPayout && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedPayout.status} />
                  <span className={`text-xl font-bold ${styles.text.primary}`}>
                    ₹{selectedPayout.amount.toLocaleString()}
                  </span>
                </div>

                <div className={`space-y-2 rounded-xl p-4 ${styles.innerCard}`}>
                  <h3 className={`text-sm font-semibold ${styles.text.primary}`}>
                    Affiliate
                  </h3>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    Code: {getAffiliateSummary(selectedPayout.affiliateId)?.affiliateCode || "—"}
                  </p>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    User ID: {getAffiliateSummary(selectedPayout.affiliateId)?.userId || "—"}
                  </p>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    Total earnings: ₹
                    {(getAffiliateSummary(selectedPayout.affiliateId)?.totalEarnings || 0).toLocaleString()}
                  </p>
                </div>

                <div className={`space-y-2 rounded-xl p-4 ${styles.innerCard}`}>
                  <h3 className={`text-sm font-semibold ${styles.text.primary}`}>
                    Payment Details
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${styles.text.muted}`}>Method</span>
                    <PaymentMethodBadge method={selectedPayout.paymentMethod} />
                  </div>
                  {selectedPayout.paymentDetails?.accountName && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      Account name: {selectedPayout.paymentDetails.accountName}
                    </p>
                  )}
                  {selectedPayout.paymentDetails?.bankName && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      Bank: {selectedPayout.paymentDetails.bankName}
                    </p>
                  )}
                  {selectedPayout.paymentDetails?.accountNumber && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      Account number: {selectedPayout.paymentDetails.accountNumber}
                    </p>
                  )}
                  {selectedPayout.paymentDetails?.ifscCode && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      IFSC: {selectedPayout.paymentDetails.ifscCode}
                    </p>
                  )}
                  {selectedPayout.paymentDetails?.upiId && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      UPI: {selectedPayout.paymentDetails.upiId}
                    </p>
                  )}
                  {selectedPayout.paymentDetails?.paypalEmail && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      PayPal: {selectedPayout.paymentDetails.paypalEmail}
                    </p>
                  )}
                </div>

                <div className={`space-y-2 rounded-xl p-4 ${styles.innerCard}`}>
                  <h3 className={`text-sm font-semibold ${styles.text.primary}`}>
                    Timeline
                  </h3>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    Requested: {new Date(selectedPayout.createdAt).toLocaleString()}
                  </p>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    Period: {selectedPayout.period}
                  </p>
                  {selectedPayout.completedAt && (
                    <p className={`text-sm ${styles.text.secondary}`}>
                      Completed: {new Date(selectedPayout.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {(selectedPayout.status === "processing" || selectedPayout.status === "failed") && (
                  <div className={`space-y-3 rounded-xl p-4 ${styles.innerCard}`}>
                    <h3 className={`text-sm font-semibold ${styles.text.primary}`}>
                      Complete Payout
                    </h3>

                    <div>
                      <label className={`mb-1 block text-xs ${styles.text.secondary}`}>
                        Transaction ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="UTR / reference number"
                          className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${styles.input}`}
                        />
                        {transactionId && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(transactionId)}
                            className={`rounded-lg px-3 ${styles.pill}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={`mb-1 block text-xs ${styles.text.secondary}`}>
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional note for this payout"
                        className={`w-full resize-none rounded-lg px-3 py-2 text-sm outline-none ${styles.input}`}
                      />
                    </div>

                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Mark Completed
                    </button>
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
