"use server";

import { getCustomerParcels, cancelCustomerParcel } from "../api/customer.api";
import type { CustomerParcelListDTO, CustomerParcelDetailDTO } from "../api/customer.dto";
import type { CustomerTableFilter } from "../types";
import { filterToCustomerStatusString } from "../lib/status";

export async function fetchCustomerParcelsAction(
  filter: CustomerTableFilter,
  page = 1,
  allowMockFallback = true
): Promise<CustomerParcelListDTO> {
  const status = filterToCustomerStatusString(filter);
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  return getCustomerParcels({ status, limit: 10, offset: (safePage - 1) * 10 }, allowMockFallback);
}

export async function cancelCustomerParcelAction(
  trackingId: string,
  reason?: string
): Promise<CustomerParcelDetailDTO> {
  return cancelCustomerParcel(trackingId, { reason });
}
