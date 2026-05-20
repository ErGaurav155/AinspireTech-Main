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
const PENDING_TEST_CHECKOUT_KEY = "pending_razorpay_test_checkout";

const isMobileCheckoutDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

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
    (payment: any) =>
      payment?.captured === true || payment?.status === "captured",
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
  const processedCallbackRef = useRef<string | null>(null);

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

  const markSuccessFromStatus = (status: any, label: string) => {
    if (!hasSuccessfulPayment(status)) return false;

    addEventLog(label, status);
    setFailureDebug(null);
    setResult(true);
    setIsProcessing(false);
    toast({
      title: "Payment successful",
      description: "Razorpay shows the UPI payment as captured.",
    });
    return true;
  };

  const pollRazorpayStatusForSuccess = async (
    id: string,
    label: string,
    attempts = 8,
  ) => {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      addEventLog(`${label}: status poll ${attempt}/${attempts}`, {
        subscriptionId: id,
      });
      const status = await checkRazorpayStatus(id);

      if (markSuccessFromStatus(status, `${label}: captured payment found`)) {
        return status;
      }

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return null;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && subscriptionIdRef.current) {
        void checkRazorpayStatus(subscriptionIdRef.current).then((status) =>
          markSuccessFromStatus(status, "Visible tab status check found success"),
        );
      }
    };

    const handleFocus = () => {
      if (subscriptionIdRef.current) {
        void checkRazorpayStatus(subscriptionIdRef.current).then((status) =>
          markSuccessFromStatus(status, "Window focus status check found success"),
        );
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      addEventLog("Page shown after external app/browser return", {
        persisted: event.persisted,
        visibilityState: document.visibilityState,
      });

      if (subscriptionIdRef.current) {
        void pollRazorpayStatusForSuccess(
          subscriptionIdRef.current,
          "Page return",
          4,
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isRazorpayCallback = searchParams.get("razorpay_checkout") === "1";
    const checkoutKind = searchParams.get("checkoutKind");
    const callbackSubscriptionId =
      searchParams.get("subscription_id") ||
      searchParams.get("razorpay_subscription_id");
    const pendingSubscriptionId =
      typeof window !== "undefined"
        ? sessionStorage.getItem(PENDING_TEST_CHECKOUT_KEY)
        : null;
    const targetSubscriptionId = callbackSubscriptionId || pendingSubscriptionId;

    if (
      !isRazorpayCallback ||
      checkoutKind !== "test-subscription" ||
      !targetSubscriptionId ||
      processedCallbackRef.current === targetSubscriptionId
    ) {
      return;
    }

    processedCallbackRef.current = targetSubscriptionId;
    subscriptionIdRef.current = targetSubscriptionId;
    setSubscriptionId(targetSubscriptionId);
    setIsProcessing(true);
    addEventLog("Razorpay mobile callback received", {
      checkoutKind,
      subscriptionId: targetSubscriptionId,
      razorpay_payment_id: searchParams.get("razorpay_payment_id"),
      hasSignature: !!searchParams.get("razorpay_signature"),
      fullUrl: window.location.href,
    });

    const processCallback = async () => {
      try {
        const paymentId = searchParams.get("razorpay_payment_id") || undefined;
        const signature = searchParams.get("razorpay_signature") || undefined;

        const verifyResponse = await verifyTestRazorpaySubscription(
          apiRequest,
          {
            subscription_id: targetSubscriptionId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
          },
        );

        addEventLog("Mobile callback verify API response", verifyResponse);

        if (verifyResponse.verified) {
          setFailureDebug(null);
          setResult(true);
          setIsProcessing(false);
          sessionStorage.removeItem(PENDING_TEST_CHECKOUT_KEY);
          toast({
            title: "Payment successful",
            description:
              verifyResponse.message || "Razorpay server verification passed.",
          });
          return;
        }

        await pollRazorpayStatusForSuccess(
          targetSubscriptionId,
          "Mobile callback",
          10,
        );
      } catch (error: any) {
        addEventLog("Mobile callback processing failed", {
          message: error.message,
          raw: error,
        });
        setResult(false);
        setIsProcessing(false);
      } finally {
        const cleanParams = new URLSearchParams(window.location.search);
        [
          "razorpay_checkout",
          "checkoutKind",
          "subscription_id",
          "razorpay_payment_id",
          "razorpay_signature",
        ].forEach((key) => cleanParams.delete(key));
        const cleanUrl = cleanParams.toString()
          ? `${window.location.pathname}?${cleanParams.toString()}`
          : window.location.pathname;
        router.replace(cleanUrl, { scroll: false });
      }
    };

    void processCallback();
  }, [apiRequest, router]);

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
      isMobileCheckoutDevice: isMobileCheckoutDevice(),
      userAgent: navigator.userAgent,
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
      sessionStorage.setItem(
        PENDING_TEST_CHECKOUT_KEY,
        subscriptionCreate.subscriptionId,
      );
      addEventLog("Test subscription created", subscriptionCreate);

      const callbackUrl = new URL(
        "/api/razorpay/checkout-callback",
        window.location.origin,
      );
      callbackUrl.searchParams.set("returnTo", "/subscription-test");
      callbackUrl.searchParams.set("kind", "test-subscription");
      callbackUrl.searchParams.set(
        "subscriptionId",
        subscriptionCreate.subscriptionId,
      );

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
        ...(isMobileCheckoutDevice()
          ? {
              callback_url: callbackUrl.toString(),
              redirect: true,
            }
          : {}),
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
            if (verifyResponse.verified) {
              sessionStorage.removeItem(PENDING_TEST_CHECKOUT_KEY);
            }
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

            if (
              markSuccessFromStatus(
                status,
                "Dismiss ignored: Razorpay payment is captured",
              )
            ) {
              sessionStorage.removeItem(PENDING_TEST_CHECKOUT_KEY);
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
        if (
          markSuccessFromStatus(status, "Failure ignored: captured immediately")
        ) {
          sessionStorage.removeItem(PENDING_TEST_CHECKOUT_KEY);
          return;
        }

        const polledStatus = await pollRazorpayStatusForSuccess(
          subscriptionCreate.subscriptionId,
          "Failure event",
          10,
        );

        if (hasSuccessfulPayment(polledStatus)) {
          sessionStorage.removeItem(PENDING_TEST_CHECKOUT_KEY);
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
