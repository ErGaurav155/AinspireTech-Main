"use client";

import { X } from "lucide-react";
import { Button } from "@rocketreplai/ui";
import { useMemo } from "react";

import { useThemeStyles } from "@rocketreplai/ui";
import { getInstagramAuthUrl } from "@/lib/instagram-auth";

interface LoginPageProps {
  onClose?: () => void;
}

export default function LoginPage({ onClose }: LoginPageProps) {
  const { isDark } = useThemeStyles(); // we only need isDark here

  const pageStyles = useMemo(() => {
    return {
      container: isDark ? "p-6 bg-[#1A1A1E]" : "p-6 bg-white",
      header: "flex items-center justify-between mb-4",
      title: isDark
        ? "text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent"
        : "text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent",
      closeButton: isDark
        ? "p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
        : "p-1.5 rounded-lg hover:bg-gray-100 transition-colors",
      closeIcon: isDark ? "h-5 w-5 text-white/40" : "h-5 w-5 text-gray-400",
      description: isDark
        ? "text-sm text-white/40 mb-6"
        : "text-sm text-gray-500 mb-6",
      authButton: isDark
        ? "w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white transition-colors"
        : "w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white transition-colors",
      error: isDark
        ? "p-6 text-center text-red-400"
        : "p-6 text-center text-red-600",
    };
  }, [isDark]);

  const authUrl = getInstagramAuthUrl();

  if (!authUrl) {
    console.error("Instagram App ID is not defined");
    return (
      <div className={pageStyles.error}>
        <p>Error: Missing Instagram configuration</p>
        {onClose && (
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={pageStyles.container}>
      <div className={pageStyles.header}>
        <h2 className={pageStyles.title}>Connect Instagram</h2>
        {onClose && (
          <button onClick={onClose} className={pageStyles.closeButton}>
            <X className={pageStyles.closeIcon} />
          </button>
        )}
      </div>

      <p className={pageStyles.description}>
        You will be redirected to Instagram to authorize access to your Business
        account.
      </p>

      <a href={authUrl} className={pageStyles.authButton}>
        Continue with Instagram
      </a>
    </div>
  );
}
