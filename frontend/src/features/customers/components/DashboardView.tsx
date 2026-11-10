"use client";

import { useState, useEffect } from "react";
import type {
  CustomerParcelListItem,
  CustomerDashboardSummary,
  CustomerTableFilter,
  CustomerProfile,
} from "../types";
import type { NavIconName, DonutSegment } from "@/lib/dashboard/types";
import { useCustomerParcels } from "../hooks/useCustomerParcels";
import {
  WelcomeHeader,
  PromoBanner,
  StatCard,
  SectionCard,
} from "@/components/dashboard";
import { CustomerParcelsTable } from "./CustomerParcelsTable";
import { CustomerParcelDrawer } from "./CustomerParcelDrawer";
import { QuickEstimatorCard } from "./QuickEstimatorCard";
import { SavedAddressesCard } from "./SavedAddressesCard";
import { QuickTrackCard } from "./QuickTrackCard";

export interface CustomerDashboardViewProps {
  greeting: string;
  userName: string;
  summary: CustomerDashboardSummary;
  parcels: CustomerParcelListItem[];
  parcelsTotal: number;
  donutSegments?: DonutSegment[];
  userProfile?: CustomerProfile;
}

export function CustomerDashboardView({
  greeting,
  userName,
  summary,
  parcels,
  parcelsTotal,
  donutSegments,
  userProfile,
}: CustomerDashboardViewProps) {
  // Dynamic greeting synced with user's system time
  const [currentGreeting, setCurrentGreeting] = useState<string>(greeting);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setCurrentGreeting("Good morning,");
    } else if (hour >= 12 && hour < 17) {
      setCurrentGreeting("Good afternoon,");
    } else {
      setCurrentGreeting("Good evening,");
    }
  }, []);

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
          greeting={currentGreeting}
          name={userName}
          subtitle="Here is the live status of your deliveries and shipments"
        />
        <PromoBanner
          title="Island-wide Express"
          subtitle="Next-day delivery available across all provinces!"
          href="/customer/book"
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
              selectable
              selected={activeFilter === filter}
              onSelect={() => setActiveFilter(filter)}
            />
          );
        })}
      </div>

      {/* Row 3: Saved Addresses (Top 3 most frequently used) */}
      <div className="w-full">
        <SavedAddressesCard
          initialAddress={userProfile?.defaultAddress}
          city={userProfile?.city}
          postalCode={userProfile?.postalCode}
          userName={userName}
          limit={3}
          isDashboardView={true}
        />
      </div>

      {/* Row 4: Live Parcel Tracking (Full length of space) */}
      <div className="w-full">
        <QuickTrackCard recentParcels={parcels} />
      </div>

      {/* Row 5: Instant Rate Estimator */}
      <div className="w-full">
        <QuickEstimatorCard />
      </div>

      {/* Row 5: My Deliveries & Orders Table (Full length of space) */}
      <div className="w-full">
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
