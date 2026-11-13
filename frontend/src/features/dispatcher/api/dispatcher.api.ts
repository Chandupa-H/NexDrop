import { cache } from "react";
import apiClient from "@/lib/api-client";
import type {
  DispatcherMeDTO,
  DispatcherStatsDTO,
  DispatchAssignmentDTO,
  CourierWorkloadDTO,
  AssignCourierRequest,
  ReassignCourierRequest,
  WarehouseReceiveRequest,
  WarehouseHandoverRequest,
  UnassignedParcelListDTO,
  UnassignedParcelDetailDTO,
  DispatchWarehouseDTO,
  WarehouseStoredParcelDTO,
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

/**
 * Get all active and recent dispatch assignments.
 */
export async function getAssignments(courierId?: number): Promise<DispatchAssignmentDTO[]> {
  const query = courierId ? `?courier_id=${courierId}` : "";
  return apiClient.get<DispatchAssignmentDTO[]>(`/dispatch${query}`);
}

/**
 * Get courier fleet workload & availability.
 */
export async function getCourierWorkload(): Promise<CourierWorkloadDTO[]> {
  return apiClient.get<CourierWorkloadDTO[]>("/dispatch/couriers/workload");
}

/**
 * Assign courier to parcel.
 */
export async function assignCourier(
  payload: AssignCourierRequest
): Promise<DispatchAssignmentDTO> {
  return apiClient.post<DispatchAssignmentDTO>("/dispatch/assign", payload);
}

/**
 * Reassign an active dispatch assignment to another courier.
 */
export async function reassignCourier(
  assignmentId: number,
  payload: ReassignCourierRequest
): Promise<DispatchAssignmentDTO> {
  return apiClient.post<DispatchAssignmentDTO>(
    `/dispatch/${assignmentId}/reassign`,
    payload
  );
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

/**
 * Warehouse dispatch: receive parcel into warehouse.
 */
export async function receiveAtWarehouse(
  payload: WarehouseReceiveRequest
): Promise<any> {
  return apiClient.post<any>("/dispatch/warehouse/receive", payload);
}

/**
 * Fetch list of active warehouses.
 */
export async function getDispatchWarehouses(): Promise<DispatchWarehouseDTO[]> {
  return apiClient.get<DispatchWarehouseDTO[]>("/dispatch/warehouses");
}

/**
 * Fetch parcels currently stored inside warehouses awaiting courier handover.
 */
export async function getWarehouseStoredParcels(
  warehouseId?: number
): Promise<WarehouseStoredParcelDTO[]> {
  const query = warehouseId ? `?warehouse_id=${warehouseId}` : "";
  return apiClient.get<WarehouseStoredParcelDTO[]>(
    `/dispatch/warehouse/stored-parcels${query}`
  );
}

/**
 * Warehouse dispatch: handover parcel to courier.
 */
export async function handoverFromWarehouse(
  payload: WarehouseHandoverRequest
): Promise<DispatchAssignmentDTO> {
  return apiClient.post<DispatchAssignmentDTO>(
    "/dispatch/warehouse/handover",
    payload
  );
}
