"use client";

import { useState } from "react";
import type {
  CustomerParcelListItem,
  CustomerDashboardSummary,
  CustomerTableFilter,
} from "../types";
import type { NavIconName, DonutSegment } from "@/lib/dashboard/types";
import { useCustomerParcels } from "../hooks/useCustomerParcels";
import {
  WelcomeHeader,
  PromoBanner,
  StatCard,
  BarChart,
  DonutChart,
  SectionCard,
} from "@/components/dashboard";
import { CustomerParcelsTable } from "./CustomerParcelsTable";
import { CustomerParcelDrawer } from "./CustomerParcelDrawer";
import { QuickEstimatorCard } from "./QuickEstimatorCard";

export interface CustomerDashboardViewProps {
  greeting: string;
  userName: string;
  summary: CustomerDashboardSummary;
  parcels: CustomerParcelListItem[];
  parcelsTotal: number;
  donutSegments: DonutSegment[];
}

export function CustomerDashboardView({
  greeting,
  userName,
  summary,
  parcels,
  parcelsTotal,
  donutSegments,
}: CustomerDashboardViewProps) {
  // State: active table filter (driven by KPI cards or table pills)
  const [activeFilter, setActiveFilter] = useState<CustomerTableFilter>("all");
  const filteredParcels = useCustomerParcels(
    activeFilter,
    parcels,
    parcelsTotal
  );

  // State: parcel detail drawer
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(
    null
  );

  // Filter mapping for KPI cards
  const kpiFilterMap: Record<string, CustomerTableFilter> = {
    active_deliveries: "active",
    delivered: "delivered",
    pending: "pending",
    total_orders: "all",
  };

  const kpiIcons: Record<string, NavIconName> = {
    active_deliveries: "truck",
    delivered: "check-circle",
    pending: "clock",
    total_orders: "package",
  };

  const handleSelectParcel = (trackingId: string) => {
    setSelectedTrackingId(trackingId);
  };

  const handleCloseDrawer = () => {
    setSelectedTrackingId(null);
  };

  const handleParcelUpdated = () => {
    filteredParcels.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Greeting + Promo */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <WelcomeHeader
          greeting={greeting}
          name={userName}
          subtitle="Here is the live status of your deliveries and shipments"
        />
        <PromoBanner
          title="Island-wide Express"
          subtitle="Next-day delivery available across all provinces!"
        />
      </div>

      {/* Row 2: KPI StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.kpis.map((kpi) => {
          const filter = kpiFilterMap[kpi.key] || "all";
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

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard title="Weekly Orders & Activity">
            <BarChart
              items={summary.weeklyOrders.map((w) => ({
                key: w.date,
                label: w.dayLabel,
                value: w.orders,
                highlight: w.isToday,
                ariaLabel: `${w.dayFull}: ${w.orders} deliveries`,
              }))}
              yMax={Math.max(...summary.weeklyOrders.map((w) => w.orders), 5)}
            />
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard title="Shipment Status Breakdown">
            <DonutChart
              segments={donutSegments}
              total={summary.totals.totalOrders}
              centerLabel="Orders"
            />
          </SectionCard>
        </div>
      </div>

      {/* Row 4: Parcels Table + Quick Estimator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CustomerParcelsTable
            parcels={filteredParcels.parcels}
            total={filteredParcels.total}
            filter={activeFilter}
            onFilterChange={setActiveFilter}
            onSelectParcel={handleSelectParcel}
            loading={filteredParcels.loading}
            error={filteredParcels.error ?? undefined}
            onRetry={filteredParcels.refetch}
          />
        </div>

        <div className="lg:col-span-2">
          <QuickEstimatorCard />
        </div>
      </div>

      {/* Drawer */}
      {selectedTrackingId && (
        <CustomerParcelDrawer
          trackingId={selectedTrackingId}
          onClose={handleCloseDrawer}
          onParcelUpdated={handleParcelUpdated}
        />
      )}
    </div>
  );
}
