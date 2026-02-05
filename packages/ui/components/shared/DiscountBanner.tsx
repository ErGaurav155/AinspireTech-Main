"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RocketIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useTheme } from "next-themes";

const DiscountBanner = () => {
  const [days, setDays] = useState("00");
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [seconds, setSeconds] = useState("00");
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark
        ? "bg-gradient-to-r from-[#0a0a0a]/90 to-[#1a1a1a]/90"
        : "bg-gradient-to-b from-gray-200 to-gray-50",
      borderColor: isDark ? "border-[#11df78]/30" : "border-green-200",
      scrollBannerBg: isDark
        ? "bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a]"
        : "bg-gradient-to-r from-white to-gray-50",
      scrollBannerBorder: isDark ? "border-[#00F0FF]/20" : "border-blue-200",
      countdownBg: isDark
        ? "bg-[#0a0a0a] border-[#00F0FF]/30"
        : "bg-white border-blue-200",
      countdownText: isDark ? "text-gray-300" : "text-gray-800",
      closeButtonBg: isDark
        ? "bg-[#1a1a1a]/80 border-[#333] hover:bg-[#FF2E9F]/20 hover:border-[#FF2E9F]/50"
        : "bg-gray-100 border-gray-300 hover:bg-[#FF2E9F]/20 hover:border-[#FF2E9F]/50",
      saleBadgeBg: isDark
        ? "bg-transparent border text-[#FF2E9F]"
        : "bg-transparent border border-[#FF2E9F] text-[#FF2E9F]",
      gradientOverlay: isDark
        ? "bg-gradient-to-r from-transparent via-[#00F0FF]/10 to-transparent group-hover:via-[#B026FF]/20"
        : "bg-gradient-to-r from-transparent via-blue-100 to-transparent group-hover:via-purple-100",
    };
  }, [currentTheme]);
  const initialCountdownDate = new Date("2024-07-13T13:00:00").getTime();

  const getNextCountdownDate = useCallback(() => {
    const now = new Date().getTime();
    if (now > initialCountdownDate) {
      const daysSinceInitial = Math.floor(
        (now - initialCountdownDate) / (1000 * 60 * 60 * 24),
      );
      const nextCountdownDate =
        initialCountdownDate +
        (daysSinceInitial + 2 - (daysSinceInitial % 2)) * 24 * 60 * 60 * 1000;
      return nextCountdownDate;
    } else {
      return initialCountdownDate;
    }
  }, [initialCountdownDate]);

  const [countdownDate, setCountdownDate] = useState(getNextCountdownDate);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = countdownDate - now;

      if (distance < 0) {
        const newCountdownDate = getNextCountdownDate();
        setCountdownDate(newCountdownDate);
        setIsVisible(true);
      } else {
        setDays(
          Math.floor(distance / (1000 * 60 * 60 * 24))
            .toString()
            .padStart(2, "0"),
        );
        setHours(
          Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            .toString()
            .padStart(2, "0"),
        );
        setMinutes(
          Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
            .toString()
            .padStart(2, "0"),
        );
        setSeconds(
          Math.floor((distance % (1000 * 60)) / 1000)
            .toString()
            .padStart(2, "0"),
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownDate, getNextCountdownDate]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className=" relative z-50 bg-transparent mt-5 top-0 left-0 w-[95vw] md:w-full mx-2 overflow-hidden rounded-xl ">
      <div className="absolute inset-0  rounded-xl">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full opacity-5 blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-r from-[#FF2E9F] to-[#B026FF] rounded-full opacity-5 blur-2xl animate-pulse delay-1000"></div>
      </div>
      <div
        className={`rounded-xl flex flex-col gap-1 justify-center items-center border ${
          themeStyles.borderColor
        }  text-foreground font-sans p-2 md:py-5 md:px-6 shadow-2xl ${
          theme === "dark" ? "shadow-[#00F0FF]/10" : "shadow-blue-200/20"
        }`}
      >
        {/* Close Button */}
        <div className="flex flex-row-reverse items-center justify-between w-full">
          <button
            onClick={handleClose}
            className={`relative p-1.5 rounded-full ${themeStyles.closeButtonBg} transition-all duration-300 group z-40`}
          >
            <XMarkIcon
              height={18}
              width={18}
              className="text-[#FF2E9F] group-hover:scale-110 transition-transform"
            />
          </button>
          <div
            className={`relative ${themeStyles.saleBadgeBg} p-1 px-2 rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300`}
          >
            <div className="absolute -top-2 -right-2">
              <SparklesIcon className="h-5 w-5 text-yellow-300 animate-pulse" />
            </div>
            <div className="text-sm font-normal tracking-wide">
              !!! 75% Off !!!
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between w-full">
          {/* Main Content */}
          <div className="flex flex-row gap-2 md:gap-6 justify-center items-center w-full relative z-10">
            {/* Countdown Timer */}
            <div className="flex gap-1 md:gap-2">
              {[
                { value: days, label: "DAYS" },
                { value: hours, label: "HRS" },
                { value: minutes, label: "MIN" },
                { value: seconds, label: "SEC" },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className={`${themeStyles.countdownBg} text-xs font-light md:text-sm md:font-normal p-1 md:py-2 md:px-4 rounded-lg shadow-inner border ${themeStyles.scrollBannerBorder}`}
                  >
                    {item.value}
                  </div>
                  <div
                    className={`text-xs md:text-sm ${themeStyles.countdownText} mt-1.5 tracking-wide font-montserrat`}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Link
              href="/web/pricing"
              className="relative overflow-hidden group"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-lg group-hover:from-[#B026FF] group-hover:to-[#FF2E9F] transition-all duration-500"></div>
              <div className="relative bg-gradient-to-r from-[#00F0FF] to-[#B026FF] group-hover:from-[#B026FF] group-hover:to-[#FF2E9F]  text-black font-semibold py-2 px-1 md:py-3 md:px-6 rounded-lg hover:rounded-lg transform group-hover:scale-105  transition-all duration-300 uppercase tracking-wide text-xs md:text-sm text-nowrap">
                Buy Now
              </div>
              {isHovered && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <SparklesIcon className="h-4 w-4 text-white animate-bounce" />
                </div>
              )}
            </Link>
          </div>

          {/* Scrolling Banner */}
          <Link
            href={"/insta/pricing"}
            className={`md:mt-3 w-full overflow-hidden rounded-lg relative group p-0 ${themeStyles.scrollBannerBg}`}
          >
            <div
              className={`absolute inset-0 ${themeStyles.gradientOverlay} transition-all duration-1000 text-sm border ${themeStyles.scrollBannerBorder} rounded-lg `}
            ></div>
            <div
              className={`flex animate-scroll-left whitespace-nowrap py-1 md:py-3 relative z-10 text-sm font-montserrat`}
            >
              <span className="font-light text-sm">
                🚀 Get <span className="text-[#00F0FF]">One Month Free</span>{" "}
                For Yearly Subscription
              </span>
              <span className="mx-3 text-[#B026FF]">•</span>
              <span>On all AI Products</span>
              <span className="mx-3 text-[#B026FF]">•</span>
              <RocketIcon className="ml-2 text-[#B026FF] animate-bounce" />
              <span className="mx-3 text-[#B026FF]">•</span>
              <span>Limited Time Offer</span>
            </div>
          </Link>
        </div>
        {/* Decorative Dots */}
        <div className="absolute -bottom-2 left-4 flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-[#00F0FF] rounded-full opacity-60"
            ></div>
          ))}
        </div>
        <div className="absolute -top-2 right-4 flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-[#FF2E9F] rounded-full opacity-60"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiscountBanner;
