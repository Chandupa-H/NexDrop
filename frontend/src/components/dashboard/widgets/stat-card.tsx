import { iconMap } from "../shell/icon-map";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { DashboardTone, NavIconName } from "@/lib/dashboard/types";

const toneClasses: Record<DashboardTone, string> = {
  success: "bg-[var(--dashboard-success-bg)] text-[var(--dashboard-success-text)]",
  info: "bg-[var(--dashboard-info-bg)] text-[var(--dashboard-info-text)]",
  warning: "bg-[var(--dashboard-warning-bg)] text-[var(--dashboard-warning-text)]",
  danger: "bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)]",
  neutral: "bg-[var(--dashboard-neutral-bg)] text-[var(--dashboard-neutral-text)]",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "success",
  deltaPct,
  deltaLabel,
  selectable,
  selected,
  onSelect,
}: {
  label: string;
  value: number | string;
  icon: NavIconName;
  tone?: DashboardTone;
  deltaPct?: number;
  deltaLabel?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const Icon = iconMap[icon];
  const Component = selectable ? "button" : "div";

  return (
    <Component
      className={`dashboard-stat-card${selectable ? " is-selectable" : ""}${
        selected ? " is-selected" : ""
      }`}
      onClick={selectable ? onSelect : undefined}
      aria-pressed={selectable ? selected : undefined}
      type={selectable ? "button" : undefined}
    >
      <div className="dashboard-stat-layout">
        <div className="dashboard-stat-copy">
          <p className="dashboard-stat-label">{label}</p>
          <p className="dashboard-stat-value">{value}</p>
          {deltaPct !== undefined && (
            <div className="dashboard-stat-delta">
              {deltaPct >= 0 ? (
                <ArrowUp className="dashboard-stat-delta-icon is-positive" aria-hidden="true" />
              ) : (
                <ArrowDown className="dashboard-stat-delta-icon is-negative" aria-hidden="true" />
              )}
              <span
                className={`dashboard-stat-delta-value ${
                  deltaPct >= 0 ? "is-positive" : "is-negative"
                }`}
              >
                {Math.abs(deltaPct)}%
              </span>
              {deltaLabel && <span className="dashboard-stat-delta-label">{deltaLabel}</span>}
            </div>
          )}
        </div>
        <div className={`dashboard-stat-icon ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" />
        </div>
      </div>
    </Component>
  );
}
