import { Suspense } from "react";
import { Spinner } from "@rocketreplai/ui";
import ReferEarnPage from "@/components/shared/ReferEarnPage";

export default function InstaReferPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReferEarnPage dashboardType="insta" />
    </Suspense>
  );
}
