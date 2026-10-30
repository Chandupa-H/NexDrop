"use client";

import { useMemo, useState } from "react";
import type {
  ActionType,
  AssignedParcel,
  CourierUser,
  DashboardSummary,
  DeliveryStatusBreakdown,
  ParcelStatus,
  TableFilter,
  WeeklyDeliveryData,
} from "../types";
import { GreetingBanner } from "./GreetingBanner";
import { KpiCards } from "./KpiCards";
import { DeliveryOverviewChart } from "./DeliveryOverviewChart";
import { DeliveryStatusDonut } from "./DeliveryStatusDonut";
import { ParcelsTable } from "./ParcelsTable";
import { LiveRouteCard } from "./LiveRouteCard";
import { QuickActions } from "./QuickActions";
import { ParcelDetailsDrawer } from "./ParcelDetailsDrawer";

interface DashboardViewProps {
  initialCourier: CourierUser;
  initialSummary: DashboardSummary;
  initialParcels: AssignedParcel[];
  weeklyData: WeeklyDeliveryData[];
  initialStatusBreakdown: DeliveryStatusBreakdown[];
  greeting: string;
}

export function DashboardView({
  initialCourier,
  initialSummary,
  initialParcels,
  weeklyData,
  initialStatusBreakdown,
  greeting,
}: DashboardViewProps) {
  const [parcels, setParcels] = useState<AssignedParcel[]>(initialParcels);
  const [activeFilter, setActiveFilter] = useState<TableFilter>("ALL");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<AssignedParcel | null>(null);
  const [initialAction, setInitialAction] = useState<ActionType | null>(null);

  // Aria-live polite toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Up Next parcel: find first IN_TRANSIT or OUT_FOR_DELIVERY, or default to first
  const upNextParcel = useMemo(() => {
    return (
      parcels.find((p) => p.status === "IN_TRANSIT" || p.status === "OUT_FOR_DELIVERY") ||
      parcels[0]
    );
  }, [parcels]);

  // Dynamically derive summary counts so KPIs, Donut, and Table ALWAYS agree
  const derivedSummary = useMemo(() => {
    const deliveredCount = parcels.filter((p) => p.status === "DELIVERED").length;
    const outForDeliveryCount = parcels.filter(
      (p) => p.status === "PICKED_UP" || p.status === "IN_TRANSIT" || p.status === "OUT_FOR_DELIVERY"
    ).length;
    const pendingCount = parcels.filter((p) => p.status === "PENDING").length;
    const failedCount = parcels.filter((p) => p.status === "FAILED").length;
    const assignedTotal = deliveredCount + outForDeliveryCount + pendingCount + failedCount;

    // Use initial deltas from props, but updated dynamic counts
    return {
      ...initialSummary,
      assignedToday: assignedTotal > 0 ? assignedTotal : initialSummary.assignedToday,
      delivered: deliveredCount,
      outForDelivery: outForDeliveryCount,
      pending: pendingCount,
      failed: failedCount,
    };
  }, [parcels, initialSummary]);

  // Dynamically derive donut breakdown matching summary
  const derivedBreakdown = useMemo(() => {
    return [
      {
        ...initialStatusBreakdown[0],
        count: derivedSummary.delivered,
      },
      {
        ...initialStatusBreakdown[1],
        count: derivedSummary.outForDelivery,
      },
      {
        ...initialStatusBreakdown[2],
        count: derivedSummary.pending,
      },
      {
        ...initialStatusBreakdown[3],
        count: derivedSummary.failed,
      },
    ];
  }, [derivedSummary, initialStatusBreakdown]);

  // Filtered parcels
  const filteredParcels = useMemo(() => {
    if (activeFilter === "ALL") return parcels;
    if (activeFilter === "DELIVERED") return parcels.filter((p) => p.status === "DELIVERED");
    if (activeFilter === "IN_TRANSIT_GROUP") {
      return parcels.filter(
        (p) => p.status === "PICKED_UP" || p.status === "IN_TRANSIT" || p.status === "OUT_FOR_DELIVERY"
      );
    }
    if (activeFilter === "PENDING") return parcels.filter((p) => p.status === "PENDING");
    if (activeFilter === "FAILED") return parcels.filter((p) => p.status === "FAILED");
    return parcels;
  }, [parcels, activeFilter]);

  // Open drawer helper
  const handleOpenDrawer = (parcel: AssignedParcel, action?: ActionType) => {
    setSelectedParcel(parcel);
    setInitialAction(action || null);
    setDrawerOpen(true);
  };

  // Close drawer helper
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedParcel(null);
    setInitialAction(null);
  };

  // Update status locally
  const handleStatusUpdate = (parcelId: string, newStatus: ParcelStatus) => {
    setParcels((prev) =>
      prev.map((p) => (p.id === parcelId ? { ...p, status: newStatus } : p))
    );
    if (selectedParcel && selectedParcel.id === parcelId) {
      setSelectedParcel((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setToastMessage(`(mock) Status updated locally for ${parcelId}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <>
      {/* Aria-Live Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#0B3D2A] text-white text-xs font-semibold shadow-lg border border-white/20 animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* 1. Greeting Row */}
      <GreetingBanner courier={initialCourier} greeting={greeting} />

      {/* 2. Four KPI Cards */}
      <KpiCards
        summary={derivedSummary}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Desktop Layout (12 cols) vs Mobile Responsive Layout */}
      <div className="hidden lg:grid grid-cols-12 gap-5 items-stretch">
        {/* Row 1: Charts (8 cols / 4 cols) */}
        <div className="col-span-8">
          <DeliveryOverviewChart data={weeklyData} />
        </div>
        <div className="col-span-4">
          <DeliveryStatusDonut
            data={derivedBreakdown}
            total={derivedSummary.assignedToday}
          />
        </div>

        {/* Row 2: Table (8 cols) / Route + Quick Actions (4 cols) */}
        <div className="col-span-8">
          <ParcelsTable
            parcels={filteredParcels}
            totalAssigned={derivedSummary.assignedToday}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onRowClick={(p) => handleOpenDrawer(p)}
          />
        </div>

        <div className="col-span-4 flex flex-col gap-5">
          <LiveRouteCard
            upNextParcel={upNextParcel}
            onOpenAction={(p, act) => handleOpenDrawer(p, act)}
          />
          <QuickActions
            onSelectAction={(act) => handleOpenDrawer(upNextParcel, act)}
          />
        </div>
      </div>

      {/* Mobile Layout (<lg): Order defined by Part 7:
          1. Greeting (above)
          2. KPIs (above)
          3. Live Route + Up Next
          4. Parcels Table (stacked card list)
          5. Quick Actions
          6. Two Charts (Overview then Donut)
      */}
      <div className="lg:hidden flex flex-col gap-5">
        {/* 3. Live Route + Up Next */}
        <LiveRouteCard
          upNextParcel={upNextParcel}
          onOpenAction={(p, act) => handleOpenDrawer(p, act)}
        />

        {/* 4. Parcels as stacked card list */}
        <ParcelsTable
          parcels={filteredParcels}
          totalAssigned={derivedSummary.assignedToday}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRowClick={(p) => handleOpenDrawer(p)}
        />

        {/* 5. Quick Actions */}
        <QuickActions
          onSelectAction={(act) => handleOpenDrawer(upNextParcel, act)}
        />

        {/* 6. Charts */}
        <DeliveryOverviewChart data={weeklyData} />
        <DeliveryStatusDonut
          data={derivedBreakdown}
          total={derivedSummary.assignedToday}
        />
      </div>

      {/* Parcel Details Drawer */}
      <ParcelDetailsDrawer
        key={selectedParcel ? `${selectedParcel.id}-${initialAction ?? "none"}` : "none"}
        parcel={selectedParcel}
        isOpen={drawerOpen}
        initialAction={initialAction}
        onClose={handleCloseDrawer}
        onUpdateStatus={handleStatusUpdate}
      />
    </>
  );
}
