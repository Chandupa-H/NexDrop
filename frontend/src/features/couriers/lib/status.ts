import type { ParcelStatus, TableFilter } from "../types";

type StatusTone = "success" | "info" | "teal" | "warning" | "danger";

export const statusMeta: Record<ParcelStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "warning" },
  picked_up: { label: "Picked Up", tone: "teal" },
  in_transit: { label: "In Transit", tone: "info" },
  out_for_delivery: { label: "Out for Delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const validNextStatuses: Record<ParcelStatus, ParcelStatus[]> = {
  pending: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function getStatusLabel(status: ParcelStatus): string {
  return statusMeta[status]?.label || status;
}

export function getStatusTone(status: ParcelStatus): StatusTone {
  return statusMeta[status]?.tone || "warning";
}

export function getNextStatuses(status: ParcelStatus): ParcelStatus[] {
  return validNextStatuses[status] || [];
}

export function filterToStatusString(filter: TableFilter): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "in_transit_group") return "picked_up,in_transit,out_for_delivery";
  return filter;
}

export function getUpNext<T extends { status: string }>(parcels: T[]): T | null {
  const inTransit = parcels.find((p) =>
    ["picked_up", "in_transit", "out_for_delivery"].includes(p.status)
  );
  if (inTransit) return inTransit;
  
  const nonTerminal = parcels.find((p) => !["delivered", "cancelled"].includes(p.status));
  return nonTerminal || null;
}
