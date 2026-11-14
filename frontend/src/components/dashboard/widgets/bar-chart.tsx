export interface BarChartItem {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
  ariaLabel: string;
}

export function BarChart({
  items,
  yMax,
  yTicks = 5,
  caption,
  expanded = false,
}: {
  items: BarChartItem[];
  yMax: number;
  yTicks?: number;
  caption?: string;
  expanded?: boolean;
}) {
  const tickCount = Number.isFinite(yTicks) ? Math.max(1, Math.floor(yTicks)) : 5;
  const niceMax =
    Number.isFinite(yMax) && yMax > 0
      ? Math.ceil(yMax / tickCount) * tickCount
      : 0;
  const ticks = Array.from(
    { length: tickCount + 1 },
    (_, i) => (niceMax / tickCount) * i
  );

  return (
    <div className="flex flex-col h-full min-h-[260px]">
      <div
        className={`flex flex-1 gap-2 ${
          expanded ? "min-h-0" : ""
        }`}
      >
        <div
          className={`flex flex-col justify-between py-2 text-xs tabular-nums text-[var(--dashboard-muted)] ${
            expanded ? "h-full min-h-0" : "h-56"
          }`}
        >
          {[...ticks].reverse().map((tick, index) => (
            <div key={index}>{Number.isInteger(tick) ? tick : tick.toFixed(1)}</div>
          ))}
        </div>
        <div
          className={`relative min-w-0 flex-1 ${
            expanded
              ? "min-h-0"
              : "h-56 min-h-56"
          }`}
        >
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((_, index) => (
              <div key={index} className="border-t border-dashed border-[var(--dashboard-hairline)]" />
            ))}
          </div>
          <div className="relative flex h-full items-end justify-around gap-1 px-2">
            {items.map((item) => {
              const heightPct =
                niceMax > 0 ? (Math.max(0, item.value) / niceMax) * 100 : 0;
              return (
                <div key={item.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                  {item.highlight && (
                    <div className="dashboard-chart-highlight-label">
                      {item.value}
                    </div>
                  )}
                  <button
                    className={`dashboard-chart-bar${item.highlight ? " is-highlighted" : ""}`}
                    style={{
                      height: `${heightPct}%`,
                      minHeight: item.value > 0 ? "4px" : "0",
                    }}
                    aria-label={item.ariaLabel}
                    title={`${item.label}: ${item.value}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-8 flex justify-around gap-1 px-2">
        {items.map((item) => (
          <div
            key={item.key}
            className={`min-w-0 flex-1 truncate text-center text-xs ${
              item.highlight
                ? "font-semibold text-[var(--dashboard-text)]"
                : "text-[var(--dashboard-muted)]"
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
      {caption && (
        <p className="text-xs text-[var(--dashboard-muted)] text-center mt-2">{caption}</p>
      )}
    </div>
  );
}
