import { DashboardData } from "@/features/couriers/components/DashboardData";

export const metadata = {
  title: "Courier Dashboard — NexDrop",
  description: "Courier delivery fleet dashboard: assigned deliveries, delivery overview, and live route status.",
};

export default function CourierDashboardPage() {
  return <DashboardData />;
}
