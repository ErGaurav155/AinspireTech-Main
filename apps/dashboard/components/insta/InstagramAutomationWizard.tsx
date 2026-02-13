"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { useMemo } from "react";

export default function LoginPage() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]" : "bg-gray-50",
      textPrimary: isDark ? "text-white" : "text-n-7",
    };
  }, [currentTheme]);
  // Theme-based styles

  const instaId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;

  if (!instaId) {
    console.error("Instagram App ID is not defined");
    return <div>Error: Missing configuration</div>;
  }

  const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${instaId}&redirect_uri=${encodeURIComponent(
    "https://rocketreplai.com/insta/pricing",
  )}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights`;

  return (
    <div
      className={` ${themeStyles.textPrimary} flex items-center justify-center `}
    >
      <div className="max-w-md w-full p-0 md:p-6 backdrop-blur-md rounded-lg shadow-md">
        <h1
          className={`text-xl md:text-2xl font-bold mb-6 text-center  ${themeStyles.textPrimary}`}
        >
          Instagram Business Login
        </h1>
        <Link
          href={authUrl}
          className="w-full flex items-center justify-center p-2 md:px-4 md:py-3 border border-transparent rounded-md shadow-sm text-base font-medium bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#B026FF] text-white hover:to-[#00F0FF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Connect Instagram Account
        </Link>
      </div>
    </div>
  );
}
