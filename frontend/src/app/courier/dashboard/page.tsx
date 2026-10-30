/**
 * /courier/dashboard — Courier Dashboard Page (Server Component)
 *
 * All initial data is supplied via mock constants and passed to the DashboardView client component.
 * TODO(api): GET /api/v1/courier/dashboard/summary  → replace MOCK_SUMMARY
 * TODO(api): GET /api/v1/courier/parcels            → replace MOCK_PARCELS
 * (Confirm endpoint paths with the Platform squad before wiring.)
 */

import { DashboardView } from "@/features/couriers/components/DashboardView";
import {
  MOCK_COURIER,
  MOCK_SUMMARY,
  MOCK_PARCELS,
  MOCK_WEEKLY_DATA,
  MOCK_STATUS_BREAKDOWN,
} from "@/features/couriers/data/mock";

export const metadata = {
  title: "Courier Dashboard — NexDrop",
  description: "Courier delivery fleet dashboard: assigned parcels, delivery overview, and live route status.",
};

export default function CourierDashboardPage() {
  // Pre-formatted greeting to prevent client-side hydration discrepancies
  const greeting = "Good morning,";

  return (
    <DashboardView
      initialCourier={MOCK_COURIER}
      initialSummary={MOCK_SUMMARY}
      initialParcels={MOCK_PARCELS}
      weeklyData={MOCK_WEEKLY_DATA}
      initialStatusBreakdown={MOCK_STATUS_BREAKDOWN}
      greeting={greeting}
    />
  );
}
