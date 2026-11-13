import { getDispatcherProfile } from "../api/dispatcher.api";
import { mapDispatcherProfile } from "../api/dispatcher.mappers";
import { dispatcherDashboardConfig } from "../config/dashboard.config";
import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";

export async function DispatcherTopbarUser({ profileHref }: { profileHref: string }) {
  const profile = mapDispatcherProfile(await getDispatcherProfile());
  return (
    <TopbarProfileLink
      user={{
        id: profile.id,
        name: profile.fullName,
        roleLabel: dispatcherDashboardConfig.roleLabel,
      }}
      profileHref={profileHref}
    />
  );
}

export function DispatcherTopbarUserSkeleton() {
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

