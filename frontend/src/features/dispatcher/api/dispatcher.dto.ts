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

