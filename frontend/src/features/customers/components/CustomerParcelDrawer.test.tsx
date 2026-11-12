import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerParcelDrawer } from "./CustomerParcelDrawer";
import { getCustomerParcelDetail } from "../api/customer.api";

vi.mock("../api/customer.api", () => ({ getCustomerParcelDetail: vi.fn() }));
vi.mock("../actions/parcels", () => ({ cancelCustomerParcelAction: vi.fn() }));

describe("CustomerParcelDrawer read-only mode", () => {
  beforeEach(() => {
    vi.mocked(getCustomerParcelDetail).mockResolvedValue({
      tracking_id: "ND-TEST", recipient_name: "Test recipient", recipient_phone_masked: "***",
      sender_name: "Test sender", delivery_address: "Test destination", delivery_city: "Test city",
      pickup_address: "Test origin", pickup_city: "Test city", status: "pending",
      created_at: "2026-11-10T10:00:00Z", eta: null, fee: 400, weight_kg: 1, notes: [], timeline: [],
    });
  });
  it("hides receipt and cancellation actions in history", async () => {
    render(<CustomerParcelDrawer trackingId="ND-TEST" readOnly onClose={vi.fn()} onParcelUpdated={vi.fn()} />);
    await screen.findByText("Parcel Specifications");
    expect(screen.queryByRole("button", { name: "Print Receipt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Delivery" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Full Tracking Page" })).toBeInTheDocument();
  });
  it("preserves dashboard actions by default", async () => {
    render(<CustomerParcelDrawer trackingId="ND-TEST" onClose={vi.fn()} onParcelUpdated={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Print Receipt" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel Delivery" })).toBeVisible();
  });
});
