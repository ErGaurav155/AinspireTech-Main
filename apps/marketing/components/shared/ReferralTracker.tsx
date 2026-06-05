"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getStoredReferralCode, storeReferralCode, withReferral } from "@/lib/referral";

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    storeReferralCode(searchParams.get("ref"));
  }, [searchParams]);

  useEffect(() => {
    const updateDashboardLinks = () => {
      const referralCode = getStoredReferralCode();
      if (!referralCode) return;

      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
        const href = anchor.getAttribute("href");
        if (!href) return;

        const url = new URL(href, window.location.href);
        if (url.hostname !== "app.rocketreplai.com") return;

        anchor.href = withReferral(url.toString());
      });
    };

    updateDashboardLinks();

    const handleDashboardLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const referralCode = getStoredReferralCode();
      if (!referralCode) return;

      const url = new URL(href, window.location.href);
      if (url.hostname !== "app.rocketreplai.com") {
        return;
      }

      anchor.href = withReferral(url.toString());
    };

    document.addEventListener("click", handleDashboardLinkClick, true);
    return () =>
      document.removeEventListener("click", handleDashboardLinkClick, true);
  }, []);

  return null;
}
