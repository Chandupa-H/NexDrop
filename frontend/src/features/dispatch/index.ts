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
