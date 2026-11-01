import { Suspense } from "react";
import { CustomerDashboardData } from "@/features/customers/components/DashboardData";
import CustomerDashboardSkeleton from "./loading";

export const metadata = {
  title: "Customer Dashboard — NexDrop",
  description:
    "Customer delivery portal: track parcels, view delivery history, estimate shipping fees, and manage orders.",
};

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<CustomerDashboardSkeleton />}>
      <CustomerDashboardData />
    </Suspense>
  );
}
