/**
 * Dispatcher API DTOs (snake_case, exactly as the backend returns them).
 * Types mirror backend/app/modules/dispatch/schemas.py response models.
 */

export interface DispatcherMeDTO {
  id: number;
  full_name: string;
  role: string;
}

export interface DispatcherStatsDTO {
  total_parcels: number;
  unassigned_parcels: number;
  active_deliveries: number;
  completed_deliveries: number;
  failed_deliveries: number;
}

export interface UnassignedParcelItemDTO {
  id: number;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_city: string;
  weight_kg: number;
  dimensions?: string | null;
  status: string;
  created_at: string;
}

export interface UnassignedParcelListDTO {
  items: UnassignedParcelItemDTO[];
  total: number;
  limit: number;
  offset: number;
  cities: string[];
}

export interface UnassignedParcelDetailDTO {
  id: number;
  tracking_number: string;
  sender_id: number;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_city: string;
  weight_kg: number;
  dimensions?: string | null;
  status: string;
  special_instructions?: string | null;
  created_at: string;
  updated_at: string;
}
