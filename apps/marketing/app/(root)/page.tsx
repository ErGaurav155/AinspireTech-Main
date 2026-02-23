// app/page.tsx
"use client";

import TestimonialSection from "@/components/shared/Testimonial";
import HeroSection from "@/components/web/Hero";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DiscountBanner from "@rocketreplai/ui/components/shared/DiscountBanner";
import { BusinessMessagingTemplate } from "@/components/shared/BusinessMessagingTemplate";
import StickyScrollFeatures from "@/components/shared/EngagementToolsection";
import { AIVoiceAgentShowcase } from "@/components/shared/OurProducts";
import OutProduct from "@/components/shared/product";

const Home = () => {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);

    const ref = searchParams.get("ref");

    if (ref) {
      const existingRef = localStorage.getItem("referral_code");

      if (!existingRef) {
        localStorage.setItem("referral_code", ref);
        document.cookie = `referral_code=${ref}; path=/; max-age=604800`; // 7 days
        console.log("Referral code stored:", ref);
      }
    }
  }, [searchParams]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex wrapper2 relative bg-transparent z-10 flex-col gap-1 items-center justify-center">
      <DiscountBanner />
      <HeroSection />
      <BusinessMessagingTemplate />
      <StickyScrollFeatures />
      <AIVoiceAgentShowcase />
      <OutProduct />
      <TestimonialSection />
    </div>
  );
};

export default Home;
