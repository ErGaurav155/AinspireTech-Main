"use client";

import { useMemo, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

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
import Script from "next/script";
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
  onSuccess: (newSubscription: any) => void;
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
      dialogBg: isDark ? "bg-[#0a0a0a]/95" : "bg-white/95",
      dialogBorder: isDark ? "border-white/10" : "border-gray-200",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      cardBg: isDark ? "bg-[#1a1a1a]/50" : "bg-gray-100/50",
      cardBorder: isDark ? "border-[#333]" : "border-gray-300",
      separatorBg: isDark ? "bg-[#333]" : "bg-gray-300",
      hoverBorder: isDark
        ? "hover:border-[#00F0FF]/50"
        : "hover:border-[#00F0FF]",
    };
  }, [currentTheme]);
  if (!plan) return null;

  const price =
    billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const inrPrice = Math.round(price * 87);

  // Add this function to your existing PaymentModal component
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
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: price * 100,
        currency: "INR",
        name: "GK Services",
        description: `${plan.name} Plan - ${billingCycle}`,
        subscription_id: result.subscriptionId,
        notes: {
          productId: plan.id,
          razorpayplanId: razorpayplanId.current,
          buyerId: userId,
          amount: price,
          referralCode: referralCode || "", // Add to notes
        },
        handler: async (response: any) => {
          const data = {
            subscription_id: result.subscriptionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          const verifyResponse = await verifyRazorpayPayment(apiRequest, data);
          if (verifyResponse.success) {
            toast.success("Payment Successful! Code added to your Dashboard");

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
            onSuccess(plan.id);

            // Clear referral code after successful purchase
            if (referralCode) {
              localStorage.removeItem("referral_code");
            }

            router.push("/insta/dashboard");
          } else {
            toast.error("Order canceled! " + verifyResponse.message);
          }
        },
        theme: {
          color: "#2563eb",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        toast.error("Order failed! " + response.error.description);
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
        return false;
      }
    } catch (error) {
      console.error("Error fetching plan info:", error);
      return false;
    } finally {
      setIsProcessing(false);
      onClose();
      await handleRazorpayPayment();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-md ${themeStyles.dialogBg} backdrop-blur-lg border ${themeStyles.dialogBorder} rounded-xl`}
        >
          <DialogHeader>
            <DialogTitle
              className={`text-center font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF] ${themeStyles.textPrimary}`}
            >
              {isInstaAccount ? "Step-2: Payment" : "Step-1: Connect Instagram"}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className={themeStyles.textSecondary}>
            {isInstaAccount
              ? "Make an instant payment to activate your subscription and elevate your Instagram engagement!"
              : "Please connect your Instagram Business account to proceed with the payment."}
          </DialogDescription>

          {isInstaAccount ? (
            <div className="space-y-6">
              {/* Plan Summary */}
              <div
                className={`${themeStyles.cardBg} backdrop-blur-sm p-4 rounded-xl border ${themeStyles.cardBorder}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${themeStyles.textSecondary}`}>
                    {plan.name} Plan
                  </span>
                  <Badge className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white">
                    {billingCycle}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xl font-bold mt-4">
                  <span className={themeStyles.textSecondary}>Total</span>
                  <span className={themeStyles.textPrimary}>${price}</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-green-400 mt-3 font-medium">
                    Save ${plan.monthlyPrice * 12 - plan.yearlyPrice} with
                    yearly billing
                  </p>
                )}
              </div>

              <Separator className={themeStyles.separatorBg} />

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <h3
                  className={`font-medium ${themeStyles.textSecondary} text-center`}
                >
                  Price in <span className="text-[#00F0FF]">USD</span> and{" "}
                  <span className="text-[#B026FF]">INR</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 border ${
                      paymentMethod === "razorpay"
                        ? "border-[#00F0FF] bg-[#00F0FF]/10"
                        : `${themeStyles.cardBorder} ${themeStyles.hoverBorder}`
                    }`}
                    onClick={() => setPaymentMethod("razorpay")}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${themeStyles.textSecondary}`}
                      >
                        International
                      </span>
                    </div>
                    <span
                      className={`text-md font-medium ${themeStyles.textPrimary} mt-2`}
                    >
                      Razorpay
                    </span>
                    <span className={`font-bold ${themeStyles.textPrimary}`}>
                      ${price}
                    </span>
                  </div>

                  <div
                    className={`rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 border ${
                      paymentMethod === "razorpay"
                        ? "border-[#00F0FF] bg-[#00F0FF]/10"
                        : `${themeStyles.cardBorder} ${themeStyles.hoverBorder}`
                    }`}
                    onClick={() => setPaymentMethod("razorpay")}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${themeStyles.textSecondary}`}
                      >
                        India
                      </span>
                    </div>
                    <span
                      className={`text-md font-medium ${themeStyles.textPrimary} mt-2`}
                    >
                      Razorpay
                    </span>
                    <span className={`font-bold ${themeStyles.textPrimary}`}>
                      ₹{inrPrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <SignedIn>
                {isSubscribed ? (
                  <Button className="w-full py-6 rounded-full font-bold text-lg bg-gradient-to-r from-[#33e49d] to-[#044624] hover:from-[#79b59b]/90 hover:to-[#30d472]/90">
                    Subscribed
                  </Button>
                ) : (
                  <Button
                    className="w-full py-6 rounded-full font-bold text-lg bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF]/90 hover:to-[#B026FF]/90"
                    onClick={() => {
                      onCheckout();
                    }}
                    disabled={isProcessing}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {isProcessing
                      ? "Processing..."
                      : isInstaAccount
                        ? `Pay with Razorpay`
                        : "Connect Instagram "}
                  </Button>
                )}
              </SignedIn>
              <SignedOut>
                <Button
                  className="w-full min-w- py-6 rounded-full font-bold text-lg bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF]/90 hover:to-[#B026FF]/90"
                  onClick={() => {
                    router.push("/sign-in?redirect_to=/pricing");
                  }}
                >
                  Sign-in
                </Button>
              </SignedOut>
              {isSubscribed ? (
                <p
                  className={`text-xs ${themeStyles.textMuted} text-center px-4`}
                >
                  Your subscription will be activated immediately after
                  successful payment. You can cancel anytime from your
                  dashboard.
                </p>
              ) : (
                <p
                  className={`text-xs ${themeStyles.textMuted} text-center px-4`}
                >
                  You had already take one of those subscription.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4">
              <p className={`${themeStyles.textSecondary} mb-4`}>
                You need to connect an Instagram account before purchasing a
                subscription.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white"
                onClick={() => router.push("/insta/accounts/add")}
              >
                Connect Instagram Account
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <Script
          id="razorpay-checkout-js"
          src="https://checkout.razorpay.com/v1/checkout.js"
        />
      </div>
    </>
  );
}
