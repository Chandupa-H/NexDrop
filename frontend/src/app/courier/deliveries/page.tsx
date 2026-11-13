import { Suspense } from "react";
import {
  AssignedDeliveries,
  AssignedDeliveriesSkeleton,
} from "@/features/couriers/components/AssignedDeliveries";

export const metadata = {
  title: "Today's Assigned Deliveries — NexDrop",
  description: "View and filter the deliveries assigned to you today.",
};

export default function CourierDeliveriesPage() {
  return (
    <Suspense fallback={<AssignedDeliveriesSkeleton />}>
      <AssignedDeliveries />
    </Suspense>
  );
}
