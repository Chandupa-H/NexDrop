import {
  getCustomerProfile,
  getCustomerDashboardSummary,
  getCustomerParcels,
} from "../api/customer.api";
import {
  mapCustomerProfile,
  mapCustomerDashboardSummary,
  mapCustomerParcelListItem,
  computeCustomerDonutSegments,
} from "../api/customer.mappers";
import { getGreeting, getTodayDateInTimeZone } from "@/lib/dashboard/format";
import { CustomerDashboardView } from "./DashboardView";

/**
 * Async server component that fetches customer dashboard data.
 * Wrapped in Suspense by the page with loading.tsx fallback.
 */
export async function CustomerDashboardData() {
  const [profileDto, summaryDto, parcelsDto] = await Promise.all([
    getCustomerProfile(),
    getCustomerDashboardSummary(),
    getCustomerParcels({ limit: 10 }),
  ]);

  const profile = mapCustomerProfile(profileDto);
  const todayDate = getTodayDateInTimeZone();
  const summary = mapCustomerDashboardSummary(summaryDto, todayDate);
  const parcels = parcelsDto.items.map(mapCustomerParcelListItem);
  const donutSegments = computeCustomerDonutSegments(summary.totals);
  const greeting = getGreeting();

  return (
    <CustomerDashboardView
      greeting={greeting}
      userName={profile.fullName}
      summary={summary}
      parcels={parcels}
      parcelsTotal={parcelsDto.total}
      donutSegments={donutSegments}
    />
  );
}
