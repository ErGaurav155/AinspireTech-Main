"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
import { Button, toast } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  createTestRazorpayOrder,
  getTestRazorpayOrderStatus,
  verifyTestRazorpayOrder,
} from "@/lib/services/subscription-actions.api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const PENDING_TEST_ORDER_KEY = "pending_razorpay_test_order";

interface CheckoutEventLog {
  at: string;
  label: string;
  details?: any;
}

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

const isCapturedPayment = (payment: any) =>
  payment?.captured === true || payment?.status === "captured";

const hasSuccessfulOrderPayment = (status: any) =>
  status?.order?.status === "paid" || isCapturedPayment(status?.latestPayment);

export default function SubscriptionTestPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [failureDebug, setFailureDebug] =
    useState<RazorpayFailureDebug | null>(null);
  const [eventLogs, setEventLogs] = useState<CheckoutEventLog[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const orderIdRef = useRef<string | null>(null);
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

  const loadRazorpayScript = async () => {
    if (window.Razorpay) {
      addEventLog("Razorpay checkout.js already available");
      return;
    }

    addEventLog("Loading Razorpay checkout.js");
    await new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID);

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Razorpay script")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = RAZORPAY_SCRIPT_SRC;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Razorpay script"));
      document.body.appendChild(script);
    });
    addEventLog("Razorpay checkout.js loaded");
  };

  const checkRazorpayOrderStatus = async (id = orderIdRef.current) => {
    if (!id) {
      addEventLog("Order status check skipped: no order id");
      return null;
    }

    setIsCheckingStatus(true);

    try {
      addEventLog("Fetching Razorpay order/payment status", { orderId: id });
      const status = await getTestRazorpayOrderStatus(apiRequest, id);
      setStatusResult(status);
      addEventLog("Razorpay order status response", status);
      return status;
    } catch (error: any) {
      addEventLog("Razorpay order status fetch failed", {
        message: error.message,
        raw: error,
      });
      toast({
        title: "Order status check failed",
        description: error.message || "Could not fetch Razorpay order status",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const markOrderSuccessFromStatus = (status: any, label: string) => {
    if (!hasSuccessfulOrderPayment(status)) return false;

    addEventLog(label, status);
    setFailureDebug(null);
    setResult(true);
    setIsProcessing(false);
    sessionStorage.removeItem(PENDING_TEST_ORDER_KEY);
    toast({
      title: "Payment successful",
      description: "Razorpay shows the order payment as captured.",
    });
    return true;
  };

  const pollRazorpayOrderStatusForSuccess = async (
    id: string,
    label: string,
    attempts = 10,
  ) => {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      addEventLog(`${label}: order status poll ${attempt}/${attempts}`, {
        orderId: id,
      });
      const status = await checkRazorpayOrderStatus(id);

      if (markOrderSuccessFromStatus(status, `${label}: captured order found`)) {
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
      if (document.visibilityState === "visible" && orderIdRef.current) {
        void checkRazorpayOrderStatus(orderIdRef.current).then((status) =>
          markOrderSuccessFromStatus(
            status,
            "Visible tab status check found success",
          ),
        );
      }
    };

    const handleFocus = () => {
      if (orderIdRef.current) {
        void checkRazorpayOrderStatus(orderIdRef.current).then((status) =>
          markOrderSuccessFromStatus(
            status,
            "Window focus status check found success",
          ),
        );
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      addEventLog("Page shown after external app/browser return", {
        persisted: event.persisted,
        visibilityState: document.visibilityState,
      });

      if (orderIdRef.current) {
        void pollRazorpayOrderStatusForSuccess(orderIdRef.current, "Page return");
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
    const callbackOrderId =
      searchParams.get("order_id") || searchParams.get("razorpay_order_id");
    const pendingOrderId = sessionStorage.getItem(PENDING_TEST_ORDER_KEY);
    const targetOrderId = callbackOrderId || pendingOrderId;

    if (
      !isRazorpayCallback ||
      checkoutKind !== "test-order" ||
      !targetOrderId ||
      processedCallbackRef.current === targetOrderId
    ) {
      return;
    }

    processedCallbackRef.current = targetOrderId;
    orderIdRef.current = targetOrderId;
    setOrderId(targetOrderId);
    setIsProcessing(true);
    addEventLog("Razorpay order mobile callback received", {
      checkoutKind,
      orderId: targetOrderId,
      razorpay_payment_id: searchParams.get("razorpay_payment_id"),
      hasSignature: !!searchParams.get("razorpay_signature"),
      fullUrl: window.location.href,
    });

    const processCallback = async () => {
      try {
        const paymentId = searchParams.get("razorpay_payment_id") || undefined;
        const signature = searchParams.get("razorpay_signature") || undefined;

        const verifyResponse = await verifyTestRazorpayOrder(apiRequest, {
          razorpay_order_id: targetOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });

        addEventLog("Mobile callback verify API response", verifyResponse);

        if (verifyResponse.verified) {
          setFailureDebug(null);
          setResult(true);
          setIsProcessing(false);
          sessionStorage.removeItem(PENDING_TEST_ORDER_KEY);
          toast({
            title: "Payment successful",
            description: "Razorpay order verification passed.",
          });
          return;
        }

        await pollRazorpayOrderStatusForSuccess(
          targetOrderId,
          "Mobile callback",
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
          "order_id",
          "razorpay_order_id",
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

  const openOrderCheckout = async () => {
    if (!userId) {
      router.push("/sign-in?redirect_url=/subscription-test");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setFailureDebug(null);
    setStatusResult(null);
    setEventLogs([]);
    addEventLog("Order checkout started", {
      userAgent: navigator.userAgent,
    });

    try {
      await loadRazorpayScript();

      const orderCreate = await createTestRazorpayOrder(apiRequest);
      setOrderId(orderCreate.orderId);
      orderIdRef.current = orderCreate.orderId;
      sessionStorage.setItem(PENDING_TEST_ORDER_KEY, orderCreate.orderId);
      addEventLog("Test order created", orderCreate);

      const callbackUrl = new URL(
        "/api/razorpay/checkout-callback",
        window.location.origin,
      );
      callbackUrl.searchParams.set("returnTo", "/subscription-test");
      callbackUrl.searchParams.set("kind", "test-order");
      callbackUrl.searchParams.set("orderId", orderCreate.orderId);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: orderCreate.amount,
        currency: orderCreate.currency,
        name: "RocketReplai",
        description: "Test Transaction",
        order_id: orderCreate.orderId,
        callback_url: callbackUrl.toString(),
        redirect: true,
        notes: {
          testCheckout: "true",
          checkoutKind: "test-order",
        },
        handler: async (response: any) => {
          addEventLog("Razorpay handler fired", response);

          try {
            const verifyResponse = await verifyTestRazorpayOrder(apiRequest, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            addEventLog("Verify API response", verifyResponse);
            await checkRazorpayOrderStatus(orderCreate.orderId);
            setResult(verifyResponse.verified);

            if (verifyResponse.verified) {
              sessionStorage.removeItem(PENDING_TEST_ORDER_KEY);
            }

            toast({
              title: "Payment verification result",
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
              title: "Payment verification failed",
              description: error.message || "Could not verify payment",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: async () => {
            addEventLog("Razorpay modal dismissed");
            const status = await checkRazorpayOrderStatus(orderCreate.orderId);

            if (
              markOrderSuccessFromStatus(
                status,
                "Dismiss ignored: order payment is captured",
              )
            ) {
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
        theme: {
          color: "#F37254",
        },
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
        const status = await checkRazorpayOrderStatus(orderCreate.orderId);

        if (
          markOrderSuccessFromStatus(
            status,
            "Failure ignored: order payment is captured",
          )
        ) {
          return;
        }

        await pollRazorpayOrderStatusForSuccess(
          orderCreate.orderId,
          "Failure event",
        );

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
        onClick={openOrderCheckout}
        disabled={isProcessing}
        className="rounded-xl bg-orange-500 px-6 py-3 text-white hover:bg-orange-600"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Open Razorpay Order Checkout
          </>
        )}
      </Button>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Payment success: {result === null ? "-" : String(result)}
      </p>

      {orderId && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Test order id: {orderId}
          </p>
          <Button
            onClick={() => checkRazorpayOrderStatus(orderId)}
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
            <span className="font-medium">order.status:</span>{" "}
            {statusResult.order?.status || "-"}
          </p>
          <p>
            <span className="font-medium">latestPayment.status:</span>{" "}
            {statusResult.latestPayment?.status || "-"}
          </p>
          <p>
            <span className="font-medium">latestPayment.captured:</span>{" "}
            {statusResult.latestPayment
              ? String(statusResult.latestPayment.captured)
              : "-"}
          </p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/80 p-3 text-xs text-white">
            {JSON.stringify(statusResult, null, 2)}
          </pre>
        </div>
      )}

      <Script id={RAZORPAY_SCRIPT_ID} src={RAZORPAY_SCRIPT_SRC} />
    </main>
  );
}
