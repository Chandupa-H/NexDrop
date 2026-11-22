import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MerchantOrder, OrderStatus } from "../types";
import { ParcelDetailModal } from "./ParcelDetailModal";

const orderForStatus = (status: OrderStatus): MerchantOrder => ({
  id: "order-1",
  trackingNumber: "ND-123456",
  recipientName: "Nimal Perera",
  recipientPhone: "0771234567",
  deliveryAddress: "1 Main Street",
  deliveryCity: "Colombo",
  status,
  weightKg: 1,
  codAmount: 0,
  isPrepaid: true,
  estimatedDelivery: "Tomorrow",
  createdAt: "2026-01-01T10:00:00Z",
  failureReason: "Recipient unavailable",
});

describe("ParcelDetailModal timeline", () => {
  it.each([
    ["created", ["active", "pending", "pending", "pending", "pending"]],
    ["picked_up", ["completed", "active", "pending", "pending", "pending"]],
    ["in_transit", ["completed", "completed", "active", "pending", "pending"]],
    ["out_for_delivery", ["completed", "completed", "completed", "active", "pending"]],
    ["delivered", ["completed", "completed", "completed", "completed", "completed"]],
    ["cancelled", ["completed", "completed", "completed", "completed", "failed"]],
  ] as const)("shows the correct step states for %s", (status, expectedStates) => {
    const { container } = render(
      <ParcelDetailModal order={orderForStatus(status)} onClose={() => {}} />
    );

    const stepStates = Array.from(
      container.querySelectorAll<HTMLElement>("[data-step-state]")
    ).map((step) => step.dataset.stepState);

    expect(stepStates).toEqual(expectedStates);
  });

  it("shows a cancelled delivery reason in the red terminal step", () => {
    const { container, getAllByText, getByText } = render(
      <ParcelDetailModal
        order={orderForStatus("cancelled")}
        onClose={() => {}}
      />
    );

    expect(getByText("Recipient unavailable")).toBeInTheDocument();
    expect(getAllByText("Cancelled")).toHaveLength(2);
    expect(container.querySelector('[data-step-state="failed"]')).toHaveTextContent(
      "Cancelled"
    );
  });

  it("falls back to an unsuccessful attempt when a failed delivery has no reason", () => {
    const order = orderForStatus("failed");
    delete order.failureReason;
    const { getByText } = render(
      <ParcelDetailModal order={order} onClose={() => {}} />
    );

    expect(getByText("Delivery Failed")).toBeInTheDocument();
    expect(getByText("Unsuccessful attempt")).toBeInTheDocument();
  });
});
