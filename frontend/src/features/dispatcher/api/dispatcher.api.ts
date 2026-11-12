import { cache } from "react";
import apiClient from "@/lib/api-client";
import type {
  DispatcherMeDTO,
  DispatcherStatsDTO,
  UnassignedParcelListDTO,
  UnassignedParcelDetailDTO,
} from "./dispatcher.dto";

/**
 * Get authenticated dispatcher profile.
 * Wrapped in React cache() so the layout and page share one request.
 */
export const getDispatcherProfile = cache(async (): Promise<DispatcherMeDTO> => {
  return apiClient.get<DispatcherMeDTO>("/dispatch/dispatcher/me");
});

/**
 * Get dispatcher dashboard metrics (strictly read-only query from backend).
 */
export async function getDispatcherStats(): Promise<DispatcherStatsDTO> {
  return apiClient.get<DispatcherStatsDTO>("/dispatch/dashboard/stats");
}

export interface GetUnassignedParcelsParams {
  search?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch unassigned parcels with search, city filter, and pagination.
 */
export async function getUnassignedParcels(
  params?: GetUnassignedParcelsParams
): Promise<UnassignedParcelListDTO> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.city && params.city !== "all") searchParams.set("city", params.city);
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  return apiClient.get<UnassignedParcelListDTO>(
    `/dispatch/unassigned-parcels${query ? `?${query}` : ""}`
  );
}

/**
 * Fetch full details for a single unassigned parcel.
 */
export async function getUnassignedParcelDetail(
  parcelId: number
): Promise<UnassignedParcelDetailDTO> {
  return apiClient.get<UnassignedParcelDetailDTO>(
    `/dispatch/unassigned-parcels/${parcelId}`
  );
}
