import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard";
import { BookDeliveryForm } from "@/features/customers/components/BookDeliveryForm";
import { getCustomerProfile, getCustomerAddresses } from "@/features/customers/api/customer.api";
import { mapCustomerProfile } from "@/features/customers/api/customer.mappers";
import { mapDtoToSavedAddress, type SavedAddress } from "@/features/customers/hooks/useSavedAddresses";

export const metadata = {
  title: "Book Delivery - NexDrop Customer",
  description: "Schedule a new courier pickup and delivery across Sri Lanka with instant rate previews.",
};

async function BookDeliveryContent() {
  const profileDto = await getCustomerProfile();
  const profile = mapCustomerProfile(profileDto);

  let initialDefaultPickup: SavedAddress | undefined;
  let initialDefaultDropoff: SavedAddress | undefined;

  try {
    const addressDtos = await getCustomerAddresses();
    if (Array.isArray(addressDtos) && addressDtos.length > 0) {
      const mapped = addressDtos.map(mapDtoToSavedAddress);
      initialDefaultPickup = mapped.find((a) => a.addressType === "pickup" && a.isDefault);
      initialDefaultDropoff = mapped.find((a) => a.addressType === "dropoff" && a.isDefault);
    }
  } catch {
    // fallback to profile defaults
  }

  return (
    <div className="space-y-6">

      <PageHeader
        title="Book Delivery"
        subtitle="Schedule a doorstep courier pickup with automated route pricing and live tracking"
      />

      <BookDeliveryForm
        customerName={initialDefaultPickup?.contactName || ""}
        defaultAddress={initialDefaultPickup?.address || ""}
        defaultCity={initialDefaultPickup?.city || ""}
        customerPhone={initialDefaultPickup?.phone || ""}
        initialDefaultPickup={initialDefaultPickup}
        initialDefaultDropoff={initialDefaultDropoff}
      />
    </div>
  );
}

export default function BookDeliveryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-96 bg-gray-100 rounded-lg" />
          <div className="h-96 w-full bg-gray-100 rounded-2xl mt-6" />
        </div>
      }
    >
      <BookDeliveryContent />
    </Suspense>
  );
}
