import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import * as dispatcherApi from "../api/dispatcher.api";
import type { DispatcherStatsViewModel } from "../api/dispatcher.mappers";
import type { DonutSegment } from "@/lib/dashboard/types";

vi.mock("../hooks/useDispatcherRealtime", () => ({
  useDispatcherRealtime: vi.fn(() => ({
    status: "connected",
    lastEvent: null,
    lastUpdated: null,
    reconnect: vi.fn(),
  })),
}));

describe("DashboardView Component", () => {
  const mockStats: DispatcherStatsViewModel = {
    totalParcels: 4,
    unassignedParcels: 4,
    activeDeliveries: 0,
    completedDeliveries: 0,
    failedDeliveries: 0,
    kpis: [
      { key: "total_parcels", label: "Total Parcels", value: 4, icon: "package", tone: "neutral", description: "" },
      { key: "unassigned_parcels", label: "Unassigned Parcels", value: 4, icon: "clock", tone: "warning", description: "" },
      { key: "active_deliveries", label: "Active Deliveries", value: 0, icon: "truck", tone: "info", description: "" },
      { key: "completed_deliveries", label: "Completed Deliveries", value: 0, icon: "check-circle", tone: "success", description: "" },
      { key: "failed_deliveries", label: "Failed Deliveries", value: 0, icon: "alert-triangle", tone: "danger", description: "" },
    ],
  };

  const mockSegments: DonutSegment[] = [
    { key: "active", label: "Active Deliveries", value: 0, tone: "info" },
    { key: "unassigned", label: "Unassigned", value: 4, tone: "warning" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders live telemetry connected status and 5 core KPI cards", () => {
    render(
      <DashboardView
        greeting="Good evening"
        userName="Nuwan Bandara"
        stats={mockStats}
        donutSegments={mockSegments}
      />
    );

    expect(screen.getByText("Live Telemetry: Connected")).toBeInTheDocument();
    expect(screen.getByText("Total Parcels")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned Parcels").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Active Deliveries").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Completed Deliveries").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Failed Deliveries").length).toBeGreaterThanOrEqual(1);
  });

  it("re-fetches dashboard stats when manual refresh is clicked", async () => {
    vi.spyOn(dispatcherApi, "getDispatcherStats").mockResolvedValue({
      total_parcels: 5,
      unassigned_parcels: 3,
      active_deliveries: 2,
      completed_deliveries: 0,
      failed_deliveries: 0,
    });

    render(
      <DashboardView
        greeting="Good evening"
        userName="Nuwan Bandara"
        stats={mockStats}
        donutSegments={mockSegments}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(dispatcherApi.getDispatcherStats).toHaveBeenCalledTimes(1);
    });
  });
});
