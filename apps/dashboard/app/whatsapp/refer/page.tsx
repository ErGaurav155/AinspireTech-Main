import { Suspense } from "react";
import ReferEarnPage from "@/components/shared/ReferEarnPage";
import { Spinner } from "@rocketreplai/ui";

export default function WhatsAppReferPage() {
  return (
    <Suspense fallback={<Spinner label="Loading referral program…" />}>
      <ReferEarnPage dashboardType="whatsapp" />
    </Suspense>
  );
}
