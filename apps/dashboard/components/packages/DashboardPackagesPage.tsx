"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  Crown,
  Loader2,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button, Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { clearStoredReferralCode, getStoredReferralCode } from "@/lib/referral";
import {
  cancelDashboardPackageSubscription,
  cancelMetaAdsSubscription,
  cancelWebsiteMaintenanceSubscription,
  DashboardPackagePlan,
  DashboardPackageServiceCheck,
  DashboardPackageServiceKey,
  DashboardPackageStatus,
  getDashboardPackageStatus,
  MetaAdsPlan,
  WebsiteMaintenancePlan,
} from "@/lib/services/package-actions.api";
import {
  createRazorpaySubscription,
  getRazerpayPlanInfo,
  verifyRazorpayPayment,
} from "@/lib/services/subscription-actions.api";

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const serviceStyles: Record<
  DashboardPackageServiceKey,
  {
    icon: typeof Bot;
    badge: string;
    activeBadge: string;
    accent: string;
  }
> = {
  insta: {
    icon: Sparkles,
    badge: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    activeBadge: "bg-pink-500 text-white border-pink-500",
    accent: "from-pink-500 to-rose-500",
  },
  web: {
    icon: Bot,
    badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    activeBadge: "bg-purple-500 text-white border-purple-500",
    accent: "from-purple-500 to-indigo-500",
  },
  whatsapp: {
    icon: MessageCircle,
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    activeBadge: "bg-emerald-500 text-white border-emerald-500",
    accent: "from-emerald-500 to-teal-500",
  },
  call: {
    icon: Phone,
    badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    activeBadge: "bg-cyan-500 text-white border-cyan-500",
    accent: "from-cyan-500 to-sky-500",
  },
};

const serviceLabels: Record<DashboardPackageServiceKey, string> = {
  insta: "Instagram",
  web: "Web Chatbot",
  whatsapp: "WhatsApp",
  call: "AI Call",
};

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const sleep = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export function DashboardPackagesPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [status, setStatus] = useState<DashboardPackageStatus | null>(null);
  const [selectedPackageId, setSelectedPackageId] =
    useState<DashboardPackagePlan["id"]>("package-starter");
  const [isLoading, setIsLoading] = useState(true);
  const [checkingPackageId, setCheckingPackageId] =
    useState<DashboardPackagePlan["id"] | null>(null);
  const [activeCheck, setActiveCheck] =
    useState<DashboardPackageServiceKey | null>(null);
  const [checkedServices, setCheckedServices] = useState<
    DashboardPackageServiceKey[]
  >([]);
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false);
  const [payingPackageId, setPayingPackageId] =
    useState<DashboardPackagePlan["id"] | null>(null);
  const [payingMetaAdsPlanId, setPayingMetaAdsPlanId] = useState<
    MetaAdsPlan["id"] | null
  >(null);
  const [payingWebsiteMaintenancePlanId, setPayingWebsiteMaintenancePlanId] =
    useState<WebsiteMaintenancePlan["id"] | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancellingMetaAds, setIsCancellingMetaAds] = useState(false);
  const [isCancellingWebsiteMaintenance, setIsCancellingWebsiteMaintenance] =
    useState(false);

  const loadStatus = useCallback(async () => {
    const data = await getDashboardPackageStatus(apiRequest);
    setStatus(data);
    if (!data.plans.some((plan) => plan.id === selectedPackageId)) {
      setSelectedPackageId(data.plans[0]?.id || "package-starter");
    }
    return data;
  }, [apiRequest, selectedPackageId]);

  useEffect(() => {
    loadStatus()
      .catch((error) => {
        toast({
          title: "Could not load packages",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [loadStatus]);

  const selectedPackage = useMemo(
    () =>
      status?.plans.find((plan) => plan.id === selectedPackageId) ||
      status?.plans[0] ||
      null,
    [selectedPackageId, status],
  );

  const checksByKey = useMemo(() => {
    return (status?.serviceChecks || []).reduce<
      Partial<Record<DashboardPackageServiceKey, DashboardPackageServiceCheck>>
    >((acc, check) => {
      acc[check.key] = check;
      return acc;
    }, {});
  }, [status]);

  const selectedChecks = useMemo(() => {
    if (!selectedPackage) return [];
    return selectedPackage.setupServices
      .map((service) => checksByKey[service])
      .filter(Boolean) as DashboardPackageServiceCheck[];
  }, [checksByKey, selectedPackage]);

  const missingChecks = selectedChecks.filter((check) => !check.ready);
  const activePackage = status?.activePackage || null;
  const activeMetaAdsSubscription = status?.activeMetaAdsSubscription || null;
  const activeWebsiteMaintenanceSubscription =
    status?.activeWebsiteMaintenanceSubscription || null;
  const activeSeparateServices = status?.activeSeparateServices || [];
  const hasSeparateServiceSubscriptions = activeSeparateServices.length > 0;
  const isChecking = Boolean(checkingPackageId);

  const loadRazorpayScript = useCallback((): Promise<void> => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Payment checkout is not available"));
    }
    if ((window as any).Razorpay) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existingScript =
        document.getElementById(RAZORPAY_SCRIPT_ID) ||
        document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);

      const handleLoad = () => resolve();
      const handleError = () =>
        reject(new Error("Payment checkout failed to load"));

      if (existingScript) {
        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.body.appendChild(script);
    });
  }, []);

  const startCheckout = async (plan: DashboardPackagePlan) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in before subscribing to a package.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPayingPackageId(plan.id);
      await loadRazorpayScript();

      const planInfo = await getRazerpayPlanInfo(apiRequest, plan.id);
      const razorpayPlanId = planInfo.razorpaymonthlyplanId;
      if (!razorpayPlanId) {
        throw new Error(`Razorpay monthly plan is not configured for ${plan.id}`);
      }

      const referralCode = getStoredReferralCode();
      const result = await createRazorpaySubscription(apiRequest, {
        amount: plan.amountInr,
        razorpayplanId: razorpayPlanId,
        buyerId: userId,
        referralCode,
        metadata: {
          productId: plan.id,
          packageId: plan.id,
          packageName: plan.name,
          subscriptionType: "package",
          billingCycle: "monthly",
          includedServices: plan.includedServices.join(","),
          email: user?.primaryEmailAddress?.emailAddress || "",
          referralCode: referralCode || "",
        },
      });

      const razorpay = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: plan.amountInr * 100,
        currency: "INR",
        name: "RocketReplai",
        description: `${plan.name} - monthly package`,
        subscription_id: result.subscriptionId,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        notes: {
          productId: plan.id,
          packageId: plan.id,
          packageName: plan.name,
          subscriptionType: "package",
          buyerId: userId,
          billingCycle: "monthly",
          includedServices: plan.includedServices.join(","),
        },
        handler: async (response: any) => {
          await verifyRazorpayPayment(apiRequest, {
            subscription_id:
              response.razorpay_subscription_id || result.subscriptionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            productId: plan.id,
            subscriptionType: "package",
            subscriptionKind: "package",
            billingCycle: "monthly",
          });
          clearStoredReferralCode();
          toast({
            title: "Package activated",
            description: "All included dashboards are now on the package plan.",
          });
          await loadStatus();
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Checkout closed",
              description: "Payment was not completed.",
              variant: "destructive",
            });
          },
        },
        theme: { color: "#EC4899" },
      });

      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message || "Could not start package checkout.",
        variant: "destructive",
      });
    } finally {
      setPayingPackageId(null);
    }
  };

  const startMetaAdsCheckout = async (plan: MetaAdsPlan) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in before subscribing to Meta Ads.",
        variant: "destructive",
      });
      return;
    }

    if (activeMetaAdsSubscription) {
      toast({
        title: "Meta Ads plan already active",
        description:
          "You already have an active Meta Ads subscription. Cancel it before selecting another budget.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPayingMetaAdsPlanId(plan.id);
      await loadRazorpayScript();

      const planInfo = await getRazerpayPlanInfo(apiRequest, plan.id);
      const razorpayPlanId = planInfo.razorpaymonthlyplanId;
      if (!razorpayPlanId) {
        throw new Error(`Razorpay monthly plan is not configured for ${plan.id}`);
      }

      const referralCode = getStoredReferralCode();
      const result = await createRazorpaySubscription(apiRequest, {
        amount: plan.amountInr,
        razorpayplanId: razorpayPlanId,
        buyerId: userId,
        referralCode,
        metadata: {
          productId: plan.id,
          subscriptionType: "meta-ads",
          billingCycle: "monthly",
          email: user?.primaryEmailAddress?.emailAddress || "",
          referralCode: referralCode || "",
        },
      });

      const razorpay = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: plan.amountInr * 100,
        currency: "INR",
        name: "RocketReplai",
        description: `${plan.name} - monthly Meta Ads budget`,
        subscription_id: result.subscriptionId,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        notes: {
          productId: plan.id,
          subscriptionType: "meta-ads",
          buyerId: userId,
          billingCycle: "monthly",
          monthlyBudgetInr: plan.monthlyBudgetInr,
        },
        handler: async (response: any) => {
          await verifyRazorpayPayment(apiRequest, {
            subscription_id:
              response.razorpay_subscription_id || result.subscriptionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            productId: plan.id,
            subscriptionType: "meta-ads",
            subscriptionKind: "meta-ads",
            billingCycle: "monthly",
          });
          clearStoredReferralCode();
          toast({
            title: "Meta Ads plan activated",
            description: `${plan.name} is now active.`,
          });
          await loadStatus();
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Checkout closed",
              description: "Payment was not completed.",
              variant: "destructive",
            });
          },
        },
        theme: { color: "#2563EB" },
      });

      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message || "Could not start Meta Ads checkout.",
        variant: "destructive",
      });
    } finally {
      setPayingMetaAdsPlanId(null);
    }
  };

  const startWebsiteMaintenanceCheckout = async (
    plan: WebsiteMaintenancePlan,
  ) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description:
          "Please sign in before subscribing to website maintenance.",
        variant: "destructive",
      });
      return;
    }

    if (activeWebsiteMaintenanceSubscription) {
      toast({
        title: "Maintenance plan already active",
        description:
          "Cancel the active website maintenance subscription before starting another one.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPayingWebsiteMaintenancePlanId(plan.id);
      await loadRazorpayScript();

      const planInfo = await getRazerpayPlanInfo(apiRequest, plan.id);
      const razorpayPlanId = planInfo.razorpaymonthlyplanId;
      if (!razorpayPlanId) {
        throw new Error(`Razorpay monthly plan is not configured for ${plan.id}`);
      }

      const referralCode = getStoredReferralCode();
      const result = await createRazorpaySubscription(apiRequest, {
        amount: plan.amountInr,
        razorpayplanId: razorpayPlanId,
        buyerId: userId,
        referralCode,
        metadata: {
          productId: plan.id,
          subscriptionType: "website-maintenance",
          billingCycle: "monthly",
          email: user?.primaryEmailAddress?.emailAddress || "",
          referralCode: referralCode || "",
        },
      });

      const razorpay = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: plan.amountInr * 100,
        currency: "INR",
        name: "RocketReplai",
        description: `${plan.name} - monthly maintenance`,
        subscription_id: result.subscriptionId,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        notes: {
          productId: plan.id,
          subscriptionType: "website-maintenance",
          buyerId: userId,
          billingCycle: "monthly",
        },
        handler: async (response: any) => {
          await verifyRazorpayPayment(apiRequest, {
            subscription_id:
              response.razorpay_subscription_id || result.subscriptionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            productId: plan.id,
            subscriptionType: "website-maintenance",
            subscriptionKind: "website-maintenance",
            billingCycle: "monthly",
          });
          clearStoredReferralCode();
          toast({
            title: "Website maintenance activated",
            description: `${plan.name} is now active.`,
          });
          await loadStatus();
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Checkout closed",
              description: "Payment was not completed.",
              variant: "destructive",
            });
          },
        },
        theme: { color: "#7C3AED" },
      });

      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description:
          error.message || "Could not start website maintenance checkout.",
        variant: "destructive",
      });
    } finally {
      setPayingWebsiteMaintenancePlanId(null);
    }
  };

  const handlePackageAction = async (plan: DashboardPackagePlan) => {
    if (activePackage) {
      toast({
        title: "One package is already active",
        description:
          "Cancel the current package before subscribing to another package.",
        variant: "destructive",
      });
      return;
    }

    if (hasSeparateServiceSubscriptions) {
      toast({
        title: "Cancel active services first",
        description:
          "Packages can be purchased only after all individual service subscriptions are cancelled.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSelectedPackageId(plan.id);
      setIsCheckDialogOpen(true);
      setCheckingPackageId(plan.id);
      setCheckedServices([]);
      const latestStatus = await loadStatus();
      if (latestStatus.activeSeparateServices.length > 0) {
        setIsCheckDialogOpen(false);
        toast({
          title: "Cancel active services first",
          description:
            "Packages can be purchased only after all individual service subscriptions are cancelled.",
          variant: "destructive",
        });
        setActiveCheck(null);
        return;
      }

      const latestPlan =
        latestStatus.plans.find((item) => item.id === plan.id) || plan;
      const latestChecksByKey = latestStatus.serviceChecks.reduce<
        Partial<Record<DashboardPackageServiceKey, DashboardPackageServiceCheck>>
      >((acc, check) => {
        acc[check.key] = check;
        return acc;
      }, {});

      for (const service of latestPlan.setupServices) {
        setActiveCheck(service);
        await sleep(350);
        setCheckedServices((items) => [...items, service]);
      }

      const missing = latestPlan.setupServices
        .map((service) => latestChecksByKey[service])
        .filter((check): check is DashboardPackageServiceCheck =>
          Boolean(check && !check.ready),
        );

      setActiveCheck(null);
      if (missing.length > 0) {
        toast({
          title: "Finish service setup first",
          description: `${missing.length} required service${
            missing.length > 1 ? "s are" : " is"
          } missing before payment.`,
          variant: "destructive",
        });
        return;
      }

      setIsCheckDialogOpen(false);
      await startCheckout(latestPlan);
    } finally {
      setCheckingPackageId(null);
    }
  };

  const handleCancelPackage = async () => {
    if (!activePackage) return;
    const confirmed = window.confirm(
      "Cancel the current common package? Included dashboards will return to their free plans.",
    );
    if (!confirmed) return;

    try {
      setIsCancelling(true);
      await cancelDashboardPackageSubscription(apiRequest, {
        subscriptionId: activePackage.subscriptionId,
        mode: "Immediate",
        reason: "Cancelled from dashboard packages page",
      });
      toast({
        title: "Package cancelled",
        description: "Your dashboards have been moved back to free mode.",
      });
      await loadStatus();
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message || "Could not cancel the package.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelMetaAds = async () => {
    if (!activeMetaAdsSubscription) return;
    const confirmed = window.confirm(
      "Cancel the current Meta Ads budget subscription?",
    );
    if (!confirmed) return;

    try {
      setIsCancellingMetaAds(true);
      await cancelMetaAdsSubscription(apiRequest, {
        subscriptionId: activeMetaAdsSubscription.subscriptionId,
        mode: "Immediate",
        reason: "Cancelled from dashboard packages page",
      });
      toast({
        title: "Meta Ads plan cancelled",
        description: "You can now choose another Meta Ads budget plan.",
      });
      await loadStatus();
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message || "Could not cancel the Meta Ads plan.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingMetaAds(false);
    }
  };

  const handleCancelWebsiteMaintenance = async () => {
    if (!activeWebsiteMaintenanceSubscription) return;
    const confirmed = window.confirm(
      "Cancel the current website maintenance subscription?",
    );
    if (!confirmed) return;

    try {
      setIsCancellingWebsiteMaintenance(true);
      await cancelWebsiteMaintenanceSubscription(apiRequest, {
        subscriptionId: activeWebsiteMaintenanceSubscription.subscriptionId,
        mode: "Immediate",
        reason: "Cancelled from dashboard packages page",
      });
      toast({
        title: "Maintenance plan cancelled",
        description: "You can now subscribe to website maintenance again.",
      });
      await loadStatus();
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description:
          error.message || "Could not cancel the website maintenance plan.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingWebsiteMaintenance(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.page} flex min-h-screen items-center justify-center`}>
        {isDark && <Orbs />}
        <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} min-h-screen ${
        isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FA]"
      }`}
    >
      {isDark && <Orbs />}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div
              className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                isDark
                  ? "border-pink-500/20 bg-pink-500/10 text-pink-300"
                  : "border-pink-200 bg-pink-50 text-pink-600"
              }`}
            >
              <PackageCheck className="h-4 w-4" />
              Common packages for every dashboard
            </div>
            <h1 className={`text-3xl font-black md:text-5xl ${styles.text.primary}`}>
              One subscription for your automation stack
            </h1>
            <p className={`mt-3 text-base md:text-lg ${styles.text.secondary}`}>
              Pick one package, complete the required free setup checks, and then
              activate all included dashboards with Razorpay billing.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="rounded-xl">
              Back to dashboards
            </Button>
          </Link>
        </header>

        {activePackage ? (
          <section
            className={`rounded-2xl border p-5 ${
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
                    {activePackage.packageName} is subscribed
                  </p>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    You can use one common package at a time. Cancel this
                    package before switching to another.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancelPackage}
                disabled={isCancelling}
                className="rounded-xl"
              >
                {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Package
              </Button>
            </div>
          </section>
        ) : null}

        {!activePackage && hasSeparateServiceSubscriptions ? (
          <section
            className={`rounded-2xl border p-5 ${
              isDark
                ? "border-amber-500/20 bg-amber-500/10"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-lg font-bold ${styles.text.primary}`}>
                    Cancel direct service subscriptions before buying a package
                  </p>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    You can still buy any single service from its own pricing
                    page. Packages are only available when no standalone paid
                    service is active.
                  </p>
                </div>
              </div>
              <div className="grid w-full gap-2 md:w-auto md:min-w-[280px]">
                {activeSeparateServices.map((service) => (
                  <Link
                    key={`${service.service}-${service.subscriptionId || service.plan}`}
                    href={service.manageUrl}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-bold ${
                      isDark
                        ? "border-white/[0.08] bg-black/20 text-white/80 hover:bg-white/[0.06]"
                        : "border-amber-200 bg-white text-gray-700 hover:bg-amber-50"
                    }`}
                  >
                    <span>{service.label}</span>
                    <span className="text-pink-500">Manage</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(status?.plans || []).map((plan) => {
            const isSelected = selectedPackage?.id === plan.id;
            const isCurrent = activePackage?.packageId === plan.id;
            const firstMonthPrice = Math.round(plan.amountInr / 2);
            return (
              <article
                key={plan.id}
                className={`flex min-h-[520px] flex-col rounded-2xl border p-5 transition ${
                  isSelected
                    ? isDark
                      ? "border-pink-500/50 bg-white/[0.06]"
                      : "border-pink-300 bg-white shadow-xl"
                    : isDark
                      ? "border-white/[0.08] bg-white/[0.035]"
                      : "border-gray-200 bg-white shadow-sm"
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${
                      serviceStyles[plan.includedServices[0]].accent
                    } text-white`}
                  >
                    <Crown className="h-5 w-5" />
                  </div>
                  {status?.firstTimeDiscountEligible ? (
                    <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">
                      50% first time
                    </span>
                  ) : null}
                </div>

                <h2 className={`text-xl font-black ${styles.text.primary}`}>
                  {plan.name}
                </h2>
                <p className={`mt-2 min-h-[48px] text-sm ${styles.text.secondary}`}>
                  {plan.description}
                </p>

                <div className="mt-5">
                  <p className={`text-3xl font-black ${styles.text.primary}`}>
                    {formatInr(plan.amountInr)}
                    <span className={`text-sm font-semibold ${styles.text.muted}`}>
                      /mo
                    </span>
                  </p>
                  {status?.firstTimeDiscountEligible ? (
                    <p className="mt-1 text-sm font-semibold text-emerald-500">
                      First month {formatInr(firstMonthPrice)} with Razorpay offer
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.includedServices.map((service) => (
                    <span
                      key={service}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                        serviceStyles[service].badge
                      }`}
                    >
                      {serviceLabels[service]}
                    </span>
                  ))}
                </div>

                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex gap-2 text-sm ${styles.text.secondary}`}
                    >
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  onClick={() => handlePackageAction(plan)}
                  disabled={
                    checkingPackageId === plan.id ||
                    payingPackageId === plan.id ||
                    Boolean(activePackage) ||
                    hasSeparateServiceSubscriptions
                  }
                  className={`mt-6 w-full rounded-xl py-6 font-bold ${
                    isCurrent
                      ? "bg-emerald-500 text-white"
                      : "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
                  }`}
                >
                  {checkingPackageId === plan.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : payingPackageId === plan.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {isCurrent
                    ? "Current Package"
                    : hasSeparateServiceSubscriptions
                      ? "Cancel direct service first"
                    : activePackage
                      ? "Cancel current package first"
                      : "Check & Purchase"}
                </Button>
              </article>
            );
          })}
        </section>

        <section
          className={`rounded-2xl border p-5 ${
            isDark
              ? "border-blue-500/20 bg-blue-500/10"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                <Sparkles className="h-3.5 w-3.5" />
                Separate Meta Ads subscriptions
              </div>
              <h2 className={`text-2xl font-black ${styles.text.primary}`}>
                Meta Ads Budget Packages
              </h2>
              <p className={`mt-2 max-w-3xl text-sm ${styles.text.secondary}`}>
                These plans are separate from automation service packages and can
                be used for monthly Meta Ads budget planning.
              </p>
            </div>
            {activeMetaAdsSubscription ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                  {activeMetaAdsSubscription.planName} active
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelMetaAds}
                  disabled={isCancellingMetaAds}
                  className="rounded-xl"
                >
                  {isCancellingMetaAds ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel Ads Plan
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(status?.metaAdsPlans || []).map((plan) => {
              const isCurrent = activeMetaAdsSubscription?.planId === plan.id;
              const isPaying = payingMetaAdsPlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`flex min-h-[360px] flex-col rounded-2xl border p-5 ${
                    isDark
                      ? "border-white/[0.08] bg-black/20"
                      : "border-blue-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                      <PackageCheck className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                      Ads Budget
                    </span>
                  </div>

                  <h3 className={`mt-4 text-xl font-black ${styles.text.primary}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-2 text-sm ${styles.text.secondary}`}>
                    {plan.description}
                  </p>

                  <div className="mt-5">
                    <p className={`text-3xl font-black ${styles.text.primary}`}>
                      {formatInr(plan.amountInr)}
                      <span className={`text-sm font-semibold ${styles.text.muted}`}>
                        /mo
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-500">
                      {formatInr(plan.monthlyBudgetInr)} monthly Meta Ads budget
                    </p>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={`flex gap-2 text-sm ${styles.text.secondary}`}
                      >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    disabled={Boolean(activeMetaAdsSubscription) || isPaying}
                    onClick={() => startMetaAdsCheckout(plan)}
                    className="mt-6 w-full rounded-xl bg-blue-500 py-6 font-bold text-white hover:bg-blue-600"
                  >
                    {isPaying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {isCurrent
                      ? "Current Ads Plan"
                      : activeMetaAdsSubscription
                        ? "Ads plan already active"
                        : "Purchase Ads Plan"}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className={`rounded-2xl border p-5 ${
            isDark
              ? "border-violet-500/20 bg-violet-500/10"
              : "border-violet-200 bg-violet-50"
          }`}
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-500">
                <Bot className="h-3.5 w-3.5" />
                Separate website service
              </div>
              <h2 className={`text-2xl font-black ${styles.text.primary}`}>
                Website Monthly Maintenance
              </h2>
              <p className={`mt-2 max-w-3xl text-sm ${styles.text.secondary}`}>
                A direct maintenance subscription for clients who only need a
                website handled. No automation setup checks are required.
              </p>
            </div>
            {activeWebsiteMaintenanceSubscription ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-500 px-3 py-1 text-xs font-bold text-white">
                  {activeWebsiteMaintenanceSubscription.planName} active
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelWebsiteMaintenance}
                  disabled={isCancellingWebsiteMaintenance}
                  className="rounded-xl"
                >
                  {isCancellingWebsiteMaintenance ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel Maintenance
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
            {(status?.websiteMaintenancePlans || []).map((plan) => {
              const isCurrent =
                activeWebsiteMaintenanceSubscription?.planId === plan.id;
              const isPaying = payingWebsiteMaintenancePlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`flex min-h-[340px] flex-col rounded-2xl border p-5 ${
                    isDark
                      ? "border-white/[0.08] bg-black/20"
                      : "border-violet-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      <Bot className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-500">
                      Website only
                    </span>
                  </div>

                  <h3 className={`mt-4 text-xl font-black ${styles.text.primary}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-2 text-sm ${styles.text.secondary}`}>
                    {plan.description}
                  </p>

                  <div className="mt-5">
                    <p className={`text-3xl font-black ${styles.text.primary}`}>
                      {formatInr(plan.amountInr)}
                      <span className={`text-sm font-semibold ${styles.text.muted}`}>
                        /mo
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-500">
                      First month {formatInr(plan.firstMonthInr)} with Razorpay
                      offer
                    </p>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={`flex gap-2 text-sm ${styles.text.secondary}`}
                      >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    disabled={
                      Boolean(activeWebsiteMaintenanceSubscription) || isPaying
                    }
                    onClick={() => startWebsiteMaintenanceCheckout(plan)}
                    className="mt-6 w-full rounded-xl bg-violet-500 py-6 font-bold text-white hover:bg-violet-600"
                  >
                    {isPaying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {isCurrent
                      ? "Current Maintenance Plan"
                      : activeWebsiteMaintenanceSubscription
                        ? "Maintenance already active"
                        : "Subscribe Maintenance"}
                  </Button>
                </article>
              );
            })}

            <div
              className={`rounded-2xl border p-5 ${
                isDark
                  ? "border-white/[0.08] bg-black/20"
                  : "border-violet-100 bg-white"
              }`}
            >
              <h3 className={`text-lg font-black ${styles.text.primary}`}>
                Separate from all packages
              </h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <RuleRow
                  isDark={isDark}
                  ok
                  text="Can be purchased directly without service setup checks."
                />
                <RuleRow
                  isDark={isDark}
                  ok
                  text="Does not block automation service packages or Meta Ads plans."
                />
                <RuleRow
                  isDark={isDark}
                  ok
                  text="Uses its own Razorpay subscription and cancellation."
                />
                <RuleRow
                  isDark={isDark}
                  ok
                  text="First-month pricing uses a Razorpay offer on the backend."
                />
              </div>
            </div>
          </div>
        </section>

        {isCheckDialogOpen && selectedPackage ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <section
              role="dialog"
              aria-modal="true"
              aria-label={`Setup checks for ${selectedPackage.name}`}
              className={`relative z-10 grid max-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 overflow-y-auto rounded-2xl border p-4 shadow-2xl md:p-5 lg:grid-cols-[1fr_420px] ${
                isDark
                  ? "border-white/[0.08] bg-[#0F0F11]"
                  : "border-gray-200 bg-white"
              }`}
            >
            <div className="flex items-start justify-between gap-4 lg:col-span-2">
              <div>
                <h2 className={`text-xl font-black ${styles.text.primary}`}>
                  Setup checks for {selectedPackage.name}
                </h2>
                <p className={`mt-1 text-sm ${styles.text.secondary}`}>
                  We check each required service before Razorpay opens. If
                  something is missing, this window stays open so you can use the
                  setup links.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCheckDialogOpen(false)}
                disabled={isChecking}
                className="h-10 w-10 rounded-xl p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div
              className={`rounded-2xl border p-5 ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.035]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-black ${styles.text.primary}`}>
                    Service readiness
                  </h2>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    We check these services before opening Razorpay.
                  </p>
                </div>
                {isChecking ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {selectedChecks.map((check) => {
                  const Icon = serviceStyles[check.key].icon;
                  const hasChecked = checkedServices.includes(check.key);
                  const isActive = activeCheck === check.key;
                  return (
                    <div
                      key={check.key}
                      className={`rounded-xl border p-4 ${
                        check.ready
                          ? isDark
                            ? "border-emerald-500/20 bg-emerald-500/10"
                            : "border-emerald-200 bg-emerald-50"
                          : isDark
                            ? "border-white/[0.08] bg-black/20"
                            : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                            check.ready
                              ? serviceStyles[check.key].activeBadge
                              : serviceStyles[check.key].badge
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold ${styles.text.primary}`}>
                              {check.label}
                            </p>
                            {isActive ? (
                              <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                            ) : hasChecked || check.ready ? (
                              check.ready ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )
                            ) : null}
                          </div>
                          <p className={`mt-1 text-sm ${styles.text.secondary}`}>
                            {check.ready
                              ? check.successText
                              : check.missingDescription}
                          </p>
                          {!check.ready ? (
                            <Link
                              href={check.setupUrl}
                              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-400"
                            >
                              {check.missingTitle}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside
              className={`rounded-2xl border p-5 ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.035]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <h2 className={`text-lg font-black ${styles.text.primary}`}>
                Purchase rules
              </h2>
              <div className="mt-4 space-y-3">
                <RuleRow
                  isDark={isDark}
                  ok={!activePackage && !hasSeparateServiceSubscriptions}
                  text="Cancel active individual service subscriptions before buying a package."
                />
                <RuleRow
                  isDark={isDark}
                  ok={!activePackage}
                  text="Only one common package can be active at a time."
                />
                <RuleRow
                  isDark={isDark}
                  ok={missingChecks.length === 0}
                  text="All required services must be active in free mode before payment."
                />
                <RuleRow
                  isDark={isDark}
                  ok={Boolean(status?.firstTimeDiscountEligible)}
                  text="First-time package customers get 50% off the first cycle."
                />
              </div>

              {missingChecks.length > 0 ? (
                <div
                  className={`mt-5 rounded-xl border p-4 ${
                    isDark
                      ? "border-amber-500/20 bg-amber-500/10"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex gap-2">
                    <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <div>
                      <p className={`font-bold ${styles.text.primary}`}>
                        Finish setup first
                      </p>
                      <p className={`mt-1 text-sm ${styles.text.secondary}`}>
                        Use the links in the checklist, then return here and
                        click purchase again.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>
          </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function RuleRow({
  ok,
  text,
  isDark,
}: {
  ok: boolean;
  text: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3 ${
        isDark ? "border-white/[0.08] bg-black/20" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-emerald-500 text-white" : "bg-amber-500 text-black"
        }`}
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
      </div>
      <p className={isDark ? "text-sm text-white/70" : "text-sm text-gray-600"}>
        {text}
      </p>
    </div>
  );
}
