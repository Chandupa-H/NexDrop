/**
 * Courier API DTOs (snake_case, exactly as the backend returns them).
 * Types mirror backend/app/modules/couriers/schemas.py response models.
 */

export interface CourierMeDTO {
  id: number;
  full_name: string;
  role: string;
}

export interface DashboardTotalsDTO {
  assigned: number;
  delivered: number;
  in_transit: number;
  pending: number;
  failed: number;
}

export interface DashboardKPIDTO {
  key: string;
  value: number;
  delta_pct: number;
}

export interface WeeklyDeliveryDTO {
  date: string; // ISO 8601
  delivered: number;
}

export interface DashboardSummaryDTO {
  totals: DashboardTotalsDTO;
  kpis: DashboardKPIDTO[];
  weekly_deliveries: WeeklyDeliveryDTO[];
}

export interface ParcelListItemDTO {
  tracking_id: string;
  customer_name: string;
  destination: string;
  status: string;
  assigned_at: string; // ISO 8601 with timezone
  eta: string | null;
}

export interface ParcelListDTO {
  items: ParcelListItemDTO[];
  total: number;
}

export interface TimelineEventDTO {
  status: string;
  label: string;
  occurred_at: string; // ISO 8601 with timezone
  location: string | null;
}

export interface ParcelDetailDTO {
  tracking_id: string;
  customer_name: string;
  customer_phone_masked: string;
  destination: string;
  address_line: string;
  status: string;
  assigned_at: string;
  eta: string | null;
  notes: string[];
  timeline: TimelineEventDTO[];
}

export interface ParcelStatusUpdateRequestDTO {
  status: string;
  note?: string;
  failure_reason?: string;
}

export interface DeliveryListItemDTO {
  parcel_id: number;
  tracking_number: string;
  status: import("../types").DeliveryStatus;
  pickup_address: string;
  dropoff_address: string;
  size: string | null;
  weight: number;
  recipient_name: string;
  recipient_phone: string;
  assigned_at: string;
}
