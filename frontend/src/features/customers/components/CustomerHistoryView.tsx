"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { CustomerParcelsTable } from "./CustomerParcelsTable";
import { CustomerParcelDrawer } from "./CustomerParcelDrawer";
import { useCustomerParcels } from "../hooks/useCustomerParcels";
import type { CustomerParcelListItem, CustomerTableFilter } from "../types";

const EMPTY_PARCELS: CustomerParcelListItem[] = [];
const PAGE_SIZE = 10;

export function CustomerHistoryView() {
  const [filter, setFilter] = useState<CustomerTableFilter>("all");
  const [page, setPage] = useState(1);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const data = useCustomerParcels(filter, EMPTY_PARCELS, 0, {
    page, fetchOnMount: true, allowMockFallback: false,
  });
  const start = data.parcels.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = data.parcels.length ? (page - 1) * PAGE_SIZE + data.parcels.length : 0;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Delivery History" subtitle="Browse all bookings, newest first, and view shipment details." />
      <p className="text-sm text-muted-foreground">
        Customer authentication is incomplete. The service currently uses a fixed customer and may return demo data.
        Displayed records are not verified PostgreSQL history. Details are read-only here.
      </p>
      <CustomerParcelsTable
        parcels={data.parcels} total={data.total} filter={filter}
        onFilterChange={(next) => { setFilter(next); setPage(1); }}
        onSelectParcel={setTrackingId} loading={data.loading}
        error={data.error ?? undefined} onRetry={data.refetch}
      />
      <nav aria-label="Delivery history pagination" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="text-sm text-muted-foreground">
          {data.loading ? "Loading deliveries..." : data.error ? "Delivery range unavailable" : `Showing ${start}–${end} of ${data.total} deliveries`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="min-h-11" disabled={page === 1 || data.loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span className="text-sm">Page {page}{!data.loading && !data.error ? ` of ${Math.max(1, Math.ceil(data.total / PAGE_SIZE))}` : ""}</span>
          <Button variant="outline" className="min-h-11" disabled={data.loading || !!data.error || page * PAGE_SIZE >= data.total} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </nav>
      {trackingId && <CustomerParcelDrawer key={trackingId} trackingId={trackingId} readOnly onClose={() => setTrackingId(null)} onParcelUpdated={data.refetch} />}
    </div>
  );
}
