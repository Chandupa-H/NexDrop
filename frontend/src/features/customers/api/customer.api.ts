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
  CustomerCreateParcelRequestDTO,
  CustomerAddressDTO,
  CustomerAddressCreateDTO,
  CustomerAddressUpdateDTO,
} from "./customer.dto";
import {
  MOCK_CUSTOMER_ME,
  getMockDashboardSummary,
  filterMockParcels,
  getMockCustomerParcelDetail,
  cancelMockCustomerParcel,
  createMockCustomerParcel,
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
 * Update authenticated customer profile.
 */
export async function updateCustomerProfile(
  payload: Partial<{
    full_name: string;
    phone: string;
    default_address: string;
    city: string;
    postal_code: string;
  }>
): Promise<CustomerMeDTO> {
  try {
    const updated = await apiClient.put<CustomerMeDTO>("/customers/customer/me", payload);
    // keep mock in sync
    Object.assign(MOCK_CUSTOMER_ME, updated);
    return updated;
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, updating in-memory profile:", err);
    if (payload.full_name) MOCK_CUSTOMER_ME.full_name = payload.full_name;
    if (payload.phone) MOCK_CUSTOMER_ME.phone = payload.phone;
    if (payload.default_address) MOCK_CUSTOMER_ME.default_address = payload.default_address;
    if (payload.city) MOCK_CUSTOMER_ME.city = payload.city;
    if (payload.postal_code) MOCK_CUSTOMER_ME.postal_code = payload.postal_code;
    return { ...MOCK_CUSTOMER_ME };
  }
}

/**
 * Delete customer profile and session data.
 */
export async function deleteCustomerProfile(): Promise<void> {
  try {
    await apiClient.delete("/customers/customer/me");
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable during profile deletion:", err);
  }
}

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
  params?: GetCustomerParcelsParams,
  allowMockFallback = true
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
    if (!allowMockFallback) throw err;
    console.warn("[CustomerAPI] Backend unreachable, falling back to mock parcels list:", err);
    return filterMockParcels(params?.status, params?.limit, params?.offset);
  }
}

/**
 * Get full customer parcel details including timeline and masked phone.
 */
export async function getCustomerParcelDetail(
  trackingId: string,
  allowMockFallback = true
): Promise<CustomerParcelDetailDTO> {
  try {
    return await apiClient.get<CustomerParcelDetailDTO>(
      `/customers/customer/parcels/${encodeURIComponent(trackingId)}`
    );
  } catch (err) {
    if (!allowMockFallback) throw err;
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

/**
 * Book a new customer delivery shipment.
 */
export async function createCustomerParcel(
  payload: CustomerCreateParcelRequestDTO
): Promise<CustomerParcelDetailDTO> {
  try {
    return await apiClient.post<CustomerParcelDetailDTO>(
      "/customers/customer/parcels",
      payload
    );
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, booking via local fallback:", err);
    return createMockCustomerParcel(payload);
  }
}

/**
 * List saved customer addresses (pickup / dropoff).
 */
export async function getCustomerAddresses(
  type?: "pickup" | "dropoff"
): Promise<CustomerAddressDTO[]> {
  try {
    const query = type ? `?type=${type}` : "";
    return await apiClient.get<CustomerAddressDTO[]>(
      `/customers/customer/addresses${query}`
    );
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable for addresses:", err);
    return [];
  }
}

/**
 * Save a new customer address to database.
 */
export async function createCustomerAddress(
  payload: CustomerAddressCreateDTO
): Promise<CustomerAddressDTO> {
  return await apiClient.post<CustomerAddressDTO>(
    "/customers/customer/addresses",
    payload
  );
}

/**
 * Update an existing customer address.
 */
export async function updateCustomerAddress(
  addressId: number,
  payload: CustomerAddressUpdateDTO
): Promise<CustomerAddressDTO> {
  return await apiClient.put<CustomerAddressDTO>(
    `/customers/customer/addresses/${addressId}`,
    payload
  );
}

/**
 * Delete a customer address.
 */
export async function deleteCustomerAddress(addressId: number): Promise<void> {
  await apiClient.delete(`/customers/customer/addresses/${addressId}`);
}

/**
 * Set a customer address as default.
 */
export async function setDefaultCustomerAddress(
  addressId: number
): Promise<CustomerAddressDTO> {
  return await apiClient.patch<CustomerAddressDTO>(
    `/customers/customer/addresses/${addressId}/default`
  );
}



