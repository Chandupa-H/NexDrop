import { Suspense } from "react";
import {
  DeliveryHistoryPage,
  DeliveryHistorySkeleton,
} from "@/features/couriers/components/DeliveryHistoryPage";

export default function CourierDeliveryHistoryRoute() {
  return (
    <Suspense fallback={<DeliveryHistorySkeleton />}>
      <DeliveryHistoryPage />
    </Suspense>
  );
}
