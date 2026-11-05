import { ApiError } from "@/lib/api-client";
import type {
  CourierLocationDTO,
  CourierLocationUpdateDTO,
  CourierLocationUpdateResponseDTO,
  DeliveryListItemDTO,
  DeliveryStatusUpdateDTO,
  DeliveryTrackingDTO,
} from "./courier.dto";
import type { DeliveryStatus } from "../types";

type Point = { lat: number; lng: number };
type MockDelivery = DeliveryListItemDTO & {
  courier_start: Point;
  pending_route: string;
  delivery_route: string;
};

const deliveries: MockDelivery[] = [
  {
    parcel_id: 1001,
    tracking_number: "ND-2026-001",
    status: "pending",
    pickup_address: "No. 18, Galle Road, Colombo 03",
    pickup_lat: 6.9147,
    pickup_lng: 79.8521,
    dropoff_address: "No. 42, Nawala Road, Rajagiriya",
    dropoff_lat: 6.9094,
    dropoff_lng: 79.8933,
    size: "Medium",
    weight: 2.5,
    recipient_name: "Kasun Perera",
    recipient_phone: "0771234567",
    assigned_at: "2026-11-05T08:30:00+05:30",
    delivery_instructions: "Call on arrival; entrance is beside the pharmacy.",
    courier_start: { lat: 6.9344, lng: 79.8428 },
    pending_route: "_kii@ohifN~MgYf^oK~WgE~WfEzYkR",
    delivery_route: "{oei@sbkfNkMcj@cBwcAb[gw@nUkxA",
  },
  {
    parcel_id: 1002,
    tracking_number: "ND-2026-002",
    status: "picked_up",
    pickup_address: "No. 6, High Level Road, Nugegoda",
    pickup_lat: 6.8649,
    pickup_lng: 79.8997,
    dropoff_address: "No. 31, Dehiwala Road, Maharagama",
    dropoff_lat: 6.848,
    dropoff_lng: 79.9267,
    size: "Small",
    weight: 1.2,
    recipient_name: "Nimal Silva",
    recipient_phone: "0712345678",
    assigned_at: "2026-11-05T09:15:00+05:30",
    delivery_instructions: null,
    courier_start: { lat: 6.8655, lng: 79.901 },
    pending_route: "",
    delivery_route: "k|{h@gttfNzTg^~Wg^nKwj@~p@ku@",
  },
  {
    parcel_id: 1003,
    tracking_number: "ND-2026-003",
    status: "in_transit",
    pickup_address: "No. 115, Galle Road, Bambalapitiya",
    pickup_lat: 6.8896,
    pickup_lng: 79.8553,
    dropoff_address: "No. 27, Hill Street, Dehiwala",
    dropoff_lat: 6.8518,
    dropoff_lng: 79.865,
    size: "Large",
    weight: 5,
    recipient_name: "Amal Fernando",
    recipient_phone: "0759876543",
    assigned_at: "2026-11-05T10:00:00+05:30",
    delivery_instructions: "Please hand the parcel to the reception desk.",
    courier_start: { lat: 6.87, lng: 79.86 },
    pending_route: "",
    delivery_route: "ox|h@_tlfN~WcB~WcBf^gEn_@wQ",
  },
  {
    parcel_id: 1004,
    tracking_number: "ND-2026-004",
    status: "delivered",
    pickup_address: "No. 52, Galle Road, Wellawatte",
    pickup_lat: 6.8744,
    pickup_lng: 79.8603,
    dropoff_address: "No. 9, Station Road, Mount Lavinia",
    dropoff_lat: 6.8389,
    dropoff_lng: 79.8636,
    size: "Small",
    weight: 0.8,
    recipient_name: "Saman Kumara",
    recipient_phone: "0765554444",
    assigned_at: "2026-11-05T07:45:00+05:30",
    delivery_instructions: null,
    courier_start: { lat: 6.8389, lng: 79.8636 },
    pending_route: "",
    delivery_route: "",
  },
];

let latestLocation: CourierLocationDTO | null = null;

const transitions: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  pending: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};

export function decodeMockRoute(encoded: string): Point[] {
  const points: Point[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }
  return points;
}

function getDelivery(deliveryId: number): MockDelivery {
  const delivery = deliveries.find((item) => item.parcel_id === deliveryId);
  if (!delivery) throw new ApiError(404, "Delivery not found.");
  return delivery;
}

function asDelivery(delivery: MockDelivery): DeliveryListItemDTO {
  const { courier_start: _start, pending_route: _pickup, delivery_route: _dropoff, ...dto } =
    delivery;
  void _start;
  void _pickup;
  void _dropoff;
  return { ...dto };
}

export function listMockDeliveries(
  status?: DeliveryStatus | DeliveryStatus[]
): DeliveryListItemDTO[] {
  const statuses = status === undefined ? [] : Array.isArray(status) ? status : [status];
  return deliveries
    .filter((delivery) => statuses.length === 0 || statuses.includes(delivery.status))
    .map(asDelivery);
}

export function getMockDelivery(deliveryId: number): DeliveryListItemDTO {
  return asDelivery(getDelivery(deliveryId));
}

export function updateMockDeliveryStatus(
  deliveryId: number,
  status: DeliveryStatusUpdateDTO["status"]
): DeliveryListItemDTO {
  const delivery = getDelivery(deliveryId);
  if (!transitions[delivery.status]?.includes(status)) {
    throw new ApiError(
      409,
      `Invalid transition from '${delivery.status}' to '${status}'`
    );
  }
  delivery.status = status;
  if (status === "picked_up") {
    const previous =
      latestLocation?.active_delivery_id === deliveryId
        ? latestLocation
        : createStartLocation(delivery);
    latestLocation = {
      ...previous,
      active_delivery_id: deliveryId,
    };
  }
  return asDelivery(delivery);
}

function createStartLocation(delivery: MockDelivery): CourierLocationDTO {
  const point =
    delivery.status === "delivered"
      ? { lat: delivery.dropoff_lat ?? 6.8389, lng: delivery.dropoff_lng ?? 79.8636 }
      : delivery.courier_start;
  return {
    ...point,
    accuracy: 8,
    heading: null,
    speed: null,
    updated_at: new Date().toISOString(),
    active_delivery_id: delivery.parcel_id,
  };
}

export function getMockLocation(deliveryId: number): CourierLocationDTO {
  const delivery = getDelivery(deliveryId);
  if (latestLocation?.active_delivery_id === deliveryId) return { ...latestLocation };
  const initial = createStartLocation(delivery);
  latestLocation = initial;
  return { ...initial };
}

export function postMockLocation(
  payload: CourierLocationUpdateDTO
): CourierLocationUpdateResponseDTO {
  if (
    !Number.isFinite(payload.lat) ||
    payload.lat < -90 ||
    payload.lat > 90 ||
    !Number.isFinite(payload.lng) ||
    payload.lng < -180 ||
    payload.lng > 180 ||
    (payload.accuracy !== undefined &&
      (!Number.isFinite(payload.accuracy) || payload.accuracy < 0)) ||
    (payload.heading !== undefined &&
      (!Number.isFinite(payload.heading) ||
        payload.heading < 0 ||
        payload.heading > 360)) ||
    (payload.speed !== undefined &&
      (!Number.isFinite(payload.speed) || payload.speed < 0))
  ) {
    throw new ApiError(422, "Latitude or longitude is invalid.");
  }
  if (!payload.deliveryId) {
    throw new ApiError(409, "Location updates require an active delivery.");
  }
  const delivery = getDelivery(payload.deliveryId);
  if (!transitions[delivery.status] || delivery.status === "delivered") {
    throw new ApiError(409, "Location updates require an active delivery.");
  }
  const previous =
    latestLocation?.active_delivery_id === delivery.parcel_id
      ? latestLocation
      : getMockLocation(delivery.parcel_id);
  if (Date.now() - new Date(previous.updated_at).getTime() < 3000) {
    return { location: previous, accepted: false };
  }
  const location: CourierLocationDTO = {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy ?? null,
    heading: payload.heading ?? null,
    speed: payload.speed ?? null,
    updated_at: new Date().toISOString(),
    active_delivery_id: delivery.parcel_id,
  };
  latestLocation = location;
  return { location, accepted: true };
}

export function getLatestMockLocation(): CourierLocationDTO | null {
  return latestLocation ? { ...latestLocation } : null;
}

export function getMockTracking(deliveryId: number): DeliveryTrackingDTO {
  const delivery = getDelivery(deliveryId);
  const completed = delivery.status === "delivered";
  const cancelled = delivery.status === "cancelled";
  const terminal = completed || cancelled;
  const location = terminal ? null : getMockLocation(deliveryId);
  const pickupPending = delivery.status === "pending";
  const destination = terminal
    ? null
    : pickupPending
      ? {
          address: delivery.pickup_address,
          lat: delivery.pickup_lat,
          lng: delivery.pickup_lng,
        }
      : {
          address: delivery.dropoff_address,
          lat: delivery.dropoff_lat,
          lng: delivery.dropoff_lng,
        };
  const route = pickupPending
    ? decodeMockRoute(delivery.pending_route)
    : terminal
      ? []
      : decodeMockRoute(delivery.delivery_route);

  return {
    delivery: asDelivery(delivery),
    courier_location: location,
    location_source: terminal ? "unavailable" : "simulated",
    next_destination: destination,
    next_action: completed
      ? "Delivery completed"
      : cancelled
        ? "Delivery cancelled"
        : pickupPending
          ? "Navigate to pickup location"
          : "Navigate to delivery location",
    simulation_route: route,
  };
}
