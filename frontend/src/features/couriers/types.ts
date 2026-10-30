/**
 * Courier feature — shared TypeScript types.
 * ParcelStatus aligns with the backend enum:
 *   backend/app/modules/parcels/models.py  (lowercase snake_case on the DB layer)
 * Align with: docs/architecture/overview.md
 */

// TODO(api): GET /api/v1/courier/dashboard/summary
// TODO(api): GET /api/v1/courier/parcels  (confirm paths with Platform)

/**
 * Canonical parcel status.
 * Keep in sync with: backend/app/modules/parcels/models.py → ParcelStatus
 */
export type ParcelStatus =
  | "PENDING"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

/** Filter applied to the parcels table (and driven by KPI cards). */
export type TableFilter =
  | "ALL"
  | "PENDING"
  | "IN_TRANSIT_GROUP" // covers PICKED_UP + IN_TRANSIT + OUT_FOR_DELIVERY
  | "DELIVERED"
  | "FAILED";

/** Action panels that can be pre-expanded when the drawer opens. */
export type ActionType =
  | "update-status"
  | "add-note"
  | "upload-proof"
  | "report-failed";

export interface AssignedParcel {
  id: string;
  trackingId: string;
  customerName: string;
  customerInitials: string;
  /** Masked phone displayed to courier e.g. "+94 77 *** 4521" */
  phone: string;
  destination: string;
  city: string;
  status: ParcelStatus;
  assignedAt: string;        // ISO-8601 — source of truth
  assignedAtDisplay: string; // Pre-formatted "08:20 AM" — avoids client toLocale* hydration mismatch
  weight: number;
  notes?: string;
}

export interface DashboardSummary {
  assignedToday: number;    // Must equal delivered + outForDelivery + pending + failed
  assignedTodayDelta: number;
  delivered: number;
  deliveredDelta: number;
  outForDelivery: number;   // "In Transit" group for donut
  outForDeliveryDelta: number;
  pending: number;
  pendingDelta: number;
  failed: number;
}

export interface WeeklyDeliveryData {
  day: string;      // "Sunday" (full, for aria-label)
  shortDay: string; // "Sun" or "Today" for x-axis label
  count: number;
  isToday: boolean;
}

export interface DeliveryStatusBreakdown {
  label: string;
  count: number;
  strokeColor: string; // donut segment stroke
  bgColor: string;     // legend dot / badge background
  textColor: string;   // legend text
}

export interface CourierUser {
  id: string;
  name: string;
  role: "Courier";
  avatarInitials: string;
}
