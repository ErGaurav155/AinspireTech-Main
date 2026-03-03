import { Suspense } from "react";
import ReferEarnPage from "@/components/shared/ReferEarnPage";
import { Spinner } from "@/components/shared/Spinner";

export default function WebReferPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReferEarnPage dashboardType="web" />
    </Suspense>
  );
}
