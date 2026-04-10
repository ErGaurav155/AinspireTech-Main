import { Suspense } from "react";
import PayoutPage from "@/components/shared/PayoutPage";
import { Spinner } from "@rocketreplai/ui";

export default function WebPayoutPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PayoutPage dashboardType="web" />
    </Suspense>
  );
}
