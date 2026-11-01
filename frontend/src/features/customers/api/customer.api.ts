/**
 * Customer API client functions.
 * Wraps apiClient calls and handles customer-specific endpoints with graceful
 * fallback to mock data when backend service is offline.
 */

import { cache } from "react";
import apiClient from "@/lib/api-client";
import type {
  CustomerMeDTO,
  CustomerDashboardSummaryDTO,
  CustomerParcelListDTO,
  CustomerParcelDetailDTO,
  CustomerCancelParcelRequestDTO,
} from "./customer.dto";
import {
  MOCK_CUSTOMER_ME,
  getMockDashboardSummary,
  filterMockParcels,
  getMockCustomerParcelDetail,
  cancelMockCustomerParcel,
} from "./customer.mock";

/**
 * Get authenticated customer profile.
 * Wrapped in React cache() so the layout userSlot and page share one request per render.
 */
export const getCustomerProfile = cache(async (): Promise<CustomerMeDTO> => {
  try {
    return await apiClient.get<CustomerMeDTO>("/customers/customer/me");
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, falling back to mock profile:", err);
    return MOCK_CUSTOMER_ME;
  }
});

/**
 * Get customer dashboard summary with totals, KPIs, and weekly deliveries/orders.
 */
export async function getCustomerDashboardSummary(): Promise<CustomerDashboardSummaryDTO> {
  try {
    return await apiClient.get<CustomerDashboardSummaryDTO>(
      "/customers/customer/dashboard/summary"
    );
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, falling back to mock summary:", err);
    return getMockDashboardSummary();
  }
}

export interface GetCustomerParcelsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * List customer parcels with optional status filter and pagination.
 */
export async function getCustomerParcels(
  params?: GetCustomerParcelsParams
): Promise<CustomerParcelListDTO> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }
  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  try {
    return await apiClient.get<CustomerParcelListDTO>(
      `/customers/customer/parcels${query ? `?${query}` : ""}`
    );
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, falling back to mock parcels list:", err);
    return filterMockParcels(params?.status, params?.limit, params?.offset);
  }
}

/**
 * Get full customer parcel details including timeline and masked phone.
 */
export async function getCustomerParcelDetail(
  trackingId: string
): Promise<CustomerParcelDetailDTO> {
  try {
    return await apiClient.get<CustomerParcelDetailDTO>(
      `/customers/customer/parcels/${trackingId}`
    );
  } catch (err) {
    console.warn(`[CustomerAPI] Backend unreachable, falling back to mock parcel detail for ${trackingId}:`, err);
    return getMockCustomerParcelDetail(trackingId);
  }
}

/**
 * Cancel a pending customer delivery request.
 */
export async function cancelCustomerParcel(
  trackingId: string,
  payload: CustomerCancelParcelRequestDTO = {}
): Promise<CustomerParcelDetailDTO> {
  try {
    return await apiClient.post<CustomerParcelDetailDTO>(
      `/customers/customer/parcels/${trackingId}/cancel`,
      payload
    );
  } catch (err) {
    console.warn(`[CustomerAPI] Backend unreachable, falling back to mock cancellation for ${trackingId}:`, err);
    return cancelMockCustomerParcel(trackingId, payload.reason);
  }
}

