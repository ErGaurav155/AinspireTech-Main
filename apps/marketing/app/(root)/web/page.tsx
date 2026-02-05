"use client";

import { AIAgentHero } from "@/components/web/AiAgentHero";
import { SetupProcess } from "@/components/web/setupProcess";
import FeatureComparisonTable from "@/components/web/WebPriceComparison";
import WebTestimonialsSection from "@/components/web/WebTestimonialSection";
import WebFeaturesGrid from "@/components/web/WebFeatureGrid";
import { WebCTASection } from "@/components/web/WebCta";
import { useEffect, useState } from "react";
import { BreadcrumbsDefault } from "@ainspiretech/ui/components/shared/breadcrumbs";
import Faq from "@ainspiretech/ui/components/shared/Faq";
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent  flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl m-auto  ">
      {/* Hero Section */}
      <BreadcrumbsDefault />
      <AIAgentHero />
      <SetupProcess />
      <div className="container mx-auto px-4 py-20">
        <WebFeaturesGrid />
        <FeatureComparisonTable />
        <WebTestimonialsSection />
        <WebCTASection />
        <Faq />
      </div>
    </div>
  );
}
