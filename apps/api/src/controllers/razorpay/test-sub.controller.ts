import { Request, Response } from "express";
import crypto from "crypto";
import { getAuth } from "@clerk/express";
import { getRazorpay } from "@/utils/util";

const TEST_RAZORPAY_PLAN_ID = "plan_SqlXUaV8XVVnSr";
const PAID_TEST_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "authenticated",
  "charged",
  "completed",
]);

const isCapturedPayment = (payment: any) =>
  payment?.captured === true || payment?.status === "captured";

const sortPaymentsByNewest = (payments: any[] = []) =>
  [...payments].sort((a, b) => (b?.created_at || 0) - (a?.created_at || 0));

const fetchTestSubscriptionStatus = async (
  razorpay: ReturnType<typeof getRazorpay>,
  subscriptionId: string,
) => {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);
  const paymentResponse = await razorpay.payments.all({
    subscription_id: subscriptionId,
    count: 10,
  } as any);
  const payments = sortPaymentsByNewest(paymentResponse.items || []);

  return {
    subscription,
    payments,
    latestPayment: payments[0],
  };
};

const reconcileAuthorizedTestPayment = async (
  razorpay: ReturnType<typeof getRazorpay>,
  subscriptionId: string,
) => {
  const initialStatus = await fetchTestSubscriptionStatus(
    razorpay,
    subscriptionId,
  );
  const latestPayment = initialStatus.latestPayment;
  let captureAttempt: any = null;

  if (
    latestPayment?.status === "authorized" &&
    latestPayment?.captured !== true
  ) {
    try {
      const capturedPayment = await razorpay.payments.capture(
        latestPayment.id,
        latestPayment.amount,
        latestPayment.currency,
      );

      captureAttempt = {
        attempted: true,
        success: isCapturedPayment(capturedPayment),
        paymentId: capturedPayment.id,
        status: capturedPayment.status,
        captured: capturedPayment.captured,
      };
    } catch (error: any) {
      captureAttempt = {
        attempted: true,
        success: false,
        paymentId: latestPayment.id,
        message: error.message,
        error: error.error || error,
      };
    }
  }

  const finalStatus = captureAttempt?.success
    ? await fetchTestSubscriptionStatus(razorpay, subscriptionId)
    : initialStatus;

  return {
    ...finalStatus,
    captureAttempt,
  };
};

const isReconciledTestPaymentSuccessful = (status: {
  subscription: any;
  latestPayment?: any;
}) =>
  PAID_TEST_SUBSCRIPTION_STATUSES.has(status.subscription?.status) ||
  isCapturedPayment(status.latestPayment);

const buildTestStatusResponse = (status: {
  subscription: any;
  payments: any[];
  latestPayment?: any;
  captureAttempt?: any;
}) => ({
  subscription: {
    id: status.subscription.id,
    status: status.subscription.status,
    plan_id: status.subscription.plan_id,
    current_start: status.subscription.current_start,
    current_end: status.subscription.current_end,
    charge_at: status.subscription.charge_at,
    paid_count: status.subscription.paid_count,
    remaining_count: status.subscription.remaining_count,
    notes: status.subscription.notes,
  },
  latestPayment: status.latestPayment
    ? {
        id: status.latestPayment.id,
        order_id: status.latestPayment.order_id,
        status: status.latestPayment.status,
        method: status.latestPayment.method,
        amount: status.latestPayment.amount,
        currency: status.latestPayment.currency,
        captured: status.latestPayment.captured,
        created_at: status.latestPayment.created_at,
      }
    : null,
  captureAttempt: status.captureAttempt || null,
  payments: status.payments?.map((payment: any) => ({
    id: payment.id,
    order_id: payment.order_id,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    error_code: payment.error_code,
    error_description: payment.error_description,
    error_source: payment.error_source,
    error_step: payment.error_step,
    error_reason: payment.error_reason,
    created_at: payment.created_at,
    captured: payment.captured,
    notes: payment.notes,
  })),
});

export const createTestRazorpaySubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const razorpay = getRazorpay();
    const subscription = await razorpay.subscriptions.create({
      plan_id: TEST_RAZORPAY_PLAN_ID,
      total_count: 12,
      customer_notify: 1 as 0 | 1,
      notes: {
        buyerId: userId,
        productId: "subscription-test",
        testCheckout: "true",
      },
    });

    console.log("Test Razorpay subscription created:", {
      userId,
      subscriptionId: subscription.id,
      planId: TEST_RAZORPAY_PLAN_ID,
      status: subscription.status,
    });

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        planId: TEST_RAZORPAY_PLAN_ID,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay subscription create error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create test subscription",
      timestamp: new Date().toISOString(),
    });
  }
};

export const verifyTestRazorpaySubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    }: {
      subscription_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } = req.body;

    console.log("Test Razorpay subscription verify request:", {
      userId,
      subscription_id,
      razorpay_payment_id,
      hasSignature: !!razorpay_signature,
    });

    if (!subscription_id) {
      return res.status(200).json({
        success: true,
        data: {
          verified: false,
          message: "Missing subscription id",
        },
        timestamp: new Date().toISOString(),
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        error: "Razorpay secret not configured",
        timestamp: new Date().toISOString(),
      });
    }

    if (!razorpay_payment_id || !razorpay_signature) {
      const razorpay = getRazorpay();
      const status = await reconcileAuthorizedTestPayment(
        razorpay,
        subscription_id,
      );
      const verified = isReconciledTestPaymentSuccessful(status);

      console.log("Test Razorpay subscription server fetch verify result:", {
        userId,
        subscription_id,
        subscriptionStatus: status.subscription.status,
        latestPayment: status.latestPayment
          ? {
              id: status.latestPayment.id,
              status: status.latestPayment.status,
              captured: status.latestPayment.captured,
            }
          : null,
        captureAttempt: status.captureAttempt,
        verified,
      });

      return res.status(200).json({
        success: true,
        data: {
          verified,
          subscriptionId: subscription_id,
          paymentId: status.latestPayment?.id,
          subscriptionStatus: status.subscription.status,
          latestPaymentStatus: status.latestPayment?.status,
          latestPaymentCaptured: status.latestPayment?.captured,
          captureAttempt: status.captureAttempt,
          message: verified
            ? "Verified from Razorpay server status"
            : "Payment is not confirmed yet",
        },
        timestamp: new Date().toISOString(),
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_payment_id}|${subscription_id}`, "utf8")
      .digest("hex");
    const signatureVerified = generatedSignature === razorpay_signature;
    const razorpay = getRazorpay();
    const status = signatureVerified
      ? await reconcileAuthorizedTestPayment(razorpay, subscription_id)
      : null;
    const verified =
      signatureVerified && !!status && isReconciledTestPaymentSuccessful(status);

    console.log("Test Razorpay subscription verify result:", {
      userId,
      subscription_id,
      razorpay_payment_id,
      signatureVerified,
      latestPayment: status?.latestPayment
        ? {
            id: status.latestPayment.id,
            status: status.latestPayment.status,
            captured: status.latestPayment.captured,
          }
        : null,
      captureAttempt: status?.captureAttempt,
      verified,
    });

    return res.status(200).json({
      success: true,
      data: {
        verified,
        subscriptionId: subscription_id,
        paymentId: razorpay_payment_id,
        subscriptionStatus: status?.subscription.status,
        latestPaymentStatus: status?.latestPayment?.status,
        latestPaymentCaptured: status?.latestPayment?.captured,
        captureAttempt: status?.captureAttempt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay subscription verify error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify test subscription",
      timestamp: new Date().toISOString(),
    });
  }
};

export const getTestRazorpaySubscriptionStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "Missing subscription id",
        timestamp: new Date().toISOString(),
      });
    }

    const razorpay = getRazorpay();
    const reconciledStatus = await reconcileAuthorizedTestPayment(
      razorpay,
      subscriptionId,
    );
    const status = buildTestStatusResponse(reconciledStatus);

    console.log("Test Razorpay subscription status:", {
      userId,
      subscriptionId,
      status,
    });

    return res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay subscription status error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch test subscription status",
      timestamp: new Date().toISOString(),
    });
  }
};
