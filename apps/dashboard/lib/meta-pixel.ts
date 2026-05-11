"use client";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1698149081533113";

type MetaPixelParams = Record<string, string | number | boolean | string[]>;

declare global {
  interface Window {
    fbq?: (
      action: "track" | "trackCustom",
      eventName: string,
      params?: MetaPixelParams,
    ) => void;
  }
}

export function trackMetaEvent(
  eventName: string,
  params?: MetaPixelParams,
) {
  if (typeof window === "undefined" || !window.fbq) return;

  window.fbq("track", eventName, params);
}

