import { getCourierProfile } from "../api/courier.api";
import { mapCourierProfile } from "../api/courier.mappers";
import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";
import type { DashboardUser } from "@/lib/dashboard/types";

/**
 * Async server component that fetches courier profile and renders the user menu.
 * Wrapped in Suspense by the layout with TopbarUserSkeleton fallback.
 */
export async function TopbarUser({ profileHref }: { profileHref: string }) {
  const profileDto = await getCourierProfile();
  const profile = mapCourierProfile(profileDto);

  const user: DashboardUser = {
    id: profile.id,
    name: profile.fullName,
    roleLabel: profile.role
      .split(/[_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" "),
  };

  return <TopbarProfileLink user={user} profileHref={profileHref} />;
}

/**
 * Skeleton matching the profile link size to prevent layout shift.
 */
export function TopbarUserSkeleton() {
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
