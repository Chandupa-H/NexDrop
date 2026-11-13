"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarClock, Search } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeliveryHistory } from "../api/courier.api";
import type {
  DeliveryHistoryParams,
  DeliveryHistoryResponseDTO,
} from "../api/courier.dto";
import { getStatusLabel, getStatusTone } from "../lib/status";

const PAGE_SIZE = 8;
const HISTORY_FILTERS = [
  { key: "all", label: "All" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type HistoryStatus = "all" | "delivered" | "cancelled";

function currentColomboDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function subtractDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days))
    .toISOString()
    .slice(0, 10);
}

function formatColomboDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}

function getHistoryStatus(params: URLSearchParams): HistoryStatus {
  const status = params.get("status");
  return status === "delivered" || status === "cancelled" ? status : "all";
}

function historyParams(params: URLSearchParams): DeliveryHistoryParams {
  const status = getHistoryStatus(params);
  const page = Number(params.get("page") ?? "1");
  return {
    status: status === "all" ? undefined : status,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    q: params.get("q") || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    page_size: PAGE_SIZE,
  };
}

export function DeliveryHistorySkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading delivery history">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="space-y-4 p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DeliveryHistoryPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const parsedParams = useMemo(
    () => historyParams(new URLSearchParams(query)),
    [query]
  );
  const activeStatus = getHistoryStatus(new URLSearchParams(query));
  const [searchInput, setSearchInput] = useState(() => ({
    query: parsedParams.q ?? "",
    value: parsedParams.q ?? "",
  }));
  const searchText =
    searchInput.query === (parsedParams.q ?? "")
      ? searchInput.value
      : parsedParams.q ?? "";
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = `${query}:${retryCount}`;
  const [result, setResult] = useState<{
    key: string;
    data: DeliveryHistoryResponseDTO | null;
    error: boolean;
  } | null>(null);

  const loading = result?.key !== requestKey;
  const failed = result?.key === requestKey && result.error;
  const data = result?.key === requestKey ? result.data : null;

  useEffect(() => {
    let active = true;
    getDeliveryHistory(parsedParams)
      .then((response) => {
        if (active) setResult({ key: requestKey, data: response, error: false });
      })
      .catch((error: unknown) => {
        console.error("Failed to load courier delivery history:", error);
        if (active) setResult({ key: requestKey, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [parsedParams, requestKey]);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(query);
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (resetPage) params.delete("page");
      const next = params.toString();
      router.push(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
    },
    [pathname, query, router]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = searchText.trim();
      if (normalized !== (parsedParams.q ?? "")) {
        updateQuery({ q: normalized || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [parsedParams.q, searchText, updateQuery]);

  const selectStatus = (status: HistoryStatus) => {
    updateQuery({ status: status === "all" ? null : status });
  };

  const applyDatePreset = (days: number) => {
    const today = currentColomboDate();
    updateQuery({ from: subtractDays(today, days - 1), to: today });
  };

  const clearFilters = () => {
    setSearchInput({ query: parsedParams.q ?? "", value: "" });
    router.push(pathname, { scroll: false });
  };

  const page = parsedParams.page ?? 1;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(
    parsedParams.status || parsedParams.from || parsedParams.to || parsedParams.q
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <PageHeader
        title="Delivery History"
        subtitle="Review your completed and cancelled deliveries"
      />

      <section
        aria-label="Delivery history summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {loading && !data ? (
          [0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Delivered"
              value={data?.history_summary.delivered ?? 0}
              icon="check-circle"
              tone="success"
            />
            <StatCard
              label="Cancelled"
              value={data?.history_summary.cancelled ?? 0}
              icon="alert-triangle"
              tone="danger"
            />
            <StatCard
              label="Total"
              value={data?.history_summary.total ?? 0}
              icon="package"
              tone="neutral"
            />
          </>
        )}
      </section>

      <Card className="space-y-4 p-3 sm:p-4">
        <div
          role="tablist"
          aria-label="Filter delivery history"
          className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {HISTORY_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={activeStatus === filter.key}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeStatus === filter.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
              onClick={() => selectStatus(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
          <label className="relative block min-w-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search tracking number or recipient"
              className="pl-9"
              placeholder="Tracking number or recipient"
              maxLength={100}
              value={searchText}
              onChange={(event) =>
                setSearchInput({
                  query: parsedParams.q ?? "",
                  value: event.target.value,
                })
              }
            />
          </label>
          <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span>From</span>
            <Input
              type="date"
              aria-label="From date"
              value={parsedParams.from ?? ""}
              onChange={(event) => updateQuery({ from: event.target.value || null })}
            />
          </label>
          <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span>To</span>
            <Input
              type="date"
              aria-label="To date"
              value={parsedParams.to ?? ""}
              onChange={(event) => updateQuery({ to: event.target.value || null })}
            />
          </label>
          <div className="flex flex-wrap items-center gap-1">
            <span className="sr-only">Date presets</span>
            {[["Today", 1], ["7 days", 7], ["30 days", 30]].map(([label, days]) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => applyDatePreset(Number(days))}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div
          role="status"
          aria-label="Loading delivery history"
          className="grid gap-4 md:grid-cols-2"
        >
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="space-y-4 p-4" aria-hidden="true">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-7 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-28" />
            </Card>
          ))}
        </div>
      ) : failed ? (
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Unable to load delivery history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
          </div>
          <Button type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Try Again
          </Button>
        </Card>
      ) : !data || data.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <CalendarClock className="size-9 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">
              {hasFilters ? "No deliveries match your filters" : "No past deliveries yet"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters
                ? "Try changing the status, date range, or search terms."
                : "Completed deliveries will appear here."}
            </p>
          </div>
          {hasFilters && (
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {data.items.map((item) => {
              const returnTo = `${pathname}${query ? `?${query}` : ""}`;
              const detailHref = `/courier/history/${item.parcel_id}?returnTo=${encodeURIComponent(returnTo)}`;
              return (
                <Card
                  key={item.parcel_id}
                  className="flex min-w-0 flex-col gap-3 border-border/80 p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <h2 className="break-all text-sm font-semibold">{item.tracking_number}</h2>
                    <StatusBadge
                      label={getStatusLabel(item.status)}
                      tone={getStatusTone(item.status)}
                    />
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <AddressBlock label="Pickup" address={item.pickup_address} />
                    <AddressBlock label="Drop-off" address={item.dropoff_address} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                    <span className="break-words font-medium">{item.recipient_name}</span>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={item.completed_at}
                    >
                      {formatColomboDate(item.completed_at)}
                    </time>
                  </div>
                  {item.failure_reason && (
                    <p className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
                      <span className="font-medium">Cancellation reason: </span>
                      {item.failure_reason}
                    </p>
                  )}
                  <div className="mt-auto flex justify-end">
                    <Link
                      href={detailHref}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      View details <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {data.total} deliveries
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => updateQuery({ page: String(page - 1) }, false)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => updateQuery({ page: String(page + 1) }, false)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AddressBlock({ label, address }: { label: string; address: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm leading-5">{address || "Address unavailable"}</p>
    </div>
  );
}
