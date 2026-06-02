"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";

const banners = [
  {
    match: "/insta",
    href: "/insta/pricing",
    text: "Made in India · ManyChat ₹12,999/yr vs RocketReplai ₹99 first month, then ₹499/mo",
  },
  {
    match: "/web",
    href: "/web/pricing",
    text: "Made in India · Global chatbots from $29/mo vs RocketReplai ₹499 first month, then ₹999/mo",
  },
  {
    match: "/call",
    href: "/call/pricing",
    text: "Made in India · Reception desk cost vs RocketReplai AI Calls from ₹2,999/mo",
  },
];

export function TopPromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const banner = banners.find(
    (item) => pathname === item.match || pathname?.startsWith(`${item.match}/`),
  );

  if (!isVisible || !banner) {
    return null;
  }

  return (
    <div className="relative z-[60] w-full overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white">
      <div className="hidden h-10 items-center justify-center px-10 text-center text-sm font-bold sm:flex">
        <Link
          href={banner.href}
          className="inline-flex items-center gap-2 transition hover:opacity-90"
        >
          <span>{banner.text}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>

      <Link
        href={banner.href}
        className="flex h-10 items-center overflow-hidden pr-12 text-[11px] font-bold sm:hidden"
      >
        <div className="top-promo-marquee flex min-w-max items-center gap-8 whitespace-nowrap">
          <span className="inline-flex items-center gap-2">
            {banner.text}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </span>
          <span className="inline-flex items-center gap-2" aria-hidden="true">
            {banner.text}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>
      </Link>

      <button
        type="button"
        aria-label="Dismiss promotion"
        onClick={() => setIsVisible(false)}
        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <style jsx>{`
        .top-promo-marquee {
          animation: top-promo-scroll 16s linear infinite;
        }

        @keyframes top-promo-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .top-promo-marquee {
            animation: none;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
