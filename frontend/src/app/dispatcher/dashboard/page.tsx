import { Suspense } from "react";
import { DashboardData } from "@/features/dispatcher/components/DashboardData";
import DashboardSkeleton from "./loading";

export const metadata = {
  title: "Dispatcher Dashboard — NexDrop",
  description: "Dispatcher fleet operations, live parcels status and delivery tracking.",
};

export default function DispatcherDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

