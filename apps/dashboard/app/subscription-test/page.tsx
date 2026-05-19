"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
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

interface RazorpayFailureDebug {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  orderId?: string;
  paymentId?: string;
  raw: any;
}

export default function SubscriptionTestPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [failureDebug, setFailureDebug] =
    useState<RazorpayFailureDebug | null>(null);

  const openCheckout = async () => {
    if (!userId) {
      router.push("/sign-in?redirect_url=/subscription-test");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setFailureDebug(null);

    try {
      // Dynamically load Razorpay checkout script if not already loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = RAZORPAY_SCRIPT_SRC;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load Razorpay script"));
          document.body.appendChild(script);
        });
      }

      // Create subscription on backend
      const subscriptionCreate =
        await createTestRazorpaySubscription(apiRequest);

      // Razorpay checkout options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        name: "RocketReplai",
        description: `Subscription test: ${TEST_PLAN_ID}`,
        subscription_id: subscriptionCreate.subscriptionId,
        notes: {
          planId: TEST_PLAN_ID,
          testCheckout: "true",
        },
        handler: async (response: any) => {
          // Verify payment immediately after success
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
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setResult(false);
            toast({
              title: "Payment cancelled",
              description: "You cancelled the payment.",
              variant: "destructive",
            });
            setIsProcessing(false);
          },
        },
        theme: { color: "#EC4899" },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response: any) => {
        const debugInfo: RazorpayFailureDebug = {
          code: response.error?.code,
          description: response.error?.description,
          source: response.error?.source,
          step: response.error?.step,
          reason: response.error?.reason,
          orderId: response.error?.metadata?.order_id,
          paymentId: response.error?.metadata?.payment_id,
          raw: response,
        };

        setFailureDebug(debugInfo);
        setResult(false);
        toast({
          title: "Payment failed",
          description:
            response.error?.description || "Payment could not be completed",
          variant: "destructive",
        });
        setIsProcessing(false);
      });

      rzp.open();
    } catch (error: any) {
      setResult(false);
      toast({
        title: "Error",
        description:
          error.message || "Something went wrong while processing payment.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const copyFailureDebug = async () => {
    if (!failureDebug) return;

    await navigator.clipboard.writeText(JSON.stringify(failureDebug, null, 2));
    toast({
      title: "Copied",
      description: "Razorpay failure details copied.",
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F9FA] px-4 py-8 dark:bg-[#0F0F11]">
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

      {failureDebug && (
        <div className="w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-950 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Razorpay payment.failed error</h2>
            <Button
              onClick={copyFailureDebug}
              className="rounded-lg bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
            >
              Copy
            </Button>
          </div>
          <div className="grid gap-2">
            <p>
              <span className="font-medium">code:</span>{" "}
              {failureDebug.code || "-"}
            </p>
            <p>
              <span className="font-medium">description:</span>{" "}
              {failureDebug.description || "-"}
            </p>
            <p>
              <span className="font-medium">source:</span>{" "}
              {failureDebug.source || "-"}
            </p>
            <p>
              <span className="font-medium">step:</span>{" "}
              {failureDebug.step || "-"}
            </p>
            <p>
              <span className="font-medium">reason:</span>{" "}
              {failureDebug.reason || "-"}
            </p>
            <p>
              <span className="font-medium">metadata.order_id:</span>{" "}
              {failureDebug.orderId || "-"}
            </p>
            <p>
              <span className="font-medium">metadata.payment_id:</span>{" "}
              {failureDebug.paymentId || "-"}
            </p>
          </div>
          <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-black/80 p-3 text-xs text-white">
            {JSON.stringify(failureDebug.raw, null, 2)}
          </pre>
        </div>
      )}

      <Script id={RAZORPAY_SCRIPT_ID} src={RAZORPAY_SCRIPT_SRC} />
    </main>
  );
}
