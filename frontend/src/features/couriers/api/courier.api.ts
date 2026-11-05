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
  DeliveryStatusUpdateDTO,
  DeliveryTrackingDTO,
  CourierLocationDTO,
  CourierLocationUpdateDTO,
  CourierLocationUpdateResponseDTO,
} from "./courier.dto";
import type { DeliveryStatus } from "../types";

let usingDevelopmentMockApi = false;

export function isDevelopmentCourierMockEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_MOCK_COURIER_DELIVERIES !== "false"
  );
}

async function courierRequest<T>(
  request: () => Promise<T>,
  mockRequest: () => T | Promise<T>
): Promise<T> {
  if (usingDevelopmentMockApi && isDevelopmentCourierMockEnabled()) {
    return mockRequest();
  }
  try {
    return await request();
  } catch (error) {
    if (
      isDevelopmentCourierMockEnabled() &&
      error instanceof ApiError &&
      error.status === 401
    ) {
      usingDevelopmentMockApi = true;
      console.warn(
        "Courier API returned 401; using development mock data. Configure a valid Supabase session to use the API."
      );
      return mockRequest();
    }
    throw error;
  }
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
  return courierRequest(
    () =>
      apiClient.get<DeliveryListItemDTO[]>(
        `/courier/deliveries/today${query ? `?${query}` : ""}`
      ),
    async () => (await import("./courier.mock")).listMockDeliveries(statuses)
  );
}

export async function getCourierDelivery(
  deliveryId: number
): Promise<DeliveryListItemDTO> {
  return courierRequest(
    () =>
      apiClient.get<DeliveryListItemDTO>(`/courier/deliveries/${deliveryId}`),
    async () => (await import("./courier.mock")).getMockDelivery(deliveryId)
  );
}

export async function updateCourierDeliveryStatus(
  deliveryId: number,
  payload: DeliveryStatusUpdateDTO
): Promise<DeliveryListItemDTO> {
  return courierRequest(
    () =>
      apiClient.patch<DeliveryListItemDTO>(
        `/courier/deliveries/${deliveryId}/status`,
        payload
      ),
    async () =>
      (await import("./courier.mock")).updateMockDeliveryStatus(
        deliveryId,
        payload.status
      )
  );
}

export async function getCourierTracking(
  deliveryId: number
): Promise<DeliveryTrackingDTO> {
  return courierRequest(
    () =>
      apiClient.get<DeliveryTrackingDTO>(
        `/deliveries/${deliveryId}/tracking`
      ),
    async () => (await import("./courier.mock")).getMockTracking(deliveryId)
  );
}

export async function postCourierLocation(
  payload: CourierLocationUpdateDTO
): Promise<CourierLocationUpdateResponseDTO> {
  return courierRequest(
    () =>
      apiClient.post<CourierLocationUpdateResponseDTO>(
        "/courier/location",
        payload
      ),
    async () => (await import("./courier.mock")).postMockLocation(payload)
  );
}

export async function getMyCourierLocation(): Promise<CourierLocationDTO | null> {
  return courierRequest(
    () => apiClient.get<CourierLocationDTO | null>("/courier/location/me"),
    async () => (await import("./courier.mock")).getLatestMockLocation()
  );
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
