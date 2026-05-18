"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { Button, toast } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  createTestRazorpaySubscription,
  verifyTestRazorpaySubscription,
} from "@/lib/services/subscription-actions.api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const TEST_PLAN_ID = "plan_SqlXUaV8XVVnSr";
const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export default function SubscriptionTestPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const openCheckout = async () => {
    if (!userId) {
      router.push("/sign-in?redirect_url=/subscription-test");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout script is still loading");
      }

      const subscriptionCreate =
        await createTestRazorpaySubscription(apiRequest);

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        name: "RocketReplai",
        description: `Subscription test: ${TEST_PLAN_ID}`,
        subscription_id: subscriptionCreate.subscriptionId,
        notes: {
          planId: TEST_PLAN_ID,
          testCheckout: "true",
        },
        handler: async (response: any) => {
          const verifyResponse = await verifyTestRazorpaySubscription(
            apiRequest,
            {
              subscription_id: subscriptionCreate.subscriptionId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          );

          setResult(verifyResponse.verified);
          toast({
            title: "Subscription verification result",
            description: String(verifyResponse.verified),
            variant: verifyResponse.verified ? "default" : "destructive",
          });
        },
        theme: { color: "#EC4899" },
      });

      razorpay.on("payment.failed", () => {
        setResult(false);
        toast({
          title: "Subscription verification result",
          description: "false",
          variant: "destructive",
        });
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Subscription test checkout error:", error);
      setResult(false);
      toast({
        title: "Subscription test failed",
        description: error.message || "Unable to open checkout",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F9FA] px-4 dark:bg-[#0F0F11]">
      <Button
        onClick={openCheckout}
        disabled={isProcessing}
        className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 text-white"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Open Razorpay Checkout
          </>
        )}
      </Button>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Subscription success: {result === null ? "-" : String(result)}
      </p>

      <Script id={RAZORPAY_SCRIPT_ID} src={RAZORPAY_SCRIPT_SRC} />
    </main>
  );
}
