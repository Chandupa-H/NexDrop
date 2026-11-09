/**
 * Courier feature — shared TypeScript types.
 * ParcelStatus aligns with the backend enum:
 *   backend/app/modules/parcels/models.py  (lowercase snake_case on the DB layer)
 * Align with: docs/architecture/overview.md
 */

/**
 * Canonical parcel status (lowercase snake_case matching backend).
 * Keep in sync with: backend/app/modules/parcels/models.py → ParcelStatus
 */
export type ParcelStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";

/** Filter applied to the parcels table (and driven by KPI cards). */
export type TableFilter =
  | "all"
  | "pending"
  | "in_transit_group" // covers picked_up + in_transit + out_for_delivery
  | "delivered"
  | "failed";

/** Action panels that can be pre-expanded when the drawer opens. */
export type ActionType =
  | "update-status"
  | "add-note"
  | "upload-proof"
  | "report-failed";

// ── View Models (camelCase for frontend consumption) ──

/**
 * Courier profile from /courier/me endpoint.
 * Renamed from CourierProfile to avoid conflict with index.ts DB-shaped type.
 */
export interface CourierMe {
  id: string;
  fullName: string;
  role: string;
}

export interface DashboardTotals {
  assigned: number;
  delivered: number;
  inTransit: number;
  pending: number;
  failed: number;
}

export interface DashboardKPI {
  key: string;
  label: string;
  value: number;
  deltaPct: number;
  tone: "success" | "warning" | "danger";
}

export interface WeeklyDelivery {
  date: string; // ISO 8601 date
  dayLabel: string; // "Sun" or "Today"
  dayFull: string; // "Sunday" for aria-label
  delivered: number;
  isToday: boolean;
}

export interface DashboardSummary {
  totals: DashboardTotals;
  kpis: DashboardKPI[];
  weeklyDeliveries: WeeklyDelivery[];
}

export interface ParcelListItem {
  trackingId: string;
  customerName: string;
  destination: string;
  status: ParcelStatus;
  assignedAt: string; // ISO 8601
  assignedAtDisplay: string; // Pre-formatted time
  eta: string | null;
}

export interface TimelineEvent {
  status: string;
  label: string;
  occurredAt: string; // ISO 8601
  occurredAtDisplay: string; // Pre-formatted
  location: string | null;
}

export interface ParcelDetail {
  trackingId: string;
  customerName: string;
  customerPhoneMasked: string;
  destination: string;
  addressLine: string;
  status: ParcelStatus;
  assignedAt: string;
  assignedAtDisplay: string;
  eta: string | null;
  notes: string[];
  timeline: TimelineEvent[];
  deliveryProof: { secureUrl: string; publicId: string } | null;
  deliveryResult: {
    outcome: "delivered" | "failed";
    recordedAt: string;
    recipientName?: string | null;
    failureReason?: string | null;
    note?: string | null;
  } | null;
  proofCleanupPending: boolean;
}
