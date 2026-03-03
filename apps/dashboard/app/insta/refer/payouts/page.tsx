import { Suspense } from "react";
import PayoutPage from "@/components/shared/PayoutPage";
import { Spinner } from "@/components/shared/Spinner";

export default function InstaPayoutPage() {
  return (
    <Suspense fallback={<Spinner label="Loading payout details…" />}>
      <PayoutPage dashboardType="insta" />
    </Suspense>
  );
}
