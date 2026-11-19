"use server";

import { ApiError } from "@/lib/api-client";
import { historyCancellationPolicy } from "../config/history-cancellation";
import { cancelCustomerParcelAction } from "./parcels";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";

export type HistoryCancellationResult =
  | { ok: true; parcel: CustomerParcelDetailDTO }
  | { ok: false; message: string; conflict?: boolean };

export async function cancelCustomerHistoryParcelAction(
  trackingId: string,
  reason?: string
): Promise<HistoryCancellationResult> {
  // This check runs on the server even if a caller bypasses the disabled UI.
  if (!historyCancellationPolicy.enabled) {
    return { ok: false, message: historyCancellationPolicy.message };
  }
  try {
    const parcel = await cancelCustomerParcelAction(trackingId, reason?.trim() || undefined, false);
    if (parcel.status !== "cancelled" || parcel.tracking_id.toUpperCase() !== trackingId.toUpperCase()) {
      return { ok: false, message: "Cancellation was not confirmed by the service. Refresh the shipment before trying again." };
    }
    return { ok: true, parcel };
  } catch (error) {
    // Return plain data: custom Error properties are not preserved across server actions.
    if (error instanceof ApiError && error.status === 409) {
      return { ok: false, conflict: true, message: "This delivery can no longer be cancelled. Only pending deliveries can be cancelled. Refresh the shipment to see its current status." };
    }
    return { ok: false, message: "Unable to cancel this delivery. No cancellation has been confirmed. Please try again." };
  }
}
