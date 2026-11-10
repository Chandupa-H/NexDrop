import {
  getCustomerProfile,
  getCustomerDashboardSummary,
  getCustomerParcels,
} from "../api/customer.api";
import {
  mapCustomerProfile,
  mapCustomerDashboardSummary,
  mapCustomerParcelListItem,
} from "../api/customer.mappers";
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
  const summary = mapCustomerDashboardSummary(summaryDto, "");
  const parcels = parcelsDto.items.map(mapCustomerParcelListItem);

  return (
    <CustomerDashboardView
      greeting="Welcome,"
      userName={profile.fullName}
      summary={summary}
      parcels={parcels}
      parcelsTotal={parcelsDto.total}
      userProfile={profile}
    />
  );
}
