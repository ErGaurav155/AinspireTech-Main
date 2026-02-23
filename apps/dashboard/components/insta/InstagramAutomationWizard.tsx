"use client";

import { X } from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";

interface LoginPageProps {
  onClose?: () => void;
}

export default function LoginPage({ onClose }: LoginPageProps) {
  const instaId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;

  if (!instaId) {
    console.error("Instagram App ID is not defined");
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Error: Missing Instagram configuration</p>
        {onClose && (
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        )}
      </div>
    );
  }

  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_reauth=true&client_id=${instaId}&redirect_uri=${encodeURIComponent(
    "https://ainspiretech.com/insta/pricing",
  )}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights`;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
          Connect Instagram
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        You will be redirected to Instagram to authorize access to your Business
        account.
      </p>

      <a
        href={authUrl}
        className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white transition-colors"
      >
        Continue with Instagram
      </a>
    </div>
  );
}
