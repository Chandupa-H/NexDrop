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
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  delivery_instructions: string | null;
}

export interface StatusHistoryEntryDTO {
  status: import("../types").ParcelStatus;
  timestamp: string;
  note: string | null;
  proof_reference: string | null;
  actor: string | null;
}

export interface DeliveryDetailDTO extends DeliveryListItemDTO {
  completed_at: string | null;
  failure_reason: string | null;
  status_history: StatusHistoryEntryDTO[];
}

export interface DeliveryHistoryItemDTO {
  parcel_id: number;
  tracking_number: string;
  status: "delivered" | "cancelled";
  pickup_address: string;
  dropoff_address: string;
  recipient_name: string;
  completed_at: string;
  failure_reason: string | null;
}

export interface DeliveryHistoryResponseDTO {
  items: DeliveryHistoryItemDTO[];
  total: number;
  page: number;
  page_size: number;
  history_summary: {
    delivered: number;
    cancelled: number;
    total: number;
  };
}

export interface DeliveryHistoryParams {
  status?: "delivered" | "cancelled";
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface CourierLocationDTO {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updated_at: string;
  active_delivery_id: number | null;
}

export interface DeliveryDestinationDTO {
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface DeliveryTrackingDTO {
  delivery: DeliveryListItemDTO;
  courier_location: CourierLocationDTO | null;
  location_source: "live" | "simulated" | "unavailable";
  next_destination: DeliveryDestinationDTO | null;
  next_action: string;
  simulation_route?: Array<{ lat: number; lng: number }>;
}

export interface CourierLocationUpdateDTO {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  deliveryId?: number;
}

export interface CourierLocationUpdateResponseDTO {
  location: CourierLocationDTO;
  accepted: boolean;
}

export interface DeliveryStatusUpdateDTO {
  status: import("../types").DeliveryStatus;
}
