import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerHistoryView } from "./CustomerHistoryView";
import { fetchCustomerParcelsAction } from "../actions/parcels";
import type { CustomerParcelListDTO } from "../api/customer.dto";

vi.mock("../actions/parcels", () => ({ fetchCustomerParcelsAction: vi.fn() }));
vi.mock("./CustomerParcelDrawer", () => ({
  CustomerParcelDrawer: ({ trackingId, readOnly }: { trackingId: string; readOnly?: boolean }) =>
    <div role="dialog">{trackingId} {readOnly ? "Read-only details" : "Editable details"}</div>,
}));

const fetchParcels = vi.mocked(fetchCustomerParcelsAction);
// Generated response data is confined to tests; no customer fixtures are added to the application.
function response(count = 10, total = 21, offset = 0): CustomerParcelListDTO {
  return {
    total,
    items: Array.from({ length: count }, (_, index) => ({
      tracking_id: `ND-TEST${offset + index}`, recipient_name: `Recipient ${offset + index}`,
      destination: "Test city", status: "pending", created_at: "2026-11-10T10:00:00Z",
      estimated_fee: 400, weight_kg: 1, eta: null,
    })),
  };
}

describe("CustomerHistoryView", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("paginates API results, resets filters to page one, and searches only the current page", async () => {
    fetchParcels.mockResolvedValueOnce(response()).mockResolvedValueOnce(response(10, 21, 10)).mockResolvedValueOnce(response(1, 1));
    render(<CustomerHistoryView />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await screen.findByText("Showing 1–10 of 21 deliveries");
    expect(fetchParcels).toHaveBeenLastCalledWith("all", 1, false);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Showing 11–20 of 21 deliveries");
    expect(fetchParcels).toHaveBeenLastCalledWith("all", 2, false);
    fireEvent.change(screen.getByLabelText("Search this page"), { target: { value: "ND-TEST11" } });
    expect(screen.getByText("ND-TEST11")).toBeInTheDocument();
    expect(screen.queryByText("ND-TEST10")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search this page"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Delivered" }));
    await screen.findByText("Showing 1–1 of 1 deliveries");
    expect(fetchParcels).toHaveBeenLastCalledWith("delivered", 1, false);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Read-only details");
  });

  it("shows an error without a false empty state and retries with loading feedback", async () => {
    let resolve!: (data: CustomerParcelListDTO) => void;
    fetchParcels.mockRejectedValueOnce(new Error("Unavailable")).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<CustomerHistoryView />);
    await screen.findByRole("alert");
    expect(screen.queryByText("No deliveries found")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await act(async () => resolve(response(0, 0)));
    expect(await screen.findByText("No deliveries found")).toBeInTheDocument();
    expect(screen.getByText("Showing 0–0 of 0 deliveries")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book Delivery" })).toHaveAttribute("href", "/customer/book");
  });

  it("ignores older filter responses, including late errors", async () => {
    let rejectOld!: (error: Error) => void;
    fetchParcels.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }))
      .mockResolvedValueOnce(response(1, 1, 50));
    render(<CustomerHistoryView />);
    fireEvent.click(screen.getByRole("button", { name: "Pending" }));
    await screen.findByText("ND-TEST50");
    await act(async () => rejectOld(new Error("Late failure")));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("ND-TEST50")).toBeInTheDocument();
  });
});
