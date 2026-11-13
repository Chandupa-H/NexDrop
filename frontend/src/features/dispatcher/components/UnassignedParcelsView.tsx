"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Search,
  Filter,
  Package,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Phone,
  Scale,
  Calendar,
  X,
} from "lucide-react";
import {
  SectionCard,
  StatusBadge,
  EmptyState,
} from "@/components/dashboard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUnassignedParcels } from "../api/dispatcher.api";
import {
  mapUnassignedParcelList,
  type UnassignedParcelListViewModel,
  type UnassignedParcelItemViewModel,
} from "../api/dispatcher.mappers";
import { ParcelDetailDrawer } from "./ParcelDetailDrawer";

interface UnassignedParcelsViewProps {
  initialData: UnassignedParcelListViewModel;
}

export function UnassignedParcelsView({ initialData }: UnassignedParcelsViewProps) {
  const [data, setData] = useState<UnassignedParcelListViewModel>(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch updated list when filters/pagination change
  const fetchParcels = useCallback(
    async (currentSearch: string, currentCity: string, currentLimit: number, currentOffset: number) => {
      setLoading(true);
      try {
        const dto = await getUnassignedParcels({
          search: currentSearch || undefined,
          city: currentCity !== "all" ? currentCity : undefined,
          limit: currentLimit,
          offset: currentOffset,
        });
        startTransition(() => {
          setData(mapUnassignedParcelList(dto));
        });
      } catch (err) {
        console.error("Failed to fetch unassigned parcels:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // Avoid double fetch on initial render if search is empty, city is all, offset is 0, limit is 10
    const isInitial =
      debouncedSearch === "" &&
      selectedCity === "all" &&
      offset === 0 &&
      limit === 10 &&
      data === initialData;

    if (!isInitial) {
      fetchParcels(debouncedSearch, selectedCity, limit, offset);
    }
  }, [debouncedSearch, selectedCity, limit, offset, fetchParcels, initialData]);

  // Pagination calculations
  const total = data.total;
  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + limit, total);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    setOffset(0);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCity("all");
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Unassigned Delivery Queue"
        subtitle="Search, filter, and review unassigned parcels ready for courier batch assignment."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchParcels(debouncedSearch, selectedCity, limit, offset)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] border-[var(--dashboard-border)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      >
        {/* Controls: Search, City Filter, Limit */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 items-stretch md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dashboard-muted)]" />
              <Input
                type="text"
                placeholder="Search by tracking #, recipient, city, address, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-8 bg-[var(--dashboard-surface)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-muted)] text-sm rounded-lg"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* City Dropdown Filter */}
            <div className="relative min-w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--dashboard-muted)] shrink-0 hidden sm:block" />
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-accent)] transition-colors"
                >
                  <option value="all">All Cities</option>
                  {data.cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(searchInput || selectedCity !== "all") && (
            <div className="flex items-center gap-2 pt-1 md:pt-0">
              <span className="text-xs text-[var(--dashboard-muted)]">Active filters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 text-xs text-[var(--dashboard-accent)] hover:underline p-0"
              >
                Reset all
              </Button>
            </div>
          )}
        </div>

        {/* Parcels Table / Empty State */}
        {data.items.length === 0 ? (
          <div className="border border-dashed border-[var(--dashboard-border)] rounded-xl my-4">
            <EmptyState
              icon="package"
              title={searchInput || selectedCity !== "all" ? "No matching parcels" : "No unassigned parcels"}
              description={
                searchInput || selectedCity !== "all"
                  ? "No unassigned parcels match your search query or city filter. Try clearing filters."
                  : "All registered parcels are currently assigned or in transit. Check back later for incoming parcels."
              }
              action={
                searchInput || selectedCity !== "all" ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--dashboard-border)] overflow-hidden bg-[var(--dashboard-surface)]">
            <Table>
              <TableHeader className="bg-[var(--dashboard-surface-subtle)] border-b border-[var(--dashboard-border)]">
                <TableRow className="border-[var(--dashboard-border)]">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Tracking #
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Recipient
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Destination
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Weight / Spec
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Registered
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-[var(--dashboard-muted)] text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((parcel: UnassignedParcelItemViewModel) => (
                  <TableRow
                    key={parcel.id}
                    className="border-b border-[var(--dashboard-border)] hover:bg-[var(--dashboard-surface-subtle)] transition-colors"
                  >
                    {/* Tracking Number */}
                    <TableCell className="font-mono text-xs font-medium text-[var(--dashboard-text)]">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-[var(--dashboard-muted)] shrink-0" />
                        <span>{parcel.trackingNumber}</span>
                        <StatusBadge label="Unassigned" tone="warning" />
                      </div>
                    </TableCell>

                    {/* Recipient */}
                    <TableCell className="text-sm">
                      <div className="font-medium text-[var(--dashboard-text)]">
                        {parcel.recipientName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--dashboard-muted)] mt-0.5">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{parcel.recipientPhone}</span>
                      </div>
                    </TableCell>

                    {/* Destination */}
                    <TableCell className="text-sm max-w-[240px]">
                      <div className="flex items-center gap-1 font-medium text-[var(--dashboard-text)]">
                        <MapPin className="w-3.5 h-3.5 text-[var(--dashboard-accent)] shrink-0" />
                        <span>{parcel.deliveryCity}</span>
                      </div>
                      <div className="text-xs text-[var(--dashboard-muted)] truncate mt-0.5" title={parcel.deliveryAddress}>
                        {parcel.deliveryAddress}
                      </div>
                    </TableCell>

                    {/* Weight / Spec */}
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--dashboard-text)]">
                        <Scale className="w-3.5 h-3.5 text-[var(--dashboard-muted)] shrink-0" />
                        <span>{parcel.weightKg ? `${parcel.weightKg} kg` : "N/A"}</span>
                      </div>
                      {parcel.dimensions && (
                        <div className="text-[11px] text-[var(--dashboard-muted)] mt-0.5">
                          {parcel.dimensions}
                        </div>
                      )}
                    </TableCell>

                    {/* Registered Date */}
                    <TableCell className="text-xs text-[var(--dashboard-muted)] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{parcel.formattedDate}</span>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedParcelId(parcel.id)}
                        className="h-8 px-2.5 text-xs border-[var(--dashboard-border)] hover:bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-text)] inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-[var(--dashboard-accent)]" />
                        <span>View</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination & Counter Bar */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--dashboard-border)] mt-4">
            {/* Range info */}
            <div className="text-xs text-[var(--dashboard-muted)]">
              Showing <span className="font-semibold text-[var(--dashboard-text)]">{startItem}</span> to{" "}
              <span className="font-semibold text-[var(--dashboard-text)]">{endItem}</span> of{" "}
              <span className="font-semibold text-[var(--dashboard-text)]">{total}</span> unassigned parcels
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Rows per page selector */}
              <div className="flex items-center gap-2 text-xs text-[var(--dashboard-muted)]">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setOffset(0);
                  }}
                  className="h-8 px-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] text-xs focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next Page Buttons */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0 || loading}
                  className="h-8 w-8 p-0 border-[var(--dashboard-border)]"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-[var(--dashboard-text)] px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total || loading}
                  className="h-8 w-8 p-0 border-[var(--dashboard-border)]"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Parcel Detail Slide-over Drawer */}
      <ParcelDetailDrawer
        parcelId={selectedParcelId}
        onClose={() => setSelectedParcelId(null)}
      />
    </div>
  );
}

