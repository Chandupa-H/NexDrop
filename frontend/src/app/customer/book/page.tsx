import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard";
import { BookDeliveryForm } from "@/features/customers/components/BookDeliveryForm";
import { getCustomerProfile, getCustomerAddressesServer } from "@/features/customers/api/customer.server";
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
    const addressDtos = await getCustomerAddressesServer();
    if (Array.isArray(addressDtos) && addressDtos.length > 0) {
      const mapped = addressDtos.map(mapDtoToSavedAddress);
      initialDefaultPickup = mapped.find((a) => a.addressType === "pickup" && a.isDefault);
      initialDefaultDropoff = mapped.find((a) => a.addressType === "dropoff" && a.isDefault);
    }
  } catch {
    // fallback to profile defaults
  }

  // If the customer has a default address in their profile but no saved addresses in DB yet
  if (!initialDefaultPickup && profile.defaultAddress) {
    initialDefaultPickup = {
      id: "profile-default",
      addressType: "pickup",
      label: "Home",
      address: profile.defaultAddress,
      city: profile.city || "",
      postalCode: profile.postalCode || "",
      isDefault: true,
      contactName: profile.fullName || "",
      phone: profile.phone || "",
    };
  }

  const senderContactName = profile.fullName || initialDefaultPickup?.contactName || "";
  const senderContactPhone = profile.phone || initialDefaultPickup?.phone || "";
  const senderPickupAddress = initialDefaultPickup?.address || profile.defaultAddress || "";
  const senderPickupCity = initialDefaultPickup?.city || profile.city || "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book Delivery"
        subtitle="Schedule a doorstep courier pickup with automated route pricing and live tracking"
      />

      <BookDeliveryForm
        customerName={senderContactName}
        defaultAddress={senderPickupAddress}
        defaultCity={senderPickupCity}
        customerPhone={senderContactPhone}
        userEmail={profile.email}
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
