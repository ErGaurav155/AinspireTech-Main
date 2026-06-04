"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Crown, Loader2, Phone } from "lucide-react";
import { Button, toast } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  createRazorpaySubscription,
  getRazerpayPlanInfo,
} from "@/lib/services/subscription-actions.api";
import { clearStoredReferralCode, getStoredReferralCode } from "@/lib/referral";

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface CallCheckoutProps {
  userId: string;
  productId: string;
  billingCycle: "monthly" | "yearly";
  amount: number;
  minutesLimit: number;
  concurrentCallLimit: number;
  agentLimit: number;
  overageRate: number;
  buttonText?: string;
  previousSubscriptionId?: string;
}

export function CallCheckout({
  userId,
  productId,
  billingCycle,
  amount,
  minutesLimit,
  concurrentCallLimit,
  agentLimit,
  overageRate,
  buttonText = "Subscribe",
  previousSubscriptionId,
}: CallCheckoutProps) {
  const router = useRouter();
  const { user } = useUser();
  const { apiRequest } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRazorpayScript = useCallback((): Promise<void> => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Payment checkout is not available"));
    }

    if ((window as any).Razorpay) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existingScript =
        document.getElementById(RAZORPAY_SCRIPT_ID) ||
        document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);

      const handleLoad = () => resolve();
      const handleError = () =>
        reject(new Error("Payment checkout failed to load"));

      if (existingScript) {
        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.body.appendChild(script);
    });
  }, []);

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await loadRazorpayScript();

      const planInfo = await getRazerpayPlanInfo(apiRequest, productId);
      const razorpayPlanId =
        billingCycle === "monthly"
          ? planInfo.razorpaymonthlyplanId
          : planInfo.razorpayyearlyplanId;

      if (!razorpayPlanId) {
        throw new Error("Razorpay plan is not configured for this call plan");
      }

      const referralCode = getStoredReferralCode();

      const result = await createRazorpaySubscription(apiRequest, {
        amount,
        razorpayplanId: razorpayPlanId,
        buyerId: userId,
        referralCode,
        metadata: {
          productId,
          subscriptionType: "call",
          billingCycle,
          previousSubscriptionId,
          previousSubscriptionType: previousSubscriptionId ? "call" : undefined,
          email: user?.primaryEmailAddress?.emailAddress || "",
          minutesLimit,
          numberLimit: concurrentCallLimit,
          concurrentCallLimit,
          agentLimit,
          overageRate,
          referralCode: referralCode || "",
        },
      });

      const paymentOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: amount * 100,
        currency: "INR",
        name: "RocketReplai",
        description: `${productId} - ${billingCycle}`,
        subscription_id: result.subscriptionId,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        notes: {
          productId,
          subscriptionType: "call",
          buyerId: userId,
          billingCycle,
          minutesLimit,
          numberLimit: concurrentCallLimit,
          concurrentCallLimit,
          agentLimit,
          overageRate,
        },
        handler: () => {
          clearStoredReferralCode();
          toast({
            title: "Payment received",
            description:
              "Your call assistant subscription will activate after Razorpay confirms it.",
          });
          router.push("/call");
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Checkout closed",
              description: "Payment was not completed.",
              variant: "destructive",
            });
          },
        },
        theme: { color: "#06B6D4" },
      };

      const razorpay = new (window as any).Razorpay(paymentOptions);
      razorpay.open();
    } catch (error: any) {
      console.error("Call checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error.message || "Could not start payment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCheckout} className="w-full">
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 font-bold text-black hover:opacity-90"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : buttonText.includes("Current") ? (
          <Crown className="mr-2 h-4 w-4" />
        ) : (
          <Phone className="mr-2 h-4 w-4" />
        )}
        {isSubmitting ? "Processing..." : buttonText}
      </Button>
    </form>
  );
}
