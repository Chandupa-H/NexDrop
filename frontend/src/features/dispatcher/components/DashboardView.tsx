"use client";

import { useState, useCallback } from "react";
import {
  WelcomeHeader,
  StatCard,
  SectionCard,
  DonutChart,
  StatusBadge,
} from "@/components/dashboard";
import type { DonutSegment } from "@/lib/dashboard/types";
import type { DispatcherStatsViewModel } from "../api/dispatcher.mappers";
import {
  mapDispatcherStats,
  computeDispatcherDonutSegments,
} from "../api/dispatcher.mappers";
import { getDispatcherStats } from "../api/dispatcher.api";
import {
  useDispatcherRealtime,
  RealtimeDeliveryEvent,
} from "../hooks/useDispatcherRealtime";
import { RefreshCw, Radio } from "lucide-react";

interface DashboardViewProps {
  greeting: string;
  userName: string;
  stats: DispatcherStatsViewModel;
  donutSegments: DonutSegment[];
}

export function DashboardView({
  greeting,
  userName,
  stats: initialStats,
  donutSegments: initialDonutSegments,
}: DashboardViewProps) {
  const [stats, setStats] = useState<DispatcherStatsViewModel>(initialStats);
  const [donutSegments, setDonutSegments] = useState<DonutSegment[]>(initialDonutSegments);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveEventNotice, setLiveEventNotice] = useState<string | null>(null);

  const refreshStats = useCallback(async (eventDetail?: string) => {
    try {
      setIsRefreshing(true);
      const updatedDto = await getDispatcherStats();
      const updatedStats = mapDispatcherStats(updatedDto);
      const updatedSegments = computeDispatcherDonutSegments(updatedStats);
      setStats(updatedStats);
      setDonutSegments(updatedSegments);

      if (eventDetail) {
        setLiveEventNotice(eventDetail);
        setTimeout(() => {
          setLiveEventNotice(null);
        }, 5000);
      }
    } catch (err) {
      console.error("Failed to refresh real-time dispatcher stats:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeDeliveryEvent) => {
      const eventName = event.event || event.type || "Delivery status updated";
      const parcelId = event.data?.parcel_id ? ` (Parcel #${event.data.parcel_id})` : "";
      const statusText = event.data?.status ? ` -> ${event.data.status}` : "";
      const notice = `⚡ Live update: ${eventName}${parcelId}${statusText}`;

      refreshStats(notice);
    },
    [refreshStats]
  );

  const { status: wsStatus } = useDispatcherRealtime({
    channel: "dispatcher",
    onEvent: handleRealtimeEvent,
  });

  const getStatusBadge = () => {
    switch (wsStatus) {
      case "connected":
        return <StatusBadge label="Live Telemetry: Connected" tone="success" />;
      case "connecting":
        return <StatusBadge label="Live Telemetry: Connecting..." tone="warning" />;
      case "error":
        return <StatusBadge label="Live Telemetry: Error" tone="danger" />;
      case "disconnected":
      default:
        return <StatusBadge label="Live Telemetry: Offline" tone="neutral" />;
    }
  };

  return (
    <div className="space-y-6">
      <WelcomeHeader
        greeting={greeting}
        name={userName}
        subtitle="Monitor live fleet dispatch operations and parcel delivery lifecycle in real time."
        aside={
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={() => refreshStats()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] hover:bg-[var(--dashboard-surface-hover)] text-[var(--dashboard-text)] transition-colors disabled:opacity-50 focus:outline-none"
              title="Refresh dashboard statistics"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Real-time WebSocket Event Notification Banner */}
      {liveEventNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between p-3.5 text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <span className="font-medium">{liveEventNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider">
            Just now
          </span>
        </div>
      )}

      {/* 5 Core Dispatcher Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </div>

      {/* Operational Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <SectionCard
            title="Delivery Status Distribution"
            subtitle="Proportional breakdown of tracked parcel lifecycle states"
          >
            <DonutChart
              segments={donutSegments}
              total={stats.totalParcels}
              centerLabel="Parcels"
            />
          </SectionCard>
        </div>

        <div className="lg:col-span-6">
          <SectionCard
            title="Dispatch Queue Summary"
            subtitle="Current operational queue status across delivery phases"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--dashboard-chart-info)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--dashboard-text)]">
                      Active Deliveries
                    </p>
                    <p className="text-xs text-[var(--dashboard-muted)]">
                      Couriers currently en route or executing delivery
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-semibold text-[var(--dashboard-text)]">
                    {stats.activeDeliveries}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--dashboard-chart-warning)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--dashboard-text)]">
                      Unassigned Parcels
                    </p>
                    <p className="text-xs text-[var(--dashboard-muted)]">
                      Parcels awaiting assignment to an available courier
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-semibold text-[var(--dashboard-text)]">
                    {stats.unassignedParcels}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--dashboard-chart-success)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--dashboard-text)]">
                      Completed Deliveries
                    </p>
                    <p className="text-xs text-[var(--dashboard-muted)]">
                      Successfully delivered and fulfilled
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-semibold text-[var(--dashboard-text)]">
                    {stats.completedDeliveries}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--dashboard-chart-danger)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--dashboard-text)]">
                      Failed Deliveries
                    </p>
                    <p className="text-xs text-[var(--dashboard-muted)]">
                      Deliveries cancelled or rejected by courier
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-semibold text-[var(--dashboard-text)]">
                    {stats.failedDeliveries}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
