export type DispatchStatus =
  | "assigned"
  | "accepted"
  | "rejected"
  | "completed";

export interface DispatchAssignment {
  id: number;
  parcel_id: number;
  courier_id: number;
  status: DispatchStatus;
  assigned_at: string;
  completed_at?: string;
  notes?: string;
}

export interface DispatcherDashboardStats {
  total_parcels: number;
  unassigned_parcels: number;
  active_deliveries: number;
  completed_deliveries: number;
  failed_deliveries: number;
}
