import { FailedDeliveriesPage } from "@/features/couriers/components/FailedDeliveriesPage";

export const metadata = {
  title: "Failed Deliveries — NexDrop",
  description: "Review courier failed delivery attempts and redelivery status.",
};

export default function CourierFailedDeliveriesPage() {
  return <FailedDeliveriesPage />;
}
