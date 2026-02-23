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
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Script from "next/script";
import { toast } from "sonner";
import { PricingPlan } from "@rocketreplai/shared";
import { useApi } from "@/lib/useApi";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Separator } from "@rocketreplai/ui/components/radix/separator";
import { Button } from "@rocketreplai/ui/components/radix/button";

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
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      dialogBg: isDark ? "bg-[#1A1A1E]" : "bg-white",
      dialogBorder: isDark ? "border-gray-800" : "border-gray-100",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-500",
      textMuted: isDark ? "text-gray-500" : "text-gray-400",
      cardBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      cardBorder: isDark ? "border-gray-700" : "border-gray-200",
      separatorBg: isDark ? "bg-gray-800" : "bg-gray-200",
      hoverBorder: isDark
        ? "hover:border-pink-500/50"
        : "hover:border-pink-300",
    };
  }, [currentTheme]);

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
        <DialogContent
          className={`max-w-md ${themeStyles.dialogBg} border ${themeStyles.dialogBorder} rounded-2xl p-0 overflow-hidden`}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {isInstaAccount
                  ? "Complete Your Purchase"
                  : "Connect Instagram First"}
              </DialogTitle>
              <DialogDescription className="text-pink-100 text-sm">
                {isInstaAccount
                  ? "Make a payment to activate your subscription"
                  : "Connect your Instagram account to proceed"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {isInstaAccount ? (
            <div className="p-6 space-y-6">
              {/* Plan Summary */}
              <div
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-xl p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-pink-600" />
                    </div>
                    <div>
                      <h3
                        className={`font-semibold ${themeStyles.textPrimary}`}
                      >
                        {plan.name} Plan
                      </h3>
                      <p className={`text-xs ${themeStyles.textSecondary}`}>
                        {billingCycle} billing
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0">
                    {billingCycle}
                  </Badge>
                </div>

                <Separator className={themeStyles.separatorBg} />

                <div className="flex items-center justify-between mt-3">
                  <span className={themeStyles.textSecondary}>Subtotal</span>
                  <span className={`font-semibold ${themeStyles.textPrimary}`}>
                    ${price}
                  </span>
                </div>

                {billingCycle === "yearly" && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Save ${plan.monthlyPrice * 12 - plan.yearlyPrice} with
                      yearly billing
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h4
                  className={`text-sm font-medium ${themeStyles.textSecondary}`}
                >
                  Select Payment Method
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {/* International */}
                  <div
                    className={`rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all border-2 ${
                      paymentMethod === "razorpay"
                        ? "border-pink-500 bg-pink-50"
                        : `${themeStyles.cardBorder} ${themeStyles.hoverBorder}`
                    }`}
                    onClick={() => setPaymentMethod("razorpay")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        International
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-800">
                      ${price}
                    </span>
                    <span className="text-xs text-gray-400">USD</span>
                  </div>

                  {/* India */}
                  <div
                    className={`rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all border-2 ${
                      paymentMethod === "razorpay"
                        ? "border-pink-500 bg-pink-50"
                        : `${themeStyles.cardBorder} ${themeStyles.hoverBorder}`
                    }`}
                    onClick={() => setPaymentMethod("razorpay")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        India
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-800">
                      ₹{inrPrice}
                    </span>
                    <span className="text-xs text-gray-400">INR</span>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-xs text-gray-400">
                  256-bit secure payment
                </span>
              </div>

              {/* Payment Button */}
              <SignedIn>
                {isSubscribed ? (
                  <Button
                    disabled
                    className="w-full py-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed"
                  >
                    <Badge className="mr-2">✓</Badge>
                    Already Subscribed
                  </Button>
                ) : (
                  <Button
                    className="w-full py-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold"
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
                  className="w-full py-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold"
                  onClick={() =>
                    router.push("/sign-in?redirect_to=/insta/pricing")
                  }
                >
                  Sign in to Continue
                </Button>
              </SignedOut>

              <p className={`text-xs ${themeStyles.textMuted} text-center`}>
                Your subscription will be activated immediately after successful
                payment. You can cancel anytime from your dashboard.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-8 w-8 text-pink-600" />
                </div>
                <h3 className={`font-semibold ${themeStyles.textPrimary} mb-2`}>
                  Connect Instagram Account
                </h3>
                <p className={`text-sm ${themeStyles.textSecondary} mb-4`}>
                  You need to connect an Instagram Business account before
                  purchasing a subscription.
                </p>
              </div>

              <Button
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold"
                onClick={() => router.push("/insta/accounts/add")}
              >
                Connect Instagram Account
              </Button>

              <button
                onClick={onClose}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
    </>
  );
}
