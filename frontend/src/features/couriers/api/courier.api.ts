/**
 * Courier API client functions.
 * Wraps apiClient calls and handles courier-specific endpoints.
 */

import { cache } from "react";
import apiClient, { ApiError } from "@/lib/api-client";
import type {
  CourierMeDTO,
  DashboardSummaryDTO,
  ParcelListDTO,
  ParcelDetailDTO,
  ParcelStatusUpdateRequestDTO,
  DeliveryListItemDTO,
} from "./courier.dto";
import type { DeliveryStatus } from "../types";

const MOCK_COURIER_DELIVERIES: DeliveryListItemDTO[] = [
  {
    parcel_id: 1001,
    tracking_number: "ND-2026-001",
    status: "pending",
    pickup_address: "Colombo 03",
    dropoff_address: "Rajagiriya",
    size: "Medium",
    weight: 2.5,
    recipient_name: "Kasun Perera",
    recipient_phone: "0771234567",
    assigned_at: "2026-11-05T08:30:00+05:30",
  },
  {
    parcel_id: 1002,
    tracking_number: "ND-2026-002",
    status: "picked_up",
    pickup_address: "Nugegoda",
    dropoff_address: "Maharagama",
    size: "Small",
    weight: 1.2,
    recipient_name: "Nimal Silva",
    recipient_phone: "0712345678",
    assigned_at: "2026-11-05T09:15:00+05:30",
  },
  {
    parcel_id: 1003,
    tracking_number: "ND-2026-003",
    status: "in_transit",
    pickup_address: "Bambalapitiya",
    dropoff_address: "Dehiwala",
    size: "Large",
    weight: 5,
    recipient_name: "Amal Fernando",
    recipient_phone: "0759876543",
    assigned_at: "2026-11-05T10:00:00+05:30",
  },
  {
    parcel_id: 1004,
    tracking_number: "ND-2026-004",
    status: "delivered",
    pickup_address: "Wellawatte",
    dropoff_address: "Mount Lavinia",
    size: "Small",
    weight: 0.8,
    recipient_name: "Saman Kumara",
    recipient_phone: "0765554444",
    assigned_at: "2026-11-05T07:45:00+05:30",
  },
];

function shouldUseMockCourierDeliveries(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_MOCK_COURIER_DELIVERIES !== "false"
  );
}

function getMockCourierDeliveries(
  statuses: DeliveryStatus[]
): DeliveryListItemDTO[] {
  if (statuses.length === 0) return MOCK_COURIER_DELIVERIES;
  return MOCK_COURIER_DELIVERIES.filter((delivery) =>
    statuses.includes(delivery.status)
  );
}

/**
 * Get the authenticated courier's profile.
 * Wrapped in React cache() so the layout and page share one request.
 */
export const getCourierProfile = cache(async (): Promise<CourierMeDTO> => {
  return apiClient.get<CourierMeDTO>("/couriers/courier/me");
});

/**
 * Get dashboard summary with totals, KPIs, and weekly deliveries.
 */
export async function getDashboardSummary(): Promise<DashboardSummaryDTO> {
  return apiClient.get<DashboardSummaryDTO>("/couriers/courier/dashboard/summary");
}

export interface GetParcelsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * List assigned parcels with optional status filter and pagination.
 */
export async function getAssignedParcels(params?: GetParcelsParams): Promise<ParcelListDTO> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  return apiClient.get<ParcelListDTO>(`/couriers/courier/parcels${query ? `?${query}` : ""}`);
}

/**
 * List today's deliveries assigned to the authenticated courier.
 * Repeated status parameters allow grouped filters such as in-progress.
 */
export async function getCourierDeliveries(
  status?: DeliveryStatus | DeliveryStatus[]
): Promise<DeliveryListItemDTO[]> {
  const searchParams = new URLSearchParams();
  const statuses = Array.isArray(status) ? status : status ? [status] : [];
  statuses.forEach((value) => searchParams.append("status", value));

  const query = searchParams.toString();
  try {
    return await apiClient.get<DeliveryListItemDTO[]>(
      `/courier/deliveries${query ? `?${query}` : ""}`
    );
  } catch (error) {
    if (
      shouldUseMockCourierDeliveries() &&
      error instanceof ApiError &&
      error.status === 401
    ) {
      console.warn(
        "Courier deliveries returned 401; using development mock data. Configure a valid Supabase session to use the API."
      );
      return getMockCourierDeliveries(statuses);
    }
    throw error;
  }
}

/**
 * Get full parcel details including masked phone and timeline.
 */
export async function getParcelDetail(trackingId: string): Promise<ParcelDetailDTO> {
  return apiClient.get<ParcelDetailDTO>(`/couriers/courier/parcels/${trackingId}`);
}

/**
 * Update parcel status with optional note and failure reason.
 */
export async function updateParcelStatus(
  trackingId: string,
  payload: ParcelStatusUpdateRequestDTO
): Promise<ParcelDetailDTO> {
  return apiClient.patch<ParcelDetailDTO>(`/couriers/courier/parcels/${trackingId}/status`, payload);
}
