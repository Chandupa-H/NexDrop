import { getCustomerProfile } from "../api/customer.api";
import { mapCustomerProfile } from "../api/customer.mappers";
import { customerDashboardConfig } from "../config/dashboard.config";
import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";

/**
 * Async server component that fetches customer profile and renders the user chip.
 * Wrapped in Suspense by the layout with CustomerTopbarUserSkeleton fallback.
 */
export async function CustomerTopbarUser({ profileHref }: { profileHref: string }) {
  const profile = mapCustomerProfile(await getCustomerProfile());

  return (
    <TopbarProfileLink
      user={{
        id: profile.id,
        name: profile.fullName,
        roleLabel: customerDashboardConfig.roleLabel,
      }}
      profileHref={profileHref}
    />
  );
}

/**
 * Skeleton matching the profile link size to prevent layout shift.
 */
export function CustomerTopbarUserSkeleton() {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg px-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/50" />
      <div className="hidden sm:block space-y-1">
        <div className="w-20 h-3.5 bg-white/50 rounded" />
        <div className="w-16 h-3 bg-white/40 rounded" />
      </div>
    </div>
  );
}
