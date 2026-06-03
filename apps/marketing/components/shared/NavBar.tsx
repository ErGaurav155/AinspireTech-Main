"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Contact, LogIn, Menu, X } from "lucide-react";
import { Button, ThemeToggle } from "@rocketreplai/ui";
import Logo from "@/public/assets/img/logo.png";
import { withReferral } from "@/lib/referral";

const navItems = [
  { id: "insta", label: "Instagram", href: "/insta" },
  { id: "web", label: "Websites", href: "/web" },
  { id: "call", label: "AI Calls", href: "/call" },
  { id: "affiliate", label: "Affiliate", href: "/affiliate" },
];

export function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignInClick = () => {
    window.location.href = withReferral("https://app.rocketreplai.com");
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-shadow duration-300 dark:border-white/10 dark:bg-slate-950/80 ${
        isScrolled ? "shadow-sm shadow-slate-950/5" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="RocketReplai home"
          onClick={() => setIsMenuOpen(false)}
        >
          <Image
            alt="RocketReplai"
            src={Logo}
            priority
            className="h-40 w-auto object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 md:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`rounded-full text-nowrap px-4 py-2 transition-colors ${
                  isActive
                    ? "bg-white text-blue-700 shadow-sm dark:bg-white/10 dark:text-white"
                    : "hover:bg-white/70 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
            <ThemeToggle />
          </div>

          <Button
            variant="outline"
            className="hidden rounded-full border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 md:inline-flex"
            onClick={handleSignInClick}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>

          <Button
            className="hidden rounded-full bg-blue-700 px-5 font-semibold text-white shadow-sm shadow-blue-700/20 hover:bg-blue-800 md:inline-flex"
            onClick={() => router.push("/contactUs")}
          >
            <Contact className="mr-2 h-4 w-4" />
            Contact
          </Button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-slate-200/80 bg-white/95 transition-[max-height,opacity] duration-300 dark:border-white/10 dark:bg-slate-950/95 md:hidden ${
          isMenuOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-full border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
              onClick={() => {
                handleSignInClick();
                setIsMenuOpen(false);
              }}
            >
              Sign In
            </Button>
            <Button
              className="rounded-full bg-blue-700 text-white hover:bg-blue-800"
              onClick={() => {
                router.push("/contactUs");
                setIsMenuOpen(false);
              }}
            >
              Contact
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
