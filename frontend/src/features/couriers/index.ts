export interface CourierProfile {
  id: number;
  user_id: number;
  vehicle_type: string;
  license_plate?: string;
  current_latitude?: number;
  current_longitude?: number;
  is_available: boolean;
  created_at: string;
}
