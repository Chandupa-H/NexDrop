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
export interface RemainingDeliveryStep {
  key: CustomerParcelStatus;
  label: string;
  location: string;
}

export function getStageIndex(status: CustomerParcelStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "picked_up":
      return 1;
    case "in_transit":
      return 2;
    case "out_for_delivery":
      return 3;
    case "delivered":
      return 4;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

export function getRemainingDeliverySteps(parcel: {
  status: CustomerParcelStatus;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
  pickupCity?: string | null;
  timeline?: Array<{ status: string }> | null;
}): RemainingDeliveryStep[] {
  if (parcel.status === "delivered" || parcel.status === "cancelled") {
    return [];
  }

  const existingStatuses = new Set(
    (parcel.timeline || []).map((evt) => evt.status.toLowerCase().trim())
  );

  const STAGE_TEMPLATES: Array<{
    key: CustomerParcelStatus;
    label: string;
    getLocation: (p: typeof parcel) => string;
  }> = [
    {
      key: "pending",
      label: "Order Created",
      getLocation: () => "Online Portal",
    },
    {
      key: "picked_up",
      label: "Picked Up by Courier",
      getLocation: (p) =>
        p.pickupCity ? `${p.pickupCity} (Courier Collection)` : "Sender Collection Area",
    },
    {
      key: "in_transit",
      label: "Sorted at Central Hub",
      getLocation: () => "Central Sorting Hub",
    },
    {
      key: "out_for_delivery",
      label: "Out for Delivery",
      getLocation: (p) =>
        p.deliveryCity ? `${p.deliveryCity} Dispatch Station` : "Local Dispatch Hub",
    },
    {
      key: "delivered",
      label: "Delivered & Signed",
      getLocation: (p) =>
        p.deliveryAddress && p.deliveryCity
          ? `${p.deliveryAddress}, ${p.deliveryCity}`
          : p.deliveryCity
          ? `${p.deliveryCity} (Recipient Address)`
          : "Recipient Address",
    },
  ];

  const currentIdx = getStageIndex(parcel.status);

  return STAGE_TEMPLATES.filter(
    (tpl, idx) => idx > currentIdx && !existingStatuses.has(tpl.key)
  ).map((tpl) => ({
    key: tpl.key,
    label: tpl.label,
    location: tpl.getLocation(parcel),
  }));
}
