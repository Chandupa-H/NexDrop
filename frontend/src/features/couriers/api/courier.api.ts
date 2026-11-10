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
  DeliveryDetailDTO,
  DeliveryHistoryParams,
  DeliveryHistoryResponseDTO,
  CourierLocationUpdateDTO,
  CourierLocationUpdateResponseDTO,
  DeliveryProofUploadDTO,
  SuccessfulDeliveryRequestDTO,
  FailedDeliveryRequestDTO,
  CourierProofListDTO,
  CourierProofParamsDTO,
  FailedDeliveryListDTO,
  FailedDeliveryParamsDTO,
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

export async function getCourierProofs(
  params: CourierProofParamsDTO = {}
): Promise<CourierProofListDTO> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.date) searchParams.set("date", params.date);
  if (params.status) searchParams.set("status", params.status);
  const query = searchParams.toString();
  return apiClient.get<CourierProofListDTO>(
    `/couriers/courier/proofs${query ? `?${query}` : ""}`
  );
}

export async function getCourierFailedDeliveries(
  params: FailedDeliveryParamsDTO = {}
): Promise<FailedDeliveryListDTO> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.reason) searchParams.set("reason", params.reason);
  if (params.date) searchParams.set("date", params.date);
  if (params.redelivery_status) searchParams.set("redelivery_status", params.redelivery_status);
  const query = searchParams.toString();
  return apiClient.get<FailedDeliveryListDTO>(
    `/couriers/courier/failed-deliveries${query ? `?${query}` : ""}`
  );
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
): Promise<DeliveryDetailDTO> {
  return courierRequest(
    () =>
      apiClient.get<DeliveryDetailDTO>(`/courier/deliveries/${deliveryId}`),
    async () => (await import("./courier.mock")).getMockDeliveryDetail(deliveryId)
  );
}

export async function getDeliveryHistory(
  params: DeliveryHistoryParams = {}
): Promise<DeliveryHistoryResponseDTO> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.q) searchParams.set("q", params.q);
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("page_size", String(params.page_size ?? 20));
  const query = searchParams.toString();
  return courierRequest(
    () =>
      apiClient.get<DeliveryHistoryResponseDTO>(
        `/courier/deliveries/history?${query}`
      ),
    async () =>
      (await import("./courier.mock")).listMockDeliveryHistory(params)
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

export async function uploadDeliveryProof(
  trackingId: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<DeliveryProofUploadDTO> {
  const body = new FormData();
  body.append("proof_file", file);
  return apiClient.postForm<DeliveryProofUploadDTO>(
    `/couriers/courier/parcels/${encodeURIComponent(trackingId)}/delivery-result/proof`,
    body,
    onProgress
  );
}

export async function deleteDeliveryProof(trackingId: string): Promise<ParcelDetailDTO> {
  return apiClient.delete<ParcelDetailDTO>(
    `/couriers/courier/parcels/${encodeURIComponent(trackingId)}/delivery-result/proof`
  );
}

export async function submitSuccessfulDelivery(
  trackingId: string,
  payload: SuccessfulDeliveryRequestDTO
): Promise<ParcelDetailDTO> {
  return apiClient.post<ParcelDetailDTO>(
    `/couriers/courier/parcels/${encodeURIComponent(trackingId)}/delivery-result/success`,
    payload
  );
}

export async function submitFailedDelivery(
  trackingId: string,
  payload: FailedDeliveryRequestDTO
): Promise<ParcelDetailDTO> {
  return apiClient.post<ParcelDetailDTO>(
    `/couriers/courier/parcels/${encodeURIComponent(trackingId)}/delivery-result/failure`,
    payload
  );
}
