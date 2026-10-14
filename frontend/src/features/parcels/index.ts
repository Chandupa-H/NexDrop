export type ParcelStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Parcel {
  id: number;
  tracking_number: string;
  sender_id: number;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_city: string;
  weight_kg: number;
  dimensions?: string;
  status: ParcelStatus;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}
