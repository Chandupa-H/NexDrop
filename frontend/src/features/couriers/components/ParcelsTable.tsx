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
import { MoreVertical, ArrowRight } from "lucide-react";
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
  filter,
  onFilterChange,
  onOpen,
  loading,
  error,
  onRetry,
}: {
  parcels: ParcelListItem[];
  total: number;
  filter: TableFilter;
  onFilterChange: (filter: TableFilter) => void;
  onOpen: (trackingId: string, action?: ActionType) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <SectionCard
      title="Today's Assigned Parcels"
      subtitle={`Showing ${parcels.length} of ${total}`}
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
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-[var(--dashboard-primary)] text-white"
                  : "bg-[var(--dashboard-neutral-bg)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)]/70"
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
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-[var(--dashboard-hairline)]">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned at</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcels.map((parcel) => (
                    <TableRow
                      key={parcel.trackingId}
                      onClick={() => onOpen(parcel.trackingId)}
                      className="cursor-pointer h-14 hover:bg-[#e8f5ec]/50"
                    >
                      <TableCell className="font-semibold">{parcel.trackingId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback className="bg-[var(--dashboard-primary)] text-white text-xs">
                              {parcel.customerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{parcel.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{parcel.destination}</TableCell>
                      <TableCell>
                        <StatusBadge label={getStatusLabel(parcel.status)} tone={getStatusTone(parcel.status)} />
                      </TableCell>
                      <TableCell className="text-[var(--dashboard-muted)]">{parcel.assignedAtDisplay}</TableCell>
                      <TableCell>
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
                  className="w-full p-4 bg-white rounded-xl border border-[var(--dashboard-hairline)] text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback className="bg-[var(--dashboard-primary)] text-white text-xs">
                          {parcel.customerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{parcel.trackingId}</div>
                        <div className="text-xs text-[var(--dashboard-muted)]">{parcel.customerName}</div>
                      </div>
                    </div>
                    <StatusBadge label={getStatusLabel(parcel.status)} tone={getStatusTone(parcel.status)} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--dashboard-muted)]">
                    <span>{parcel.destination}</span>
                    <span>{parcel.assignedAtDisplay}</span>
                  </div>
                </button>
              ))}
            </div>
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
    { type: "add-note", label: "Add note" },
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
