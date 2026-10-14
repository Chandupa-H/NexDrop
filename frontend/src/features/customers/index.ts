export interface CustomerProfile {
  id: number;
  user_id: number;
  phone: string;
  default_address: string;
  city: string;
  postal_code: string;
  notes?: string;
  created_at: string;
}
