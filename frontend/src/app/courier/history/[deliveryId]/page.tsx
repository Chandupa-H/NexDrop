import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryHistoryDetailPage } from "@/features/couriers/components/DeliveryHistoryDetailPage";

export default function CourierDeliveryHistoryDetailRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
      <DeliveryHistoryDetailPage />
    </Suspense>
  );
}
