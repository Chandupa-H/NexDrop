export interface MerchantProfile {
  id: number;
  user_id: number;
  business_name: string;
  registration_number: string;
  contact_phone: string;
  business_address: string;
  api_key?: string;
  created_at: string;
}
