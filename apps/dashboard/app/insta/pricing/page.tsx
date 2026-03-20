"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Zap,
  X,
  Loader2,
  BadgeCheck,
  Sparkles,
  Crown,
  Shield,
  TrendingUp,
  Calendar,
  CreditCard,
} from "lucide-react";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";

import PaymentModal from "@/components/insta/PaymentModal";
import { AccountSelectionDialog } from "@/components/insta/AccountSelectionDialog";
import { PricingPlan } from "@rocketreplai/shared";
import {
  Badge,
  Button,
  Orbs,
  Spinner,
  Switch,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";

import {
  cancelRazorPaySubscription,
  connectInstaAccount,
  deleteInstaAccount,
  getInstaAccount,
  getSubscriptioninfo,
} from "@/lib/services/insta-actions.api";
import { getUserById } from "@/lib/services/user-actions.api";
import { ConfirmSubscriptionChangeDialog } from "@/components/insta/CancelSubcriptionChangeDialog";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// Types
interface Subscription {
  productId: string;
  billingCycle: "monthly" | "yearly";
  subscriptionId?: string;
  chatbotType?: string;
}

// Constants
const FREE_PLAN_ACCOUNT_LIMIT = 1;
const CANCELLATION_REASON_PLACEHOLDER = "User requested cancellation";

// Single Pro Plan Configuration
const instagramPricingPlans: PricingPlan[] = [
  {
    id: "Insta-Automation-Pro",
    name: "Pro Unlimited",
    description: "For growing creators",
    monthlyPrice: 500,
    yearlyPrice: 5000,
    account: 3,
    limit: 5000,
    features: [
      "3 Instagram Accounts",
      "Unlimited Automations",
      "Unlimited DMs",
      "Ask Follow before DM",
      "Basic keyword triggers",
      "Priority Support (WhatsApp & Email)",
      "Instagram API compliance",
      "Spam detection",
    ],
    popular: true,
  },
];

// Free Plan Features
const freePlanFeatures = [
  "1 Instagram Account",
  "Unlimited Automations",
  "2000 DMs / Month",
  "Ask Follow before DM",
  "Priority Support (WhatsApp and E-mail)",
];

// Comparison Table Data
const comparisonFeatures = [
  { feature: "Pricing", free: "₹0 / Month", pro: "₹500 / Month" },
  { feature: "Automations", free: "Unlimited", pro: "Unlimited" },
  { feature: "DM Send Limit", free: "2000 / Month", pro: "Unlimited" },
  { feature: "Instagram Accounts", free: "1", pro: "3" },
  { feature: "Priority Support", free: "✓", pro: "✓" },
  { feature: "Next Post Automation", free: "✗", pro: "✓" },
  { feature: "Follow-Up Flow", free: "✗", pro: "✓" },
  { feature: "Email Collection", free: "✗", pro: "✓" },
  { feature: "Reply Delay", free: "✗", pro: "✓" },
  { feature: "Ask For Follow", free: "✓", pro: "✓" },
  { feature: "Post And Reel Automation", free: "✗", pro: "✓" },
  { feature: "Story Automations", free: "✗", pro: "✓" },
  { feature: "Inbox Automations", free: "✗", pro: "✓" },
  { feature: "Remove App Branding", free: "✗", pro: "✓" },
  { feature: "Excess DM Queue", free: "✗", pro: "✓" },
  { feature: "Welcome Openers", free: "✗", pro: "✓" },
];

// Main Pricing Component
function PricingWithSearchParams() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeProductId = searchParams.get("code");
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInstaAccount, setIsInstaAccount] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationMode, setCancellationMode] = useState<
    "Immediate" | "End-of-term"
  >("End-of-term");
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGettingAcc, setIsGettingAcc] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [showCancelAccountDialog, setShowCancelAccountDialog] = useState(false);

  // Pending actions
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [pendingBillingCycle, setPendingBillingCycle] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [isProcessingChange, setIsProcessingChange] = useState(false);

  // Helper: Show toast notifications
  const showToast = useCallback(
    (title: string, description: string, isError: boolean = false) => {
      toast({
        title,
        description,
        duration: 3000,
        variant: isError ? "destructive" : "default",
      });
    },
    [],
  );

  // Helper: Fetch user accounts
  const fetchUserAccounts = useCallback(async (): Promise<any[]> => {
    try {
      const accountsResponse = await getInstaAccount(apiRequest);
      return accountsResponse.accounts || [];
    } catch (error) {
      console.error("Error fetching user accounts:", error);
      return [];
    }
  }, [apiRequest]);

  // Helper: Connect Instagram account
  const connectInstagramAccount = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const response = await connectInstaAccount(apiRequest, code);
        if (response.account) {
          showToast(
            "Success!",
            "Instagram account connected successfully",
            false,
          );
          return true;
        } else {
          showToast("Failed!", "Failed to connect account", true);
          return false;
        }
      } catch (error: any) {
        console.error("Error connecting account:", error);
        showToast(
          "Failed!",
          error.message || "Failed to connect account",
          true,
        );
        return false;
      }
    },
    [showToast, apiRequest],
  );

  // Fetch user data and subscription info
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isLoaded) return;
      setIsLoading(true);

      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const buyer = await getUserById(apiRequest, userId);
        if (!buyer) {
          router.push("/sign-in");
          return;
        }

        setEmail(buyer.email);

        // Fetch user accounts
        const accounts = await fetchUserAccounts();
        setUserAccounts(accounts);

        // Check if user has accounts
        const hasAccounts = accounts.length > 0;
        const needsAccountConnection =
          !hasAccounts ||
          (buyer.accountLimit && accounts.length < buyer.accountLimit);

        // Handle account connection if needed
        if (needsAccountConnection && activeProductId) {
          setIsGettingAcc(true);
          const connected = await connectInstagramAccount(activeProductId);
          setIsInstaAccount(connected);
          setIsGettingAcc(false);
        } else {
          setIsInstaAccount(hasAccounts);
        }

        // Fetch subscription info
        const subscription = await getSubscriptioninfo(apiRequest);
        console.log("subscription:", subscription);
        if (
          subscription.subscriptions &&
          subscription.subscriptions.length > 0
        ) {
          const activeSub = subscription.subscriptions.find(
            (sub: any) => sub.status === "active",
          );
          if (activeSub) {
            setIsSubscribed(true);
            setCurrentSubscription({
              productId: activeSub.chatbotType,
              billingCycle: activeSub.billingCycle,
              subscriptionId: activeSub.subscriptionId,
              chatbotType: activeSub.chatbotType,
            });
          } else {
            setIsSubscribed(false);
            setCurrentSubscription(null);
          }
        } else {
          setIsSubscribed(false);
          setCurrentSubscription(null);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        showToast("Failed!", "Failed to load subscription data", true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [
    userId,
    router,
    activeProductId,
    isLoaded,
    connectInstagramAccount,
    showToast,
    apiRequest,
    fetchUserAccounts,
  ]);

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!currentSubscription?.subscriptionId) {
      showToast("Failed!", "No subscription selected for cancellation", true);
      return;
    }

    setIsCancelling(true);
    try {
      const cancelResult = await cancelRazorPaySubscription(apiRequest, {
        subscriptionId: currentSubscription.subscriptionId,
        subscriptionType: "insta",
        reason: cancellationReason || CANCELLATION_REASON_PLACEHOLDER,
        mode: cancellationMode,
      });

      if (!cancelResult.success) {
        showToast(
          "Failed!",
          cancelResult.message || "Failed to cancel subscription",
          true,
        );
        return;
      }

      showToast("Success!", "Subscription cancelled successfully", false);
      setCurrentSubscription(null);
      setIsSubscribed(false);
      setShowCancelDialog(false);
      setCancellationReason("");
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      showToast("Failed!", "Failed to cancel subscription", true);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle subscription change
  const handleSubscribe = async (
    plan: PricingPlan,
    cycle: "monthly" | "yearly",
  ) => {
    // Check if it's the same plan
    if (
      currentSubscription &&
      currentSubscription.productId === plan.id &&
      currentSubscription.billingCycle === cycle
    ) {
      return;
    }

    // If user has a current subscription, show confirmation dialog
    if (currentSubscription) {
      setPendingPlan(plan);
      setPendingBillingCycle(cycle);
      setShowConfirmDialog(true);
    } else {
      // No current subscription, proceed directly
      setSelectedPlan(plan);
      setIsPaymentModalOpen(true);
    }
  };

  // Handle confirmed subscription change
  const handleConfirmedChange = async () => {
    if (!pendingPlan) return;

    setIsProcessingChange(true);
    setShowConfirmDialog(false);

    try {
      // First, cancel current subscription
      if (currentSubscription?.subscriptionId) {
        const cancelResult = await cancelRazorPaySubscription(apiRequest, {
          subscriptionId: currentSubscription.subscriptionId,
          subscriptionType: "insta",
          reason: "Changing to new plan",
          mode: "Immediate",
        });

        if (!cancelResult.success) {
          showToast("Failed!", "Failed to cancel current subscription", true);
          setIsProcessingChange(false);
          return;
        }
      }

      // Check account limit for new plan
      if (userAccounts.length > pendingPlan.account) {
        setShowAccountDialog(true);
      } else {
        setSelectedPlan(pendingPlan);
        setIsPaymentModalOpen(true);
      }
    } catch (error) {
      console.error("Error changing subscription:", error);
      showToast("Failed!", "Failed to change subscription", true);
      setIsProcessingChange(false);
    }
  };

  // Handle account deletion
  const handleAccountDeletion = async (selectedAccountIds: string[]) => {
    setIsProcessingChange(true);
    setShowAccountDialog(false);

    try {
      // Delete selected accounts
      for (const accountId of selectedAccountIds) {
        const result = await deleteInstaAccount(apiRequest, accountId);
        if (!result.success) {
          showToast("Failed!", "Failed to delete accounts", true);
          setIsProcessingChange(false);
          return;
        }
      }

      showToast("Success!", "Accounts deleted successfully", false);

      // Update user accounts list
      const updatedAccounts = userAccounts.filter(
        (account) => !selectedAccountIds.includes(account._id),
      );
      setUserAccounts(updatedAccounts);

      // Proceed to payment
      setSelectedPlan(pendingPlan);
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error("Error deleting accounts:", error);
      showToast("Failed!", "Failed to delete accounts", true);
    } finally {
      setIsProcessingChange(false);
      setPendingPlan(null);
    }
  };

  // Handle confirmed cancellation
  const handleConfirmedCancellation = async () => {
    setShowCancelConfirmDialog(false);

    // Check if we need to delete accounts (free plan only allows 1 account)
    if (userAccounts.length > FREE_PLAN_ACCOUNT_LIMIT) {
      setShowCancelAccountDialog(true);
    } else {
      await processCancellation();
    }
  };

  // Process the actual cancellation
  const processCancellation = async () => {
    if (!currentSubscription?.subscriptionId) return;

    setIsCancelling(true);
    try {
      const cancelResult = await cancelRazorPaySubscription(apiRequest, {
        subscriptionId: currentSubscription.subscriptionId,
        subscriptionType: "insta",
        reason: CANCELLATION_REASON_PLACEHOLDER,
        mode: "Immediate",
      });

      if (!cancelResult.success) {
        showToast("Failed!", "Failed to cancel subscription", true);
        return;
      }

      showToast("Success!", "Subscription cancelled successfully", false);
      setCurrentSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      showToast("Failed!", "Failed to cancel subscription", true);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle account deletion for cancellation
  const handleCancelAccountDeletion = async (selectedAccountIds: string[]) => {
    setIsCancelling(true);
    setShowCancelAccountDialog(false);

    try {
      // Delete selected accounts
      for (const accountId of selectedAccountIds) {
        const result = await deleteInstaAccount(apiRequest, accountId);
        if (!result.success) {
          showToast("Failed!", "Failed to delete accounts", true);
          setIsCancelling(false);
          return;
        }
      }

      showToast("Success!", "Accounts deleted successfully", false);

      // Update user accounts list
      const updatedAccounts = userAccounts.filter(
        (account) => !selectedAccountIds.includes(account._id),
      );
      setUserAccounts(updatedAccounts);

      // Proceed with cancellation
      await processCancellation();
    } catch (error) {
      console.error("Error deleting accounts:", error);
      showToast("Failed!", "Failed to delete accounts", true);
      setIsCancelling(false);
    }
  };

  // Page-specific styles (not in central theme)
  const pageStyles = useMemo(
    () => ({
      heroPill: isDark
        ? "inline-flex items-center bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1 mb-4"
        : "inline-flex items-center bg-pink-50 border border-pink-200 rounded-full px-4 py-1 mb-4",
      heroPillIcon: isDark ? "text-pink-400" : "text-pink-500",
      heroPillText: isDark
        ? "text-sm font-medium text-pink-400"
        : "text-sm font-medium text-pink-600",
      heroTitle: isDark
        ? "text-2xl md:text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-pink-200 bg-clip-text text-transparent"
        : "text-2xl md:text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-pink-100 bg-clip-text text-transparent",
      heroText: isDark
        ? "text-white/40 text-lg mb-6 max-w-2xl mx-auto"
        : "text-gray-500 text-lg mb-6 max-w-2xl mx-auto",
      billingText: (isActive: boolean) =>
        isDark
          ? `text-sm font-medium ${isActive ? "text-white" : "text-white/40"}`
          : `text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`,
      switchTrack: isDark
        ? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
        : "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500",
      cardPopular: (isPopular: boolean, isCurrent: boolean) => {
        if (isCurrent) {
          return isDark
            ? "border-pink-500 ring-2 ring-pink-500/30"
            : "border-pink-500 ring-2 ring-pink-200";
        }
        if (isPopular) {
          return isDark ? "ring-1 ring-pink-500/20" : "ring-1 ring-pink-200";
        }
        return "";
      },
      featureIcon: (included: boolean) =>
        isDark
          ? `w-5 h-5 rounded-full ${
              included ? "bg-pink-500/20" : "bg-white/[0.06]"
            } flex items-center justify-center flex-shrink-0 mt-0.5`
          : `w-5 h-5 rounded-full ${
              included ? "bg-pink-100" : "bg-gray-100"
            } flex items-center justify-center flex-shrink-0 mt-0.5`,
      featureIconColor: (included: boolean) =>
        isDark
          ? included
            ? "text-pink-400"
            : "text-white/40"
          : included
            ? "text-pink-600"
            : "text-gray-400",
      priceHighlight: isDark
        ? "text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent"
        : "text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent",
      tokenBadge: isDark
        ? "text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-4"
        : "text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4",
      buttonPrimary: (disabled?: boolean) =>
        isDark
          ? `w-full bg-gradient-to-r from-pink-500 to-pink-100 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`
          : `w-full bg-gradient-to-r from-pink-500 to-pink-100 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`,
      buttonCurrent: isDark
        ? "w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed"
        : "w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed",
      buttonOutline: isDark
        ? "w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl"
        : "w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl",
      buttonDisabled: isDark
        ? "w-full bg-gray-700 text-white/40 cursor-not-allowed rounded-xl"
        : "w-full bg-gray-300 text-gray-800 cursor-not-allowed rounded-xl",
      badgeDefault: isDark
        ? "bg-gray-500/10 border border-gray-500/20 text-gray-400"
        : "bg-gray-100 text-gray-500 border-gray-200",
      badgeGreen: isDark
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-green-100 text-green-600 border-green-200",
      badgePopular:
        "bg-gradient-to-r from-pink-500 to-pink-100 text-white border-0 px-4 py-1",
      badgeCurrent:
        "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-1",
      tableHead: isDark ? "bg-white/[0.04]" : "bg-gray-50",
      tableHeadCell: isDark
        ? "text-left py-4 px-6 font-semibold text-white"
        : "text-left py-4 px-6 font-semibold text-gray-700",
      tableHeadCellCenter: (color: string) =>
        isDark
          ? `text-center py-4 px-6 font-semibold text-${color}-400`
          : `text-center py-4 px-6 font-semibold text-${color}-600`,
      tableRow: isDark
        ? "hover:bg-white/[0.03] transition-colors divide-y divide-white/[0.06]"
        : "hover:bg-gray-50 transition-colors divide-y divide-gray-100",
      tableCell: isDark
        ? "py-4 px-6 font-medium text-white"
        : "py-4 px-6 font-medium text-gray-700",
      tableCellValue: isDark ? "text-white/60" : "text-gray-600",
      checkIcon: isDark
        ? "h-5 w-5 text-green-400 mx-auto"
        : "h-5 w-5 text-green-500 mx-auto",
      xIcon: isDark
        ? "h-5 w-5 text-red-400 mx-auto"
        : "h-5 w-5 text-red-500 mx-auto",
      trustCard: isDark
        ? "glass-inner rounded-xl p-4 text-center"
        : "bg-white border border-gray-100 rounded-xl p-4 text-center",
      trustIcon: isDark
        ? "h-8 w-8 text-pink-400 mx-auto mb-2"
        : "h-8 w-8 text-pink-500 mx-auto mb-2",
      trustTitle: isDark
        ? "font-semibold text-white mb-1"
        : "font-semibold text-gray-800 mb-1",
      trustDesc: isDark ? "text-xs text-white/40" : "text-xs text-gray-400",
      cancelDialog: isDark
        ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-xl"
        : "bg-white border border-gray-100 rounded-2xl p-6 max-w-md w-full shadow-xl",
      cancelTitle: isDark
        ? "text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent"
        : "text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent",
      cancelClose: isDark
        ? "p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
        : "p-1.5 rounded-lg hover:bg-gray-100 transition-colors",
      cancelCloseIcon: isDark ? "text-white/40" : "text-gray-400",
      cancelLabel: isDark ? "text-white/60" : "text-gray-500",
      cancelTextarea: isDark
        ? "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none"
        : "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none",
      cancelInfo: isDark
        ? "bg-white/[0.03] rounded-xl p-4 space-y-1.5"
        : "bg-gray-50 rounded-xl p-4 space-y-1.5",
      cancelInfoText: isDark
        ? "text-xs text-white/60"
        : "text-xs text-gray-600",
      cancelButtonNow: isDark
        ? "flex-1 rounded-xl bg-red-500/80 hover:bg-red-500 text-white"
        : "flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white",
      cancelButtonTerm: isDark
        ? "flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
        : "flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl",
    }),
    [isDark],
  );

  // Loading state
  if (isLoading || !isLoaded)
    return <Spinner label="Loading pricing information..." />;

  return (
    <div
      className={
        isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen"
      }
    >
      {isDark && <Orbs />}

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className={pageStyles.heroPill}>
            <Zap className={`h-4 w-4 mr-1 ${pageStyles.heroPillIcon}`} />
            <span className={pageStyles.heroPillText}>
              Never Miss a Customer Comment
            </span>
          </div>
          <h1 className={pageStyles.heroTitle}>Instagram Comment Automation</h1>
          <p className={pageStyles.heroText}>
            Reply instantly to every comment. No setup fees. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={pageStyles.billingText(billingCycle === "monthly")}
            >
              Monthly
            </span>
            <Switch
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) =>
                setBillingCycle(checked ? "yearly" : "monthly")
              }
              className={pageStyles.switchTrack}
            />
            <span className={pageStyles.billingText(billingCycle === "yearly")}>
              Yearly
            </span>
            <span
              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${pageStyles.badgeGreen} ml-2`}
            >
              Save 16%
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 max-w-6xl mx-auto">
          {/* Free Plan Card */}
          <div
            className={`relative group rounded-2xl border transition-all duration-300 ${styles.card} p-6 w-full lg:w-96`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className={styles.text.primary + " text-xl font-bold"}>
                  Free
                </h3>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${pageStyles.badgeDefault}`}
                >
                  Default
                </span>
              </div>

              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-800 dark:text-white">
                  ₹0
                </p>
                <p className={styles.text.secondary + " text-sm"}>forever</p>
              </div>

              <ul className="space-y-3 mb-6">
                {freePlanFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={pageStyles.featureIcon(true)}>
                      <Check className={pageStyles.featureIconColor(true)} />
                    </div>
                    <span className={pageStyles.heroPillText}>{feature}</span>
                  </li>
                ))}
              </ul>

              <SignedOut>
                <Button
                  onClick={() => router.push("/sign-in")}
                  className={pageStyles.buttonPrimary()}
                >
                  Get Started
                </Button>
              </SignedOut>
              <SignedIn>
                <Button
                  disabled={!currentSubscription}
                  className={
                    currentSubscription
                      ? pageStyles.buttonPrimary()
                      : pageStyles.buttonDisabled
                  }
                >
                  {currentSubscription ? "Current Plan" : "Your Current Plan"}
                </Button>
              </SignedIn>
            </div>
          </div>

          {/* Pro Plan Card */}
          {instagramPricingPlans.map((plan) => {
            const isCurrentPlan = currentSubscription?.productId === plan.id;
            const price =
              billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

            return (
              <div
                key={plan.id}
                className={`relative group rounded-2xl border-2 transition-all duration-300 ${styles.card} ${pageStyles.cardPopular(plan.popular, isCurrentPlan)} p-6 w-full lg:w-96 transform lg:scale-105 z-10 overflow-visible`}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className={pageStyles.badgePopular}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className={pageStyles.badgeCurrent}>
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Crown
                        className={`h-6 w-6 ${isDark ? "text-pink-400" : "text-pink-500"}`}
                      />
                      <h3
                        className={styles.text.primary + " text-xl font-bold"}
                      >
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className={pageStyles.priceHighlight}>₹{price}</p>
                    <p className={styles.text.secondary + " text-sm"}>
                      per {billingCycle === "monthly" ? "month" : "year"}
                    </p>
                  </div>

                  <p className={pageStyles.tokenBadge}>
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Two months free on yearly plan
                  </p>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className={pageStyles.featureIcon(true)}>
                          <Check
                            className={pageStyles.featureIconColor(true)}
                          />
                        </div>
                        <span className={pageStyles.heroPillText}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <SignedOut>
                    <Button
                      onClick={() => router.push("/sign-in")}
                      className={pageStyles.buttonPrimary()}
                    >
                      Get Started
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    {isCurrentPlan ? (
                      <div className="space-y-2">
                        <Button disabled className={pageStyles.buttonCurrent}>
                          <BadgeCheck className="h-4 w-4 mr-2" />
                          Current Plan
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelConfirmDialog(true)}
                          disabled={isCancelling}
                          className={pageStyles.buttonOutline}
                        >
                          Cancel Subscription
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan, billingCycle)}
                        disabled={isUpgrading || isProcessingChange}
                        className={pageStyles.buttonPrimary(
                          isUpgrading || isProcessingChange,
                        )}
                      >
                        {isUpgrading || isProcessingChange ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : currentSubscription ? (
                          "Change Plan"
                        ) : (
                          "Start Automating"
                        )}
                      </Button>
                    )}
                  </SignedIn>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Section */}
      <section className="relative py-12 px-4 sm:px-4 lg:px-8 border-t border-gray-100 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
              Free vs Pro Comparison
            </h2>
            <p className={styles.text.secondary}>
              Everything you get with each plan
            </p>
          </div>
          <div className={styles.card}>
            <div className="w-full overflow-x-auto">
              <table className="min-w-[700px] w-full table-fixed border-collapse">
                <thead className={pageStyles.tableHead}>
                  <tr>
                    <th className={pageStyles.tableHeadCell}>Features</th>
                    <th className={pageStyles.tableHeadCellCenter("pink")}>
                      Free
                    </th>
                    <th className={pageStyles.tableHeadCellCenter("pink")}>
                      Pro Unlimited
                    </th>
                  </tr>
                </thead>
                <tbody className={pageStyles.tableRow}>
                  {comparisonFeatures.map((row, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className={pageStyles.tableCell}>{row.feature}</td>
                      <td className="py-4 px-6 text-center">
                        {row.free === "✓" ? (
                          <Check className={pageStyles.checkIcon} />
                        ) : row.free === "✗" ? (
                          <X className={pageStyles.xIcon} />
                        ) : (
                          <span className={pageStyles.tableCellValue}>
                            {row.free}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.pro === "✓" ? (
                          <Check className={pageStyles.checkIcon} />
                        ) : row.pro === "✗" ? (
                          <X className={pageStyles.xIcon} />
                        ) : (
                          <span className={pageStyles.tableCellValue}>
                            {row.pro}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className={`${pageStyles.trustCard} ${styles.card}`}>
              <Shield className={pageStyles.trustIcon} />
              <h4 className={pageStyles.trustTitle}>Secure Payments</h4>
              <p className={pageStyles.trustDesc}>
                256-bit encrypted transactions
              </p>
            </div>
            <div className={`${pageStyles.trustCard} ${styles.card}`}>
              <TrendingUp className={pageStyles.trustIcon} />
              <h4 className={pageStyles.trustTitle}>No Hidden Fees</h4>
              <p className={pageStyles.trustDesc}>
                Cancel anytime, no questions asked
              </p>
            </div>
            <div className={`${pageStyles.trustCard} ${styles.card}`}>
              <CreditCard className={pageStyles.trustIcon} />
              <h4 className={pageStyles.trustTitle}>Multiple Payment Modes</h4>
              <p className={pageStyles.trustDesc}>
                Cards, UPI, NetBanking, Wallets
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={pageStyles.cancelDialog}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={pageStyles.cancelTitle}>Cancel Subscription</h2>
              <button
                onClick={() => setShowCancelDialog(false)}
                className={pageStyles.cancelClose}
              >
                <X className={pageStyles.cancelCloseIcon} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${pageStyles.cancelLabel} mb-2`}
                >
                  Please tell us why you are leaving
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className={pageStyles.cancelTextarea}
                  placeholder="Cancellation reason..."
                  rows={3}
                />
              </div>

              <div className={pageStyles.cancelInfo}>
                <p className={pageStyles.cancelInfoText}>
                  <strong>Immediate:</strong> Service ends immediately
                </p>
                <p className={pageStyles.cancelInfoText}>
                  <strong>End-of-term:</strong> Service continues until billing
                  period ends
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setCancellationMode("Immediate");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className={pageStyles.cancelButtonNow}
                >
                  {isCancelling ? "Cancelling..." : "Cancel Now"}
                </Button>
                <Button
                  onClick={() => {
                    setCancellationMode("End-of-term");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className={pageStyles.cancelButtonTerm}
                >
                  {isCancelling ? "Cancelling..." : "End of Term"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {userId && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          plan={selectedPlan}
          billingCycle={billingCycle}
          email={email}
          userId={userId}
          isSubscribed={isSubscribed}
          isInstaAccount={isInstaAccount}
          isgettingAcc={isGettingAcc}
          onSuccess={() => {
            setIsSubscribed(true);
            setIsUpgrading(false);
            setIsPaymentModalOpen(false);
            router.push("/insta");
          }}
        />
      )}

      {/* Confirm Subscription Change Dialog */}
      <ConfirmSubscriptionChangeDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmedChange}
        currentPlan={
          instagramPricingPlans.find(
            (p) => p.id === currentSubscription?.productId,
          ) || null
        }
        newPlan={pendingPlan}
        isLoading={isProcessingChange}
      />

      {/* Account Selection Dialog */}
      <AccountSelectionDialog
        isOpen={showAccountDialog}
        onClose={() => setShowAccountDialog(false)}
        onConfirm={handleAccountDeletion}
        accounts={userAccounts}
        newPlan={pendingPlan}
        isLoading={isProcessingChange}
      />

      {/* Confirm Cancellation Dialog */}
      <ConfirmDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
        onConfirm={handleConfirmedCancellation}
        title="Confirm Cancellation"
        description="Are you sure you want to cancel your subscription? Your plan will
              revert to the Free plan which only allows 1 Instagram account."
        confirmText="Yes, Cancel Subscription"
        isDestructive={true}
        isLoading={isCancelling}
      />

      {/* Account Selection Dialog for Cancellation */}
      <AccountSelectionDialog
        isOpen={showCancelAccountDialog}
        onClose={() => setShowCancelAccountDialog(false)}
        onConfirm={handleCancelAccountDeletion}
        accounts={userAccounts}
        newPlan={{
          id: "Insta-Automation-Free",
          name: "Free",
          description: "",
          monthlyPrice: 0,
          yearlyPrice: 0,
          account: 1,
          limit: 500,
          features: [],
          popular: false,
        }}
        isLoading={isCancelling}
      />
    </div>
  );
}

export default function Pricing() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F0F11] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 dark:text-white/40">
              Loading pricing information...
            </p>
          </div>
        </div>
      }
    >
      <PricingWithSearchParams />
    </Suspense>
  );
}
