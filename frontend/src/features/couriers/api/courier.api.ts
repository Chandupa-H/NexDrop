/**
 * Courier API client functions.
 * Wraps apiClient calls and handles courier-specific endpoints.
 */

import apiClient from "@/lib/api-client";
import type {
  CourierMeDTO,
  CourierProfileDTO,
  CourierProfileUpdateDTO,
  CourierPasswordChangeDTO,
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
  CourierLocationWebSocketTicketDTO,
  DeliveryProofUploadDTO,
  SuccessfulDeliveryRequestDTO,
  FailedDeliveryRequestDTO,
  CourierProofListDTO,
  CourierProofParamsDTO,
  FailedDeliveryListDTO,
  FailedDeliveryParamsDTO,
} from "./courier.dto";
import type { DeliveryStatus, TableFilter } from "../types";

let courierProfileRequest: Promise<CourierProfileDTO> | null = null;
let dashboardSummaryRequest: Promise<DashboardSummaryDTO> | null = null;
const assignedParcelRequests = new Map<string, Promise<ParcelListDTO>>();

/** Get the authenticated courier's profile. */
export async function getCourierProfile(): Promise<CourierMeDTO> {
  return apiClient.get<CourierMeDTO>("/couriers/courier/me");
}

export function getCourierAccountProfile(): Promise<CourierProfileDTO> {
  if (!courierProfileRequest) {
    courierProfileRequest = apiClient
      .get<CourierProfileDTO>("/couriers/courier/profile")
      .finally(() => {
        courierProfileRequest = null;
      });
  }
  return courierProfileRequest;
}

export function updateCourierAccountProfile(
  profile: CourierProfileUpdateDTO
): Promise<CourierProfileDTO> {
  return apiClient.patch<CourierProfileDTO>("/couriers/courier/profile", profile);
}

export function changeCourierPassword(
  password: CourierPasswordChangeDTO
): Promise<void> {
  return apiClient.post<void>(
    "/couriers/courier/profile/change-password",
    password
  );
}

/**
 * Get dashboard summary with totals, KPIs, and weekly deliveries.
 */
export function getDashboardSummary(): Promise<DashboardSummaryDTO> {
  if (!dashboardSummaryRequest) {
    const request = apiClient.get<DashboardSummaryDTO>(
      "/couriers/courier/dashboard/summary"
    );
    const sharedRequest = request.finally(() => {
      if (dashboardSummaryRequest === sharedRequest) {
        dashboardSummaryRequest = null;
      }
    });
    dashboardSummaryRequest = sharedRequest;
  }
  return dashboardSummaryRequest;
}

export interface GetParcelsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * List assigned parcels with optional status filter and pagination.
 */
export function getAssignedParcels(params?: GetParcelsParams): Promise<ParcelListDTO> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const endpoint = `/couriers/courier/parcels${query ? `?${query}` : ""}`;
  const existingRequest = assignedParcelRequests.get(endpoint);
  if (existingRequest) return existingRequest;

  const request = apiClient.get<ParcelListDTO>(endpoint);
  const sharedRequest = request.finally(() => {
    if (assignedParcelRequests.get(endpoint) === sharedRequest) {
      assignedParcelRequests.delete(endpoint);
    }
  });
  assignedParcelRequests.set(endpoint, sharedRequest);
  return sharedRequest;
}

export async function getParcelsForFilter(
  filter: TableFilter,
  page: number,
  pageSize: number
): Promise<ParcelListDTO> {
  const filterStatuses: Partial<Record<TableFilter, string>> = {
    pending: "pending",
    in_transit_group: "picked_up,in_transit,out_for_delivery",
    delivered: "delivered",
    failed: "cancelled",
  };
  const status = filter === "all" ? undefined : filterStatuses[filter];
  if (filter !== "all" && !status) {
    throw new Error(`Unsupported courier parcel filter: ${filter}`);
  }

  return getAssignedParcels({
    status,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
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
  return apiClient.get<DeliveryListItemDTO[]>(
    `/courier/deliveries/today${query ? `?${query}` : ""}`
  );
}

export async function getCourierDelivery(
  deliveryId: number
): Promise<DeliveryDetailDTO> {
  return apiClient.get<DeliveryDetailDTO>(`/courier/deliveries/${deliveryId}`);
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
  return apiClient.get<DeliveryHistoryResponseDTO>(
    `/courier/deliveries/history?${query}`
  );
}

export async function updateCourierDeliveryStatus(
  deliveryId: number,
  payload: DeliveryStatusUpdateDTO
): Promise<DeliveryListItemDTO> {
  return apiClient.patch<DeliveryListItemDTO>(
    `/courier/deliveries/${deliveryId}/status`,
    payload
  );
}

export async function getCourierTracking(
  deliveryId: number
): Promise<DeliveryTrackingDTO> {
  return apiClient.get<DeliveryTrackingDTO>(
    `/deliveries/${deliveryId}/tracking`
  );
}

export async function postCourierLocation(
  payload: CourierLocationUpdateDTO
): Promise<CourierLocationUpdateResponseDTO> {
  return apiClient.post<CourierLocationUpdateResponseDTO>(
    "/courier/location",
    payload
  );
}

export async function getMyCourierLocation(): Promise<CourierLocationDTO | null> {
  return apiClient.get<CourierLocationDTO | null>("/courier/location/me");
}

export async function createCourierLocationWebSocketTicket(): Promise<CourierLocationWebSocketTicketDTO> {
  return apiClient.post<CourierLocationWebSocketTicketDTO>(
    "/courier/location/ws-ticket"
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
