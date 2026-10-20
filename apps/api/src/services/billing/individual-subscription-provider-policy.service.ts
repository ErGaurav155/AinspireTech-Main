const REPLACEMENT_CHECKOUT_KINDS = new Set(["web", "insta"]);

export function supportsIndividualReplacementCheckout(kind: string) {
  return REPLACEMENT_CHECKOUT_KINDS.has(kind);
}

export function canUpdateRazorpaySubscription(status: unknown) {
  return ["authenticated", "active"].includes(
    String(status || "").toLowerCase(),
  );
}

export function shouldUseIndividualReplacementCheckout(error: unknown) {
  const providerError = error as {
    error?: { description?: unknown };
    message?: unknown;
  };
  const description = String(
    providerError?.error?.description || providerError?.message || "",
  );

  return (
    /subscriptions cannot be updated when payment mode is upi/i.test(
      description,
    ) ||
    /can'?t update subscription when subscription is not in authenticated or active state/i.test(
      description,
    )
  );
}
