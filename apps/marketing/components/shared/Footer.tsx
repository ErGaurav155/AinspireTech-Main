"use client";

import { Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/assets/img/logo.png";
import MetaImg from "@/public/assets/img/metaImg.png";

const productLinks = [
  { href: "/insta", label: "Insta automation" },
  { href: "/web", label: "Website chatbots" },
  { href: "/call", label: "AI calling" },
  { href: "/whatsapp", label: "WhatsApp automation" },
  { href: "/packages", label: "Packages" },
  { href: "/affiliate", label: "Affiliate" },
];

const companyLinks = [
  { href: "/contactUs", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/TermsandCondition", label: "Terms & Conditions" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 text-slate-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                alt="RocketReplai"
                src={Logo}
                className="h-20 w-200 object-contain"
                loading="lazy"
              />
            </Link>
            <p className=" max-w-sm text-sm leading-6">
              Simple automation tools for growing conversations, leads, and
              support without adding busywork.
            </p>
            <Image
              src={MetaImg}
              alt="Meta Business Partner"
              width={150}
              height={60}
              className="mt-5 h-10 w-auto object-contain opacity-85"
              loading="lazy"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
              Products
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
              Reach us
            </h3>
            <div className="mt-4 space-y-4 text-sm">
              <p className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <MapPin className="h-4 w-4" />
                </span>
                Nashik, India
              </p>
              <a
                href="mailto:support@rocketreplai.com"
                className="flex items-center gap-3 transition hover:text-blue-700 dark:hover:text-blue-300"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <Mail className="h-4 w-4" />
                </span>
                support@rocketreplai.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RocketReplai. All rights reserved.</p>
          <p className="text-slate-500 dark:text-slate-400">
            Built for faster customer conversations.
          </p>
        </div>
      </div>
    </footer>
  );
}
