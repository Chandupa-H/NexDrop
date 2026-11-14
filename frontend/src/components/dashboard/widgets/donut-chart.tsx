import { calculatePercentages } from "@/lib/dashboard/format";
import type { DonutSegment } from "@/lib/dashboard/types";
export type { DonutSegment } from "@/lib/dashboard/types";

const toneColors: Record<DonutSegment["tone"], string> = {
  success: "var(--dashboard-chart-success)",
  info: "var(--dashboard-chart-info)",
  warning: "var(--dashboard-chart-warning)",
  danger: "var(--dashboard-chart-danger)",
};

export function DonutChart({
  segments,
  total,
  centerLabel,
  className,
  compact = false,
}: {
  segments: DonutSegment[];
  total?: number;
  centerLabel: string;
  className?: string;
  compact?: boolean;
}) {
  const percentages = calculatePercentages(segments.map((s) => s.value));
  const displayTotal = total ?? segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const computedSegments = segments.map((segment, i) => {
    const pct = percentages[i];
    const dashLength = (pct / 100) * circumference;
    const dashOffset = percentages
      .slice(0, i)
      .reduce((sum, p) => sum + (p / 100) * circumference, 0);
    return {
      segment,
      dashLength,
      dashOffset,
    };
  });

  const summary = segments
    .map((s, i) => `${s.label}: ${s.value} (${percentages[i]}%)`)
    .join(", ");

  return (
    <div
      className={`flex items-center ${
        compact
          ? "flex-col gap-3"
          : "flex-col lg:flex-row justify-center gap-6 h-full min-h-[260px] my-auto"
      } ${className ?? ""}`.trim()}
    >
      <div
        className={`relative shrink-0 ${
          compact ? "h-32 w-32" : "h-48 w-48"
        }`}
        role="img"
        aria-label={`Total ${displayTotal}. ${summary || "No status data"}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--dashboard-chart-track)"
            strokeWidth="12"
          />
          {computedSegments.map(({ segment, dashLength, dashOffset }) => {
            return (
              <circle
                key={segment.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={toneColors[segment.tone]}
                strokeWidth="12"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-dashOffset}
                strokeLinecap="butt"
                className="transition-all"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold tabular-nums">{displayTotal}</div>
          <div className="text-xs text-[var(--dashboard-muted)]">{centerLabel}</div>
        </div>
      </div>

      <div
        className={`w-full flex-1 ${
          compact
            ? "grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 2xl:grid-cols-1"
            : "space-y-3"
        }`}
      >
        {segments.map((segment, i) => (
          <div key={segment.key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: toneColors[segment.tone] }}
                aria-hidden="true"
              />
              <span className="truncate text-sm text-[var(--dashboard-text)]">{segment.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-sm font-medium">{segment.value}</span>
              <span className="text-sm text-[var(--dashboard-muted)]">{percentages[i]}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
