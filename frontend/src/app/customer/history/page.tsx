import { CustomerHistoryView } from "@/features/customers/components/CustomerHistoryView";

export const metadata = {
  title: "Delivery History - NexDrop Customer",
  description: "Browse customer bookings and shipment details.",
};

export default function CustomerHistoryPage() {
  return <CustomerHistoryView />;
}
