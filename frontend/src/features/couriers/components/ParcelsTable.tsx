/**
 * Parcels table with filters and actions.
 * Props:
 * - parcels: ParcelListItem[] - list of parcels to display
 * - total: number - total count for "Showing X of Y"
 * - filter: TableFilter - currently selected filter
 * - onFilterChange: (filter: TableFilter) => void
 * - onOpen: (trackingId: string, action?: ActionType) => void - open drawer with optional pre-expanded action
 * - loading?: boolean - show skeleton rows
 * - error?: string - error message
 * - onRetry?: () => void - retry handler for errors
 */

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, EmptyState } from "@/components/dashboard";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { getStatusLabel, getStatusTone } from "../lib/status";
import type { ParcelListItem, TableFilter, ActionType } from "../types";

const filters: Array<{ key: TableFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit_group", label: "In progress" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed" },
];

export function ParcelsTable({
  parcels,
  total,
  page,
  pageSize,
  filter,
  onFilterChange,
  onPageChange,
  onOpen,
  loading,
  error,
  onRetry,
}: {
  parcels: ParcelListItem[];
  total: number;
  page: number;
  pageSize: number;
  filter: TableFilter;
  onFilterChange: (filter: TableFilter) => void;
  onPageChange: (page: number) => void;
  onOpen: (trackingId: string, action?: ActionType) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min((page - 1) * pageSize + parcels.length, total);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4eee7] bg-white shadow-[0_8px_24px_-20px_rgba(16,42,29,0.45)]">
      <header className="flex flex-col gap-3 border-b border-[#eaf0ec] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff8f2] text-[#16824a]">
              <Package aria-hidden="true" className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-[#103b29]">
              Assigned parcels
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#687b70] sm:ml-11">
            Showing {rangeStart}–{rangeEnd} of {total}
          </p>
        </div>
        <Link
          href="/courier/deliveries"
          className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-sm font-semibold text-[#16824a] hover:bg-[#eff8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16824a] sm:self-auto"
        >
          View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>
      <div className="space-y-4 p-4 sm:p-5" aria-busy={loading}>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#0b5137] text-white shadow-sm"
                  : "text-[#5b7266] hover:bg-[#eff8f2] hover:text-[#103b29]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-between p-4 bg-red-50 text-red-700 rounded-xl text-sm">
            <span>{error}</span>
            {onRetry && <Button onClick={onRetry} size="sm" variant="outline">Retry</Button>}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : parcels.length === 0 ? (
          <EmptyState
            icon="package"
            title="No parcels in this status"
            description="Try selecting a different filter to see more parcels."
            action={
              filter !== "all" ? (
                <Button onClick={() => onFilterChange("all")} variant="outline">
                  Clear filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-[#e7eee9] bg-white shadow-sm xl:block">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-[#f6faf7]">
                  <TableRow>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Tracking ID</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Customer</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Destination</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Assigned at</TableHead>
                    <TableHead className="w-12 px-4 py-3 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcels.map((parcel) => (
                    <TableRow
                      key={parcel.trackingId}
                      onClick={() => onOpen(parcel.trackingId)}
                      className="group h-16 cursor-pointer border-t border-[#edf2ee] transition-colors hover:bg-[#f5faf6]"
                    >
                      <TableCell className="px-4 py-3 font-semibold text-slate-900">{parcel.trackingId}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <AvatarFallback className="bg-[var(--dashboard-primary)] text-white text-[10px] font-semibold">
                              {parcel.customerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-700">{parcel.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">{parcel.destination}</TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusBadge label={getStatusLabel(parcel.status)} tone={getStatusTone(parcel.status)} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-500">{parcel.assignedAtDisplay}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <ActionMenu onSelect={(action) => onOpen(parcel.trackingId, action)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 xl:hidden">
              {parcels.map((parcel) => (
                <button
                  key={parcel.trackingId}
                  onClick={() => onOpen(parcel.trackingId)}
                  className="w-full rounded-xl border border-[#e7eee9] bg-white p-4 text-left transition-colors hover:border-[#c8dfd0] hover:bg-[#fbfdfb]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback className="bg-[var(--dashboard-primary)] text-white text-[10px] font-semibold">
                          {parcel.customerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{parcel.trackingId}</div>
                        <div className="text-xs text-slate-500">{parcel.customerName}</div>
                      </div>
                    </div>
                    <StatusBadge label={getStatusLabel(parcel.status)} tone={getStatusTone(parcel.status)} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">{parcel.destination}</span>
                    <span>{parcel.assignedAtDisplay}</span>
                  </div>
                </button>
              ))}
            </div>

            {pageCount > 1 && (
              <nav
                aria-label="Parcel pages"
                className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-slate-500">
                  Showing <span className="font-medium text-slate-700">{rangeStart}–{rangeEnd}</span> of{" "}
                  <span className="font-medium text-slate-700">{total}</span> parcels
                </p>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1 || loading}
                    aria-label="Previous parcel page"
                    className="gap-1 rounded-lg border-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="min-w-20 text-center text-sm font-medium text-slate-600" aria-live="polite">
                    Page {page} of {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pageCount || loading}
                    aria-label="Next parcel page"
                    className="gap-1 rounded-lg border-slate-200"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ActionMenu({ onSelect }: { onSelect: (action: ActionType) => void }) {
  const [open, setOpen] = useState(false);

  const actions: Array<{ type: ActionType; label: string }> = [
    { type: "update-status", label: "View details" },
    { type: "update-status", label: "Update status" },
    { type: "upload-proof", label: "Upload proof" },
    { type: "report-failed", label: "Report failed delivery" },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-8 h-8 rounded-lg hover:bg-[var(--dashboard-neutral-bg)] flex items-center justify-center"
        aria-label="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-[var(--dashboard-hairline)] py-2 z-50">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(action.type);
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--dashboard-page-bg)] transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
