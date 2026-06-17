"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageCheck, ShieldCheck } from "lucide-react";
import { Button, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  DashboardPackageSubscription,
  getDashboardPackageStatus,
} from "@/lib/services/package-actions.api";

export function PackageSubscriptionNotice() {
  const { apiRequest } = useApi();
  const { isDark, styles } = useThemeStyles();
  const [activePackage, setActivePackage] =
    useState<DashboardPackageSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    getDashboardPackageStatus(apiRequest)
      .then((status) => {
        if (isMounted) setActivePackage(status.activePackage);
      })
      .catch(() => {
        if (isMounted) setActivePackage(null);
      });

    return () => {
      isMounted = false;
    };
  }, [apiRequest]);

  if (!activePackage) return null;

  return (
    <section
      className={`mb-8 rounded-2xl border p-5 ${
        isDark
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-lg font-bold ${styles.text.primary}`}>
              {activePackage.packageName} package is active
            </p>
            <p className={`text-sm ${styles.text.secondary}`}>
              This service is included in your common package. Cancel or switch
              packages from the package page before buying a standalone service.
            </p>
          </div>
        </div>
        <Link href="/packages">
          <Button className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">
            <PackageCheck className="mr-2 h-4 w-4" />
            Manage Package
          </Button>
        </Link>
      </div>
    </section>
  );
}
