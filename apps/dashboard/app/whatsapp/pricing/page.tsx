import WhatsAppAutomationDashboard from "@/components/whatsapp/WhatsAppAutomationDashboard";
import { PackageSubscriptionNotice } from "@/components/packages/PackageSubscriptionNotice";

export default function WhatsAppPricingPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <PackageSubscriptionNotice />
      </div>
      <WhatsAppAutomationDashboard view="pricing" />
    </>
  );
}
