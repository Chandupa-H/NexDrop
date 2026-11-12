"use client";

import Link from "next/link";
import { useState, useMemo, useId } from "react";
import { SectionCard, StatusBadge, EmptyState } from "@/components/dashboard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";
import { getCustomerStatusLabel, getCustomerStatusTone } from "../lib/status";
import type { CustomerParcelListItem, CustomerTableFilter } from "../types";

const filterTabs: Array<{ key: CustomerTableFilter; label: string }> = [
  { key: "all", label: "All Orders" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

export interface CustomerParcelsTableProps {
  parcels: CustomerParcelListItem[];
  total: number;
  filter: CustomerTableFilter;
  onFilterChange: (filter: CustomerTableFilter) => void;
  onSelectParcel: (trackingId: string) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function CustomerParcelsTable({
  parcels,
  total,
  filter,
  onFilterChange,
  onSelectParcel,
  loading,
  error,
  onRetry,
}: CustomerParcelsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchId = useId();

  const filteredParcels = useMemo(() => {
    if (!searchQuery.trim()) return parcels;
    const q = searchQuery.toLowerCase().trim();
    return parcels.filter(
      (p) =>
        p.trackingId.toLowerCase().includes(q) ||
        p.recipientName.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q)
    );
  }, [parcels, searchQuery]);

  return (
    <SectionCard
      title="My Deliveries & Orders"
      subtitle={loading ? "Loading shipments..." : error ? "Shipments unavailable" : `Showing ${filteredParcels.length} of ${total} shipments`}
    >
      <div className="space-y-4" aria-busy={loading}>
        {/* Filter pills + search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                aria-pressed={filter === tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={`min-h-10 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-[var(--dashboard-primary)] text-white shadow-sm"
                    : "bg-[var(--dashboard-neutral-bg)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)]/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full min-w-0 sm:w-80 md:w-96 sm:shrink-0">
            <label htmlFor={searchId} className="mb-1 block text-sm text-muted-foreground">Search this page</label>
            <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--dashboard-muted)]" />
            <input
              id={searchId}
              type="text"
              placeholder="Filter by tracking number or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-10 w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
            />
            </div>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div role="alert" className="flex items-center justify-between p-4 bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)] rounded-xl text-sm">
            <span>{error}</span>
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="outline">
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Table content */}
        {loading ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">Loading deliveries...</span>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? null : filteredParcels.length === 0 ? (
          <EmptyState
            icon="package"
            title="No deliveries found"
            description={
              searchQuery
                ? `No shipments match "${searchQuery}".`
                : "There are currently no deliveries matching the selected status filter."
            }
            action={
              filter !== "all" || searchQuery ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onFilterChange("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              ) : <Link href="/customer/book" className="text-primary underline">Book Delivery</Link>
            }
          />
        ) : (
          <div className="overflow-x-auto no-scrollbar rounded-xl border border-[var(--dashboard-hairline)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--dashboard-page-bg)]/50 hover:bg-[var(--dashboard-page-bg)]/50">
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Tracking ID
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Recipient & City
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Created Date
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Est. Fee
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Status
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcels.map((parcel) => (
                  <TableRow
                    key={parcel.trackingId}
                    className="cursor-pointer transition-colors hover:bg-[var(--dashboard-neutral-bg)]/40"
                    onClick={() => onSelectParcel(parcel.trackingId)}
                  >
                    <TableCell className="text-center font-semibold text-sm text-[var(--dashboard-deep-green)]">
                      <Link
                        href={`/customer/track?id=${encodeURIComponent(parcel.trackingId)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline hover:text-[var(--dashboard-primary)] transition-colors inline-block"
                        title="Track this parcel"
                      >
                        {parcel.trackingId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium text-sm text-[var(--dashboard-text)]">
                        {parcel.recipientName}
                      </div>
                      <div className="text-sm text-[var(--dashboard-muted)]">
                        {parcel.destination}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-[var(--dashboard-muted)] whitespace-nowrap">
                      {parcel.createdAtDisplay}
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold text-[var(--dashboard-text)]">
                      Rs. {parcel.estimatedFee.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <StatusBadge
                        label={getCustomerStatusLabel(parcel.status)}
                        tone={getCustomerStatusTone(parcel.status)}
                      />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectParcel(parcel.trackingId);
                        }}
                        className="h-8 gap-1 text-xs font-medium text-[var(--dashboard-primary)] hover:text-[var(--dashboard-deep-green)] hover:bg-[var(--dashboard-control-bg)] mx-auto"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
