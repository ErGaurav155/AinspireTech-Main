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

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo") || "/";
  const redirectUrl = new URL(returnTo, requestUrl.origin);
  const callbackParams = new URLSearchParams(redirectUrl.search);
  const formData = await request.formData();

  callbackParams.set("razorpay_checkout", "1");
  appendParam(callbackParams, "checkoutKind", requestUrl.searchParams.get("kind"));
  appendParam(
    callbackParams,
    "subscription_id",
    requestUrl.searchParams.get("subscriptionId") ||
      formData.get("razorpay_subscription_id"),
  );
  appendParam(
    callbackParams,
    "razorpay_payment_id",
    formData.get("razorpay_payment_id"),
  );
  appendParam(
    callbackParams,
    "razorpay_signature",
    formData.get("razorpay_signature"),
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
}
