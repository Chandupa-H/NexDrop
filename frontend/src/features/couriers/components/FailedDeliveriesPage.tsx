"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Search, X } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getCourierFailedDeliveries } from "../api/courier.api";
import type {
  FailedDeliveryListDTO,
  FailedDeliveryParamsDTO,
  FailedDeliveryRecordDTO,
} from "../api/courier.dto";

const FAILURE_REASONS = [
  ["address_not_found", "Address Not Found"],
  ["customer_unavailable", "Customer Unavailable"],
  ["refused_delivery", "Refused Delivery"],
  ["damaged_parcel", "Damaged Parcel"],
  ["other", "Other"],
] as const;

function formatColomboDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}

function statusLabel(value: string): string {
  if (value === "cancelled") return "Failed";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function redeliveryLabel(value: string | null): string {
  return value ? statusLabel(value) : "Not tracked";
}

export function FailedDeliveriesPage() {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<FailedDeliveryRecordDTO | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: FailedDeliveryListDTO | null;
    errorMessage: string | null;
  } | null>(null);

  const params = useMemo<FailedDeliveryParamsDTO>(
    () => ({
      q: query.trim() || undefined,
      reason: reason || undefined,
      date: deliveryDate || undefined,
    }),
    [query, reason, deliveryDate]
  );
  const requestKey = `${params.q ?? ""}:${params.reason ?? ""}:${params.date ?? ""}:${requestVersion}`;
  const loading = result?.key !== requestKey;
  const errorMessage =
    result?.key === requestKey ? result.errorMessage : null;
  const data = result?.key === requestKey ? result.data : null;

  useEffect(() => {
    let active = true;
    getCourierFailedDeliveries(params)
      .then((response) => {
        if (active) {
          setResult({ key: requestKey, data: response, errorMessage: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({
            key: requestKey,
            data: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : "Unable to load failed deliveries. Please try again.",
          });
        }
      });
    return () => { active = false; };
  }, [params, requestKey]);

  useEffect(() => {
    if (!selectedRecord) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRecord(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedRecord]);

  const clearFilters = () => {
    setQuery("");
    setReason("");
    setDeliveryDate("");
  };
  const hasFilters = Boolean(query || reason || deliveryDate);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <PageHeader
        title="Failed Deliveries"
        subtitle="Review unsuccessful delivery attempts recorded by the backend."
      />

      <section aria-label="Failed delivery summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Failed Deliveries" value={data?.summary.total_failed_deliveries ?? 0} icon="alert-triangle" tone="danger" />
            <StatCard label="Today's Failed Deliveries" value={data?.summary.today_failed_deliveries ?? 0} icon="clock" tone="warning" />
            <StatCard label="Pending Redelivery" value={data?.summary.pending_redelivery ?? "—"} icon="refresh-cw" tone="info" />
            <StatCard label="Most Common Failure Reason" value={data?.summary.most_common_failure_reason ?? "—"} icon="alert-triangle" tone="neutral" />
          </>
        )}
      </section>

      <Card className="grid min-w-0 grid-cols-1 gap-4 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(220px,1.1fr)_minmax(190px,0.9fr)_minmax(220px,1fr)]">
        <label className="relative block min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Search tracking number or recipient" className="pl-9" placeholder="Tracking number or recipient" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="min-w-0">
          <Select
            aria-label="Filter by failure reason"
            className="min-w-0"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            options={[{ value: "", label: "All failure reasons" }, ...FAILURE_REASONS.map(([value, label]) => ({ value, label }))]}
          />
        </div>
        <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">Failed date</span>
          <span className="min-w-0 flex-1">
            <Input className="min-w-0" aria-label="Filter by failed date" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
          </span>
        </label>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading failed deliveries">
          {[0, 1, 2].map((item) => <Card key={item} className="space-y-4 p-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-24 w-full" /></Card>)}
        </div>
      ) : errorMessage ? (
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div><h2 className="font-semibold">Unable to load failed deliveries</h2><p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p></div>
          <Button type="button" onClick={() => setRequestVersion((version) => version + 1)}>Try Again</Button>
        </Card>
      ) : !data?.items.length ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="size-9 text-muted-foreground" aria-hidden="true" />
          <div><h2 className="font-semibold">{hasFilters ? "No failed deliveries match your filters" : "No failed deliveries yet"}</h2><p className="mt-1 text-sm text-muted-foreground">{hasFilters ? "Try changing or clearing your filters." : "Parcels will appear here after a delivery attempt is reported as failed."}</p></div>
          {hasFilters && <Button type="button" variant="outline" onClick={clearFilters}>Clear filters</Button>}
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">Showing {data.total} failed {data.total === 1 ? "attempt" : "attempts"}</p>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((record) => (
              <button
                type="button"
                key={`${record.tracking_number}:${record.failed_at}`}
                onClick={() => setSelectedRecord(record)}
                className="min-w-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`View failed delivery ${record.tracking_number}, attempt ${record.attempt_number}`}
              >
                <Card className="flex h-full min-w-0 flex-col gap-3 border-border/80 p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="break-all text-sm font-semibold">{record.tracking_number}</h2><p className="mt-1 text-sm text-muted-foreground">Attempt {record.attempt_number}</p></div>
                    <StatusBadge label={statusLabel(record.parcel_status)} tone={["failed", "cancelled"].includes(record.parcel_status) ? "danger" : record.parcel_status === "delivered" ? "success" : "neutral"} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{record.customer_name}</p>
                    <p className="break-words text-muted-foreground">{record.delivery_address}</p>
                    <time className="block text-xs text-muted-foreground" dateTime={record.failed_at}>{formatColomboDate(record.failed_at)}</time>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 text-sm">
                    <p className="font-medium">{record.failure_reason_label}</p>
                    {record.note && <p className="mt-1 line-clamp-2 text-muted-foreground">{record.note}</p>}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                    <span className="text-muted-foreground">Redelivery</span>
                    <span className="font-medium">{redeliveryLabel(record.redelivery_status)}</span>
                  </div>
                </Card>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Retry Delivery is unavailable because the backend does not currently support a safe retry workflow.</p>
        </>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecord(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="failed-detail-title" className="relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Failed delivery · Attempt {selectedRecord.attempt_number}</p><h2 id="failed-detail-title" className="mt-1 break-all text-xl font-semibold">{selectedRecord.tracking_number}</h2></div>
              <Button type="button" variant="ghost" size="sm" aria-label="Close failed delivery details" onClick={() => setSelectedRecord(null)}><X className="size-5" aria-hidden="true" />Close</Button>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Customer / recipient</dt><dd className="mt-0.5 font-medium">{selectedRecord.customer_name}</dd></div>
              <div><dt className="text-muted-foreground">Customer phone</dt><dd className="mt-0.5 font-medium">{selectedRecord.customer_phone_masked}</dd></div>
              <div><dt className="text-muted-foreground">Courier</dt><dd className="mt-0.5 font-medium">{selectedRecord.courier_name ?? "Not available"}</dd></div>
              <div><dt className="text-muted-foreground">Destination</dt><dd className="mt-0.5 font-medium">{selectedRecord.destination}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Delivery address</dt><dd className="mt-0.5 break-words font-medium">{selectedRecord.delivery_address}</dd></div>
              <div><dt className="text-muted-foreground">Assigned</dt><dd className="mt-0.5 font-medium">{formatColomboDate(selectedRecord.assigned_at)}</dd></div>
              <div><dt className="text-muted-foreground">ETA</dt><dd className="mt-0.5 font-medium">{selectedRecord.eta ? formatColomboDate(selectedRecord.eta) : "Not available"}</dd></div>
              <div><dt className="text-muted-foreground">Failed attempt</dt><dd className="mt-0.5 font-medium">{formatColomboDate(selectedRecord.failed_at)}</dd></div>
              <div><dt className="text-muted-foreground">Failure reason</dt><dd className="mt-0.5 font-medium">{selectedRecord.failure_reason_label}</dd></div>
              <div><dt className="text-muted-foreground">Current parcel status</dt><dd className="mt-0.5 font-medium">{statusLabel(selectedRecord.parcel_status)}</dd></div>
              <div><dt className="text-muted-foreground">Redelivery status</dt><dd className="mt-0.5 font-medium">{redeliveryLabel(selectedRecord.redelivery_status)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Delivery note</dt><dd className="mt-0.5 whitespace-pre-wrap font-medium">{selectedRecord.note || "No additional note"}</dd></div>
            </dl>
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Retry Delivery is unavailable. This project has no backend redelivery scheduling or retry endpoint.
            </div>
            <section className="mt-5 border-t border-border pt-4">
              <h3 className="font-semibold">Previous delivery attempts</h3>
              {selectedRecord.previous_attempts.length ? (
                <ol className="mt-3 space-y-3">
                  {selectedRecord.previous_attempts.map((attempt) => (
                    <li key={`${attempt.attempt_number}:${attempt.failed_at}`} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">Attempt {attempt.attempt_number} · {attempt.failure_reason_label}</span><time className="text-xs text-muted-foreground" dateTime={attempt.failed_at}>{formatColomboDate(attempt.failed_at)}</time></div>
                      {attempt.note && <p className="mt-1 text-muted-foreground">{attempt.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : <p className="mt-2 text-sm text-muted-foreground">No earlier failed attempts recorded.</p>}
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
