import { NextRequest, NextResponse } from "next/server";

const appendParam = (
  params: URLSearchParams,
  key: string,
  value: FormDataEntryValue | string | null,
) => {
  if (typeof value === "string" && value) {
    params.set(key, value);
  }
};

const buildRedirectResponse = (
  request: NextRequest,
  formData?: FormData,
) => {
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo") || "/";
  const redirectUrl = new URL(returnTo, requestUrl.origin);
  const callbackParams = new URLSearchParams(redirectUrl.search);

  callbackParams.set("razorpay_checkout", "1");
  appendParam(callbackParams, "checkoutKind", requestUrl.searchParams.get("kind"));
  appendParam(
    callbackParams,
    "subscription_id",
    requestUrl.searchParams.get("subscriptionId") ||
      requestUrl.searchParams.get("razorpay_subscription_id") ||
      formData?.get("razorpay_subscription_id") ||
      null,
  );
  appendParam(
    callbackParams,
    "razorpay_payment_id",
    requestUrl.searchParams.get("razorpay_payment_id") ||
      formData?.get("razorpay_payment_id") ||
      null,
  );
  appendParam(
    callbackParams,
    "razorpay_signature",
    requestUrl.searchParams.get("razorpay_signature") ||
      formData?.get("razorpay_signature") ||
      null,
  );
  appendParam(callbackParams, "productId", requestUrl.searchParams.get("productId"));
  appendParam(
    callbackParams,
    "billingCycle",
    requestUrl.searchParams.get("billingCycle"),
  );
  appendParam(callbackParams, "planLimit", requestUrl.searchParams.get("planLimit"));
  appendParam(
    callbackParams,
    "accountLimit",
    requestUrl.searchParams.get("accountLimit"),
  );
  appendParam(callbackParams, "chatbotId", requestUrl.searchParams.get("chatbotId"));
  appendParam(
    callbackParams,
    "previousSubscriptionId",
    requestUrl.searchParams.get("previousSubscriptionId"),
  );
  appendParam(
    callbackParams,
    "previousSubscriptionType",
    requestUrl.searchParams.get("previousSubscriptionType"),
  );

  redirectUrl.search = callbackParams.toString();
  return NextResponse.redirect(redirectUrl, 303);
};

export async function GET(request: NextRequest) {
  return buildRedirectResponse(request);
}

export async function POST(request: NextRequest) {
  return buildRedirectResponse(request, await request.formData());
}
