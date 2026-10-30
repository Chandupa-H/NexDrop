"use client";

import { cn } from "@/lib/utils";
import type { AssignedParcel, ParcelStatus, TableFilter } from "../types";

// ── Status badge config ──────────────────────────────────────────────────
const STATUS_CFG: Record<ParcelStatus, { label: string; bg: string; text: string }> = {
  PENDING:          { label: "Pending",          bg: "#FFF1D6", text: "#9A5B00" },
  PICKED_UP:        { label: "Picked Up",        bg: "#DDF4F1", text: "#0F766E" },
  IN_TRANSIT:       { label: "In Transit",       bg: "#E4EEFF", text: "#1D4ED8" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "#E4EEFF", text: "#1D4ED8" },
  DELIVERED:        { label: "Delivered",        bg: "#E3F6E8", text: "#12703A" },
  FAILED:           { label: "Failed",           bg: "#FDE4E4", text: "#B42318" },
};

function StatusBadge({ status }: { status: ParcelStatus }) {
  const { label, bg, text } = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: text }} aria-hidden="true" />
      {label}
    </span>
  );
}

// ── Filter pills config ──────────────────────────────────────────────────
const PILLS: { label: string; value: TableFilter }[] = [
  { label: "All",        value: "ALL" },
  { label: "Pending",    value: "PENDING" },
  { label: "In transit", value: "IN_TRANSIT_GROUP" },
  { label: "Delivered",  value: "DELIVERED" },
  { label: "Failed",     value: "FAILED" },
];

interface ParcelsTableProps {
  parcels: AssignedParcel[];
  totalAssigned: number;
  activeFilter: TableFilter;
  onFilterChange: (f: TableFilter) => void;
  onRowClick: (p: AssignedParcel) => void;
}

function InitialsAvatar({ initials }: { initials: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 rounded-full items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: "#0b3d2a" }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** Stacked card for mobile view */
function ParcelCard({ parcel, onClick }: { parcel: AssignedParcel; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-[#E5EEE8] bg-white p-4 space-y-2.5 hover:bg-[#F2F7F3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
      aria-label={`Open details for ${parcel.trackingId}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <InitialsAvatar initials={parcel.customerInitials} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[#0F2A1D]">{parcel.customerName}</p>
            <p className="text-xs text-[#5B7266] font-mono">{parcel.trackingId}</p>
          </div>
        </div>
        <StatusBadge status={parcel.status} />
      </div>
      <p className="text-xs text-[#5B7266] truncate">{parcel.destination}</p>
      <p className="text-xs text-[#5B7266]">{parcel.assignedAtDisplay}</p>
    </button>
  );
}

export function ParcelsTable({
  parcels, totalAssigned, activeFilter, onFilterChange, onRowClick,
}: ParcelsTableProps) {
  return (
    <div className="ct-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2A1D]" style={{ letterSpacing: "-0.01em" }}>
            Today&apos;s Assigned Parcels
          </h2>
          <p className="text-xs text-[#5B7266] mt-0.5">
            Showing {parcels.length} of {totalAssigned} (mock)
          </p>
        </div>
        <span
          className="text-xs font-medium text-[#5B7266] cursor-not-allowed"
          aria-disabled="true"
          title="Coming soon"
        >
          View all
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap" role="group" aria-label="Filter parcels by status">
        {PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => onFilterChange(pill.value)}
            aria-pressed={activeFilter === pill.value}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]",
              activeFilter === pill.value
                ? "bg-[#0b3d2a] text-white"
                : "bg-[#F2F7F3] text-[#5B7266] hover:bg-[#E5EEE8]"
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {parcels.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
          <p className="text-sm text-[#5B7266]">No parcels in this status</p>
          <button
            type="button"
            onClick={() => onFilterChange("ALL")}
            className="text-xs font-semibold text-[#16A34A] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] rounded"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Desktop table */}
      {parcels.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Assigned parcels">
            <thead>
              <tr className="border-b border-[#E5EEE8]">
                {["Tracking ID", "Customer", "Destination", "Status", "Assigned at", ""].map((h) => (
                  <th
                    key={h}
                    className="pb-3 text-left text-xs font-semibold text-[#5B7266] uppercase tracking-wider pr-4 last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onRowClick(p)}
                  className="border-b border-[#E5EEE8] last:border-0 hover:bg-[#F2F7F3] cursor-pointer transition-colors"
                  style={{ height: 56 }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open details for ${p.trackingId}`}
                  onKeyDown={(e) => e.key === "Enter" && onRowClick(p)}
                >
                  <td className="pr-4 py-0">
                    <span className="font-semibold text-sm text-[#0b3d2a] font-mono">{p.trackingId}</span>
                  </td>
                  <td className="pr-4 py-0">
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar initials={p.customerInitials} />
                      <span className="text-sm font-medium text-[#0F2A1D]">{p.customerName}</span>
                    </div>
                  </td>
                  <td className="pr-4 py-0 max-w-[180px]">
                    <span className="text-sm text-[#5B7266] truncate block">{p.destination}</span>
                  </td>
                  <td className="pr-4 py-0">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="pr-4 py-0">
                    <span className="text-xs text-[#5B7266] tabular-nums">{p.assignedAtDisplay}</span>
                  </td>
                  <td className="py-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRowClick(p); }}
                      aria-label={`Open actions for ${p.trackingId}`}
                      className="p-1.5 rounded-lg text-[#5B7266] hover:bg-[#E5EEE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
                    >
                      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <circle cx="2" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="14" cy="8" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile card list */}
      {parcels.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {parcels.map((p) => (
            <ParcelCard key={p.id} parcel={p} onClick={() => onRowClick(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
