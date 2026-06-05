"use client";

const REFERRAL_STORAGE_KEY = "referral_code";
const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

const cleanReferralCode = (value: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
};

export const getStoredReferralCode = () => {
  if (typeof window === "undefined") return null;

  const cookieValues = document.cookie
    .split("; ")
    .filter((row) => row.startsWith(`${REFERRAL_STORAGE_KEY}=`))
    .map((row) =>
      row
        .split("=")
        .slice(1)
        .join("="),
    )
    .filter(Boolean);
  const cookieReferral = cleanReferralCode(
    cookieValues.length
      ? decodeURIComponent(cookieValues[cookieValues.length - 1])
      : null,
  );

  if (cookieReferral) {
    const localReferral = cleanReferralCode(
      window.localStorage.getItem(REFERRAL_STORAGE_KEY),
    );

    if (localReferral !== cookieReferral) {
      clearReferralStorageVariants();
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, cookieReferral);
    }

    return cookieReferral;
  }

  const localReferral = cleanReferralCode(
    window.localStorage.getItem(REFERRAL_STORAGE_KEY),
  );
  if (localReferral) return localReferral;
  return null;
};

const clearReferralStorageVariants = () => {
  if (typeof window === "undefined") return;

  Object.keys(window.localStorage).forEach((key) => {
    if (
      key === REFERRAL_STORAGE_KEY ||
      key.startsWith(`${REFERRAL_STORAGE_KEY}-`) ||
      key.startsWith("referral-code")
    ) {
      window.localStorage.removeItem(key);
    }
  });
};

const expireReferralCookies = () => {
  if (typeof document === "undefined") return;

  document.cookie = `${REFERRAL_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;

  if (window.location.hostname.endsWith("rocketreplai.com")) {
    document.cookie = `${REFERRAL_STORAGE_KEY}=; path=/; domain=.rocketreplai.com; max-age=0; SameSite=Lax`;
    document.cookie = `${REFERRAL_STORAGE_KEY}=; path=/; domain=${window.location.hostname}; max-age=0; SameSite=Lax`;
  }
};

export const storeReferralCode = (value: string | null) => {
  if (typeof window === "undefined") return null;

  const referralCode = cleanReferralCode(value);
  if (!referralCode) return null;

  clearReferralStorageVariants();
  expireReferralCookies();
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);

  const encodedReferral = encodeURIComponent(referralCode);
  const cookie = `${REFERRAL_STORAGE_KEY}=${encodedReferral}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  document.cookie = cookie;

  if (window.location.hostname.endsWith("rocketreplai.com")) {
    document.cookie = `${cookie}; domain=.rocketreplai.com`;
  }

  return referralCode;
};

export const withReferral = (href: string) => {
  if (typeof window === "undefined") return href;

  const referralCode = getStoredReferralCode();
  if (!referralCode) return href;

  try {
    const url = new URL(href, window.location.href);
    url.searchParams.set("ref", referralCode);
    return url.toString();
  } catch {
    return href;
  }
};
