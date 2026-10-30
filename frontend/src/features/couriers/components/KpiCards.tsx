import { Package, CheckCircle2, Truck, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary, TableFilter } from "../types";

interface KpiCardsProps {
  summary: DashboardSummary;
  activeFilter: TableFilter;
  onFilterChange: (f: TableFilter) => void;
}

interface CardDef {
  label: string;
  value: number;
  delta: number;
  filter: TableFilter;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function KpiCard({
  label, value, delta, Icon, iconBg, iconColor, isActive, onClick,
}: Omit<CardDef, "filter"> & { isActive: boolean; onClick: () => void }) {
  const up = delta >= 0;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "ct-card text-left flex flex-col gap-3 w-full transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2",
        "hover:-translate-y-0.5 hover:shadow-lg",
        isActive && "ring-2 ring-[#16A34A]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#5B7266]">{label}</p>
          <p
            className="font-bold text-[#0F2A1D] mt-1 tabular-nums"
            style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {value}
          </p>
        </div>
        <div
          className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}
          aria-hidden="true"
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {up ? (
          <TrendingUp className="h-3.5 w-3.5 text-[#16A34A] shrink-0" aria-hidden="true" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-[#DC2626] shrink-0" aria-hidden="true" />
        )}
        <span className={cn("text-xs font-semibold tabular-nums", up ? "text-[#16A34A]" : "text-[#DC2626]")}>
          {up ? "+" : ""}{delta}%
        </span>
        <span className="text-xs text-[#5B7266]">from yesterday</span>
      </div>
    </button>
  );
}

export function KpiCards({ summary, activeFilter, onFilterChange }: KpiCardsProps) {
  const cards: CardDef[] = [
    {
      label: "Assigned today",
      value: summary.assignedToday,
      delta: summary.assignedTodayDelta,
      filter: "ALL",
      Icon: Package,
      iconBg: "bg-[#E3F6E8]",
      iconColor: "text-[#16A34A]",
    },
    {
      label: "Delivered",
      value: summary.delivered,
      delta: summary.deliveredDelta,
      filter: "DELIVERED",
      Icon: CheckCircle2,
      iconBg: "bg-[#E3F6E8]",
      iconColor: "text-[#12703A]",
    },
    {
      label: "Out for delivery",
      value: summary.outForDelivery,
      delta: summary.outForDeliveryDelta,
      filter: "IN_TRANSIT_GROUP",
      Icon: Truck,
      iconBg: "bg-[#E4EEFF]",
      iconColor: "text-[#1D4ED8]",
    },
    {
      label: "Pending",
      value: summary.pending,
      delta: summary.pendingDelta,
      filter: "PENDING",
      Icon: Clock,
      iconBg: "bg-[#FFF1D6]",
      iconColor: "text-[#9A5B00]",
    },
  ];

  return (
    <section aria-label="Key performance indicators">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <KpiCard
            key={card.label}
            {...card}
            isActive={activeFilter === card.filter}
            onClick={() => onFilterChange(card.filter)}
          />
        ))}
      </div>
    </section>
  );
}
