import apiClient from "@/lib/api-client";

export interface AdminStatsDTO {
  active_deliveries: number;
  total_deliveries: number;
  registered_merchants: number;
  pending_merchants: number;
  active_couriers: number;
  total_couriers: number;
  total_users: number;
  gmv_revenue: number;
}

export interface RecentActivityItemDTO {
  id: string;
  action: string;
  subject: string;
  time: string;
  type: string;
  status: string;
  tone: string;
}

export interface AdminZoneLoadDTO {
  id: number;
  name: string;
  code: string;
  activeCouriers: number;
  pendingParcels: number;
  status: string;
  surgeMultiplier: number;
  baseFee: number;
  currency: string;
}

export interface AdminDashboardDTO {
  stats: AdminStatsDTO;
  recent_activity: RecentActivityItemDTO[];
  zone_loads: AdminZoneLoadDTO[];
}

export interface AdminUserDTO {
  id: number;
  display_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  is_active: boolean;
  joined: string;
  created_at: string;
  deliveries: number;
}

export interface AdminMerchantDTO {
  id: number;
  display_id: string;
  user_id: number;
  business_name: string;
  owner_name: string;
  email: string;
  registration_number: string;
  contact_phone: string;
  business_address: string;
  business_type: string | null;
  website_url: string | null;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  api_key: string | null;
  submitted: string;
  created_at: string;
}

export interface AdminCourierDTO {
  id: number;
  display_id: string;
  name: string;
  email: string;
  phone: string | null;
  vehicle_type: string;
  license_plate: string | null;
  zone: string;
  status: string;
  is_available: boolean;
  rating: number;
  completed_trips: number;
  active_order: string | null;
}

export interface AdminDispatcherDTO {
  id: number;
  display_id: string;
  name: string;
  email: string;
  phone: string | null;
  hub: string;
  assigned_couriers: number;
  shift: string;
  status: string;
  incidents_handled: number;
}

export interface DeliveryZoneDTO {
  id: number;
  name: string;
  code: string;
  postcodes: string | null;
  hub_name: string | null;
  base_fee: number | null;
  currency: string | null;
  avg_delivery_time_mins: number | null;
  active_couriers: number | null;
  status: string | null;
  surge_multiplier: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingTierDTO {
  id: number;
  name: string;
  base_rate: number;
  per_km_rate: number;
  per_kg_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAnalyticsDTO {
  total_parcels: number;
  delivered_count: number;
  in_transit_count: number;
  pending_count: number;
  cancelled_count: number;
  total_revenue: number;
  completion_rate: number;
  avg_delivery_mins: number;
  zone_volume: Array<{
    name: string;
    code: string;
    activeCouriers: number;
    deliveries: number;
  }>;
  status_breakdown: Array<{
    name: string;
    count: number;
    color: string;
  }>;
}

export const adminApi = {
  getDashboard: () => apiClient.get<AdminDashboardDTO>("/admin/dashboard"),

  getUsers: (role?: string) => {
    const qs = role && role !== "All" ? `?role=${encodeURIComponent(role)}` : "";
    return apiClient.get<AdminUserDTO[]>(`/admin/users${qs}`);
  },

  toggleUserStatus: (userId: number) =>
    apiClient.patch<{ id: number; is_active: boolean; status: string }>(
      `/admin/users/${userId}/toggle-status`
    ),

  getMerchants: () => apiClient.get<AdminMerchantDTO[]>("/admin/merchants"),

  updateMerchantApproval: (
    merchantId: number,
    status: "approved" | "rejected",
    rejection_reason?: string
  ) =>
    apiClient.patch(`/merchants/${merchantId}/approval`, {
      status,
      rejection_reason,
    }),

  getCouriers: () => apiClient.get<AdminCourierDTO[]>("/admin/couriers"),

  getDispatchers: () => apiClient.get<AdminDispatcherDTO[]>("/admin/dispatchers"),

  getZones: () => apiClient.get<DeliveryZoneDTO[]>("/zones"),

  createZone: (payload: Partial<DeliveryZoneDTO>) =>
    apiClient.post<DeliveryZoneDTO>("/zones", payload),

  updateZone: (zoneId: number, payload: Partial<DeliveryZoneDTO>) =>
    apiClient.patch<DeliveryZoneDTO>(`/zones/${zoneId}`, payload),

  getPricingTiers: () => apiClient.get<PricingTierDTO[]>("/pricing/tiers?include_inactive=true"),

  updatePricingTier: (tierId: number, payload: Partial<PricingTierDTO>) =>
    apiClient.patch<PricingTierDTO>(`/pricing/tiers/${tierId}`, payload),

  getAnalytics: () => apiClient.get<AdminAnalyticsDTO>("/admin/analytics"),
};

