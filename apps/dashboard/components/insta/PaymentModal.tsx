"use client";

import { useMemo, useRef, useState } from "react";
import {
  CreditCard,
  X,
  Check,
  Loader2,
  Shield,
  Zap,
  Calendar,
  Crown,
  Sparkles,
} from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Script from "next/script";
import { toast } from "sonner";
import { PricingPlan } from "@rocketreplai/shared";
import { useApi } from "@/lib/useApi";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  useThemeStyles,
} from "@rocketreplai/ui";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import { updateUserLimits } from "@/lib/services/user-actions.api";
import {
  createRazorpaySubscription,
  getRazerpayPlanInfo,
  verifyRazorpayPayment,
} from "@/lib/services/subscription-actions.api";
import {
  sendSubscriptionEmailToOwner,
  sendSubscriptionEmailToUser,
} from "@/lib/services/misc-actions.api";

// Payment Modal Component
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: PricingPlan | null;
  billingCycle: "monthly" | "yearly";
  email: string;
  userId: string;
  isSubscribed: boolean;
  isInstaAccount: boolean;
  isgettingAcc: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentModal({
  isOpen,
  onClose,
  plan,
  billingCycle,
  email,
  userId,
  isSubscribed,
  isInstaAccount,
  isgettingAcc,
  onSuccess,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay">("razorpay");
  const razorpayplanId = useRef<string | null>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // Page‑specific styles
  const pageStyles = useMemo(
    () => ({
      dialogContent: isDark
        ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md"
        : "bg-white border border-gray-100 rounded-2xl p-0 overflow-hidden max-w-md",
      dialogHeader: "bg-gradient-to-r from-pink-500 to-rose-500 p-6",
      dialogTitle: "text-white text-xl font-bold flex items-center gap-2",
      dialogDesc: "text-pink-100 text-sm",
      contentContainer: "p-6 space-y-6",
      cardBg: isDark
        ? "bg-white/[0.03] border border-white/[0.06]"
        : "bg-gray-50 border border-gray-200",
      cardBorder: isDark ? "border-white/[0.08]" : "border-gray-100",
      planIcon: isDark
        ? "w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center"
        : "w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center",
      planIconColor: isDark ? "text-pink-400" : "text-pink-600",
      planName: isDark
        ? "font-semibold text-white"
        : "font-semibold text-gray-900",
      planBilling: isDark ? "text-white/40 text-xs" : "text-gray-500 text-xs",
      planBadge:
        "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0",
      separator: isDark ? "bg-white/[0.06]" : "bg-gray-200",
      priceRow: "flex items-center justify-between mt-3",
      priceLabel: isDark ? "text-white/40" : "text-gray-500",
      priceValue: isDark
        ? "font-semibold text-white"
        : "font-semibold text-gray-900",
      savingsBox: isDark
        ? "mt-2 bg-green-500/10 border border-green-500/20 rounded-lg p-2"
        : "mt-2 bg-green-50 border border-green-200 rounded-lg p-2",
      savingsText: isDark
        ? "text-green-400 text-xs flex items-center gap-1"
        : "text-green-600 text-xs flex items-center gap-1",
      methodTitle: isDark
        ? "text-white/40 text-sm font-medium"
        : "text-gray-500 text-sm font-medium",
      methodGrid: "grid grid-cols-2 gap-3",
      methodCard: (isSelected: boolean) =>
        isDark
          ? `rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all border-2 ${
              isSelected
                ? "border-pink-500 bg-pink-500/10"
                : "border-white/[0.08] hover:border-pink-500/50"
            }`
          : `rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all border-2 ${
              isSelected
                ? "border-pink-500 bg-pink-50"
                : "border-gray-200 hover:border-pink-300"
            }`,
      methodLabel: "text-xs font-medium text-gray-500",
      methodAmount: "text-lg font-bold text-gray-800",
      methodCurrency: "text-xs text-gray-400",
      securityBadge: "flex items-center justify-center gap-2",
      securityIcon: isDark ? "text-green-400" : "text-green-500",
      securityText: isDark ? "text-white/40 text-xs" : "text-gray-400 text-xs",
      buttonSubscribed:
        "w-full py-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed",
      buttonPayment: (disabled?: boolean) =>
        isDark
          ? `w-full py-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
          : `w-full py-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      buttonSignin:
        "w-full py-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold",
      buttonConnect:
        "w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold",
      buttonLater:
        "w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors",
      footerText: isDark
        ? "text-white/40 text-xs text-center"
        : "text-gray-400 text-xs text-center",
      connectIcon: isDark
        ? "w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-3"
        : "w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-3",
      connectIconColor: isDark ? "text-pink-400" : "text-pink-600",
      connectTitle: isDark
        ? "text-white font-semibold mb-2"
        : "text-gray-900 font-semibold mb-2",
      connectText: isDark
        ? "text-white/40 text-sm mb-4"
        : "text-gray-500 text-sm mb-4",
    }),
    [isDark],
  );

  if (!plan) return null;

  const price =
    billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const inrPrice = Math.round(price * 87);

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      // Get referral code from localStorage
      const referralCode = localStorage.getItem("referral_code");

      const result = await createRazorpaySubscription(apiRequest, {
        amount: price,
        razorpayplanId: razorpayplanId.current!,
        buyerId: userId,
        referralCode: referralCode || null,
        metadata: {
          productId: plan.id,
          subscriptionType: "insta",
          billingCycle,
        },
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: price * 100,
        currency: "INR",
        name: "AinpireTech",
        description: `${plan.name} Plan - ${billingCycle}`,
        subscription_id: result.subscriptionId,
        notes: {
          productId: plan.id,
          razorpayplanId: razorpayplanId.current,
          buyerId: userId,
          amount: price,
          referralCode: referralCode || "",
        },
        handler: async (response: any) => {
          const data = {
            subscription_id: result.subscriptionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          const verifyResponse = await verifyRazorpayPayment(apiRequest, data);

          if (verifyResponse.success) {
            toast.success("Payment Successful! Subscription activated");

            await updateUserLimits(apiRequest, plan.limit, plan.account);
            await sendSubscriptionEmailToOwner(apiRequest, {
              email: email,
              userId: userId,
              subscriptionId: result.subscriptionId,
            });
            await sendSubscriptionEmailToUser(apiRequest, {
              email: email,
              userId: userId,
              agentId: plan.id,
              subscriptionId: result.subscriptionId,
            });

            // Clear referral code after successful purchase
            if (referralCode) {
              localStorage.removeItem("referral_code");
            }

            onSuccess();
          } else {
            toast.error(
              "Payment verification failed: " + verifyResponse.message,
            );
          }
        },
        theme: {
          color: "#EC4899",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        toast.error("Payment failed: " + response.error.description);
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Checkout Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const onCheckout = async () => {
    try {
      setIsProcessing(true);

      // Fetch plan data
      const info = await getRazerpayPlanInfo(apiRequest, plan.id);
      if (!info.razorpaymonthlyplanId || !info.razorpayyearlyplanId) {
        router.push("/");
        throw new Error("Plan not found");
      }

      if (billingCycle === "monthly") {
        razorpayplanId.current = info.razorpaymonthlyplanId;
      } else if (billingCycle === "yearly") {
        razorpayplanId.current = info.razorpayyearlyplanId;
      } else {
        router.push("/");
        return;
      }

      onClose();
      await handleRazorpayPayment();
    } catch (error) {
      console.error("Error fetching plan info:", error);
      toast.error("Failed to initialize payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className={styles.dialogOverlay} />
          <DialogContent className={pageStyles.dialogContent}>
            {/* Header with gradient */}
            <div className={pageStyles.dialogHeader}>
              <DialogHeader>
                <DialogTitle className={pageStyles.dialogTitle}>
                  <Crown className="h-5 w-5" />
                  {isInstaAccount
                    ? "Complete Your Purchase"
                    : "Connect Instagram First"}
                </DialogTitle>
                <DialogDescription className={pageStyles.dialogDesc}>
                  {isInstaAccount
                    ? "Make a payment to activate your subscription"
                    : "Connect your Instagram account to proceed"}
                </DialogDescription>
              </DialogHeader>
            </div>

            {isInstaAccount ? (
              <div className={pageStyles.contentContainer}>
                {/* Plan Summary */}
                <div
                  className={`${pageStyles.cardBg} border ${pageStyles.cardBorder} rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={pageStyles.planIcon}>
                        <Sparkles
                          className={`h-4 w-4 ${pageStyles.planIconColor}`}
                        />
                      </div>
                      <div>
                        <h3 className={pageStyles.planName}>
                          {plan.name} Plan
                        </h3>
                        <p className={pageStyles.planBilling}>
                          {billingCycle} billing
                        </p>
                      </div>
                    </div>
                    <Badge className={pageStyles.planBadge}>
                      {billingCycle}
                    </Badge>
                  </div>

                  <Separator className={pageStyles.separator} />

                  <div className={pageStyles.priceRow}>
                    <span className={pageStyles.priceLabel}>Subtotal</span>
                    <span className={pageStyles.priceValue}>${price}</span>
                  </div>

                  {billingCycle === "yearly" && (
                    <div className={pageStyles.savingsBox}>
                      <p className={pageStyles.savingsText}>
                        <Calendar className="h-3 w-3" />
                        Save ${plan.monthlyPrice * 12 - plan.yearlyPrice} with
                        yearly billing
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <h4 className={pageStyles.methodTitle}>
                    Select Payment Method
                  </h4>

                  <div className={pageStyles.methodGrid}>
                    {/* International */}
                    <div
                      className={pageStyles.methodCard(
                        paymentMethod === "razorpay",
                      )}
                      onClick={() => setPaymentMethod("razorpay")}
                    >
                      <div className="flex items-center gap-2">
                        <span className={pageStyles.methodLabel}>
                          International
                        </span>
                      </div>
                      <span className={pageStyles.methodAmount}>${price}</span>
                      <span className={pageStyles.methodCurrency}>USD</span>
                    </div>

                    {/* India */}
                    <div
                      className={pageStyles.methodCard(
                        paymentMethod === "razorpay",
                      )}
                      onClick={() => setPaymentMethod("razorpay")}
                    >
                      <div className="flex items-center gap-2">
                        <span className={pageStyles.methodLabel}>India</span>
                      </div>
                      <span className={pageStyles.methodAmount}>
                        ₹{inrPrice}
                      </span>
                      <span className={pageStyles.methodCurrency}>INR</span>
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className={pageStyles.securityBadge}>
                  <Shield className={`h-4 w-4 ${pageStyles.securityIcon}`} />
                  <span className={pageStyles.securityText}>
                    256-bit secure payment
                  </span>
                </div>

                {/* Payment Button */}
                <SignedIn>
                  {isSubscribed ? (
                    <Button disabled className={pageStyles.buttonSubscribed}>
                      <Badge className="mr-2">✓</Badge>
                      Already Subscribed
                    </Button>
                  ) : (
                    <Button
                      className={pageStyles.buttonPayment(isProcessing)}
                      onClick={onCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" />
                          Pay with Razorpay
                        </>
                      )}
                    </Button>
                  )}
                </SignedIn>
                <SignedOut>
                  <Button
                    className={pageStyles.buttonSignin}
                    onClick={() =>
                      router.push("/sign-in?redirect_to=/insta/pricing")
                    }
                  >
                    Sign in to Continue
                  </Button>
                </SignedOut>

                <p className={pageStyles.footerText}>
                  Your subscription will be activated immediately after
                  successful payment. You can cancel anytime from your
                  dashboard.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="text-center py-4">
                  <div className={pageStyles.connectIcon}>
                    <Zap className={`h-8 w-8 ${pageStyles.connectIconColor}`} />
                  </div>
                  <h3 className={pageStyles.connectTitle}>
                    Connect Instagram Account
                  </h3>
                  <p className={pageStyles.connectText}>
                    You need to connect an Instagram Business account before
                    purchasing a subscription.
                  </p>
                </div>

                <Button
                  className={pageStyles.buttonConnect}
                  onClick={() => router.push("/insta/accounts/add")}
                >
                  Connect Instagram Account
                </Button>

                <button onClick={onClose} className={pageStyles.buttonLater}>
                  Maybe later
                </button>
              </div>
            )}
          </DialogContent>
        </DialogPrimitive.Portal>
      </Dialog>

      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
    </>
  );
}
