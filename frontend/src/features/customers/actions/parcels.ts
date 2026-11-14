"use server";

import { getCustomerParcels, cancelCustomerParcel } from "../api/customer.api";
import type { CustomerParcelListDTO, CustomerParcelDetailDTO } from "../api/customer.dto";
import type { CustomerTableFilter } from "../types";

const filterStatuses: Partial<Record<CustomerTableFilter, string>> = {
  active: "picked_up,in_transit,out_for_delivery",
  delivered: "delivered",
  pending: "pending",
  cancelled: "cancelled",
};

export async function fetchCustomerParcelsAction(
  filter: CustomerTableFilter
): Promise<CustomerParcelListDTO> {
  const status = filter === "all" ? undefined : filterStatuses[filter];
  return getCustomerParcels({ status, limit: 10, offset: 0 });
}

export async function cancelCustomerParcelAction(
  trackingId: string,
  reason?: string
): Promise<CustomerParcelDetailDTO> {
  return cancelCustomerParcel(trackingId, { reason });
}
