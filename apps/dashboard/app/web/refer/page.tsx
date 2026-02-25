import { Suspense } from "react";
import ReferEarnPage from "@/components/shared/ReferEarnPage";

export default function WebReferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading referral program...</p>
          </div>
        </div>
      }
    >
      <ReferEarnPage dashboardType="web" />
    </Suspense>
  );
}
