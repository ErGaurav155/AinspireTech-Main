"use client";

import { Sparkles, Play } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useMemo } from "react";

const ProductShowcase = () => {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-transparent" : "bg-transparent",
      cardBg: isDark
        ? "bg-gradient-to-br from-[#8923a3]/10 to-[#00F0FF]/5 backdrop-blur-sm border border-white/10"
        : "bg-gradient-to-br from-[#8923a3]/5 to-[#00F0FF]/10 backdrop-blur-sm border border-gray-200",
      backgroundAnimation: isDark
        ? "bg-gradient-to-r from-[#00F0FF]/5 via-[#B026FF]/5 to-[#FF2E9F]/5"
        : "bg-gradient-to-r from-[#00F0FF]/10 via-[#B026FF]/10 to-[#FF2E9F]/10",
      titleColor: isDark ? "text-white" : "text-n-8",
      descriptionColor: isDark ? "text-gray-300" : "text-n-5",
      outlineButtonBg: isDark
        ? "border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
        : "border-gray-300 text-n-5 hover:bg-gray-100 backdrop-blur-sm",
    };
  }, [currentTheme]);
  return (
    <div
      className={`w-full ${themeStyles.containerBg} text-foreground relative overflow-hidden`}
    >
      <div className="relative max-w-4xl w-full m-auto z-10 px-4 sm:px-6 lg:px-8">
        {/* Enhanced Bottom CTA Section */}
        <div className="text-center">
          <div
            className={`relative overflow-hidden rounded-3xl ${themeStyles.cardBg} p-8 md:p-12`}
          >
            {/* Background animation */}
            <div
              className={`absolute inset-0 ${themeStyles.backgroundAnimation}`}
            />

            <div className="relative z-10">
              <h3
                className={`text-3xl md:text-4xl font-bold ${themeStyles.titleColor} mb-4 font-montserrat`}
              >
                Ready to Transform Your Web/Insta Automation?
              </h3>

              <p
                className={`${themeStyles.descriptionColor} mb-8 text-lg leading-relaxed font-montserrat`}
              >
                Join thousands of businesses already using our AI solutions to
                automate customer engagement and boost conversions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/web"
                  className="bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] hover:shadow-xl text-black font-semibold px-8 py-6 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Web Automation
                </Link>

                <Link
                  href="/insta"
                  className={`${themeStyles.outlineButtonBg} px-8 py-6 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105`}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Insta Automation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductShowcase;
