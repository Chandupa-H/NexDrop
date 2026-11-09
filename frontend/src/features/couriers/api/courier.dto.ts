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
  delivery_proof: DeliveryProofDTO | null;
  delivery_result: DeliveryResultDTO | null;
  proof_cleanup_pending: boolean;
}

export interface DeliveryProofDTO {
  secure_url: string;
  public_id: string;
}

export interface DeliveryResultDTO {
  outcome: "delivered" | "failed";
  recorded_at: string;
  recipient_name?: string | null;
  failure_reason?: string | null;
  note?: string | null;
}

export interface DeliveryProofUploadDTO {
  secure_url: string;
  public_id: string;
  parcel: ParcelDetailDTO;
}

export interface SuccessfulDeliveryRequestDTO {
  recipient_name: string;
  confirmed: boolean;
}

export interface FailedDeliveryRequestDTO {
  failure_reason: string;
  note?: string;
  confirmed: boolean;
}

export interface ParcelStatusUpdateRequestDTO {
  status: string;
  note?: string;
  failure_reason?: string;
}
