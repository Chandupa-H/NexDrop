import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api-client";
import { CustomerDashboardView } from "./DashboardView";
import { CustomerHistoryView } from "./CustomerHistoryView";
import { mapCustomerParcelListItem } from "../api/customer.mappers";
import { getCustomerStatusLabel } from "../lib/status";
import type { CustomerParcelListDTO } from "../api/customer.dto";
import type { CustomerDashboardSummary, CustomerParcelStatus } from "../types";

vi.mock("@/lib/api-client", () => ({ default: { get: vi.fn() } }));
// Keep the real table, hook, server action, API query builder and mappers.
// Unrelated dashboard widgets must not issue requests during these tests.
vi.mock("./SavedAddressesCard", () => ({ SavedAddressesCard: () => null }));
vi.mock("./QuickEstimatorCard", () => ({ QuickEstimatorCard: () => null }));
vi.mock("./QuickTrackCard", () => ({ QuickTrackCard: () => null }));

// Test-only response generation covers every value in the inspected backend ParcelStatus enum.
const statuses: CustomerParcelStatus[] = [
  "pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled",
];
const summary: CustomerDashboardSummary = {
  totals: { totalOrders: 6, activeDeliveries: 3, delivered: 1, pending: 1, cancelled: 1 },
  kpis: [], weeklyOrders: [],
};
function orders(count: number): CustomerParcelListDTO["items"] {
  return Array.from({ length: count }, (_, index) => ({
    tracking_id: `ND-FILTER${index}`, recipient_name: `Recipient ${index}`,
    destination: "Test destination", status: statuses[index % statuses.length],
    created_at: "2026-11-10T10:00:00Z", estimated_fee: 400, weight_kg: 1, eta: null,
  }));
}
function serveOrders(items: CustomerParcelListDTO["items"]) {
  vi.mocked(apiClient.get).mockImplementation(async (endpoint) => {
    const query = new URL(endpoint, "http://test.invalid").searchParams;
    const allowed = query.get("status")?.split(",");
    const matches = allowed ? items.filter((item) => allowed.includes(item.status)) : items;
    const offset = Number(query.get("offset") ?? 0);
    const limit = Number(query.get("limit") ?? 10);
    return { items: matches.slice(offset, offset + limit), total: matches.length };
  });
}

describe("customer order filtering across both views", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(["dashboard", "history"] as const)("%s includes all six statuses and applies only the selected filter", async (view) => {
    const items = orders(6);
    serveOrders(items);
    render(view === "dashboard"
      ? <CustomerDashboardView greeting="Welcome" userName="Test customer" summary={summary} parcels={items.map(mapCustomerParcelListItem)} parcelsTotal={items.length} />
      : <CustomerHistoryView />);
    const allOrders = screen.getByRole("button", { name: "All Orders" });
    for (const item of items) expect(await screen.findByText(item.tracking_id)).toBeInTheDocument();
    const table = screen.getByRole("table");
    for (const status of statuses) expect(within(table).getByText(getCustomerStatusLabel(status))).toBeInTheDocument();
    expect(screen.getByLabelText("Search this page")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Failed" })).not.toBeInTheDocument();

    for (const [label, statusQuery] of [
      ["Active", "picked_up,in_transit,out_for_delivery"],
      ["Pending", "pending"], ["Delivered", "delivered"], ["Cancelled", "cancelled"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      const included = items.filter((item) => statusQuery.split(",").includes(item.status));
      await screen.findByText(`Showing ${included.length} of ${included.length} shipments`);
      const request = vi.mocked(apiClient.get).mock.lastCall![0];
      const query = new URL(request, "http://test.invalid").searchParams;
      expect(query.get("status")).toBe(statusQuery);
      expect(query.get("offset")).toBe("0");
      for (const item of items) {
        if (included.includes(item)) expect(screen.getByText(item.tracking_id)).toBeInTheDocument();
        else expect(screen.queryByText(item.tracking_id)).not.toBeInTheDocument();
      }
      fireEvent.click(allOrders);
      await screen.findByText("Showing 6 of 6 shipments");
      for (const item of items) expect(screen.getByText(item.tracking_id)).toBeInTheDocument();
    }
    // Dashboard starts from its server-provided unfiltered page; history fetches it.
    // Every All Orders API request must omit status, rather than enumerate known statuses.
    const allRequests = vi.mocked(apiClient.get).mock.calls.filter(([endpoint]) => !new URL(endpoint, "http://test.invalid").searchParams.has("status"));
    if (view === "history") expect(allRequests.length).toBeGreaterThan(0);
  });

  it("preserves history server totals and resets to page one for every filter, including All Orders", async () => {
    serveOrders(orders(24));
    render(<CustomerHistoryView />);
    await screen.findByText("Showing 1–10 of 24 deliveries");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Showing 11–20 of 24 deliveries");

    for (const [label, total] of [["Active", 12], ["Pending", 4], ["Delivered", 4], ["Cancelled", 4]] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      await screen.findByText(`Showing 1–${Math.min(10, total)} of ${total} deliveries`);
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
      expect(new URL(vi.mocked(apiClient.get).mock.lastCall![0], "http://test.invalid").searchParams.get("offset")).toBe("0");
      if (label === "Active") {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        await screen.findByText("Showing 11–12 of 12 deliveries");
        expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      }
      fireEvent.click(screen.getByRole("button", { name: "All Orders" }));
      await screen.findByText("Showing 1–10 of 24 deliveries");
      await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith("/customers/customer/parcels?limit=10&offset=0"));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await screen.findByText("Showing 11–20 of 24 deliveries");
    }
  });
});
