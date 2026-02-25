"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import {
  ArrowLeft,
  Zap,
  Instagram,
  Globe,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import {
  getAffiliateDashInfo,
  requestPayout,
  saveAffiPaymentDetails,
} from "@/lib/services/affiliate-actions.api";

interface PayoutPageProps {
  dashboardType: "insta" | "web";
}

// Payment method icons
const UPIIcon = () => <span className="text-2xl">⚡</span>;
const PayPalIcon = () => <span className="text-2xl">🅿️</span>;
const BankIcon = () => <span className="text-2xl">🏦</span>;

export default function PayoutPage({ dashboardType }: PayoutPageProps) {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "paypal" | "bank">(
    "bank",
  );
  const [availableBalance, setAvailableBalance] = useState(0);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const [formData, setFormData] = useState({
    // Bank fields
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    // PayPal field
    paypalEmail: "",
    // UPI field
    upiId: "",
  });

  // Get theme colors based on dashboard type
  const theme = {
    primary: dashboardType === "insta" ? "pink" : "purple",
    gradient:
      dashboardType === "insta"
        ? "from-pink-500 to-rose-500"
        : "from-purple-500 to-pink-500",
    icon: dashboardType === "insta" ? Instagram : Globe,
    backRoute: dashboardType === "insta" ? "/insta/refer" : "/web/refer",
  };

  useEffect(() => {
    if (!userId || !isLoaded) return;

    const fetchData = async () => {
      try {
        const data = await getAffiliateDashInfo(apiRequest);

        if (!data.isAffiliate) {
          toast({
            title: "Error",
            description: "Affiliate data not found",
            variant: "destructive",
            duration: 3000,
          });
          router.push(theme.backRoute);
          return;
        }

        // Set available balance
        setAvailableBalance(data.stats?.pendingEarnings || 0);

        // Pre-fill if payment details already exist
        if (data.affiliate?.paymentDetails) {
          const details = data.affiliate.paymentDetails;
          setPaymentMethod(details.method);
          setFormData({
            accountName: details.accountName || "",
            accountNumber: details.accountNumber || "",
            ifscCode: details.ifscCode || "",
            bankName: details.bankName || "",
            paypalEmail: details.paypalEmail || "",
            upiId: details.upiId || "",
          });
        }
      } catch (error) {
        console.error("Error fetching affiliate data:", error);
        toast({
          title: "Error loading data",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, isLoaded, apiRequest, router, theme.backRoute]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCopyExampleUpi = async () => {
    await navigator.clipboard.writeText("9324350209-2@axl");
    setCopiedUpi(true);
    toast({
      title: "Copied!",
      description: "Example UPI ID copied to clipboard",
      duration: 2000,
    });
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSavePaymentDetails = async () => {
    setSaving(true);

    try {
      // Validate based on payment method
      if (paymentMethod === "bank") {
        if (
          !formData.accountName ||
          !formData.accountNumber ||
          !formData.ifscCode ||
          !formData.bankName
        ) {
          toast({
            title: "Missing fields",
            description: "Please fill all bank details",
            variant: "destructive",
            duration: 3000,
          });
          setSaving(false);
          return;
        }
      } else if (paymentMethod === "paypal") {
        if (!formData.paypalEmail) {
          toast({
            title: "Missing field",
            description: "Please enter PayPal email",
            variant: "destructive",
            duration: 3000,
          });
          setSaving(false);
          return;
        }
      } else if (paymentMethod === "upi") {
        if (!formData.upiId) {
          toast({
            title: "Missing field",
            description: "Please enter UPI ID",
            variant: "destructive",
            duration: 3000,
          });
          setSaving(false);
          return;
        }
      }

      const response = await saveAffiPaymentDetails(apiRequest, {
        paymentMethod,
        ...formData,
      });

      if (response.success) {
        toast({
          title: "Payment details saved!",
          description: "You can now request payouts",
          duration: 3000,
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPayout = async () => {
    if (payoutAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please select a payout amount",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (payoutAmount > availableBalance) {
      toast({
        title: "Insufficient balance",
        description: "Amount exceeds available balance",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setRequesting(true);

    try {
      const response = await requestPayout(apiRequest, payoutAmount);

      if (response.success) {
        toast({
          title: "Payout requested!",
          description: "Your payout request has been submitted",
          duration: 3000,
        });
        router.push(theme.backRoute);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setRequesting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div
          className={`w-5 h-5 border-2 border-t-transparent border-${
            theme.primary
          }-500 rounded-full animate-spin`}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Refer & Earn</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}
            >
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payout</h1>
              <p className="text-gray-500 text-sm">
                Add payout details and request your earnings
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-2xl p-4 md:p-6 mb-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-6">
            Select payout method
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* UPI Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod("upi")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "upi"
                  ? `border-${theme.primary}-500 bg-${theme.primary}-50`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                  paymentMethod === "upi"
                    ? `border-${theme.primary}-500`
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "upi" && (
                  <div
                    className={`w-3 h-3 rounded-full bg-${theme.primary}-500`}
                  />
                )}
              </div>
              <UPIIcon />
              <span className="font-medium text-gray-900">UPI</span>
            </button>

            {/* PayPal Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod("paypal")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "paypal"
                  ? `border-${theme.primary}-500 bg-${theme.primary}-50`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                  paymentMethod === "paypal"
                    ? `border-${theme.primary}-500`
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "paypal" && (
                  <div
                    className={`w-3 h-3 rounded-full bg-${theme.primary}-500`}
                  />
                )}
              </div>
              <PayPalIcon />
              <span className="font-medium text-gray-900">PayPal</span>
            </button>

            {/* Bank Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "bank"
                  ? `border-${theme.primary}-500 bg-${theme.primary}-50`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                  paymentMethod === "bank"
                    ? `border-${theme.primary}-500`
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "bank" && (
                  <div
                    className={`w-3 h-3 rounded-full bg-${theme.primary}-500`}
                  />
                )}
              </div>
              <BankIcon />
              <span className="font-medium text-gray-900">Bank</span>
            </button>
          </div>

          {/* Bank Details Form */}
          {paymentMethod === "bank" && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Add Bank Details
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This information will be used for future payouts
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Account holder name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Account number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    IFSC / Swift code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Bank name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <Button
                onClick={handleSavePaymentDetails}
                disabled={saving}
                className={`bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white rounded-lg px-6`}
              >
                {saving ? "Saving..." : "Save & continue"}
              </Button>
            </div>
          )}

          {/* PayPal Details Form */}
          {paymentMethod === "paypal" && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Add PayPal Details
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This information will be used for future payouts
              </p>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">
                  PayPal email
                </label>
                <input
                  type="email"
                  name="paypalEmail"
                  value={formData.paypalEmail}
                  onChange={handleChange}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <Button
                onClick={handleSavePaymentDetails}
                disabled={saving}
                className={`bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white rounded-lg px-6`}
              >
                {saving ? "Saving..." : "Save & continue"}
              </Button>
            </div>
          )}

          {/* UPI Details Form */}
          {paymentMethod === "upi" && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Add UPI Details
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This information will be used for future payouts
              </p>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">
                  UPI ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleChange}
                    placeholder="9324350209-2@axl"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">
                  Example UPI format:
                </p>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-mono">
                    9324350209-2@axl
                  </code>
                  <button
                    onClick={handleCopyExampleUpi}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Copy example"
                  >
                    {copiedUpi ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSavePaymentDetails}
                disabled={saving}
                className={`bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white rounded-lg px-6`}
              >
                {saving ? "Saving..." : "Save & continue"}
              </Button>
            </div>
          )}
        </div>

        {/* Request Payout Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-6">
            Request payout
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-700">Select Amount</label>
              <span className="text-sm text-gray-600">
                Available:{" "}
                <span className="font-semibold">
                  ₹{availableBalance.toFixed(2)}
                </span>
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={availableBalance}
              step="100"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(parseFloat(e.target.value))}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-${theme.primary}-500`}
              disabled={availableBalance === 0}
            />

            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">₹0</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{payoutAmount.toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">
                ₹{availableBalance.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handleRequestPayout}
            disabled={
              requesting || availableBalance === 0 || payoutAmount === 0
            }
            className={`bg-gradient-to-r ${
              requesting || availableBalance === 0 || payoutAmount === 0
                ? "from-gray-400 to-gray-500 cursor-not-allowed"
                : theme.gradient
            } hover:opacity-90 text-white rounded-lg px-6`}
          >
            {requesting ? "Requesting..." : "Request payout"}
          </Button>

          {availableBalance === 0 && (
            <p className="text-sm text-gray-500 mt-4">
              No balance available for payout. Start referring to earn
              commissions!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
