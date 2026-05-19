"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
import { Button, toast } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  createTestRazorpaySubscription,
  getTestRazorpaySubscriptionStatus,
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

interface CheckoutEventLog {
  at: string;
  label: string;
  details?: any;
}

const hasSuccessfulPayment = (status: any) =>
  status?.payments?.some(
    (payment: any) => payment?.captured === true || payment?.status === "captured",
  );

export default function SubscriptionTestPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [failureDebug, setFailureDebug] = useState<RazorpayFailureDebug | null>(
    null,
  );
  const [eventLogs, setEventLogs] = useState<CheckoutEventLog[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const subscriptionIdRef = useRef<string | null>(null);

  const addEventLog = (label: string, details?: any) => {
    setEventLogs((current) => [
      {
        at: new Date().toLocaleTimeString(),
        label,
        details,
      },
      ...current,
    ]);
  };

  const checkRazorpayStatus = async (id = subscriptionIdRef.current) => {
    if (!id) {
      addEventLog("Status check skipped: no subscription id");
      return null;
    }

    setIsCheckingStatus(true);

    try {
      addEventLog("Fetching Razorpay subscription/payment status", {
        subscriptionId: id,
      });
      const status = await getTestRazorpaySubscriptionStatus(apiRequest, id);
      setStatusResult(status);
      addEventLog("Razorpay status response", status);
      return status;
    } catch (error: any) {
      addEventLog("Razorpay status fetch failed", {
        message: error.message,
        raw: error,
      });
      toast({
        title: "Status check failed",
        description: error.message || "Could not fetch Razorpay status",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && subscriptionIdRef.current) {
        void checkRazorpayStatus(subscriptionIdRef.current);
      }
    };

    const handleFocus = () => {
      if (subscriptionIdRef.current) {
        void checkRazorpayStatus(subscriptionIdRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const openCheckout = async () => {
    if (!userId) {
      router.push("/sign-in?redirect_url=/subscription-test");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setFailureDebug(null);
    setStatusResult(null);
    setEventLogs([]);
    addEventLog("Checkout started with handler-only flow", {
      planId: TEST_PLAN_ID,
    });

    try {
      if (!window.Razorpay) {
        addEventLog("Loading Razorpay checkout.js");
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = RAZORPAY_SCRIPT_SRC;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load Razorpay script"));
          document.body.appendChild(script);
        });
        addEventLog("Razorpay checkout.js loaded");
      } else {
        addEventLog("Razorpay checkout.js already available");
      }

      const subscriptionCreate =
        await createTestRazorpaySubscription(apiRequest);
      setSubscriptionId(subscriptionCreate.subscriptionId);
      subscriptionIdRef.current = subscriptionCreate.subscriptionId;
      addEventLog("Test subscription created", subscriptionCreate);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        name: "RocketReplai",
        description: `Subscription test: ${TEST_PLAN_ID}`,
        subscription_id: subscriptionCreate.subscriptionId,
        payment_capture: "1",
        notes: {
          planId: TEST_PLAN_ID,
          testCheckout: "true",
        },
        handler: async (response: any) => {
          addEventLog("Razorpay handler fired", response);

          try {
            addEventLog("Calling verify API", {
              subscription_id: subscriptionCreate.subscriptionId,
              razorpay_payment_id: response.razorpay_payment_id,
              hasSignature: !!response.razorpay_signature,
            });

            const verifyResponse = await verifyTestRazorpaySubscription(
              apiRequest,
              {
                subscription_id: subscriptionCreate.subscriptionId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            );

            addEventLog("Verify API response", verifyResponse);
            await checkRazorpayStatus(subscriptionCreate.subscriptionId);
            setResult(verifyResponse.verified);
            toast({
              title: "Subscription verification result",
              description: String(verifyResponse.verified),
              variant: verifyResponse.verified ? "default" : "destructive",
            });
          } catch (error: any) {
            addEventLog("Verify API failed", {
              message: error.message,
              raw: error,
            });
            setResult(false);
            toast({
              title: "Verification request failed",
              description: error.message || "Could not call verify API",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: async () => {
            addEventLog("Razorpay modal dismissed");
            const status = await checkRazorpayStatus(
              subscriptionCreate.subscriptionId,
            );

            if (hasSuccessfulPayment(status)) {
              addEventLog("Dismiss ignored: Razorpay payment is captured");
              setResult(true);
              toast({
                title: "Payment successful",
                description: "Razorpay shows the UPI payment as captured.",
              });
              setIsProcessing(false);
              return;
            }

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
      addEventLog("Razorpay instance created");

      rzp.on("payment.failed", async (response: any) => {
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

        addEventLog("Razorpay payment.failed fired", debugInfo);
        const status = await checkRazorpayStatus(
          subscriptionCreate.subscriptionId,
        );

        if (hasSuccessfulPayment(status)) {
          addEventLog("Failure ignored: Razorpay payment is captured", {
            failure: debugInfo,
            status,
          });
          setFailureDebug(null);
          setResult(true);
          toast({
            title: "Payment successful",
            description:
              "Razorpay reported a checkout error, but the UPI payment is captured.",
          });
          setIsProcessing(false);
          return;
        }

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
      addEventLog("Razorpay checkout opened");
    } catch (error: any) {
      addEventLog("Checkout error", {
        message: error.message,
        raw: error,
      });
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
      {subscriptionId && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Test subscription id: {subscriptionId}
          </p>
          <Button
            onClick={() => checkRazorpayStatus(subscriptionId)}
            disabled={isCheckingStatus}
            className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black dark:bg-white/10 dark:hover:bg-white/20"
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Razorpay...
              </>
            ) : (
              "Check Razorpay Status"
            )}
          </Button>
        </div>
      )}

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

      {eventLogs.length > 0 && (
        <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-gray-900 shadow-sm dark:border-white/10 dark:bg-[#17171A] dark:text-gray-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Checkout event log</h2>
            <Button
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(eventLogs, null, 2),
                )
              }
              className="rounded-lg bg-gray-900 px-3 py-1 text-xs text-white hover:bg-black dark:bg-white/10 dark:hover:bg-white/20"
            >
              Copy Logs
            </Button>
          </div>
          <div className="space-y-3">
            {eventLogs.map((event, index) => (
              <div
                key={`${event.at}-${event.label}-${index}`}
                className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]"
              >
                <p className="font-medium">
                  {event.at} - {event.label}
                </p>
                {event.details !== undefined && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/80 p-2 text-xs text-white">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {statusResult && (
        <div className="w-full max-w-xl rounded-xl border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-950 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Razorpay backend status</h2>
            <Button
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(statusResult, null, 2),
                )
              }
              className="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
            >
              Copy Status
            </Button>
          </div>
          <p>
            <span className="font-medium">subscription.status:</span>{" "}
            {statusResult.subscription?.status || "-"}
          </p>
          <p>
            <span className="font-medium">payments:</span>{" "}
            {statusResult.payments?.length ?? 0}
          </p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/80 p-3 text-xs text-white">
            {JSON.stringify(statusResult, null, 2)}
          </pre>
        </div>
      )}

      <script id={RAZORPAY_SCRIPT_ID} src={RAZORPAY_SCRIPT_SRC} />
    </main>
  );
}
