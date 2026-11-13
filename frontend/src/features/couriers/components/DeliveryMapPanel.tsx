"use client";

import "leaflet/dist/leaflet.css";

import * as L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactElement,
} from "react";
import { MapPin, Navigation, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getShortestDrivingRoute, type RoutingPoint } from "../api/routing.service";
import type { DeliveryTrackingDTO } from "../api/courier.dto";

type Point = RoutingPoint;
type LatLng = L.LatLngTuple;
type RouteSource = "osrm" | "mock";

interface DisplayRoute {
  destinationKey: string;
  points: Point[];
  source: RouteSource;
  distanceMeters?: number;
  durationSeconds?: number;
}

interface RoutingState {
  route: DisplayRoute | null;
  loading: boolean;
  failed: boolean;
}

interface DeliveryMapPanelProps {
  tracking: DeliveryTrackingDTO;
  onRoutePath: (points: Point[]) => void;
}

const EMPTY_ROUTING_STATE: RoutingState = {
  route: null,
  loading: false,
  failed: false,
};

const STATUS_AFTER_PICKUP = new Set([
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);
const ACTIVE_DESTINATION_STATUSES = new Set([
  "pending",
  "picked_up",
  "in_transit",
  "out_for_delivery",
]);

function toLatLng(point: Point): LatLng {
  return [point.lat, point.lng];
}

function formatCoordinates(point: Point | null): string {
  return point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Not available";
}

function markerIcon(label: string, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:32px;height:32px;border:2px solid white;border-radius:50%;background:${color};color:white;font:bold 12px sans-serif;box-shadow:0 1px 5px #0006">${label}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function distanceMeters(start: Point, end: Point): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(end.lat - start.lat);
  const lngDelta = radians(end.lng - start.lng);
  const value =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(start.lat)) *
      Math.cos(radians(end.lat)) *
      Math.sin(lngDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function fitMapToPoints(map: L.Map, points: Point[]) {
  if (points.length === 0) return;
  const locations = points.map(toLatLng);
  if (locations.length === 1) {
    map.setView(locations[0], 15);
  } else {
    map.fitBounds(locations, { padding: [24, 24] });
  }
}

function RoutingMapContents({
  tracking,
  courier,
  pickup,
  dropoff,
  destination,
  destinationKey,
  onRoutePath,
  onRoutingState,
  retryRef,
}: {
  tracking: DeliveryTrackingDTO;
  courier: Point | null;
  pickup: Point | null;
  dropoff: Point | null;
  destination: Point | null;
  destinationKey: string;
  onRoutePath: DeliveryMapPanelProps["onRoutePath"];
  onRoutingState: (state: RoutingState) => void;
  retryRef: MutableRefObject<(() => void) | null>;
}) {
  const map = useMap();
  const routeRequestControllerRef = useRef<AbortController | null>(null);
  const routeRequestIdRef = useRef(0);
  const lastRouteOriginRef = useRef<Point | null>(null);
  const lastRouteAtRef = useRef(0);
  const previousDestinationKeyRef = useRef<string | null>(null);
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeInputRef = useRef({
    courier,
    destination,
    destinationKey,
    pickup,
    dropoff,
    tracking,
  });
  const routeFitDestinationRef = useRef<string | null>(null);
  const courierIcon = useMemo(() => markerIcon("C", "#1d4ed8"), []);
  const pickupIcon = useMemo(
    () =>
      STATUS_AFTER_PICKUP.has(tracking.delivery.status)
        ? markerIcon("✓", "#15803d")
        : markerIcon("P", "#0f766e"),
    [tracking.delivery.status]
  );
  const dropoffIcon = useMemo(() => markerIcon("D", "#15803d"), []);
  const [route, setRoute] = useState<DisplayRoute | null>(null);

  useEffect(() => {
    routeInputRef.current = {
      courier,
      destination,
      destinationKey,
      pickup,
      dropoff,
      tracking,
    };
  }, [courier, destination, destinationKey, dropoff, pickup, tracking]);

  const fitBoundsForCurrentDelivery = useCallback(
    (routePoints: Point[] = []) => {
      const current = routeInputRef.current;
      fitMapToPoints(
        map,
        [current.courier, current.destination, current.pickup, current.dropoff, ...routePoints].filter(
          (point): point is Point => point !== null
        )
      );
    },
    [map]
  );

  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => {
      window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    };
    const dialog = container.closest("dialog");
    let resizeObserver: ResizeObserver | null = null;
    let openTimer: ReturnType<typeof setTimeout> | null = null;
    const onDialogOpen = () => {
      if (openTimer) clearTimeout(openTimer);
      openTimer = setTimeout(() => {
        map.invalidateSize({ pan: false });
        fitBoundsForCurrentDelivery();
      }, 120);
    };

    invalidate();
    onDialogOpen();
    dialog?.addEventListener("toggle", onDialogOpen);
    dialog?.addEventListener("transitionend", onDialogOpen);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(invalidate);
      resizeObserver.observe(container);
    }

    return () => {
      dialog?.removeEventListener("toggle", onDialogOpen);
      dialog?.removeEventListener("transitionend", onDialogOpen);
      resizeObserver?.disconnect();
      if (openTimer) clearTimeout(openTimer);
    };
  }, [fitBoundsForCurrentDelivery, map]);

  const requestRoute = useCallback(
    async () => {
      const current = routeInputRef.current;
      if (!current.courier || !current.destination) return;

      if (routeTimerRef.current) {
        clearTimeout(routeTimerRef.current);
        routeTimerRef.current = null;
      }
      routeRequestControllerRef.current?.abort();
      const controller = new AbortController();
      routeRequestControllerRef.current = controller;
      const requestId = ++routeRequestIdRef.current;
      const origin = current.courier;
      const target = current.destination;
      const requestedDestinationKey = current.destinationKey;

      lastRouteOriginRef.current = origin;
      lastRouteAtRef.current = Date.now();
      onRoutingState({ route: null, loading: true, failed: false });

      try {
        const result = await getShortestDrivingRoute(origin, target, controller.signal);
        if (controller.signal.aborted || requestId !== routeRequestIdRef.current) return;
        const nextRoute: DisplayRoute = {
          ...result,
          destinationKey: requestedDestinationKey,
          source: "osrm",
        };
        setRoute(nextRoute);
        onRoutePath(result.points);
        onRoutingState({ route: nextRoute, loading: false, failed: false });
      } catch (error) {
        if (controller.signal.aborted || requestId !== routeRequestIdRef.current) return;
        console.error("OSRM route request failed:", error);
        const mockRoute =
          current.tracking.location_source === "simulated" &&
          current.tracking.simulation_route &&
          current.tracking.simulation_route.length > 1
            ? current.tracking.simulation_route
            : null;
        const fallback = mockRoute
          ? {
              destinationKey: requestedDestinationKey,
              points: mockRoute,
              source: "mock" as const,
            }
          : null;
        setRoute(fallback);
        onRoutePath(fallback?.points ?? []);
        onRoutingState({ route: fallback, loading: false, failed: true });
      } finally {
        if (routeRequestControllerRef.current === controller) {
          routeRequestControllerRef.current = null;
        }
      }

    },
    [onRoutePath, onRoutingState]
  );

  const requestRouteRef = useRef(requestRoute);
  useEffect(() => {
    requestRouteRef.current = requestRoute;
    retryRef.current = () => void requestRouteRef.current();
  }, [requestRoute, retryRef]);

  useEffect(() => {
    const previousDestinationKey = previousDestinationKeyRef.current;
    if (previousDestinationKey !== destinationKey) {
      previousDestinationKeyRef.current = destinationKey;
      routeRequestControllerRef.current?.abort();
      routeRequestControllerRef.current = null;
      routeRequestIdRef.current += 1;
      if (routeTimerRef.current) {
        clearTimeout(routeTimerRef.current);
        routeTimerRef.current = null;
      }
      lastRouteOriginRef.current = null;
      lastRouteAtRef.current = 0;
      routeFitDestinationRef.current = null;
      setRoute(null);
      onRoutePath([]);
      onRoutingState({ route: null, loading: false, failed: false });
      fitBoundsForCurrentDelivery();
      if (ACTIVE_DESTINATION_STATUSES.has(tracking.delivery.status) && courier && destination) {
        void requestRouteRef.current();
      }
      return;
    }

    if (
      !ACTIVE_DESTINATION_STATUSES.has(tracking.delivery.status) ||
      !courier ||
      !destination
    ) {
      return;
    }

    const lastOrigin = lastRouteOriginRef.current;
    if (!lastOrigin) {
      void requestRouteRef.current();
      return;
    }
    if (distanceMeters(lastOrigin, courier) <= 150 || routeTimerRef.current) return;

    const delay = Math.max(0, 15_000 - (Date.now() - lastRouteAtRef.current));
    routeTimerRef.current = setTimeout(() => {
      routeTimerRef.current = null;
      void requestRouteRef.current();
    }, delay);
  }, [
    courier,
    destination,
    destinationKey,
    fitBoundsForCurrentDelivery,
    onRoutePath,
    onRoutingState,
    tracking.delivery.status,
  ]);

  useEffect(() => {
    if (!route || route.destinationKey !== destinationKey) return;
    if (routeFitDestinationRef.current === destinationKey) return;
    fitBoundsForCurrentDelivery(route.points);
    routeFitDestinationRef.current = destinationKey;
  }, [destinationKey, fitBoundsForCurrentDelivery, route]);

  useEffect(
    () => () => {
      routeRequestControllerRef.current?.abort();
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      retryRef.current = null;
    },
    [retryRef]
  );

  const activeRoute = route?.destinationKey === destinationKey ? route : null;

  return (
    <>
      {courier && (
        <Marker position={toLatLng(courier)} icon={courierIcon} title="Courier">
          <Tooltip permanent direction="top">Courier</Tooltip>
        </Marker>
      )}
      {pickup && (
        <Marker
          position={toLatLng(pickup)}
          icon={pickupIcon}
          title={STATUS_AFTER_PICKUP.has(tracking.delivery.status) ? "Pickup complete" : "Pickup"}
        >
          <Tooltip permanent direction="top">
            {STATUS_AFTER_PICKUP.has(tracking.delivery.status) ? "Pickup complete" : "Pickup"}
          </Tooltip>
        </Marker>
      )}
      {dropoff && (
        <Marker position={toLatLng(dropoff)} icon={dropoffIcon} title="Drop-off">
          <Tooltip permanent direction="top">Drop-off</Tooltip>
        </Marker>
      )}
      {activeRoute && (
        <Polyline
          positions={activeRoute.points.map(toLatLng)}
          pathOptions={{
            color: activeRoute.source === "mock" ? "#b45309" : "#064e3b",
            weight: 5,
            opacity: 0.85,
            dashArray: activeRoute.source === "mock" ? "8 8" : undefined,
          }}
        />
      )}
    </>
  );
}

export function DeliveryMapPanel({ tracking, onRoutePath }: DeliveryMapPanelProps) {
  const status = tracking.delivery.status;
  const courier = useMemo(
    () =>
      tracking.courier_location
        ? { lat: tracking.courier_location.lat, lng: tracking.courier_location.lng }
        : null,
    [tracking.courier_location]
  );
  const pickup = useMemo(
    () =>
      tracking.delivery.pickup_lat !== null && tracking.delivery.pickup_lng !== null
        ? { lat: tracking.delivery.pickup_lat, lng: tracking.delivery.pickup_lng }
        : null,
    [tracking.delivery.pickup_lat, tracking.delivery.pickup_lng]
  );
  const dropoff = useMemo(
    () =>
      tracking.delivery.dropoff_lat !== null && tracking.delivery.dropoff_lng !== null
        ? { lat: tracking.delivery.dropoff_lat, lng: tracking.delivery.dropoff_lng }
        : null,
    [tracking.delivery.dropoff_lat, tracking.delivery.dropoff_lng]
  );
  const destination = useMemo(
    () =>
      status === "pending"
        ? pickup
        : ["picked_up", "in_transit", "out_for_delivery"].includes(status)
          ? dropoff
          : null,
    [dropoff, pickup, status]
  );
  const destinationKey = destination
    ? `${status === "pending" ? "pickup" : "dropoff"}:${destination.lat}:${destination.lng}`
    : status;
  const center = courier ?? pickup ?? dropoff ?? { lat: 6.9271, lng: 79.8612 };
  const [routingState, setRoutingState] = useState<RoutingState>(EMPTY_ROUTING_STATE);
  const retryRef = useRef<(() => void) | null>(null);
  const terminal = status === "delivered" || status === "cancelled";
  const actionLabel = terminal
    ? status === "delivered"
      ? "Delivery completed"
      : "Delivery cancelled"
    : tracking.next_action;
  const activeRoute =
    routingState.route?.destinationKey === destinationKey
      ? routingState.route
      : null;

  return (
    <Card className="min-w-0 overflow-hidden p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">Route & courier location</h3>
        <Badge
          variant={tracking.location_source === "simulated" ? "secondary" : "outline"}
          className={
            tracking.location_source === "simulated"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : tracking.location_source === "live"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : ""
          }
        >
          {tracking.location_source === "simulated"
            ? "Simulated GPS"
            : tracking.location_source === "live"
              ? "Live GPS"
              : "Waiting for GPS"}
        </Badge>
      </div>

      <div
        role="application"
        aria-label="Delivery map showing courier, pickup, and drop-off"
        className="h-72 w-full min-w-0 overflow-hidden rounded-lg bg-muted md:h-96"
      >
        <MapContainer
          center={toLatLng(center)}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
            maxZoom={19}
          />
          <RoutingMapContents
            tracking={tracking}
            courier={courier}
            pickup={pickup}
            dropoff={dropoff}
            destination={destination}
            destinationKey={destinationKey}
            onRoutePath={onRoutePath}
            onRoutingState={setRoutingState}
            retryRef={retryRef}
          />
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Legend label="Courier" color="bg-blue-700" />
        <Legend
          label={STATUS_AFTER_PICKUP.has(status) ? "Pickup complete" : "Pickup"}
          color={STATUS_AFTER_PICKUP.has(status) ? "bg-green-700" : "bg-teal-700"}
        />
        <Legend label="Drop-off" color="bg-green-700" />
      </div>

      <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
        <AddressRow icon={<Navigation />} label="Courier" address="Current location" point={courier} />
        <AddressRow
          icon={<MapPin />}
          label="Pickup"
          address={tracking.delivery.pickup_address}
          point={pickup}
          complete={STATUS_AFTER_PICKUP.has(status)}
        />
        <AddressRow
          icon={<PackageCheck />}
          label="Drop-off"
          address={tracking.delivery.dropoff_address}
          point={dropoff}
          complete={status === "delivered"}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div>
          <p className="text-sm font-medium text-foreground">{actionLabel}</p>
          {activeRoute?.source === "osrm" && (
            <p className="text-xs text-muted-foreground">
              Shortest-distance route: {(activeRoute.distanceMeters! / 1000).toFixed(1)} km ·{" "}
              {Math.max(1, Math.round(activeRoute.durationSeconds! / 60))} min. Shortest distance
              may not be the fastest in traffic.
            </p>
          )}
          {activeRoute?.source === "mock" && (
            <p className="text-xs text-amber-800">Mock route · OSRM is currently unavailable.</p>
          )}
          {!terminal && routingState.loading && (
            <p className="text-xs text-muted-foreground">Finding route…</p>
          )}
        </div>
        {routingState.failed && !terminal && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-destructive">Route unavailable.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => retryRef.current?.()}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function AddressRow({
  icon,
  label,
  address,
  point,
  complete = false,
}: {
  icon: ReactElement<{ className?: string }>;
  label: string;
  address: string;
  point: Point | null;
  complete?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 text-sm">
      {cloneElement(icon, {
        className: `mt-0.5 size-4 shrink-0 ${complete ? "text-green-700" : "text-muted-foreground"}`,
      })}
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {label} {complete && <span className="text-green-700">(Complete)</span>}
        </p>
        <p className="break-words text-muted-foreground">{address}</p>
        <p className="font-mono text-xs text-muted-foreground">{formatCoordinates(point)}</p>
      </div>
    </div>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}
