"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { storeReferralCode } from "@/lib/referral";

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    storeReferralCode(searchParams.get("ref"));
  }, [searchParams]);

  return null;
}
