"use client";

import { MapPin, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import Logo from "../../../public/assets/img/logo.png";

export function Footer() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const currentTheme = resolvedTheme || theme || "light";
  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      footerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-gray-50/80",
      borderColor: isDark ? "border-[#00F0FF]/30" : "border-blue-300",
      lightBorderColor: isDark ? "border-[#00F0FF]/10" : "border-gray-200",
      logoBg: isDark ? "bg-[#0A0A0A]" : "bg-white",
      linkText: isDark
        ? "text-gray-300 hover:text-[#00F0FF]"
        : "text-n-5 hover:text-[#00F0FF]",
      titleText: isDark ? "text-white" : "text-n-5",
      subtitleText: isDark ? "text-gray-300" : "text-n-5",
      inputBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      inputBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-300",
      inputText: isDark ? "text-white" : "text-n-5",
      inputPlaceholder: isDark
        ? "placeholder-gray-500"
        : "placeholder-gray-400",
      iconBg: isDark
        ? "bg-gradient-to-r from-[#00F0FF]/20 to-[#B026FF]/20"
        : "bg-gradient-to-r from-[#00F0FF]/10 to-[#B026FF]/10",
      copyrightText: isDark ? "text-gray-400" : "text-n-4",
    };
  }, [currentTheme]);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className=" bg-transparent  flex items-center justify-center h-full w-full">
        <div className="w-5 h-5  border-t-transparent  rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <footer
      className={`w-full border-t ${themeStyles.borderColor} ${themeStyles.footerBg}`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10  backdrop-blur-sm`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Logo and Navigation */}
          <div className="flex flex-col items-center md:items-start">
            <div className="mb-6">
              <Link href="/" className="flex items-center">
                <div className="relative w-10 h-10 mr-3">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] animate-pulse"></div>
                  <div
                    className={`absolute inset-1 rounded-full ${themeStyles.logoBg} flex items-center justify-center`}
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
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
                  Ainpire<span className="text-[#B026FF]">Tech</span>
                </h1>
              </Link>
            </div>
            <ul className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 font-montserrat">
              {[
                { href: "/contactUs", label: "Contact Us" },
                { href: "/privacy-policy", label: "Privacy Policy" },
                { href: "/TermsandCondition", label: "Terms & Conditions" },
              ].map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className={`font-normal transition-colors duration-300 ${themeStyles.linkText}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${themeStyles.iconBg}`}>
                <MapPin className="text-[#00F0FF] size-5" />
              </div>
              <div>
                <h3 className={`font-bold ${themeStyles.titleText}`}>
                  Address
                </h3>
                <p className={`${themeStyles.subtitleText} font-montserrat`}>
                  Nashik, IND
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${themeStyles.iconBg}`}>
                <Mail className="text-[#00F0FF] size-5" />
              </div>
              <div>
                <h3 className={`font-bold ${themeStyles.titleText}`}>
                  Contact
                </h3>
                <a
                  href="mailto:gauravgkhaire@gmail.com"
                  className={`${themeStyles.subtitleText} hover:text-[#00F0FF] transition-colors duration-300 text-sm md:text-base font-montserrat`}
                >
                  gauravgkhaire@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className={`text-xl font-bold ${themeStyles.titleText} mb-4`}>
              Stay Updated
            </h3>
            <div className="relative w-full max-w-md">
              <input
                type="email"
                placeholder="Your email address"
                className={`w-full p-3 rounded-lg ${themeStyles.inputBg} backdrop-blur-sm border ${themeStyles.inputBorder} ${themeStyles.inputText} ${themeStyles.inputPlaceholder} focus:outline-none focus:ring-2 focus:ring-[#00F0FF] font-montserrat`}
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>
            <p
              className={`${themeStyles.subtitleText} text-sm mt-3 font-montserrat`}
            >
              Get the latest updates and offers
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div
          className={`mt-10 pt-6 border-t ${themeStyles.lightBorderColor} text-center font-montserrat`}
        >
          <p className={themeStyles.copyrightText}>
            © {new Date().getFullYear()} AInspireTech. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
