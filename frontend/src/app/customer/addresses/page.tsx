import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard";
import { SavedAddressesCard } from "@/features/customers/components/SavedAddressesCard";
import { getCustomerProfile } from "@/features/customers/api/customer.api";
import { mapCustomerProfile } from "@/features/customers/api/customer.mappers";

export const metadata = {
  title: "Saved Addresses - NexDrop Customer",
  description:
    "Manage frequently used pickup origin locations and recipient drop-off destinations for rapid booking.",
};

async function CustomerAddressesContent() {
  const profileDto = await getCustomerProfile();
  const profile = mapCustomerProfile(profileDto);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved Addresses"
        subtitle="Manage frequently used pickup origins and recipient delivery destinations with 1-click booking"
      />

      <div className="w-full">
        <SavedAddressesCard
          initialAddress={profile.defaultAddress}
          city={profile.city}
          postalCode={profile.postalCode}
          userName={profile.fullName}
          title="All Saved Locations"
          subtitle="Complete address book for pickup origins and recipient destinations across Sri Lanka"
        />
      </div>
    </div>
  );
}

export default function CustomerAddressesPage() {
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
      <CustomerAddressesContent />
    </Suspense>
  );
}
