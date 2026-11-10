/**
 * Customer API DTOs (snake_case, exactly as backend returns them).
 */

export interface CustomerMeDTO {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  default_address: string;
  city: string;
  postal_code: string;
}

export interface CustomerDashboardTotalsDTO {
  total_orders: number;
  active_deliveries: number;
  delivered: number;
  pending: number;
  cancelled: number;
}

export interface CustomerDashboardKPIDTO {
  key: string;
  value: number;
  delta_pct: number;
}

export interface CustomerWeeklyOrderDTO {
  date: string;
  orders: number;
}

export interface CustomerDashboardSummaryDTO {
  greeting?: string;
  totals: CustomerDashboardTotalsDTO;
  kpis: CustomerDashboardKPIDTO[];
  weekly_orders: CustomerWeeklyOrderDTO[];
}

export interface CustomerParcelListItemDTO {
  tracking_id: string;
  recipient_name: string;
  destination: string;
  status: string;
  created_at: string;
  estimated_fee: number;
  weight_kg: number;
  eta: string | null;
}

export interface CustomerParcelListDTO {
  items: CustomerParcelListItemDTO[];
  total: number;
}

export interface CustomerTimelineEventDTO {
  status: string;
  label: string;
  occurred_at: string;
  location: string | null;
}

export interface CustomerParcelDetailDTO {
  tracking_id: string;
  recipient_name: string;
  recipient_phone_masked: string;
  sender_name: string;
  delivery_address: string;
  delivery_city: string;
  pickup_address: string;
  pickup_city: string;
  status: string;
  created_at: string;
  eta: string | null;
  fee: number;
  weight_kg: number;
  dimensions?: string | null;
  special_instructions?: string | null;
  notes: string[];
  timeline: CustomerTimelineEventDTO[];
}

export interface CustomerCancelParcelRequestDTO {
  reason?: string;
}

export interface CustomerCreateParcelRequestDTO {
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_city: string;
  pickup_address?: string;
  pickup_city?: string;
  weight_kg: number;
  dimensions?: string;
  special_instructions?: string;
  fee?: number;
}

export interface CustomerAddressDTO {
  id: number;
  customer_id: number;
  address_type: "pickup" | "dropoff";
  label: string;
  custom_name?: string | null;
  address: string;
  city: string;
  postal_code: string;
  contact_name?: string | null;
  phone?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddressCreateDTO {
  address_type: "pickup" | "dropoff";
  label: string;
  custom_name?: string | null;
  address: string;
  city: string;
  postal_code: string;
  contact_name?: string | null;
  phone?: string | null;
  is_default?: boolean;
}

export interface CustomerAddressUpdateDTO {
  address_type?: "pickup" | "dropoff";
  label?: string;
  custom_name?: string | null;
  address?: string;
  city?: string;
  postal_code?: string;
  contact_name?: string | null;
  phone?: string | null;
  is_default?: boolean;
}

