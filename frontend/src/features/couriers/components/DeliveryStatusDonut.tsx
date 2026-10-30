import type { DeliveryStatusBreakdown } from "../types";

interface DeliveryStatusDonutProps {
  data: DeliveryStatusBreakdown[];
  total: number;
}

/**
 * SVG donut using stroke-dasharray technique.
 * r=36, strokeWidth=11, circumference ≈ 226.2
 * Each segment is a separate <circle> with dasharray offset.
 * TODO: replace with recharts PieChart when approved as a dependency.
 */
export function DeliveryStatusDonut({ data, total }: DeliveryStatusDonutProps) {
  const r = 36;
  const sw = 11;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r; // ≈ 226.19
  const gap = 3; // px gap between segments

  // Build segments using reduce (immutable — avoids react-hooks/immutability lint error)
  type Seg = DeliveryStatusBreakdown & { len: number; offset: number };
  const { segments } = data.reduce<{ segments: Seg[]; acc: number }>(
    ({ segments: prev, acc }, d) => {
      const pct = total > 0 ? d.count / total : 0;
      const len = Math.max(0, pct * circ - gap);
      return {
        segments: [...prev, { ...d, len, offset: acc }],
        acc: acc + pct * circ,
      };
    },
    { segments: [], acc: 0 }
  );

  return (
    <div className="ct-card flex flex-col h-full">
      <h2 className="text-lg font-semibold text-[#0F2A1D]" style={{ letterSpacing: "-0.01em" }}>
        Delivery Status
      </h2>
      <p className="text-xs text-[#5B7266] mt-0.5 mb-5">Today&apos;s breakdown</p>

      <div className="flex flex-col items-center gap-5 flex-1 justify-center">
        {/* Donut */}
        <div className="relative w-[200px] h-[200px]">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            role="img"
            aria-label={`Delivery status: ${total} parcels total. ${data.map((d) => `${d.label}: ${d.count}`).join(", ")}.`}
          >
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5EEE8" strokeWidth={sw} />
            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.strokeColor}
                strokeWidth={sw}
                strokeDasharray={`${seg.len} ${circ}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              >
                <title>{seg.label}: {seg.count} ({total > 0 ? Math.round((seg.count / total) * 100) : 0}%)</title>
              </circle>
            ))}
          </svg>

          {/* Center label (HTML overlay — avoids foreignObject issues) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <span
              className="font-bold text-[#0F2A1D] tabular-nums leading-none"
              style={{ fontSize: 32 }}
            >
              {total}
            </span>
            <span className="text-xs text-[#5B7266] mt-1">Parcels today</span>
          </div>
        </div>

        {/* Legend */}
        <ul className="w-full space-y-2.5" role="list" aria-label="Status legend">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: d.strokeColor }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-[#5B7266]">{d.label}</span>
              <span className="font-semibold text-[#0F2A1D] tabular-nums text-sm">{d.count}</span>
              <span className="text-xs text-[#5B7266] tabular-nums w-8 text-right">
                {total > 0 ? Math.round((d.count / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
