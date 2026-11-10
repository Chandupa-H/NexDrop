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
}: {
  segments: DonutSegment[];
  total?: number;
  centerLabel: string;
  className?: string;
}) {
  const percentages = calculatePercentages(segments.map((s) => s.value));
  const displayTotal = total ?? segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const summary = segments
    .map((s, i) => `${s.label}: ${s.value} (${percentages[i]}%)`)
    .join(", ");

  return (
    <div className={`flex flex-col lg:flex-row items-center justify-center gap-6 h-full min-h-[260px] my-auto ${className ?? ""}`.trim()}>
      <div
        className="relative w-48 h-48 shrink-0"
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
          {segments.map((segment, i) => {
            const pct = percentages[i];
            const dashLength = (pct / 100) * circumference;
            const dashOffset = currentOffset;
            currentOffset += dashLength;

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

      <div className="flex-1 space-y-3 w-full">
        {segments.map((segment, i) => (
          <div key={segment.key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: toneColors[segment.tone] }}
                aria-hidden="true"
              />
              <span className="text-sm text-[var(--dashboard-text)]">{segment.label}</span>
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
