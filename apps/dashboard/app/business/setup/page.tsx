"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, RefreshCw } from "lucide-react";
import { Button, Spinner, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  createBusinessWorkspace,
  getPlatformContext,
} from "@/lib/services/platform.api";

const ALLOWED_DESTINATIONS = ["/web", "/insta", "/whatsapp"];

function BusinessSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { apiRequest } = useApi();
  const { styles } = useThemeStyles();
  const started = useRef(false);
  const [error, setError] = useState("");

  const destination = useMemo(() => {
    const requested = searchParams.get("redirect") || "/web";
    return ALLOWED_DESTINATIONS.some(
      (path) => requested === path || requested.startsWith(`${path}/`),
    )
      ? requested
      : "/web";
  }, [searchParams]);

  const setup = async () => {
    if (!user) return;
    setError("");
    try {
      const context = await getPlatformContext(apiRequest);
      if (context.primaryAccountType === "AGENCY") {
        router.replace(
          context.agencies[0]?._id
            ? `/agency/${context.agencies[0]._id}`
            : "/agency/setup",
        );
        return;
      }
      if (context.primaryAccountType === "MEMBER") {
        router.replace(
          context.workspaces[0]?._id
            ? `/workspace/${context.workspaces[0]._id}`
            : "/",
        );
        return;
      }
      if (context.primaryAccountType === "BUSINESS") {
        router.replace(destination);
        return;
      }

      const identity =
        user.fullName ||
        user.firstName ||
        user.primaryEmailAddress?.emailAddress.split("@")[0] ||
        "My";
      await createBusinessWorkspace(apiRequest, `${identity} Business`);
      // A full navigation reloads the root access provider after the account
      // type is claimed, avoiding a stale "unselected" redirect.
      window.location.replace(destination);
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Unable to create your Business account.",
      );
      started.current = false;
    }
  };

  useEffect(() => {
    if (!isLoaded || !user || started.current) return;
    started.current = true;
    void setup();
    // setup intentionally runs once for the authenticated Clerk user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  if (!error) return <Spinner label="Preparing your individual Business account…" />;

  return (
    <main className={`${styles.page} flex min-h-screen items-center justify-center p-5`}>
      <div className={`${styles.card} w-full max-w-lg rounded-3xl p-8 text-center`}>
        <Building2 className="mx-auto h-10 w-10 text-violet-500" />
        <h1 className={`mt-4 text-2xl font-bold ${styles.text.primary}`}>
          Business setup needs another try
        </h1>
        <p className={`mt-3 text-sm ${styles.text.secondary}`}>{error}</p>
        <Button
          className="mt-6 rounded-full"
          onClick={() => {
            started.current = true;
            void setup();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Retry setup
        </Button>
      </div>
    </main>
  );
}

export default function BusinessSetupPage() {
  return (
    <Suspense fallback={<Spinner label="Preparing your Business account…" />}>
      <BusinessSetupContent />
    </Suspense>
  );
}
