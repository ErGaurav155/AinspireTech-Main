import { Request, Response } from "express";
import crypto from "crypto";
import { getAuth } from "@clerk/express";
import { getRazorpay } from "@/utils/util";

const TEST_ORDER_AMOUNT = 300;
const TEST_ORDER_CURRENCY = "INR";

const isCapturedPayment = (payment: any) =>
  payment?.captured === true || payment?.status === "captured";

export const createTestRazorpayOrderController = async (
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
    const order = await razorpay.orders.create({
      amount: TEST_ORDER_AMOUNT,
      currency: TEST_ORDER_CURRENCY,
      receipt: `test-order-${Date.now()}`,
      payment_capture: true,
      notes: {
        buyerId: userId,
        productId: "order-test",
        testCheckout: "true",
      },
    });

    console.log("Test Razorpay order created:", {
      userId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay order create error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create test order",
      timestamp: new Date().toISOString(),
    });
  }
};

export const verifyTestRazorpayOrderController = async (
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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        error: "Missing order id",
        timestamp: new Date().toISOString(),
      });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const orderPayments =
      await razorpay.orders.fetchPayments(razorpay_order_id);
    const latestPayment = [...(orderPayments.items || [])].sort(
      (a: any, b: any) => (b?.created_at || 0) - (a?.created_at || 0),
    )[0];

    let signatureVerified = false;

    if (razorpay_payment_id && razorpay_signature) {
      const secret = process.env.RAZORPAY_KEY_SECRET;

      if (!secret) {
        return res.status(500).json({
          success: false,
          error: "Razorpay secret not configured",
          timestamp: new Date().toISOString(),
        });
      }

      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`, "utf8")
        .digest("hex");
      signatureVerified = generatedSignature === razorpay_signature;
    }

    const verified =
      order.status === "paid" ||
      isCapturedPayment(latestPayment) ||
      signatureVerified;

    console.log("Test Razorpay order verify result:", {
      userId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      orderStatus: order.status,
      latestPayment: latestPayment
        ? {
            id: latestPayment.id,
            status: latestPayment.status,
            captured: latestPayment.captured,
          }
        : null,
      signatureVerified,
      verified,
    });

    return res.status(200).json({
      success: true,
      data: {
        verified,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id || latestPayment?.id,
        orderStatus: order.status,
        latestPaymentStatus: latestPayment?.status,
        latestPaymentCaptured: latestPayment?.captured,
        signatureVerified,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay order verify error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify test order",
      timestamp: new Date().toISOString(),
    });
  }
};

export const getTestRazorpayOrderStatusController = async (
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

    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing order id",
        timestamp: new Date().toISOString(),
      });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.fetch(orderId);
    const payments = await razorpay.orders.fetchPayments(orderId);
    const sortedPayments = [...(payments.items || [])].sort(
      (a: any, b: any) => (b?.created_at || 0) - (a?.created_at || 0),
    );

    const status = {
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        amount_paid: order.amount_paid,
        amount_due: order.amount_due,
        currency: order.currency,
        receipt: order.receipt,
        notes: order.notes,
      },
      latestPayment: sortedPayments[0]
        ? {
            id: sortedPayments[0].id,
            status: sortedPayments[0].status,
            method: sortedPayments[0].method,
            amount: sortedPayments[0].amount,
            currency: sortedPayments[0].currency,
            captured: sortedPayments[0].captured,
            error_code: sortedPayments[0].error_code,
            error_description: sortedPayments[0].error_description,
            error_source: sortedPayments[0].error_source,
            error_step: sortedPayments[0].error_step,
            error_reason: sortedPayments[0].error_reason,
            created_at: sortedPayments[0].created_at,
          }
        : null,
      payments: sortedPayments.map((payment: any) => ({
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        captured: payment.captured,
        error_code: payment.error_code,
        error_description: payment.error_description,
        error_source: payment.error_source,
        error_step: payment.error_step,
        error_reason: payment.error_reason,
        created_at: payment.created_at,
      })),
    };

    console.log("Test Razorpay order status:", {
      userId,
      orderId,
      status,
    });

    return res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay order status error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch test order status",
      timestamp: new Date().toISOString(),
    });
  }
};
