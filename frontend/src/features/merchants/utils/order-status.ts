export const ORDER_STATUSES = [
  "created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type MerchantOrderStatus = OrderStatus | "pending";

export const ORDER_STATUS_LEVELS: Record<OrderStatus, number> = {
  created: 1,
  picked_up: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 5,
  failed: 5,
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: "Order Created",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
};

export const IN_TRANSIT_ORDER_STATUSES = ["picked_up", "in_transit"] as const;
export const TERMINAL_FAILURE_ORDER_STATUSES = ["failed", "cancelled"] as const;

export function getOrderStatusLabel(status: MerchantOrderStatus): string {
  return status === "pending" ? ORDER_STATUS_LABELS.created : ORDER_STATUS_LABELS[status];
}

export function getOrderStatusLevel(status: MerchantOrderStatus): number {
  return status === "pending" ? ORDER_STATUS_LEVELS.created : ORDER_STATUS_LEVELS[status];
}

export function getOrderStatusBadgeVariant(status: MerchantOrderStatus): OrderStatus {
  return status === "pending" ? "created" : status;
}

export function isInTransitStatus(status: OrderStatus): boolean {
  return IN_TRANSIT_ORDER_STATUSES.some((inTransitStatus) => inTransitStatus === status);
}

export function isTerminalFailureStatus(status: OrderStatus): boolean {
  return TERMINAL_FAILURE_ORDER_STATUSES.some(
    (failureStatus) => failureStatus === status
  );
}
