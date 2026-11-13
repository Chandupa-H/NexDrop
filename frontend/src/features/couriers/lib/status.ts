import type { CourierParcelStatus, ParcelStatus, TableFilter } from "../types";

type StatusTone = "success" | "info" | "teal" | "warning" | "danger";

export const statusMeta: Record<CourierParcelStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "warning" },
  picked_up: { label: "Picked Up", tone: "teal" },
  in_transit: { label: "In Transit", tone: "info" },
  out_for_delivery: { label: "Out for Delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
};

export const validNextStatuses: Record<CourierParcelStatus, ParcelStatus[]> = {
  pending: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["out_for_delivery"],
  out_for_delivery: [],
  delivered: [],
  cancelled: [],
  failed: [],
};

export function getStatusLabel(status: CourierParcelStatus): string {
  return statusMeta[status]?.label || status;
}

export function getStatusTone(status: CourierParcelStatus): StatusTone {
  return statusMeta[status]?.tone || "warning";
}

export function getNextStatuses(status: CourierParcelStatus): ParcelStatus[] {
  return validNextStatuses[status] || [];
}

export function filterToStatusString(filter: TableFilter): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "in_transit_group") return "picked_up,in_transit,out_for_delivery";
  return filter;
}

export function sortCourierParcelsByStatus<T extends { status: string }>(parcels: T[]): T[] {
  const order: Record<string, number> = {
    pending: 0,
    picked_up: 1,
    in_transit: 2,
    out_for_delivery: 3,
    delivered: 4,
    failed: 5,
    cancelled: 6,
  };

  return [...parcels].sort((a, b) => {
    const aOrder = order[a.status] ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order[b.status] ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

export function getUpNext<T extends { status: string }>(parcels: T[]): T | null {
  const inTransit = parcels.find((p) =>
    ["picked_up", "in_transit", "out_for_delivery"].includes(p.status)
  );
  if (inTransit) return inTransit;

  const nonTerminal = parcels.find(
    (p) => !["delivered", "cancelled", "failed"].includes(p.status)
  );
  return nonTerminal || null;
}
