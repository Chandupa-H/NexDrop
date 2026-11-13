import { getDispatcherProfile, getDispatcherStats } from "../api/dispatcher.api";
import {
  mapDispatcherProfile,
  mapDispatcherStats,
  computeDispatcherDonutSegments,
} from "../api/dispatcher.mappers";
import { getGreeting } from "@/lib/dashboard/format";
import { DashboardView } from "./DashboardView";

/**
 * Async server component that fetches dispatcher profile and stats.
 * Wrapped in Suspense by the page with loading.tsx fallback.
 */
export async function DashboardData() {
  const [profileDto, statsDto] = await Promise.all([
    getDispatcherProfile(),
    getDispatcherStats(),
  ]);

  const profile = mapDispatcherProfile(profileDto);
  const stats = mapDispatcherStats(statsDto);
  const donutSegments = computeDispatcherDonutSegments(stats);
  const greeting = getGreeting();

  return (
    <DashboardView
      greeting={greeting}
      userName={profile.fullName}
      stats={stats}
      donutSegments={donutSegments}
    />
  );
}

