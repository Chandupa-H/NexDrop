import { Suspense } from "react";
import { getCustomerProfile } from "@/features/customers/api/customer.api";
import { mapCustomerProfile } from "@/features/customers/api/customer.mappers";
import { PageHeader, SectionCard } from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Mail, Phone, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Customer Profile — NexDrop",
  description: "View and manage your NexDrop customer profile and address preferences.",
};

async function ProfileContent() {
  const profileDto = await getCustomerProfile();
  const profile = mapCustomerProfile(profileDto);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="My Profile"
        subtitle="Manage your personal contact information and delivery preferences"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Contact Information" subtitle="Your primary details for notifications">
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">Full Name</p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">{profile.fullName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">Email Address</p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">Contact Number</p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">{profile.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">Account Role</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--dashboard-success-bg)] text-[var(--dashboard-success-text)] capitalize">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Default Delivery Address" subtitle="Used automatically for pickup & drop-offs">
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">Street Address</p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">{profile.defaultAddress}</p>
                <p className="text-sm text-[var(--dashboard-muted)]">
                  {profile.city}, {profile.postalCode}
                </p>
                <p className="text-xs text-[var(--dashboard-muted)]">Sri Lanka</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]">
              <p className="text-xs font-medium text-[var(--dashboard-text)]">Delivery Note Preference</p>
              <p className="text-xs text-[var(--dashboard-muted)] mt-1">
                Couriers will attempt delivery during standard daytime hours (8:00 AM – 6:00 PM).
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
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
