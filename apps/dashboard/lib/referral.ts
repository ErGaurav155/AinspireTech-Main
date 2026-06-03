"use client";

const REFERRAL_STORAGE_KEY = "referral_code";
const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

const cleanReferralCode = (value: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
};

const getCookieReferralCode = () => {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${REFERRAL_STORAGE_KEY}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  return value ? cleanReferralCode(decodeURIComponent(value)) : null;
};

export const getStoredReferralCode = () => {
  if (typeof window === "undefined") return null;

  const localReferral = cleanReferralCode(
    window.localStorage.getItem(REFERRAL_STORAGE_KEY),
  );
  if (localReferral) return localReferral;

  const cookieReferral = getCookieReferralCode();
  if (cookieReferral) {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, cookieReferral);
  }

  return cookieReferral;
};

export const storeReferralCode = (value: string | null) => {
  if (typeof window === "undefined") return null;

  const referralCode = cleanReferralCode(value);
  if (!referralCode) return getStoredReferralCode();

  window.localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);

  const encodedReferral = encodeURIComponent(referralCode);
  const cookie = `${REFERRAL_STORAGE_KEY}=${encodedReferral}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  document.cookie = cookie;

  if (window.location.hostname.endsWith("rocketreplai.com")) {
    document.cookie = `${cookie}; domain=.rocketreplai.com`;
  }

  return referralCode;
};

export const clearStoredReferralCode = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
  document.cookie = `${REFERRAL_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;

  if (window.location.hostname.endsWith("rocketreplai.com")) {
    document.cookie = `${REFERRAL_STORAGE_KEY}=; path=/; domain=.rocketreplai.com; max-age=0; SameSite=Lax`;
  }
};
