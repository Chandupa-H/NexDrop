"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Phone,
  Weight,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCourierTracking,
  postCourierLocation,
  updateCourierDeliveryStatus,
} from "../api/courier.api";
import type { DeliveryTrackingDTO } from "../api/courier.dto";
import type { DeliveryStatus } from "../types";
import { getNextStatuses, getStatusLabel, getStatusTone } from "../lib/status";
import { StatusBadge } from "@/components/dashboard";

const DeliveryMapPanel = dynamic(
  () => import("./DeliveryMapPanel").then((module) => module.DeliveryMapPanel),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-xl" />,
  }
);

const nextAction: Partial<
  Record<DeliveryStatus, { status: DeliveryStatus; label: string }>
> = {
  pending: { status: "picked_up", label: "Mark as Picked Up" },
  picked_up: { status: "in_transit", label: "Mark as In Transit" },
  in_transit: { status: "out_for_delivery", label: "Mark Out for Delivery" },
  out_for_delivery: { status: "delivered", label: "Mark as Delivered" },
};

type LocationState =
  | "active"
  | "waiting"
  | "denied"
  | "unavailable"
  | "completed"
  | "cancelled";

export function DeliveryDetailsDialog({
  deliveryId,
  onClose,
  onStatusUpdated,
}: {
  deliveryId: number;
  onClose: () => void;
  onStatusUpdated: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialLoadTimerRef = useRef<number | null>(null);
  const lastLocationPostRef = useRef(0);
  const mountedRef = useRef(false);
  const trackingRef = useRef<DeliveryTrackingDTO | null>(null);
  const [tracking, setTracking] = useState<DeliveryTrackingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>("waiting");
  const [locationSyncError, setLocationSyncError] = useState(false);
  const [actionError, setActionError] = useState(false);

  const stopTracking = useCallback(() => {
    if (initialLoadTimerRef.current !== null) {
      window.clearTimeout(initialLoadTimerRef.current);
      initialLoadTimerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading && mountedRef.current) setLoading(true);
    try {
      const result = await getCourierTracking(deliveryId);
      if (!mountedRef.current) return;
      trackingRef.current = result;
      setTracking(result);
      setError(false);
      if (["delivered", "cancelled"].includes(result.delivery.status)) {
        stopTracking();
      }
    } catch (requestError) {
      console.error("Failed to load courier delivery tracking:", requestError);
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [deliveryId, stopTracking]);

  useEffect(() => {
    mountedRef.current = true;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    initialLoadTimerRef.current = window.setTimeout(() => void refresh(), 0);
    pollTimerRef.current = setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      mountedRef.current = false;
      stopTracking();
    };
  }, [refresh, stopTracking]);

  useEffect(() => {
    const currentTracking = trackingRef.current;
    if (
      !currentTracking ||
      ["delivered", "cancelled"].includes(currentTracking.delivery.status)
    ) return;

    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!mountedRef.current) return;
        setLocationState("active");
        const current = trackingRef.current;
        if (current) {
          const updated = {
            ...current,
            courier_location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              updated_at: new Date(position.timestamp).toISOString(),
              active_delivery_id: deliveryId,
            },
            location_source: "live" as const,
          };
          trackingRef.current = updated;
          setTracking(updated);
        }
        if (Date.now() - lastLocationPostRef.current >= 3000) {
          lastLocationPostRef.current = Date.now();
          void postCourierLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            deliveryId,
          })
            .then(() => {
              if (mountedRef.current) setLocationSyncError(false);
            })
            .catch((locationError: unknown) => {
              console.error("Failed to update courier location:", locationError);
              if (mountedRef.current) setLocationSyncError(true);
            });
        }
      },
      (geoError) => {
        if (!mountedRef.current) return;
        setLocationState(
          geoError.code === geoError.PERMISSION_DENIED ? "denied" : "unavailable"
        );
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [
    deliveryId,
    tracking?.delivery.status,
  ]);

  const close = () => {
    stopTracking();
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.close === "function") dialog.close();
    else dialog?.removeAttribute("open");
    onClose();
  };

  const handleStatusAction = async () => {
    if (!tracking) return;
    const action = nextAction[tracking.delivery.status];
    if (!action || !getNextStatuses(tracking.delivery.status).includes(action.status)) return;
    setSubmitting(true);
    setActionError(false);
    try {
      await updateCourierDeliveryStatus(deliveryId, { status: action.status });
      await refresh();
      if (mountedRef.current) onStatusUpdated();
    } catch (statusError) {
      console.error("Failed to update delivery status:", statusError);
      if (mountedRef.current) setActionError(true);
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const noRoute = useCallback(() => {}, []);
  const action = tracking ? nextAction[tracking.delivery.status] : undefined;
  const resolvedLocationState: LocationState =
    tracking?.delivery.status === "delivered"
      ? "completed"
      : tracking?.delivery.status === "cancelled"
        ? "cancelled"
        : typeof navigator !== "undefined" && !navigator.geolocation
          ? "unavailable"
          : locationState;
  const locationLabel: Record<LocationState, string> = {
    active: "Location tracking active",
    waiting: "Waiting for GPS",
    denied: "Permission denied",
    unavailable: "Location unavailable",
    completed: "Delivery completed",
    cancelled: "Delivery cancelled",
  };
  const mapTracking: DeliveryTrackingDTO | null = tracking
    ? {
        ...tracking,
        location_source:
          ["delivered", "cancelled"].includes(tracking.delivery.status)
            ? "unavailable"
            : resolvedLocationState === "active"
              ? "live"
              : "unavailable",
      }
    : null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Delivery details"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="fixed inset-2 z-50 m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto rounded-2xl bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Delivery details
          </p>
          <h2 className="truncate text-lg font-semibold">
            {tracking?.delivery.tracking_number ?? "Loading delivery"}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="size-10 p-2"
          aria-label="Close details"
          onClick={close}
        >
          <X className="size-5" />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      ) : error || !tracking ? (
        <Card className="m-4 flex flex-col items-center gap-4 p-8 text-center sm:m-6">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">Unable to load delivery details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void refresh(true)}>
              Try Again
            </Button>
            <Button type="button" onClick={close}>Close</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0 space-y-4">
            <Card className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tracking number</p>
                  <p className="font-semibold">{tracking.delivery.tracking_number}</p>
                </div>
                <StatusBadge
                  label={getStatusLabel(tracking.delivery.status)}
                  tone={getStatusTone(tracking.delivery.status)}
                />
              </div>
              <div className="space-y-3 border-t border-border pt-3">
                <DetailRow icon={<MapPin />} label="Pickup" value={tracking.delivery.pickup_address} />
                <DetailRow icon={<MapPin />} label="Drop-off" value={tracking.delivery.dropoff_address} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Package className="size-4 text-muted-foreground" />
                  {tracking.delivery.size ?? "Size unavailable"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Weight className="size-4 text-muted-foreground" />
                  {tracking.delivery.weight} kg
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-semibold">{tracking.delivery.recipient_name}</p>
                <a
                  className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  href={`tel:${tracking.delivery.recipient_phone.replace(/[^\d+]/g, "")}`}
                >
                  <Phone className="size-4" />
                  {tracking.delivery.recipient_phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" />
                Assigned {new Date(tracking.delivery.assigned_at).toLocaleString()}
              </div>
              {tracking.delivery.delivery_instructions && (
                <div className="rounded-lg bg-muted/60 p-3 text-sm">
                  <p className="font-medium">Delivery instructions</p>
                  <p className="mt-1 text-muted-foreground">
                    {tracking.delivery.delivery_instructions}
                  </p>
                </div>
              )}
            </Card>

            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                {tracking.delivery.status === "delivered" ? (
                  <CheckCircle2 className="size-5 text-green-700" />
                ) : (
                  <MapPin className="size-5 text-primary" />
                )}
                <div>
                  <p className="font-semibold">{tracking.next_action}</p>
                  <p className="text-xs text-muted-foreground">{locationLabel[resolvedLocationState]}</p>
                </div>
              </div>
              {locationSyncError && (
                <p role="status" className="text-sm text-destructive">
                  Location updates could not be saved. Check your connection.
                </p>
              )}
              {actionError && (
                <p role="alert" className="text-sm text-destructive">
                  Could not update this delivery. Please try again.
                </p>
              )}
              {action && (
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  disabled={submitting || !getNextStatuses(tracking.delivery.status).includes(action.status)}
                  onClick={() => void handleStatusAction()}
                >
                  {submitting ? "Updating..." : action.label}
                </Button>
              )}
            </Card>
          </div>

          <div className="min-w-0">
            {mapTracking && <DeliveryMapPanel tracking={mapTracking} onRoutePath={noRoute} />}
          </div>
        </div>
      )}
    </dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm">{value || "Address unavailable"}</p>
      </div>
    </div>
  );
}
