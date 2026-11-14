import { Suspense } from "react";
import { CustomerReceiptRoute } from "@/features/customers/components/CustomerReceiptView";

export const metadata = {
  title: "Shipment Receipt - NexDrop Customer",
  description: "View and print a shipment summary. This is not proof of payment.",
};

export default function CustomerReceiptPage() {
  return (
    <Suspense fallback={<p role="status">Loading shipment receipt...</p>}>
      <CustomerReceiptRoute />
    </Suspense>
  );
}
