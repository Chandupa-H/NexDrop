import type { CustomerParcelStatus, CustomerTableFilter } from "../types";

type StatusTone = "success" | "info" | "teal" | "warning" | "danger" | "neutral";

export const customerStatusMeta: Record<
  CustomerParcelStatus,
  { label: string; tone: StatusTone }
> = {
  pending: { label: "Pending", tone: "warning" },
  picked_up: { label: "Picked Up", tone: "teal" },
  in_transit: { label: "In Transit", tone: "info" },
  out_for_delivery: { label: "Out for Delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function getCustomerStatusLabel(status: CustomerParcelStatus): string {
  return customerStatusMeta[status]?.label || status;
}

export function getCustomerStatusTone(status: CustomerParcelStatus): StatusTone {
  return customerStatusMeta[status]?.tone || "neutral";
}

export function filterToCustomerStatusString(
  filter: CustomerTableFilter
): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "active") return "picked_up,in_transit,out_for_delivery";
  return filter;
}
