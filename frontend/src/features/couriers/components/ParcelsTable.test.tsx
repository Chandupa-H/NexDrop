import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParcelsTable } from "./ParcelsTable";
import type { ParcelListItem } from "../types";

const parcels: ParcelListItem[] = Array.from({ length: 6 }, (_, index) => ({
  trackingId: `NXD-${index + 1}`,
  customerName: `Customer ${index + 1}`,
  destination: "Colombo",
  status: "pending",
  assignedAt: "2026-11-10T08:00:00+05:30",
  assignedAtDisplay: "08:00 AM",
  eta: null,
}));

describe("ParcelsTable pagination", () => {
  it("shows the current range and requests the next page", () => {
    const onPageChange = vi.fn();

    render(
      <ParcelsTable
        parcels={parcels}
        total={25}
        page={1}
        pageSize={6}
        filter="all"
        onFilterChange={vi.fn()}
        onPageChange={onPageChange}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("Showing 1–6 of 25")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous parcel page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next parcel page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
