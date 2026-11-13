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

export interface DispatchAssignmentDTO {
  id: number;
  parcel_id: number;
  courier_id: number;
  status: "assigned" | "accepted" | "rejected" | "completed";
  assigned_at: string;
  completed_at?: string | null;
  notes?: string | null;
}

export interface CourierWorkloadDTO {
  courier_id: number;
  user_id: number;
  full_name: string;
  vehicle_type: string;
  is_available: boolean;
  active_assignments: number;
  workload_status: "AVAILABLE" | "OPTIMAL" | "BUSY" | "UNAVAILABLE";
}

export interface AssignCourierRequest {
  parcel_id: number;
  courier_id: number;
  notes?: string;
  delivery_method?: "DIRECT" | "VIA_WAREHOUSE";
  target_warehouse_id?: number;
}

export interface DispatchWarehouseDTO {
  id: number;
  name: string;
  address: string;
  city: string;
  contact_number: string;
  is_active: boolean;
}

export interface WarehouseStoredParcelDTO {
  id: number;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_city: string;
  weight_kg: number;
  dimensions?: string | null;
  status: string;
  delivery_method: string;
  warehouse_id: number;
  warehouse_name: string;
  warehouse_city: string;
  updated_at: string;
}

export interface ReassignCourierRequest {
  new_courier_id: number;
  reason?: string;
}

export interface WarehouseReceiveRequest {
  parcel_id: number;
  warehouse_id: number;
  notes?: string;
}

export interface WarehouseHandoverRequest {
  parcel_id: number;
  warehouse_id: number;
  courier_id: number;
  notes?: string;
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
