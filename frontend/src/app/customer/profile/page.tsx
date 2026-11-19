import { Suspense } from "react";
import { getCustomerProfile } from "@/features/customers/api/customer.api";
import { mapCustomerProfile } from "@/features/customers/api/customer.mappers";
import { CustomerProfileView } from "@/features/customers/components/CustomerProfileView";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Customer Profile - NexDrop",
  description: "View and manage your NexDrop customer profile and address preferences.",
};

async function ProfileContent() {
  const profileDto = await getCustomerProfile();
  const profile = mapCustomerProfile(profileDto);

  return <CustomerProfileView initialProfile={profile} />;
}

export default function CustomerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
