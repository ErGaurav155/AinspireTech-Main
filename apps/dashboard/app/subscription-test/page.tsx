"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, toast } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const TEST_PLAN_ID = "plan_SqlXUaV8XVVnSr";
const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const isMobileCheckoutDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

export default function SubscriptionTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const verifySubscription = useCallback(
    async ({
      subscriptionId,
      paymentId,
      signature,
    }: {
      subscriptionId: string;
      paymentId?: string | null;
      signature?: string | null;
    }) => {
      const verifyResult = await apiRequest<{
        verified: boolean;
        subscriptionId?: string;
        paymentId?: string;
        message?: string;
      }>("/razorpay/test-subscription/verify", {
        method: "POST",
        body: JSON.stringify({
          subscription_id: subscriptionId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      });

      setResult(verifyResult.verified);
      toast({
        title: "Subscription verification result",
        description: String(verifyResult.verified),
        variant: verifyResult.verified ? "default" : "destructive",
      });
    },
    [apiRequest],
  );

  useEffect(() => {
    const subscriptionId = searchParams.get("subscription_id");

    if (searchParams.get("razorpay_checkout") !== "1" || !subscriptionId) {
      return;
    }

    setIsLoading(true);
    void verifySubscription({
      subscriptionId,
      paymentId: searchParams.get("razorpay_payment_id"),
      signature: searchParams.get("razorpay_signature"),
    }).finally(() => {
      setIsLoading(false);
      router.replace("/subscription-test", { scroll: false });
    });
  }, [router, searchParams, verifySubscription]);

  const openCheckout = async () => {
    if (!userId) {
      router.push("/sign-in?redirect_url=/subscription-test");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout script is still loading");
      }

      const createResult = await apiRequest<{
        subscriptionId: string;
        planId: string;
      }>("/razorpay/test-subscription/create", {
        method: "POST",
      });

      const callbackUrl = new URL(
        "/api/razorpay/checkout-callback",
        window.location.origin,
      );
      callbackUrl.searchParams.set("returnTo", "/subscription-test");
      callbackUrl.searchParams.set("kind", "test");
      callbackUrl.searchParams.set("subscriptionId", createResult.subscriptionId);
      callbackUrl.searchParams.set("productId", "subscription-test");
      callbackUrl.searchParams.set("billingCycle", "monthly");
      callbackUrl.searchParams.set("razorpay_checkout", "1");

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        name: "RocketReplai",
        description: `Subscription test: ${TEST_PLAN_ID}`,
        subscription_id: createResult.subscriptionId,
        notes: {
          planId: TEST_PLAN_ID,
          testCheckout: "true",
        },
        handler: async (response: any) => {
          await verifySubscription({
            subscriptionId: createResult.subscriptionId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        ...(isMobileCheckoutDevice()
          ? {
              callback_url: callbackUrl.toString(),
              redirect: true,
            }
          : {}),
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
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F9FA] px-4 dark:bg-[#0F0F11]">
      <Button
        onClick={openCheckout}
        disabled={isLoading}
        className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 text-white"
      >
        {isLoading ? (
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
