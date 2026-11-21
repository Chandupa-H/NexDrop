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
  updateMockCustomerParcelStatus,
  createMockCustomerParcel,
} from "./customer.mock";

/**
 * Get authenticated customer profile.
 * Safe for client-side and shared usage; falls back to apiClient or mock data.
 */
export const getCustomerProfile = cache(async (): Promise<CustomerMeDTO> => {
  // If in browser, read from supabase browser client if session exists
  if (typeof window !== "undefined") {
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        let profileRow: { full_name?: string; email?: string; phone?: string; default_address?: string; city?: string; postal_code?: string } | null = null;
        try {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, email, phone, default_address, city, postal_code")
            .eq("id", user.id)
            .maybeSingle();
          profileRow = data;
        } catch {
          // ignore
        }

        const meta = user.user_metadata || {};
        const metaName = (profileRow?.full_name as string) || (meta.full_name as string) || (meta.name as string);
        const emailPrefix = user.email
          ? user.email.split("@")[0].replace(/[._]/g, " ")
          : "";
        const formattedEmailName = emailPrefix
          ? emailPrefix
              .split(" ")
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : "Customer";

        const email = user.email || profileRow?.email || "";
        const profileObj: CustomerMeDTO = {
          id: 1,
          full_name: metaName || formattedEmailName,
          email,
          phone: profileRow?.phone || (meta.phone as string) || "",
          role: "customer",
          default_address: profileRow?.default_address || (meta.default_address as string) || "",
          city: profileRow?.city || (meta.city as string) || "",
          postal_code: profileRow?.postal_code || (meta.postal_code as string) || "",
        };

        if (typeof window !== "undefined" && email) {
          try {
            const { setActiveCustomerUserKey } = await import("./customer.mock");
            setActiveCustomerUserKey(email);
            localStorage.setItem(
              "nexdrop_current_user_profile",
              JSON.stringify(profileObj)
            );
          } catch {}
        }

        return profileObj;
      }
    } catch {
      // ignore
    }
  }

  try {
    const backendMe = await apiClient.get<CustomerMeDTO>("/customers/customer/me");
    if (backendMe) {
      const result: CustomerMeDTO = {
        ...backendMe,
        default_address: backendMe.default_address === "45/2 Temple Road" ? "" : backendMe.default_address,
        city: backendMe.city === "Colombo 07" ? "" : backendMe.city,
        postal_code: backendMe.postal_code === "00700" ? "" : backendMe.postal_code,
        phone:
          backendMe.phone === "+94771234567" || backendMe.phone === "+94 77 123 4567"
            ? ""
            : backendMe.phone,
        full_name: backendMe.full_name === "Dihini Kankanamage" ? "" : backendMe.full_name,
      };

      if (typeof window !== "undefined" && result.email) {
        try {
          const { setActiveCustomerUserKey } = await import("./customer.mock");
          setActiveCustomerUserKey(result.email);
          localStorage.setItem(
            "nexdrop_current_user_profile",
            JSON.stringify(result)
          );
        } catch {}
      }

      return result;
    }
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, falling back to mock profile:", err);
  }
  return MOCK_CUSTOMER_ME;
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
  // Update Supabase Auth user metadata & profiles table if in browser
  if (typeof window !== "undefined") {
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (
          payload.full_name ||
          payload.phone ||
          payload.default_address ||
          payload.city ||
          payload.postal_code
        ) {
          await supabase.auth.updateUser({
            data: {
              ...(payload.full_name ? { full_name: payload.full_name } : {}),
              ...(payload.phone ? { phone: payload.phone } : {}),
              ...(payload.default_address ? { default_address: payload.default_address } : {}),
              ...(payload.city ? { city: payload.city } : {}),
              ...(payload.postal_code ? { postal_code: payload.postal_code } : {}),
            },
          });
        }
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            ...(payload.full_name ? { full_name: payload.full_name } : {}),
            ...(payload.phone ? { phone: payload.phone } : {}),
            ...(payload.default_address ? { default_address: payload.default_address } : {}),
            ...(payload.city ? { city: payload.city } : {}),
            ...(payload.postal_code ? { postal_code: payload.postal_code } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch (supabaseErr) {
      console.warn("[CustomerAPI] Failed to sync Supabase profile update:", supabaseErr);
    }

    try {
      if (
        payload.default_address ||
        payload.city ||
        payload.postal_code ||
        payload.full_name ||
        payload.phone
      ) {
        const keys = ["nexdrop_customer_saved_addresses"];
        if (payload.full_name) {
          keys.push(`nexdrop_customer_saved_addresses_${payload.full_name.trim().toLowerCase().replace(/\s+/g, "_")}`);
        }
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("nexdrop_customer_saved_addresses_") && !keys.includes(k)) {
            keys.push(k);
          }
        }
        for (const storageKey of keys) {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const addresses = JSON.parse(stored);
            if (Array.isArray(addresses)) {
              const updated = addresses.map((a: any) => {
                if (a.isDefault && a.addressType === "pickup") {
                  return {
                    ...a,
                    ...(payload.default_address ? { address: payload.default_address } : {}),
                    ...(payload.city ? { city: payload.city } : {}),
                    ...(payload.postal_code ? { postalCode: payload.postal_code } : {}),
                    ...(payload.full_name ? { contactName: payload.full_name } : {}),
                    ...(payload.phone ? { phone: payload.phone } : {}),
                  };
                }
                return a;
              });
              localStorage.setItem(storageKey, JSON.stringify(updated));
              const def = updated.find((a: any) => a.isDefault && a.addressType === "pickup");
              if (def) localStorage.setItem("nexdrop_customer_default_pickup", JSON.stringify(def));
            }
          }
        }
      }
    } catch {
      // ignore localStorage sync error
    }
  }

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
  payload: CustomerCancelParcelRequestDTO = {},
  allowMockFallback = true
): Promise<CustomerParcelDetailDTO> {
  try {
    return await apiClient.post<CustomerParcelDetailDTO>(
      `/customers/customer/parcels/${encodeURIComponent(trackingId)}/cancel`,
      payload
    );
  } catch (err) {
    if (!allowMockFallback) throw err;
    console.warn(`[CustomerAPI] Backend unreachable, falling back to mock cancellation for ${trackingId}:`, err);
    return cancelMockCustomerParcel(trackingId, payload.reason);
  }
}

/**
 * Update parcel status and advance through the delivery lifecycle:
 * pending -> picked_up -> in_transit -> out_for_delivery -> delivered.
 */
export async function updateCustomerParcelStatus(
  trackingId: string,
  status: CustomerParcelDetailDTO["status"],
  note?: string,
  location?: string,
  allowMockFallback = true
): Promise<CustomerParcelDetailDTO> {
  try {
    return await apiClient.patch<CustomerParcelDetailDTO>(
      `/customers/customer/parcels/${encodeURIComponent(trackingId)}/status`,
      { status, note, location }
    );
  } catch (err) {
    if (!allowMockFallback) throw err;
    console.warn(`[CustomerAPI] Backend unreachable, falling back to mock status update for ${trackingId}:`, err);
    return updateMockCustomerParcelStatus(trackingId, status, note, location);
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
    const list = await apiClient.get<CustomerAddressDTO[]>(
      `/customers/customer/addresses${query}`
    );
    if (Array.isArray(list)) {
      // Filter out stale dev mock addresses
      return list.filter(
        (a) =>
          a.address !== "45/2 Temple Road" &&
          a.contact_name !== "Dihini Kankanamage" &&
          a.phone !== "+94 77 123 4567"
      );
    }
    return [];
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



