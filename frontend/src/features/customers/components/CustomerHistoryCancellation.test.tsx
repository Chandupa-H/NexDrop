import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerParcelDrawer } from "./CustomerParcelDrawer";
import { CustomerHistoryView } from "./CustomerHistoryView";
import { getCustomerParcelDetail } from "../api/customer.api";
import { fetchCustomerParcelsAction, cancelCustomerParcelAction } from "../actions/parcels";
import { cancelCustomerHistoryParcelAction, type HistoryCancellationResult } from "../actions/history-cancellation";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";

const policy = vi.hoisted(() => ({ enabled: false, message: "Live cancellation is disabled until customer ownership is verified." }));
vi.mock("../config/history-cancellation", () => ({ historyCancellationPolicy: policy }));
vi.mock("../api/customer.api", () => ({ getCustomerParcelDetail: vi.fn() }));
vi.mock("../actions/parcels", () => ({ fetchCustomerParcelsAction: vi.fn(), cancelCustomerParcelAction: vi.fn() }));
vi.mock("../actions/history-cancellation", () => ({ cancelCustomerHistoryParcelAction: vi.fn() }));

const parcel: CustomerParcelDetailDTO = {
  tracking_id: "ND-TEST", recipient_name: "Test recipient", recipient_phone_masked: "***",
  sender_name: "Test sender", delivery_address: "Test destination", delivery_city: "Test city",
  pickup_address: "Test origin", pickup_city: "Test city", status: "pending",
  created_at: "2026-11-10T10:00:00Z", eta: null, fee: 400, weight_kg: 1, notes: [], timeline: [],
};

function drawer(onParcelUpdated = vi.fn()) {
  return render(<CustomerParcelDrawer trackingId="ND-TEST" readOnly historyCancellation onClose={vi.fn()} onParcelUpdated={onParcelUpdated} />);
}
async function confirm() {
  fireEvent.click(await screen.findByRole("button", { name: "Cancel Delivery" }));
  return screen.getByRole("button", { name: "Confirm Cancel" });
}

describe("history cancellation workflow (mock requests only)", () => {
  beforeEach(() => {
    vi.resetAllMocks(); policy.enabled = false;
    vi.mocked(getCustomerParcelDetail).mockResolvedValue(parcel);
  });
  it("lets pending shipments review confirmation but never submit with the gate closed", async () => {
    drawer();
    expect(await screen.findByText(policy.message)).toBeInTheDocument();
    const button = await confirm();
    expect(screen.getByRole("group", { name: "Confirm Cancellation" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason for cancellation (optional)"), { target: { value: "Changed plans" } });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(cancelCustomerHistoryParcelAction).not.toHaveBeenCalled();
    expect(cancelCustomerParcelAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep Order" }));
    expect(screen.queryByRole("group", { name: "Confirm Cancellation" })).not.toBeInTheDocument();
  });
  it.each(["picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled"])("keeps %s shipments read-only", async (status) => {
    vi.mocked(getCustomerParcelDetail).mockResolvedValue({ ...parcel, status });
    drawer();
    await screen.findByText("Parcel Specifications");
    expect(screen.queryByRole("button", { name: "Cancel Delivery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print Receipt" })).not.toBeInTheDocument();
  });
  it("submits a reason once, prevents duplicates and refreshes only on confirmed success", async () => {
    policy.enabled = true;
    let resolve!: (value: HistoryCancellationResult) => void;
    vi.mocked(cancelCustomerHistoryParcelAction).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const updated = vi.fn(); drawer(updated);
    const button = await confirm();
    fireEvent.change(screen.getByLabelText("Reason for cancellation (optional)"), { target: { value: " Changed plans " } });
    fireEvent.click(button); fireEvent.click(button);
    expect(cancelCustomerHistoryParcelAction).toHaveBeenCalledExactlyOnceWith("ND-TEST", "Changed plans");
    expect(screen.getByRole("button", { name: "Cancelling..." })).toBeDisabled();
    expect(screen.getByLabelText("Reason for cancellation (optional)")).toBeDisabled();
    expect(updated).not.toHaveBeenCalled();
    await act(async () => resolve({ ok: true, parcel: { ...parcel, status: "cancelled" } }));
    expect(updated).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Delivery cancelled");
    expect(screen.queryByRole("button", { name: "Cancel Delivery" })).not.toBeInTheDocument();
  });
  it.each([false, true])("shows failures without a success message (conflict=%s)", async (conflict) => {
    policy.enabled = true;
    vi.mocked(cancelCustomerHistoryParcelAction).mockResolvedValue({ ok: false, conflict, message: conflict ? "This delivery can no longer be cancelled." : "Unable to cancel this delivery." });
    const updated = vi.fn(); drawer(updated);
    fireEvent.click(await confirm());
    expect(await screen.findByRole("alert")).toHaveTextContent(conflict ? "no longer be cancelled" : "Unable to cancel");
    expect(screen.queryByText(/Delivery cancelled\./)).not.toBeInTheDocument();
    expect(updated).toHaveBeenCalledTimes(conflict ? 1 : 0);
    expect(screen.getByRole("button", { name: "Confirm Cancel" })).toBeEnabled();
  });
  it("refreshes pending totals after cancellation and finds the shipment under Cancelled", async () => {
    policy.enabled = true;
    let status = "pending";
    vi.mocked(fetchCustomerParcelsAction).mockImplementation(async (filter) => {
      const included = filter === "all" || filter === status;
      return { total: included ? 1 : 0, items: included ? [{ tracking_id: parcel.tracking_id,
        recipient_name: parcel.recipient_name, destination: parcel.delivery_city, status,
        created_at: parcel.created_at, estimated_fee: parcel.fee, weight_kg: 1, eta: null }] : [] };
    });
    vi.mocked(cancelCustomerHistoryParcelAction).mockImplementation(async () => {
      status = "cancelled"; return { ok: true, parcel: { ...parcel, status } };
    });
    render(<CustomerHistoryView />);
    await screen.findByText("Showing 1–1 of 1 deliveries");
    fireEvent.click(screen.getByRole("button", { name: "Pending" }));
    await waitFor(() => expect(fetchCustomerParcelsAction).toHaveBeenLastCalledWith("pending", 1, false));
    fireEvent.click(await screen.findByRole("button", { name: "Details" }));
    fireEvent.click(await confirm());
    await screen.findByText("Showing 0–0 of 0 deliveries");
    expect(cancelCustomerHistoryParcelAction).toHaveBeenCalledWith("ND-TEST", undefined);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelled" }));
    await screen.findByText("Showing 1–1 of 1 deliveries");
    expect(within(screen.getByRole("table")).getByText(parcel.tracking_id)).toBeInTheDocument();
    expect(fetchCustomerParcelsAction).toHaveBeenLastCalledWith("cancelled", 1, false);
  });
  it("moves back to the last available page after cancellation removes its final pending record", async () => {
    policy.enabled = true;
    let total = 11;
    vi.mocked(fetchCustomerParcelsAction).mockImplementation(async (_filter, page = 1) => {
      const count = Math.min(10, Math.max(0, total - (page - 1) * 10));
      return { total, items: Array.from({ length: count }, (_, index) => ({
        tracking_id: page === 2 ? "ND-TEST" : `ND-PAGE${index}`, recipient_name: "Test recipient",
        destination: "Test city", status: "pending", created_at: parcel.created_at,
        estimated_fee: 400, weight_kg: 1, eta: null,
      })) };
    });
    vi.mocked(cancelCustomerHistoryParcelAction).mockImplementation(async () => {
      total = 10; return { ok: true, parcel: { ...parcel, status: "cancelled" } };
    });
    render(<CustomerHistoryView />);
    await screen.findByText("Showing 1–10 of 11 deliveries");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Showing 11–11 of 11 deliveries");
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    fireEvent.click(await confirm());
    await screen.findByText("Showing 1–10 of 10 deliveries");
    expect(fetchCustomerParcelsAction).toHaveBeenLastCalledWith("all", 1, false);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });
});
