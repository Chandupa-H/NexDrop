"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ParcelListItem,
  DashboardSummary,
  TableFilter,
  ActionType,
} from "../types";
import type { NavIconName } from "@/lib/dashboard/types";
import type { DonutSegment } from "@/lib/dashboard/types";
import { useParcels } from "../hooks/useParcels";

import {
  WelcomeHeader,
  PromoBanner,
  StatCard,
  BarChart,
  DonutChart,
  SectionCard,
} from "@/components/dashboard";

import { ParcelsTable } from "./ParcelsTable";
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTrackingId = searchParams.get("tracking_id");

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
    if (requestedTrackingId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tracking_id");
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    }
  };
  const activeTrackingId = requestedTrackingId ?? selectedTrackingId;

  const handleStatusUpdated = (options?: { closeDrawer?: boolean }) => {
    filteredParcels.refetch();
    router.refresh();
    if (options?.closeDrawer !== false) {
      handleCloseDrawer();
    }
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

      {/* Today's parcels use the full dashboard content width. */}
      <div className="min-w-0 w-full">
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

      {/* Drawer */}
      {(drawerOpen || requestedTrackingId !== null) && activeTrackingId && (
        <ParcelDetailsDrawer
          trackingId={activeTrackingId}
          action={requestedTrackingId ? undefined : drawerAction}
          onClose={handleCloseDrawer}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
