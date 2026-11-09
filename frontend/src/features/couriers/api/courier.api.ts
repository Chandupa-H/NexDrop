/**
 * Courier API client functions.
 * Wraps apiClient calls and handles courier-specific endpoints.
 */

import { cache } from "react";
import apiClient from "@/lib/api-client";
import type {
  CourierMeDTO,
  DashboardSummaryDTO,
  ParcelListDTO,
  ParcelDetailDTO,
  ParcelStatusUpdateRequestDTO,
  DeliveryProofUploadDTO,
  SuccessfulDeliveryRequestDTO,
  FailedDeliveryRequestDTO,
} from "./courier.dto";

// TODO(platform): attach the auth token in apiClient

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
