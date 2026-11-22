import { describe, expect, it } from "vitest";
import type { MerchantOrder } from "../types";
import { calculateMerchantKpis } from "../data/mock-merchant-data";
import {
  getOrderStatusBadgeVariant,
  getOrderStatusLabel,
  getOrderStatusLevel,
  isInTransitStatus,
  isTerminalFailureStatus,
  ORDER_STATUSES,
} from "./order-status";

describe("merchant order statuses", () => {
  it("defines labels and lifecycle levels for every merchant status", () => {
    expect(ORDER_STATUSES).toEqual([
      "created",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "failed",
    ]);

    expect(ORDER_STATUSES.map((status) => getOrderStatusLabel(status))).toEqual([
      "Order Created",
      "Picked Up",
      "In Transit",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Failed",
    ]);
    expect(ORDER_STATUSES.map((status) => getOrderStatusLevel(status))).toEqual([
      1, 2, 3, 4, 5, 5, 5,
    ]);
  });

  it("treats pending as Order Created and classifies transit and terminal failures", () => {
    expect(getOrderStatusLabel("pending")).toBe("Order Created");
    expect(getOrderStatusLevel("pending")).toBe(1);
    expect(getOrderStatusBadgeVariant("pending")).toBe("created");
    expect(isInTransitStatus("picked_up")).toBe(true);
    expect(isInTransitStatus("in_transit")).toBe(true);
    expect(isInTransitStatus("created")).toBe(false);
    expect(isTerminalFailureStatus("failed")).toBe(true);
    expect(isTerminalFailureStatus("cancelled")).toBe(true);
    expect(isTerminalFailureStatus("delivered")).toBe(false);
  });

  it("counts picked-up parcels in transit and excludes terminal failures from pending COD", () => {
    const makeOrder = (
      id: string,
      status: MerchantOrder["status"],
      codAmount: number
    ): MerchantOrder => ({
      id,
      trackingNumber: id,
      recipientName: "Recipient",
      recipientPhone: "0771234567",
      deliveryAddress: "1 Main Street",
      deliveryCity: "Colombo",
      status,
      weightKg: 1,
      codAmount,
      isPrepaid: false,
      estimatedDelivery: "Tomorrow",
      createdAt: "2026-01-01T10:00:00Z",
    });

    const kpis = calculateMerchantKpis([
      makeOrder("picked-up", "picked_up", 100),
      makeOrder("in-transit", "in_transit", 200),
      makeOrder("cancelled", "cancelled", 300),
      makeOrder("failed", "failed", 400),
    ]);

    expect(kpis.inTransit).toBe(2);
    expect(kpis.failed).toBe(2);
    expect(kpis.pendingCod).toBe(300);
  });
});
