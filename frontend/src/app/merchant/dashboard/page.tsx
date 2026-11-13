import { Suspense } from "react";
import { MerchantDashboardView } from "@/features/merchants/components/MerchantDashboardView";
import MerchantDashboardLoading from "./loading";

export const metadata = {
  title: "Merchant Dashboard — NexDrop",
  description: "Merchant delivery management portal: parcel tracking, order creation, API keys, and webhooks.",
};

export default function MerchantDashboardPage() {
  return (
    <Suspense fallback={<MerchantDashboardLoading />}>
      <MerchantDashboardView />
    </Suspense>
  );
}

