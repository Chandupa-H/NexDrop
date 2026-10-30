"use client";

import { useState } from "react";
import type { WeeklyDeliveryData } from "../types";

const Y_MAX = 40;
const Y_STEPS = [40, 30, 20, 10, 0];
const PERIODS = ["Last 7 days", "Last 14 days", "Last 30 days"] as const;

interface DeliveryOverviewChartProps {
  data: WeeklyDeliveryData[];
}

/**
 * HTML/CSS bar chart — no SVG stretching, no third-party chart library.
 * Bars grow via flex-end alignment; y-axis and gridlines are plain HTML divs.
 * TODO: replace with recharts BarChart when approved as a dependency.
 */
export function DeliveryOverviewChart({ data }: DeliveryOverviewChartProps) {
  const [period, setPeriod] = useState<string>(PERIODS[0]);

  return (
    <div className="ct-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-5 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2A1D]" style={{ letterSpacing: "-0.01em" }}>
            Delivery Overview
          </h2>
          <p className="text-xs text-[#5B7266] mt-0.5">Parcels delivered per day</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Select time period"
          className="h-9 px-3 rounded-xl bg-[#F2F7F3] border-0 text-sm text-[#0F2A1D] focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
        >
          {PERIODS.map((p, i) => (
            <option key={p} value={p} disabled={i > 0}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Chart area */}
      <div className="flex gap-3 flex-1 min-h-[260px]">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between pb-7 text-right shrink-0">
          {Y_STEPS.map((v) => (
            <span key={v} className="text-[11px] text-[#5B7266] tabular-nums leading-none">{v}</span>
          ))}
        </div>

        {/* Plot area */}
        <div className="flex-1 flex flex-col">
          {/* Grid + bars */}
          <div className="flex-1 relative">
            {/* Dashed gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" aria-hidden="true">
              {Y_STEPS.map((v) => (
                <div key={v} className="w-full border-t border-dashed border-[#E5EEE8]" />
              ))}
            </div>

            {/* Bars row */}
            <div className="absolute inset-0 flex items-end gap-1.5 pb-0">
              {data.map((item) => {
                const heightPct = Math.round((item.count / Y_MAX) * 100);
                return (
                  <div
                    key={item.day}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                  >
                    {/* Value chip (today only) */}
                    {item.isToday && (
                      <div
                        className="text-[11px] font-bold text-white rounded-md px-1.5 py-0.5 shrink-0 tabular-nums"
                        style={{ background: "#0b3d2a" }}
                      >
                        {item.count}
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      role="graphics-symbol"
                      tabIndex={0}
                      aria-label={`${item.day}: ${item.count} parcels delivered`}
                      title={item.isToday ? undefined : `${item.shortDay}: ${item.count}`}
                      className={`w-full courier-bar${item.isToday ? " courier-bar-today" : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1.5 mt-2">
            {data.map((item) => (
              <div key={item.day} className="flex-1 text-center">
                <span
                  className="text-[11px] text-[#5B7266] font-medium"
                  style={{ fontWeight: item.isToday ? 700 : undefined, color: item.isToday ? "#16A34A" : undefined }}
                >
                  {item.shortDay}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
