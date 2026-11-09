"use server";

import { getAssignedParcels } from "../api/courier.api";
import type { ParcelListDTO } from "../api/courier.dto";
import type { TableFilter } from "../types";

const filterStatuses: Partial<Record<TableFilter, string>> = {
  pending: "pending",
  in_transit_group: "picked_up,in_transit,out_for_delivery",
  delivered: "delivered",
  failed: "failed",
};

export async function fetchParcelsAction(filter: TableFilter): Promise<ParcelListDTO> {
  if (filter === "all") {
    return getAssignedParcels({ limit: 50, offset: 0 });
  }
  const status = filterStatuses[filter];
  if (!status) {
    throw new Error(`Unsupported server-side parcel filter: ${filter}`);
  }

  return getAssignedParcels({ status, limit: 6, offset: 0 });
}
