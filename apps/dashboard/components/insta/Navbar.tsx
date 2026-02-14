"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Logo from "public/assets/img/logo.png";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@rocketreplai/ui/components/shared/theme-toggle";
import { Button } from "@rocketreplai/ui/components/radix/button";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const currentTheme = resolvedTheme || theme || "light";
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Theme-based styles (only after mounted)
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      cardBg: isDark ? "bg-transparent" : "bg-white/50",
      borderColor: isDark ? "border-white/10" : "border-gray-200",
      logoBg: isDark ? "bg-[#0A0A0A]" : "bg-white",
      linkText: isDark
        ? "text-gray-300 hover:text-[#00F0FF]"
        : "text-n-5 hover:text-[#00F0FF]",
      outlineButton: isDark
        ? "border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF]/10"
        : "border-[#00F0FF]/50 text-[#00F0FF] hover:bg-[#00F0FF]/5",
      mobileMenuBg: isDark ? "border-white/10" : "border-gray-200",
      mobileButton: isDark ? "text-white" : "text-gray-700",
    };
  }, [currentTheme]);

  if (!mounted) {
    return (
      <div className=" bg-transparent  flex items-center justify-center h-full w-full">
        <div className="w-5 h-5  border-t-transparent  rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <nav
      className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md pb-1 border-b transition-all duration-300 ${
        themeStyles.cardBg
      } ${isScrolled ? "rounded-lg shadow-md" : "rounded-none"}`}
    >
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative h-7 w-7 md:w-10 md:h-10 mr-1 md:mr-3">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] animate-pulse"></div>
              <div
                className={`absolute inset-1 rounded-full ${themeStyles.logoBg} flex items-center justify-center transition-colors duration-300`}
              >
                <Image
                  alt="Logo"
                  src={Logo}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-lg lg:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
              Ainpire<span className="text-[#B026FF]">Tech</span>
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 md:space-x-3 lg:space-x-4 text-sm lg:text-base ">
            <Link
              href="/insta/dashboard"
              className={`transition-colors font-medium ${themeStyles.linkText}`}
            >
              Dashboard
            </Link>
            <Link
              href="/insta/accounts"
              className={`transition-colors font-medium ${themeStyles.linkText}`}
            >
              Accounts
            </Link>
            <Link
              href="/insta/templates"
              className={`transition-colors font-medium ${themeStyles.linkText}`}
            >
              Templates
            </Link>
            <Link
              href="/insta/analytics"
              className={`transition-colors font-medium ${themeStyles.linkText}`}
            >
              Analytics
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-2 md:space-x-3 lg:space-x-4">
            <ThemeToggle />
            <Button
              className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-black hover:opacity-90 transition-opacity p-2 lg:px-4 "
              asChild
            >
              <Link href="/insta/pricing">
                <Zap className="hidden lg:flex h-4 w-4 mr-2" />
                <span className="hidden lg:inline-flex">Get&nbsp;</span>
                Pricing
              </Link>
            </Button>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center justify-center gap-2">
            <ThemeToggle />
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <Button
              variant="ghost"
              className="md:hidden text-xl text-[#00F0FF] border border-purple-700 rounded-md cursor-pointer px-2 py-1 whitespace-nowrap"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? "✕" : "☰"}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}

        <div
          className={`md:hidden transition-all duration-300  overflow-hidden ${
            isOpen ? "max-h-96" : "max-h-0"
          } bg-background/80 backdrop-blur-sm`}
        >
          <div className="flex flex-col space-y-3">
            <Link
              href="/insta/dashboard"
              className={`transition-colors font-medium px-2 py-1 ${themeStyles.linkText}`}
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/insta/accounts"
              className={`transition-colors font-medium px-2 py-1 ${themeStyles.linkText}`}
              onClick={() => setIsOpen(false)}
            >
              Accounts
            </Link>
            <Link
              href="/insta/templates"
              className={`transition-colors font-medium px-2 py-1 ${themeStyles.linkText}`}
              onClick={() => setIsOpen(false)}
            >
              Templates
            </Link>
            <Link
              href="/insta/analytics"
              className={`transition-colors font-medium px-2 py-1 ${themeStyles.linkText}`}
              onClick={() => setIsOpen(false)}
            >
              Analytics
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              <SignedOut>
                <Button
                  variant="outline"
                  className={`hover:opacity-90 transition-opacity ${themeStyles.outlineButton}`}
                  asChild
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </SignedOut>

              <Button
                className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-black hover:opacity-90 transition-opacity"
                asChild
              >
                <Link href="/insta/pricing">
                  <Zap className="h-4 w-4 mr-2" />
                  Get Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
