import { Request, Response } from "express";

const DASHBOARD_URL = process.env.APP_URL || "https://app.rocketreplai.com";

const appendParam = (
  params: URLSearchParams,
  key: string,
  value: unknown,
) => {
  if (typeof value === "string" && value) {
    params.set(key, value);
  }
};

const getRazorpayErrorValue = (body: any, key: string) => {
  const error = body?.error;

  if (error && typeof error === "object" && typeof error[key] === "string") {
    return error[key];
  }

  return body?.[`error[${key}]`] || body?.[`error.${key}`];
};

export const razorpayCheckoutCallbackController = (
  req: Request,
  res: Response,
) => {
  const returnTo =
    typeof req.query.returnTo === "string" && req.query.returnTo
      ? req.query.returnTo
      : "/";
  const redirectUrl = new URL(returnTo, DASHBOARD_URL);
  const callbackParams = new URLSearchParams(redirectUrl.search);

  callbackParams.set("razorpay_checkout", "1");
  appendParam(callbackParams, "checkoutKind", req.query.kind);
  appendParam(
    callbackParams,
    "order_id",
    req.query.orderId || req.query.razorpay_order_id || req.body?.razorpay_order_id,
  );
  appendParam(
    callbackParams,
    "subscription_id",
    req.query.subscriptionId ||
      req.query.razorpay_subscription_id ||
      req.body?.razorpay_subscription_id,
  );
  appendParam(
    callbackParams,
    "razorpay_payment_id",
    req.query.razorpay_payment_id || req.body?.razorpay_payment_id,
  );
  appendParam(
    callbackParams,
    "razorpay_signature",
    req.query.razorpay_signature || req.body?.razorpay_signature,
  );
  appendParam(
    callbackParams,
    "razorpay_error_code",
    getRazorpayErrorValue(req.body, "code"),
  );
  appendParam(
    callbackParams,
    "razorpay_error_description",
    getRazorpayErrorValue(req.body, "description"),
  );
  appendParam(
    callbackParams,
    "razorpay_error_reason",
    getRazorpayErrorValue(req.body, "reason"),
  );
  appendParam(callbackParams, "productId", req.query.productId);
  appendParam(callbackParams, "billingCycle", req.query.billingCycle);
  appendParam(callbackParams, "planLimit", req.query.planLimit);
  appendParam(callbackParams, "accountLimit", req.query.accountLimit);
  appendParam(callbackParams, "chatbotId", req.query.chatbotId);
  appendParam(
    callbackParams,
    "previousSubscriptionId",
    req.query.previousSubscriptionId,
  );
  appendParam(
    callbackParams,
    "previousSubscriptionType",
    req.query.previousSubscriptionType,
  );

  redirectUrl.search = callbackParams.toString();
  return res.redirect(303, redirectUrl.toString());
};
