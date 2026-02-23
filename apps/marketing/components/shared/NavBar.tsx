"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "public/assets/img/logo.png";
import { Contact } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@rocketreplai/ui/components/shared/theme-toggle";

import { Button } from "@rocketreplai/ui/components/radix/button";

export function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState("home");
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      cardBg: isDark ? "bg-transparent" : "bg-white/50",
      textPrimary: isDark ? "text-gray-300" : "text-n-5",
      outlineButton: isDark
        ? "border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF]/10"
        : "border-[#00F0FF]/50 text-[#00F0FF] hover:bg-[#00F0FF]/5",
    };
  }, [currentTheme]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "insta", label: "Insta", href: "/insta" },
    { id: "web", label: "Web", href: "/web" },
    { id: "affiliate", label: "Affiliate", href: "/affiliate" },
    { id: "review", label: "Review", href: "/Review" },
  ];

  const handleNavClick = (id: string) => {
    setActiveNavItem(id);
    setIsMenuOpen(false);
  };

  // On marketing site (www.rocketreplai.com) - when user clicks sign-in
  const handleSignInClick = () => {
    const referralCode = localStorage.getItem("referral_code");
    const dashboardUrl = "https://app.rocketreplai.com";

    if (referralCode) {
      // Append referral code to URL
      window.location.href = `${dashboardUrl}?ref=${referralCode}`;
    } else {
      window.location.href = dashboardUrl;
    }
  };
  if (!mounted) {
    return (
      <div className="bg-transparent flex items-center justify-center w-full">
        <div className="w-5 h-5  border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <header
      className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b pb-1 transition-all duration-300 ${
        themeStyles.cardBg
      } ${isScrolled ? "rounded-lg shadow-md" : "rounded-none"}`}
    >
      {/* Logo */}
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center"
            onClick={() => handleNavClick("home")}
          >
            <div className="relative h-7 w-7 md:w-10 md:h-10 mr-1 md:mr-3">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] animate-pulse"></div>
              <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
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
          <nav className="hidden md:flex justify-evenly items-center space-x-3 lg:space-x-8 text-sm lg:text-base">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-link font-medium relative group cursor-pointer px-2 py-1 ${
                  activeNavItem === item.id
                    ? "text-[#00F0FF]"
                    : `${themeStyles.textPrimary}`
                }`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="hover:text-[#00F0FF] transition-colors">
                  {item.label}
                </span>
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-[#00F0FF] transition-all duration-300 ${
                    activeNavItem === item.id
                      ? "w-full"
                      : "w-0 group-hover:w-full"
                  }`}
                ></span>
              </Link>
            ))}
          </nav>

          {/* Desktop Right Section */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Contact Us Button */}
            <Button
              className="hidden md:flex bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-black hover:opacity-90 transition-opacity"
              onClick={() => router.push("/contactUs")}
            >
              <Contact className="h-4 w-4 mr-2" />
              Contact Us
            </Button>

            {/* Sign In Button */}
            <Button
              variant="outline"
              className={`hidden md:flex hover:opacity-90 transition-opacity ${themeStyles.outlineButton}`}
              onClick={handleSignInClick}
            >
              Sign In
            </Button>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-xl text-[#00F0FF] border border-purple-700 rounded-md cursor-pointer px-2 py-1 whitespace-nowrap"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMenuOpen ? "max-h-96" : "max-h-0"
          } bg-background/80 backdrop-blur-sm`}
        >
          <div className="flex flex-col space-y-3 py-4">
            {/* Navigation Links */}
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`text-foreground font-medium hover:text-[#00F0FF] transition-colors cursor-pointer px-2 py-1 ${
                  activeNavItem === item.id
                    ? "text-[#00F0FF]"
                    : ` ${themeStyles.textPrimary}`
                }`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Buttons */}
            <div className="flex flex-col space-y-2 pt-2">
              <Button
                className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-black hover:opacity-90 transition-opacity w-full"
                onClick={() => {
                  router.push("/contactUs");
                  setIsMenuOpen(false);
                }}
              >
                <Contact className="h-4 w-4 mr-2" />
                Contact Us
              </Button>

              <Button
                variant="outline"
                className={`hover:opacity-90 transition-opacity ${themeStyles.outlineButton} w-full`}
                onClick={() => {
                  handleSignInClick();
                  setIsMenuOpen(false);
                }}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
