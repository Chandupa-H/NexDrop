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
