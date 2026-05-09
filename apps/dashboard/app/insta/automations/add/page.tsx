// app/insta/automations/add/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  MessageCircle,
  BookOpen,
  MessageSquare,
  Radio,
  Crown,
} from "lucide-react";
import { Button, Orbs, useThemeStyles } from "@rocketreplai/ui";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { getSubscriptioninfo } from "@/lib/services/insta-actions.api";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

const FREE_DM_LIMIT = 1000;
const FREE_FOLLOW_CHECK_LIMIT = 50;

const automationTypes = [
  {
    id: "comments",
    icon: MessageCircle,
    title: "DM from Comments",
    description:
      "Automatically send a DM to users who comment on a selected post.",
    comingSoon: false,
    href: "/insta/automations/add/comments",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "stories",
    icon: BookOpen,
    title: "DM from Stories",
    description:
      "Auto-DM users who engage with your Story (replies, likes, reactions).",
    comingSoon: false,
    href: "/insta/automations/add/stories",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "dms",
    icon: MessageSquare,
    title: "Respond to all DMs",
    description: "Auto-respond to every incoming DM.",
    comingSoon: false,
    href: "/insta/automations/add/dms",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "live",
    icon: Radio,
    title: "DM from Live Comments",
    description:
      "Send automatic DMs to users commenting during your Instagram Live sessions.",
    comingSoon: true,
    href: "#",
    gradient: "from-gray-500 to-gray-600",
  },
];

// Page-specific styles (only what's unique to this page)
function buildPageStyles(
  isDark: boolean,
  styles: ReturnType<typeof useThemeStyles>["styles"],
) {
  return {
    // Card - combines theme card with page-specific hover effects
    card: (comingSoon: boolean) =>
      `${styles.card} rounded-2xl p-6 md:p-8 transition-all group ${
        comingSoon
          ? "opacity-70 cursor-not-allowed"
          : isDark
            ? "hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 cursor-pointer"
            : "hover:border-gray-200 hover:shadow-md hover:shadow-black/5 cursor-pointer"
      }`,
    disabledCard: isDark
      ? `${styles.card} rounded-2xl p-6 md:p-8 opacity-60 cursor-not-allowed border-red-500/30`
      : `${styles.card} rounded-2xl p-6 md:p-8 opacity-70 cursor-not-allowed border-red-200`,
    warning: isDark
      ? "mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
      : "mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600",
    warningButton:
      "mt-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold h-8 px-4",

    // Coming Soon badge - completely unique to this page
    comingSoonBadge: isDark
      ? "absolute top-4 right-4 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-medium rounded-full"
      : "absolute top-4 right-4 px-2.5 py-1 bg-pink-500 text-white text-xs font-medium rounded-full",

    // Icon container - uses gradient from type, rest is page-specific
    iconContainer: (comingSoon: boolean, gradient: string) =>
      `w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform ${
        comingSoon
          ? isDark
            ? "bg-white/5 border border-white/10"
            : "bg-gray-50 border border-gray-100"
          : `bg-gradient-to-br ${gradient}`
      }`,

    // Icon color - page-specific based on comingSoon state
    icon: (comingSoon: boolean) =>
      `h-6 w-6 ${
        comingSoon ? (isDark ? "text-white/40" : "text-gray-400") : "text-white"
      }`,

    // Title - uses theme text colors with page-specific opacity
    title: (comingSoon: boolean) =>
      `text-lg font-semibold mb-2 ${
        comingSoon
          ? isDark
            ? "text-white/40"
            : "text-gray-400"
          : styles.text.primary
      }`,

    // Description - uses theme text colors with page-specific opacity
    description: (comingSoon: boolean) =>
      `text-sm leading-relaxed ${
        comingSoon
          ? isDark
            ? "text-white/30"
            : "text-gray-400"
          : styles.text.secondary
      }`,
  };
}

export default function AddAutomationPage() {
  const { styles, isDark } = useThemeStyles();
  const pageStyles = buildPageStyles(isDark, styles);
  const { userId } = useAuth();
  const router = useRouter();
  const { apiRequest } = useApi();
  const { selectedAccount } = useInstaAccount();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const dmSent = selectedAccount?.accountDMSent || 0;
  const followChecks = selectedAccount?.accountFollowCheck || 0;
  const dmLimitReached = !isSubscribed && dmSent >= FREE_DM_LIMIT;
  const followCheckLimitReached =
    !isSubscribed && followChecks >= FREE_FOLLOW_CHECK_LIMIT;

  const fetchSubscription = useCallback(async () => {
    if (!userId) return;
    const result = await getSubscriptioninfo(apiRequest);
    setIsSubscribed(!!result.subscriptions?.length);
  }, [apiRequest, userId]);

  useEffect(() => {
    fetchSubscription().catch(() => setIsSubscribed(false));
  }, [fetchSubscription]);

  return (
    <div
      className={
        isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen"
      }
    >
      {isDark && <Orbs />}
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto relative z-10">
        {dmLimitReached && (
          <div className={pageStyles.warning}>
            DM send is full ({FREE_DM_LIMIT.toLocaleString()}/
            {FREE_DM_LIMIT.toLocaleString()}). New automations can be created
            only as disabled and will not work because global automation is
            stopped. Upgrade to Pro to use automations again.
            <div>
              <Button
                onClick={() => router.push("/insta/pricing")}
                className={pageStyles.warningButton}
              >
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Upgrade to use
              </Button>
            </div>
          </div>
        )}
        {!dmLimitReached && followCheckLimitReached && (
          <div className={pageStyles.warning}>
            Follow-check is full ({FREE_FOLLOW_CHECK_LIMIT}/
            {FREE_FOLLOW_CHECK_LIMIT}). Follow gates will be skipped and the
            automation will proceed to the next step.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automationTypes.map((type) => {
            const Icon = type.icon;
            const disabled = type.comingSoon || dmLimitReached;
            const card = (
              <div
                className={
                  dmLimitReached && !type.comingSoon
                    ? pageStyles.disabledCard
                    : pageStyles.card(type.comingSoon)
                }
              >
                {/* Coming Soon badge */}
                {type.comingSoon && (
                  <div className={pageStyles.comingSoonBadge}>Coming Soon</div>
                )}

                {/* Icon */}
                <div
                  className={pageStyles.iconContainer(
                    type.comingSoon,
                    type.gradient,
                  )}
                >
                  <Icon
                    className={pageStyles.icon(type.comingSoon)}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Text */}
                <h3 className={pageStyles.title(type.comingSoon)}>
                  {type.title}
                </h3>
                <p className={pageStyles.description(type.comingSoon)}>
                  {dmLimitReached && !type.comingSoon
                    ? "DM send is full. Upgrade to Pro to use this automation."
                    : type.description}
                </p>
              </div>
            );

            if (disabled) {
              return <div key={type.id}>{card}</div>;
            }

            return (
              <Link key={type.id} href={type.href}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
