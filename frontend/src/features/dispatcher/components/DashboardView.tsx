import {
  WelcomeHeader,
  StatCard,
  SectionCard,
  DonutChart,
  StatusBadge,
} from "@/components/dashboard";
import type { DonutSegment } from "@/lib/dashboard/types";
import type { DispatcherStatsViewModel } from "../api/dispatcher.mappers";

interface DashboardViewProps {
  greeting: string;
  userName: string;
  stats: DispatcherStatsViewModel;
  donutSegments: DonutSegment[];
}

export function DashboardView({
  greeting,
  userName,
  stats,
  donutSegments,
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
      <WelcomeHeader
        greeting={greeting}
        name={userName}
        subtitle="Monitor live fleet dispatch operations and parcel delivery lifecycle."
        aside={<StatusBadge label="Live Telemetry" tone="success" />}
      />

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

