import { Suspense } from "react";
import ReferEarnPage from "@/components/shared/ReferEarnPage";
import { Spinner } from "@rocketreplai/ui";

export default function WebReferPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReferEarnPage dashboardType="web" />
    </Suspense>
  );
}
