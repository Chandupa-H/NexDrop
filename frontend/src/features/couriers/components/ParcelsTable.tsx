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
import { SectionCard, StatusBadge, EmptyState } from "@/components/dashboard";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MoreVertical, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getStatusLabel, getStatusTone } from "../lib/status";
import type { ParcelListItem, TableFilter, ActionType } from "../types";

const filters: Array<{ key: TableFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit_group", label: "In transit" },
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
    <SectionCard
      title="Today's Assigned Parcels"
      subtitle={`Showing ${rangeStart}–${rangeEnd} of ${total}`}
      action={
        <button
          disabled
          className="text-sm text-[var(--dashboard-primary)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </button>
      }
    >
      <div className="space-y-4" aria-busy={loading}>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]/60 p-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                filter === f.key
                  ? "bg-[var(--dashboard-primary)] text-white shadow-sm"
                  : "text-[var(--dashboard-text)] hover:bg-white hover:text-[var(--dashboard-primary)]"
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
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-[var(--dashboard-hairline)] bg-white shadow-sm">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-slate-50/80">
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
                      className="group h-16 cursor-pointer border-t border-slate-100 transition-colors hover:bg-emerald-50/60"
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

            <div className="lg:hidden space-y-3">
              {parcels.map((parcel) => (
                <button
                  key={parcel.trackingId}
                  onClick={() => onOpen(parcel.trackingId)}
                  className="w-full rounded-2xl border border-[var(--dashboard-hairline)] bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
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
    </SectionCard>
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
