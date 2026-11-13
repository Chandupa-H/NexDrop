"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Weight,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { getCourierDelivery } from "../api/courier.api";
import type { DeliveryDetailDTO } from "../api/courier.dto";
import { getStatusLabel, getStatusTone } from "../lib/status";
import { StatusTimeline } from "./StatusTimeline";

function formatColomboDate(value: string | null): string {
  if (!value) return "Completion time unavailable";
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}

function mapsHref(
  address: string,
  lat: number | null,
  lng: number | null
): string {
  const query =
    lat !== null && lng !== null ? `${address} ${lat}, ${lng}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getReturnTo(value: string | null): string {
  if (value && /^\/courier\/history(?:\?.*)?$/.test(value)) {
    return value;
  }
  return "/courier/history";
}

export function DeliveryHistoryDetailPage() {
  const params = useParams<{ deliveryId: string }>();
  const searchParams = useSearchParams();
  const returnTo = getReturnTo(searchParams.get("returnTo"));
  const deliveryId = Number(params.deliveryId);
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    detail: DeliveryDetailDTO | null;
    errorStatus: number | null;
  } | null>(null);
  const requestKey = `${deliveryId}:${retryCount}`;
  const loading = result?.key !== requestKey;
  const errorStatus = result?.key === requestKey ? result.errorStatus : null;
  const currentDetail = result?.key === requestKey ? result.detail : null;

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!Number.isInteger(deliveryId) || deliveryId < 1) {
          throw new ApiError(404, "Delivery not found.");
        }
        return getCourierDelivery(deliveryId);
      })
      .then((loadedDetail) => {
        if (active) {
          setResult({
            key: requestKey,
            detail: loadedDetail,
            errorStatus: null,
          });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load courier delivery details:", error);
        if (active) {
          setResult({
            key: requestKey,
            detail: null,
            errorStatus: error instanceof ApiError ? error.status : 0,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [deliveryId, requestKey]);

  const isTerminal =
    currentDetail?.status === "delivered" || currentDetail?.status === "cancelled";
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link
        href={returnTo}
        className="-ml-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Delivery History
      </Link>

      {loading ? (
        <div
          role="status"
          aria-label="Loading delivery details"
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]"
        >
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : errorStatus !== null || !currentDetail ? (
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="size-9 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold">
              {errorStatus === 403
                ? "Access denied"
                : errorStatus === 404
                  ? "Delivery not found"
                  : "Unable to load delivery"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorStatus === 403
                ? "You are not assigned to this delivery."
                : errorStatus === 404
                  ? "This delivery may have been removed or the link is invalid."
                  : "Check your connection and try again."}
            </p>
          </div>
          {errorStatus !== 403 && errorStatus !== 404 && (
            <Button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try Again
            </Button>
          )}
        </Card>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Delivery details
              </p>
              <h1 className="break-all text-2xl font-semibold">
                {currentDetail.tracking_number}
              </h1>
            </div>
            <StatusBadge
              label={getStatusLabel(currentDetail.status)}
              tone={getStatusTone(currentDetail.status)}
            />
          </header>

          {currentDetail.status === "cancelled" && currentDetail.failure_reason && (
            <Card role="status" className="border-destructive/30 bg-destructive/5 p-4">
              <p className="font-semibold text-destructive">Delivery cancelled</p>
              <p className="mt-1 text-sm text-foreground">
                Cancellation reason: {currentDetail.failure_reason}
              </p>
            </Card>
          )}

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <div className="min-w-0 space-y-4">
              <Card className="space-y-4 p-4 sm:p-5">
                <h2 className="font-semibold">Parcel information</h2>
                <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-3 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                    {currentDetail.size ?? "Size unavailable"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Weight className="size-4 text-muted-foreground" aria-hidden="true" />
                    {currentDetail.weight} kg
                  </span>
                </div>

                <AddressDetail
                  label="Pickup"
                  address={currentDetail.pickup_address}
                  lat={currentDetail.pickup_lat}
                  lng={currentDetail.pickup_lng}
                />
                <AddressDetail
                  label="Drop-off"
                  address={currentDetail.dropoff_address}
                  lat={currentDetail.dropoff_lat}
                  lng={currentDetail.dropoff_lng}
                />

                <div className="border-t border-border pt-3">
                  <p className="font-semibold">{currentDetail.recipient_name}</p>
                  <a
                    className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                    href={`tel:${currentDetail.recipient_phone.replace(/[^\d+]/g, "")}`}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {currentDetail.recipient_phone}
                  </a>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  Assigned {formatColomboDate(currentDetail.assigned_at)}
                </div>
                {currentDetail.completed_at && (
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Completed {formatColomboDate(currentDetail.completed_at)}
                  </div>
                )}
                {currentDetail.status === "delivered" && (
                  <p className="text-sm text-muted-foreground">
                    {currentDetail.status_history.find(
                      (entry) => entry.status === "delivered" && entry.proof_reference
                    )?.proof_reference
                      ? `Proof reference: ${
                          currentDetail.status_history.find(
                            (entry) =>
                              entry.status === "delivered" && entry.proof_reference
                          )?.proof_reference
                        }`
                      : `Received by ${currentDetail.recipient_name}`}
                  </p>
                )}
              </Card>

              {currentDetail.delivery_instructions && (
                <Card className="p-4">
                  <h2 className="font-semibold">Delivery instructions</h2>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {currentDetail.delivery_instructions}
                  </p>
                </Card>
              )}

              {isTerminal ? (
                <Card className="p-4 text-sm text-muted-foreground">
                  This delivery is closed.
                </Card>
              ) : (
                <Card className="p-4 text-sm text-muted-foreground">
                  History details are read-only.
                </Card>
              )}
            </div>

            <Card className="min-w-0 space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="font-semibold">Status timeline</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Status changes recorded for this delivery.
                </p>
              </div>
              <StatusTimeline entries={currentDetail.status_history} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AddressDetail({
  label,
  address,
  lat,
  lng,
}: {
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-border pb-3">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm">{address || "Address unavailable"}</p>
        <a
          href={mapsHref(address, lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
        >
          Open in Maps <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
