"use client";

import { useState, useMemo } from "react";
import type {
  ParcelListItem,
  DashboardSummary,
  TableFilter,
  ActionType,
} from "../types";
import type { NavIconName } from "@/lib/dashboard/types";
import type { DonutSegment } from "@/lib/dashboard/types";
import { useParcels } from "../hooks/useParcels";
import { getUpNext } from "../lib/status";

import {
  WelcomeHeader,
  PromoBanner,
  StatCard,
  BarChart,
  DonutChart,
  SectionCard,
} from "@/components/dashboard";

import { ParcelsTable } from "./ParcelsTable";
import { LiveRouteCard } from "./LiveRouteCard";
import { ParcelDetailsDrawer } from "./ParcelDetailsDrawer";

export interface DashboardViewProps {
  greeting: string;
  userName: string;
  summary: DashboardSummary;
  parcels: ParcelListItem[];
  parcelsTotal: number;
  donutSegments: DonutSegment[];
}

/**
 * Client-side dashboard coordinator.
 * Manages filter state, drawer state, and composes all building blocks.
 */
export function DashboardView({
  greeting,
  userName,
  summary,
  parcels,
  parcelsTotal,
  donutSegments,
}: DashboardViewProps) {
  // State: active filter (driven by KPI cards)
  const [activeFilter, setActiveFilter] = useState<TableFilter>("all");
  const filteredParcels = useParcels(activeFilter, parcels, parcelsTotal);

  // State: drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(
    null
  );
  const [drawerAction, setDrawerAction] = useState<ActionType | undefined>(
    undefined
  );

  // Derived: total for donut center
  const donutTotal = summary.totals.assigned;

  // KPI key to filter mapping (backend keys → frontend TableFilter)
  const kpiKeyToFilter: Record<string, TableFilter> = {
    assigned: "all",
    delivered: "delivered",
    in_transit: "in_transit_group",
    pending: "pending",
    failed: "failed", // not in backend KPIs but keeping for future
  };

  // KPI icon mapping (by backend key)
  const kpiIcons: Record<string, NavIconName> = {
    assigned: "package",
    delivered: "check-circle",
    in_transit: "truck",
    pending: "clock",
    failed: "alert-triangle",
  };

  // Derived: up-next parcel
  const upNextParcel = useMemo(() => getUpNext(parcels), [parcels]);

  // Handlers
  const handleOpenDrawer = (trackingId: string, action?: ActionType) => {
    setSelectedTrackingId(trackingId);
    setDrawerAction(action);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedTrackingId(null);
    setDrawerAction(undefined);
  };

  const handleStatusUpdated = () => {
    // In real app, refetch parcels or use optimistic update
    // For now, just close drawer
    handleCloseDrawer();
  };

  return (
    <div className="space-y-6">
      {/* Row 1: greeting + promo */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <WelcomeHeader
          greeting={greeting}
          name={userName}
          subtitle="Your deliveries today"
        />
        <PromoBanner title="Delivery Bonus" subtitle="Earn 20% more this week!" />
      </div>

      {/* Row 2: KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.kpis.map((kpi) => {
          const filter = kpiKeyToFilter[kpi.key] || "all";
          return (
            <StatCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              icon={kpiIcons[kpi.key] || "package"}
              tone={kpi.tone}
              deltaPct={kpi.deltaPct}
              selectable
              selected={activeFilter === filter}
              onSelect={() => setActiveFilter(filter)}
            />
          );
        })}
      </div>

      {/* Row 3: charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard title="Weekly Deliveries">
            <BarChart
              items={summary.weeklyDeliveries.map((w) => ({
                key: w.date,
                label: w.dayLabel,
                value: w.delivered,
                highlight: w.isToday,
                ariaLabel: `${w.dayFull}: ${w.delivered} deliveries`,
              }))}
              yMax={Math.max(
                ...summary.weeklyDeliveries.map((w) => w.delivered),
                10
              )}
            />
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard title="Status Breakdown">
            <DonutChart
              segments={donutSegments}
              total={donutTotal}
              centerLabel="Assigned"
            />
          </SectionCard>
        </div>
      </div>

      {/* Row 4: table + sidebar (desktop: 2-col, mobile: stack) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Parcels table (3/5) */}
        <div className="lg:col-span-3">
          <ParcelsTable
            parcels={filteredParcels.parcels}
            total={filteredParcels.total}
            filter={activeFilter}
            onFilterChange={setActiveFilter}
            onOpen={handleOpenDrawer}
            loading={filteredParcels.loading}
            error={filteredParcels.error ?? undefined}
            onRetry={filteredParcels.refetch}
          />
        </div>

        {/* Live Route (2/5) */}
        <div className="h-full lg:col-span-2 [&>.dashboard-section-card]:h-full">
          <LiveRouteCard
            upNext={upNextParcel}
            onUpdateStatus={() =>
              upNextParcel &&
              handleOpenDrawer(upNextParcel.trackingId, "update-status")
            }
          />
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && selectedTrackingId && (
        <ParcelDetailsDrawer
          trackingId={selectedTrackingId}
          action={drawerAction}
          onClose={handleCloseDrawer}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
