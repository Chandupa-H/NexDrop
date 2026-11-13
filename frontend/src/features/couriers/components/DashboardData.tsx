import { getCourierProfile, getDashboardSummary, getAssignedParcels } from "../api/courier.api";
import { mapCourierProfile, mapDashboardSummary, mapParcelListItem, computeDonutSegments } from "../api/courier.mappers";
import { getGreeting, getTodayDateInTimeZone } from "@/lib/dashboard/format";
import { DashboardView } from "./DashboardView";
import { COURIER_PARCEL_PAGE_SIZE } from "../types";

/**
 * Async server component that fetches all dashboard data and renders DashboardView.
 * Wrapped in Suspense by the page with loading.tsx fallback.
 */
export async function DashboardData() {
  const [profileDto, summaryDto, parcelsDto] = await Promise.all([
    getCourierProfile(),
    getDashboardSummary(),
    getAssignedParcels({ limit: COURIER_PARCEL_PAGE_SIZE }),
  ]);

  const profile = mapCourierProfile(profileDto);
  const todayDate = getTodayDateInTimeZone();
  const summary = mapDashboardSummary(summaryDto, todayDate);
  const parcels = parcelsDto.items.map(mapParcelListItem);
  const donutSegments = computeDonutSegments(summary.totals);
  const greeting = getGreeting();

  return (
    <DashboardView
      greeting={greeting}
      userName={profile.fullName}
      summary={summary}
      parcels={parcels}
      parcelsTotal={parcelsDto.total}
      donutSegments={donutSegments}
    />
  );
}
