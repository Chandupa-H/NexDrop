"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Package,
  Route,
  Truck,
} from "lucide-react";
import type {
  ParcelListItem,
  DashboardSummary,
  TableFilter,
  ActionType,
} from "../types";
import type { DonutSegment } from "@/lib/dashboard/types";
import { useParcels } from "../hooks/useParcels";

import { BarChart, DonutChart } from "@/components/dashboard";

import { ParcelsTable } from "./ParcelsTable";
import { ParcelDetailsDrawer } from "./ParcelDetailsDrawer";
import { CourierLiveLocationPanel } from "./CourierLiveLocationPanel";

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
  const [parcelPage, setParcelPage] = useState(1);
  const filteredParcels = useParcels(activeFilter, parcelPage, parcels, parcelsTotal);

  const handleFilterChange = (filter: TableFilter) => {
    setActiveFilter(filter);
    setParcelPage(1);
  };

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

  const kpiVisuals: Record<
    string,
    {
      icon: typeof Package;
      iconStyle: string;
    }
  > = {
    assigned: {
      icon: Package,
      iconStyle: "bg-emerald-50 text-emerald-800",
    },
    delivered: {
      icon: CheckCircle2,
      iconStyle: "bg-green-50 text-green-700",
    },
    in_transit: {
      icon: Truck,
      iconStyle: "bg-blue-50 text-blue-700",
    },
    pending: {
      icon: Clock3,
      iconStyle: "bg-amber-50 text-amber-700",
    },
    failed: {
      icon: Route,
      iconStyle: "bg-rose-50 text-rose-700",
    },
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
  const completedThisWeek = summary.weeklyDeliveries.reduce(
    (total, day) => total + day.delivered,
    0
  );

  const handleStatusUpdated = (options?: { closeDrawer?: boolean }) => {
    filteredParcels.refetch();
    router.refresh();
    if (options?.closeDrawer !== false) {
      handleCloseDrawer();
    }
  };

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#dcebe1] bg-white shadow-[0_12px_36px_-28px_rgba(16,42,29,0.35)]">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#b6f36b] to-[#16824a]" />
        <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#16824a]">
              <Route aria-hidden="true" size={14} />
              Courier overview
            </div>
            <p className="text-sm font-medium text-[#687b70]">{greeting},</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#103b29] sm:text-[2.1rem]">
              {userName}
            </h1>
            <p className="mt-2 text-sm text-[#687b70]">
              Here’s what’s happening with your deliveries today.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-2xl bg-[#f2f8f4] px-4 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#16824a] shadow-sm">
                <CheckCircle2 aria-hidden="true" size={20} />
              </span>
              <span>
                <span className="block text-2xl font-semibold leading-none tabular-nums text-[#103b29]">
                  {completedThisWeek}
                </span>
                <span className="mt-1 block text-xs text-[#687b70]">
                  Completed this week
                </span>
              </span>
            </div>
            <Link
              href="/courier/deliveries"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b5137] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a422e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16824a]"
            >
              Go to deliveries
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.kpis.map((kpi) => {
          const filter = kpiKeyToFilter[kpi.key] || "all";
          const visual = kpiVisuals[kpi.key] ?? kpiVisuals.assigned;
          const Icon = visual.icon;
          return (
            <button
              key={kpi.key}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => handleFilterChange(filter)}
              className={`group flex min-h-28 w-full items-center justify-between gap-3 rounded-2xl border border-[#e4eee7] bg-white p-4 text-left shadow-[0_8px_24px_-20px_rgba(16,42,29,0.45)] transition duration-200 hover:-translate-y-0.5 hover:border-[#c8dfd0] hover:shadow-[0_16px_30px_-20px_rgba(16,42,29,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16824a] sm:p-5 ${
                activeFilter === filter
                  ? "border-[#16824a]/50 bg-[#f8fcf9] ring-2 ring-[#16824a]/15"
                  : ""
              }`}
            >
              <span>
                <span className="block text-sm font-medium text-[#5b7266]">
                  {kpi.label}
                </span>
                <span className="mt-2 block text-3xl font-semibold tracking-tight tabular-nums text-[#0f2a1d]">
                  {kpi.value}
                </span>
                {kpi.deltaPct !== undefined && (
                  <span
                    className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                      kpi.deltaPct >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {kpi.deltaPct >= 0 ? (
                      <ArrowUpRight aria-hidden="true" size={14} />
                    ) : (
                      <ArrowDownRight aria-hidden="true" size={14} />
                    )}
                    {Math.abs(kpi.deltaPct)}% from last week
                  </span>
                )}
              </span>
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${visual.iconStyle}`}
              >
                <Icon aria-hidden="true" size={21} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
        <div className="flex h-full min-w-0 flex-col rounded-2xl border border-[#e4eee7] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(16,42,29,0.45)] sm:p-5 xl:col-span-7 2xl:col-span-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#103b29]">
                Weekly activity
              </h2>
              <p className="mt-1 text-xs text-[#687b70]">
                Completed deliveries over the past 7 days
              </p>
            </div>
            <span className="rounded-full bg-[#f2f8f4] px-2.5 py-1 text-xs font-medium text-[#52715f]">
              Last 7 days
            </span>
          </div>
          <div className="min-h-0 flex-1">
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
              expanded
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-5 xl:col-span-5 2xl:contents">
          <div className="2xl:col-span-4">
            <CourierLiveLocationPanel />
          </div>

          <section className="rounded-2xl border border-[#e4eee7] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(16,42,29,0.45)] sm:p-5 2xl:col-span-3">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#103b29]">
                Delivery status
              </h2>
              <p className="mt-1 text-xs text-[#687b70]">
                Your current parcel breakdown
              </p>
            </div>
            <DonutChart
              segments={donutSegments}
              total={donutTotal}
              centerLabel="Parcels"
              compact
            />
          </section>
        </div>
      </div>

      <div className="min-w-0 w-full">
        <ParcelsTable
          parcels={filteredParcels.parcels}
          total={filteredParcels.total}
          page={parcelPage}
          pageSize={filteredParcels.pageSize}
          filter={activeFilter}
          onPageChange={setParcelPage}
          onFilterChange={handleFilterChange}
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
