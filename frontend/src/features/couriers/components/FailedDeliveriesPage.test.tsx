import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCourierFailedDeliveries } = vi.hoisted(() => ({ getCourierFailedDeliveries: vi.fn() }));
vi.mock("../api/courier.api", () => ({ getCourierFailedDeliveries }));

import { FailedDeliveriesPage } from "./FailedDeliveriesPage";

const response = {
  items: [
    {
      tracking_number: "NXD001243",
      customer_name: "Tharindu Bandara",
      customer_phone_masked: "+94 772 *** 5634",
      destination: "Galle",
      delivery_address: "23 Hikkaduwa Road, Galle",
      assigned_at: "2026-10-31T07:20:00+05:30",
      eta: null,
      courier_name: "Poorna Danushka",
      failed_at: "2026-10-31T09:30:00+05:30",
      failure_reason: "customer_unavailable",
      failure_reason_label: "Customer Unavailable",
      note: "Customer did not answer.",
      parcel_status: "failed",
      redelivery_status: "pending",
      attempt_number: 2,
      previous_attempts: [
        {
          attempt_number: 1,
          failed_at: "2026-10-30T14:20:00+05:30",
          failure_reason: "customer_unavailable",
          failure_reason_label: "Customer Unavailable",
          note: "Recipient did not answer the phone.",
        },
      ],
    },
  ],
  total: 1,
  summary: {
    total_failed_deliveries: 5,
    today_failed_deliveries: 0,
    pending_redelivery: 2,
    most_common_failure_reason: "Customer Unavailable",
  },
};

describe("FailedDeliveriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCourierFailedDeliveries.mockResolvedValue(response);
  });

  it("shows backend summary values and failed delivery records", async () => {
    render(<FailedDeliveriesPage />);
    expect(await screen.findByText("NXD001243")).toBeInTheDocument();
    expect(screen.getByText("Total Failed Deliveries")).toBeInTheDocument();
    expect(screen.getByText("Today's Failed Deliveries")).toBeInTheDocument();
    expect(screen.getByText("Pending Redelivery")).toBeInTheDocument();
    expect(screen.getByText("Most Common Failure Reason")).toBeInTheDocument();
    expect(screen.getByText("Tharindu Bandara")).toBeInTheDocument();
    expect(screen.getAllByText("Customer Unavailable").length).toBeGreaterThan(0);
  });

  it("sends search, reason, date, and redelivery filters to the backend", async () => {
    render(<FailedDeliveriesPage />);
    await screen.findByText("NXD001243");
    fireEvent.change(screen.getByRole("textbox", { name: "Search tracking number or recipient" }), { target: { value: "Tharindu" } });
    fireEvent.change(screen.getByLabelText("Filter by failure reason"), { target: { value: "customer_unavailable" } });
    fireEvent.change(screen.getByLabelText("Filter by failed date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Filter by redelivery status"), { target: { value: "pending" } });
    await waitFor(() => {
      expect(getCourierFailedDeliveries).toHaveBeenLastCalledWith({
        q: "Tharindu", reason: "customer_unavailable", date: "2026-10-31", redelivery_status: "pending",
      });
    });
  });

  it("opens details with earlier attempts and explains retry is unavailable", async () => {
    render(<FailedDeliveriesPage />);
    await screen.findByText("NXD001243");
    fireEvent.click(screen.getByRole("button", { name: "View failed delivery NXD001243, attempt 2" }));
    const dialog = screen.getByRole("dialog", { name: "NXD001243" });
    expect(within(dialog).getByText("Poorna Danushka")).toBeInTheDocument();
    expect(within(dialog).getByText("Retry Delivery is unavailable. This project has no backend redelivery scheduling or retry endpoint.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Attempt 1 · Customer Unavailable/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "NXD001243" })).not.toBeInTheDocument();
  });

  it("shows a clear empty state when the backend has no matching attempts", async () => {
    getCourierFailedDeliveries.mockResolvedValueOnce({ ...response, items: [], total: 0 });
    render(<FailedDeliveriesPage />);
    expect(await screen.findByText("No failed deliveries")).toBeInTheDocument();
  });
});
