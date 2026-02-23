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
  Coins,
} from "lucide-react";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";

import PaymentModal from "@/components/insta/PaymentModal";
import { AccountSelectionDialog } from "@/components/insta/AccountSelectionDialog";
import { ConfirmSubscriptionChangeDialog } from "@/components/insta/CancelSubcriptionChangeDialog";
import { PricingPlan } from "@rocketreplai/shared";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Textarea } from "@rocketreplai/ui/components/radix/textarea";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";

import {
  cancelRazorPaySubscription,
  connectInstaAccount,
  deleteInstaAccount,
  getInstaAccount,
  getSubscriptioninfo,
} from "@/lib/services/insta-actions.api";
import { getUserById } from "@/lib/services/user-actions.api";

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
    limit: 50000000,
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
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

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

  // Theme-based styles
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
      hoverBorder: isDark
        ? "hover:border-pink-500/50"
        : "hover:border-pink-300",
      badgeBg: isDark ? "bg-gray-800" : "bg-gray-100",
      alertBg: isDark ? "bg-red-900/20" : "bg-red-50",
      buttonOutlineBorder: isDark ? "border-gray-700" : "border-gray-200",
      buttonOutlineText: isDark ? "text-gray-300" : "text-gray-600",
      dialogBg: isDark ? "bg-[#1A1A1E]" : "bg-white",
      inputBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
      inputText: isDark ? "text-white" : "text-gray-900",
      gradientPrimary: "from-pink-500 to-rose-500",
      gradientSecondary: "from-purple-500 to-pink-500",
      gradientGold: "from-amber-500 to-orange-500",
    };
  }, [currentTheme]);

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
        if (response.ok) {
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

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">
            Loading pricing information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center bg-pink-50 border border-pink-200 rounded-full px-4 py-1 mb-4">
            <Zap className="h-4 w-4 text-pink-500 mr-1" />
            <span className="text-sm font-medium text-pink-600">
              Never Miss a Customer Comment
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-pink-100 bg-clip-text text-transparent">
            Instagram Comment Automation
          </h1>
          <p
            className={`text-lg ${themeStyles.textSecondary} mb-6 max-w-2xl mx-auto`}
          >
            Reply instantly to every comment. No setup fees. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${billingCycle === "monthly" ? themeStyles.textPrimary : themeStyles.textMuted}`}
            >
              Monthly
            </span>
            <Switch
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) =>
                setBillingCycle(checked ? "yearly" : "monthly")
              }
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
            />
            <span
              className={`text-sm font-medium ${billingCycle === "yearly" ? themeStyles.textPrimary : themeStyles.textMuted}`}
            >
              Yearly
            </span>
            <Badge className="bg-green-100 text-green-600 border-green-200 ml-2">
              Save 16%
            </Badge>
          </div>
        </div>
      </section>
      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 max-w-6xl mx-auto">
          {/* Free Plan Card */}
          <div
            className={`relative group rounded-2xl border transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder} hover:border-pink-300 p-6 w-full lg:w-96`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${themeStyles.textPrimary}`}>
                  Free
                </h3>
                <Badge
                  variant="outline"
                  className="text-gray-500 border-gray-200"
                >
                  Default
                </Badge>
              </div>

              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-800">₹0</p>
                <p className={`text-sm ${themeStyles.textSecondary}`}>
                  forever
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {freePlanFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-pink-600" />
                    </div>
                    <span className={`text-sm ${themeStyles.textSecondary}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <SignedOut>
                <Button
                  onClick={() => router.push("/sign-in")}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
                >
                  Get Started
                </Button>
              </SignedOut>
              <SignedIn>
                <Button
                  disabled={!currentSubscription}
                  className={`w-full rounded-xl ${
                    currentSubscription
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                      : "bg-gray-300 text-gray-800 cursor-not-allowed"
                  }`}
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
                className={`relative group rounded-2xl border-2 transition-all duration-300 ${
                  isCurrentPlan
                    ? "border-pink-500 ring-2 ring-pink-200"
                    : themeStyles.cardBorder
                } ${themeStyles.cardBg} ${plan.popular && " ring-2 ring-pink-200"} hover:border-pink-400 p-6 w-full lg:w-96 transform lg:scale-105 z-10`}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-gradient-to-r from-pink-500 to-pink-100 hover:from-pink-600 hover:to-rose-600 text-white border-0 px-4 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-1">
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-6 w-6 text-pink-500" />
                      <h3
                        className={`text-xl font-bold ${themeStyles.textPrimary}`}
                      >
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                      ₹{price}
                    </p>
                    <p className={`text-sm ${themeStyles.textSecondary}`}>
                      per {billingCycle === "monthly" ? "month" : "year"}
                    </p>
                  </div>

                  <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Two months free on yearly plan
                  </p>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-pink-600" />
                        </div>
                        <span
                          className={`text-sm ${themeStyles.textSecondary}`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <SignedOut>
                    <Button
                      onClick={() => router.push("/sign-in")}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
                    >
                      Get Started
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    {isCurrentPlan ? (
                      <div className="space-y-2">
                        <Button
                          disabled
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed"
                        >
                          <BadgeCheck className="h-4 w-4 mr-2" />
                          Current Plan
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelConfirmDialog(true)}
                          disabled={isCancelling}
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          Cancel Subscription
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan, billingCycle)}
                        disabled={isUpgrading || isProcessingChange}
                        className="w-full bg-gradient-to-r from-pink-500 to-pink-100 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
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
      <section className=" relative py-12 px-4 sm:px-4 lg:px-8 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
              Free vs Pro Comparison
            </h2>
            <p className={`text-base ${themeStyles.textSecondary}`}>
              Everything you get with each plan
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="min-w-[700px] w-full table-fixed border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-1/3 text-left py-4 px-6 font-semibold text-gray-700">
                      Features
                    </th>
                    <th className="w-1/3 text-center py-4 px-6 font-semibold text-pink-600">
                      Free
                    </th>
                    <th className="w-1/3 text-center py-4 px-6 font-semibold text-pink-600">
                      Pro Unlimited
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisonFeatures.map((row, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium text-gray-700">
                        {row.feature}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.free === "✓" ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : row.free === "✗" ? (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <span className="text-gray-600">{row.free}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.pro === "✓" ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : row.pro === "✗" ? (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <span className="text-gray-600">{row.pro}</span>
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
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <Shield className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-800 mb-1">
                Secure Payments
              </h4>
              <p className="text-xs text-gray-400">
                256-bit encrypted transactions
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <TrendingUp className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-800 mb-1">
                No Hidden Fees
              </h4>
              <p className="text-xs text-gray-400">
                Cancel anytime, no questions asked
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <CreditCard className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-800 mb-1">
                Multiple Payment Modes
              </h4>
              <p className="text-xs text-gray-400">
                Cards, UPI, NetBanking, Wallets
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${themeStyles.dialogBg} border ${themeStyles.cardBorder} rounded-2xl p-6 max-w-md w-full shadow-xl`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                Cancel Subscription
              </h2>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${themeStyles.textSecondary} mb-2`}
                >
                  Please tell us why you are leaving
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className={`w-full px-4 py-3 ${themeStyles.inputBg} border ${themeStyles.inputBorder} rounded-xl text-sm ${themeStyles.inputText} focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none`}
                  placeholder="Cancellation reason..."
                  rows={3}
                />
              </div>

              <div className={`bg-gray-50 rounded-xl p-4 space-y-1.5`}>
                <p className="text-xs text-gray-600">
                  <strong>Immediate:</strong> Service ends immediately
                </p>
                <p className="text-xs text-gray-600">
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
                  className="flex-1 rounded-xl"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Now"}
                </Button>
                <Button
                  onClick={() => {
                    setCancellationMode("End-of-term");
                    handleCancelSubscription();
                  }}
                  disabled={isCancelling}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-pink-600 text-white rounded-xl"
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
            router.push("/insta/dashboard");
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
      <AlertDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Are you sure you want to cancel your subscription? Your plan will
              revert to the Free plan which only allows 1 Instagram account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedCancellation}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">
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
