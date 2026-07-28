import { Suspense } from "react";
import PayoutPage from "@/components/shared/PayoutPage";
import { Spinner } from "@rocketreplai/ui";

export default function CallPayoutPage() {
  return (
    <Suspense fallback={<Spinner label="Loading payout details…" />}>
      <PayoutPage dashboardType="call" />
    </Suspense>
  );
}
