import { Suspense } from "react";
import { DashboardData } from "@/features/couriers/components/DashboardData";
import DashboardSkeleton from "./loading";

export const metadata = {
  title: "Courier Dashboard — NexDrop",
  description: "Courier delivery fleet dashboard: assigned deliveries, delivery overview, and live route status.",
};

export default function CourierDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
