import { Suspense } from "react";
import { getDispatcherProfile } from "@/features/dispatcher/api/dispatcher.api";
import { mapDispatcherProfile } from "@/features/dispatcher/api/dispatcher.mappers";
import { SectionCard } from "@/components/dashboard";
import { Shield, Hash } from "lucide-react";
import DispatcherProfileLoading from "./loading";

export const metadata = {
  title: "Dispatcher Profile — NexDrop",
  description: "Dispatcher account and role details.",
};

async function DispatcherProfileData() {
  const profileDto = await getDispatcherProfile();
  const profile = mapDispatcherProfile(profileDto);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--dashboard-text)]">Dispatcher Profile</h1>
        <p className="text-sm text-[var(--dashboard-muted)] mt-1">
          Your account credentials and role assignments on NexDrop.
        </p>
      </div>

      <SectionCard title="Account Overview" subtitle="Profile metadata registered in the dispatch service">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)]">
            <div className="w-12 h-12 rounded-full bg-[var(--dashboard-primary)] flex items-center justify-center text-white font-bold text-lg">
              {profile.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--dashboard-text)]">{profile.fullName}</p>
              <p className="text-xs text-[var(--dashboard-muted)] capitalize">{profile.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] space-y-1">
              <div className="flex items-center gap-2 text-xs text-[var(--dashboard-muted)]">
                <Hash className="w-3.5 h-3.5" />
                <span>Dispatcher ID</span>
              </div>
              <p className="text-sm font-semibold text-[var(--dashboard-text)]">{profile.id}</p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] space-y-1">
              <div className="flex items-center gap-2 text-xs text-[var(--dashboard-muted)]">
                <Shield className="w-3.5 h-3.5 text-[var(--dashboard-chart-success)]" />
                <span>Access Role</span>
              </div>
              <p className="text-sm font-semibold text-[var(--dashboard-text)] capitalize">{profile.role}</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default function DispatcherProfilePage() {
  return (
    <Suspense fallback={<DispatcherProfileLoading />}>
      <DispatcherProfileData />
    </Suspense>
  );
}
