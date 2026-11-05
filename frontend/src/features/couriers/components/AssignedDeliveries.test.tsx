import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCourierDeliveries, push, readSearchParams } = vi.hoisted(() => ({
  getCourierDeliveries: vi.fn(),
  push: vi.fn(),
  readSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/courier/deliveries",
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(readSearchParams()),
}));

vi.mock("@/features/couriers/api/courier.api", () => ({
  getCourierDeliveries,
}));

import { AssignedDeliveries } from "./AssignedDeliveries";

describe("AssignedDeliveries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readSearchParams.mockReturnValue("");
  });

  it("renders a delivery returned by the API", async () => {
    getCourierDeliveries.mockResolvedValue([
      {
        parcel_id: 17,
        tracking_number: "ND-0000000017",
        status: "pending",
        pickup_address: "10 Main Street, Colombo",
        dropoff_address: "20 Lake Road, Colombo",
        size: "20x15x10",
        weight: 2,
        recipient_name: "Test Recipient",
        recipient_phone: "0771234567",
        assigned_at: "2026-11-05T08:00:00+05:30",
      },
    ]);

    render(<AssignedDeliveries />);

    expect(await screen.findByText("ND-0000000017")).toBeInTheDocument();
    expect(screen.getByText("10 Main Street, Colombo")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "To Pick Up 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "0771234567" })).toHaveAttribute(
      "href",
      "tel:0771234567"
    );
    fireEvent.click(screen.getByRole("button", { name: /View Details/ }));
    expect(push).toHaveBeenCalledWith(
      "/courier/dashboard?tracking_id=ND-0000000017"
    );
  });

  it("shows the required empty state when the API returns no deliveries", async () => {
    getCourierDeliveries.mockResolvedValue([]);

    render(<AssignedDeliveries />);

    expect(
      await screen.findByText("No deliveries assigned today")
    ).toBeInTheDocument();
  });

  it("retries a failed request", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getCourierDeliveries
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce([]);

    render(<AssignedDeliveries />);
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));

    await waitFor(() => {
      expect(getCourierDeliveries).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText("No deliveries assigned today")
    ).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("stores grouped status filters in the URL query", () => {
    getCourierDeliveries.mockResolvedValue([]);
    render(<AssignedDeliveries />);

    fireEvent.click(screen.getByRole("tab", { name: "In Progress 0" }));

    expect(push).toHaveBeenCalledWith(
      "/courier/deliveries?status=picked_up&status=in_transit&status=out_for_delivery",
      { scroll: false }
    );
  });

  it("requests the statuses stored in the URL", async () => {
    readSearchParams.mockReturnValue(
      "status=picked_up&status=in_transit&status=out_for_delivery"
    );
    getCourierDeliveries.mockResolvedValue([]);

    render(<AssignedDeliveries />);

    await waitFor(() => {
      expect(getCourierDeliveries).toHaveBeenCalledWith([
        "picked_up",
        "in_transit",
        "out_for_delivery",
      ]);
    });
  });
});
