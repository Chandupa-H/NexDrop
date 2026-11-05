"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { EmptyState, PageHeader, StatCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getCourierDeliveries } from "../api/courier.api";
import type { DeliveryListItemDTO } from "../api/courier.dto";
import type { DeliveryStatus } from "../types";
import { DeliveryCard } from "./DeliveryCard";
import { DeliveryDetailsDialog } from "./DeliveryDetailsDialog";

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "To Pick Up" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const statusByTab: Record<Exclude<TabKey, "all">, DeliveryStatus[]> = {
  pending: ["pending"],
  "in-progress": ["picked_up", "in_transit", "out_for_delivery"],
  done: ["delivered"],
};

function getActiveTab(values: string[]): TabKey {
  const key = values.join(",");
  if (key === statusByTab.pending.join(",")) return "pending";
  if (key === statusByTab["in-progress"].join(",")) return "in-progress";
  if (key === statusByTab.done.join(",")) return "done";
  return "all";
}

function DeliveryCardSkeleton() {
  return (
    <Card className="space-y-4 p-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <div className="flex gap-3 py-1">
        <div className="flex flex-col items-center py-1">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="my-1 h-7 w-px" />
          <Skeleton className="size-3 rounded-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      <div className="flex gap-4 border-t border-border pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </Card>
  );
}

export function AssignedDeliveriesSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
      </div>
        <Skeleton className="h-10 w-full max-w-xl rounded-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DeliveryCardSkeleton />
          <DeliveryCardSkeleton />
        </div>
    </div>
  );
}

export function AssignedDeliveries() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const activeTab = getActiveTab(searchParams.getAll("status"));
  const selectedStatuses = useMemo(
    () => (activeTab === "all" ? undefined : statusByTab[activeTab]),
    [activeTab]
  );
  const [retryCount, setRetryCount] = useState(0);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const requestKey = `${selectedStatuses?.join(",") ?? "all"}:${retryCount}`;

  const [result, setResult] = useState<{
    requestKey: string;
    deliveries: DeliveryListItemDTO[];
    allDeliveries: DeliveryListItemDTO[];
    failed: boolean;
  } | null>(null);

  const loading = result?.requestKey !== requestKey;
  const failed = result?.requestKey === requestKey && result.failed;
  const deliveries =
    result?.requestKey === requestKey ? result.deliveries : [];
  const allDeliveries = result?.allDeliveries ?? [];
  const summary = {
    total: allDeliveries.length,
    pending: allDeliveries.filter((delivery) => delivery.status === "pending").length,
    inProgress: allDeliveries.filter((delivery) =>
      statusByTab["in-progress"].includes(delivery.status)
    ).length,
    delivered: allDeliveries.filter((delivery) => delivery.status === "delivered").length,
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      getCourierDeliveries(),
      selectedStatuses ? getCourierDeliveries(selectedStatuses) : undefined,
    ])
      .then(([allResult, filteredResult]) => {
        if (active) {
          setResult({
            requestKey,
            allDeliveries: allResult,
            deliveries: filteredResult ?? allResult,
            failed: false,
          });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load courier deliveries:", error);
        if (active) {
          setResult({
            requestKey,
            allDeliveries: [],
            deliveries: [],
            failed: true,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [requestKey, selectedStatuses]);

  const selectTab = useCallback(
    (key: TabKey) => {
      const params = new URLSearchParams(query);
      params.delete("status");
      if (key !== "all") {
        statusByTab[key].forEach((value) => params.append("status", value));
      }
      const nextQuery = params.toString();
      router.push(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, query, router]
  );

  const emptyState = {
    all: {
      title: "No deliveries assigned today",
      description: "New deliveries assigned to you today will appear here.",
    },
    pending: {
      title: "No deliveries waiting for pickup",
      description: "You're all caught up on pickups for today.",
    },
    "in-progress": {
      title: "No deliveries in progress",
      description: "Deliveries you pick up will appear here while in progress.",
    },
    done: {
      title: "No completed deliveries yet",
      description: "Completed deliveries will appear here.",
    },
  }[activeTab];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <PageHeader
        title="Today's Deliveries"
        subtitle="Your delivery schedule for today"
      />

      <section
        aria-label="Today's delivery summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {loading && result === null ? (
          [...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Total" value={summary.total} icon="package" tone="neutral" />
            <StatCard label="To Pick Up" value={summary.pending} icon="clock" tone="warning" />
            <StatCard label="In Progress" value={summary.inProgress} icon="truck" tone="info" />
            <StatCard label="Delivered" value={summary.delivered} icon="check-circle" tone="success" />
          </>
        )}
      </section>

      <div
        className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filter deliveries by status"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`delivery-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-label={`${tab.label} ${
              tab.key === "all"
                ? summary.total
                : tab.key === "pending"
                  ? summary.pending
                  : tab.key === "in-progress"
                    ? summary.inProgress
                    : summary.delivered
            }`}
            aria-selected={activeTab === tab.key}
            aria-controls="delivery-tab-panel"
            onClick={() => selectTab(tab.key)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-4 ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                activeTab === tab.key
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.key === "all"
                ? summary.total
                : tab.key === "pending"
                  ? summary.pending
                  : tab.key === "in-progress"
                    ? summary.inProgress
                    : summary.delivered}
            </span>
          </button>
        ))}
      </div>

      <div
        id="delivery-tab-panel"
        role="tabpanel"
        aria-labelledby={`delivery-tab-${activeTab}`}
        aria-busy={loading}
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <DeliveryCardSkeleton key={index} />
            ))}
          </div>
        ) : failed ? (
          <Card className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                Unable to load today&apos;s deliveries
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Please check your connection and try again.
              </p>
            </div>
            <Button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try Again
            </Button>
          </Card>
        ) : deliveries.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon="package"
              title={emptyState.title}
              description={emptyState.description}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.parcel_id}
                delivery={delivery}
                onViewDetails={setSelectedDeliveryId}
              />
            ))}
          </div>
        )}
      </div>
      {selectedDeliveryId !== null && (
        <DeliveryDetailsDialog
          deliveryId={selectedDeliveryId}
          onClose={() => setSelectedDeliveryId(null)}
          onStatusUpdated={() => setRetryCount((count) => count + 1)}
        />
      )}
    </div>
  );
}
