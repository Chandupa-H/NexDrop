import { ApiError } from "@/lib/api-client";
import type {
  CourierLocationDTO,
  CourierLocationUpdateDTO,
  CourierLocationUpdateResponseDTO,
  DeliveryDetailDTO,
  DeliveryHistoryParams,
  DeliveryHistoryResponseDTO,
  DeliveryHistoryItemDTO,
  DeliveryListItemDTO,
  DeliveryStatusUpdateDTO,
  DeliveryTrackingDTO,
  StatusHistoryEntryDTO,
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

type HistoricalDelivery = DeliveryHistoryItemDTO & {
  courier_id: number;
  recipient_phone: string;
  size: string;
  weight: number;
  assigned_at: string;
  status_history: StatusHistoryEntryDTO[];
};

const historicalDeliveries: HistoricalDelivery[] = [
  {
    parcel_id: 2001,
    tracking_number: "ND-2026-H001",
    status: "delivered",
    pickup_address: "No. 14, Park Road, Colombo 05",
    dropoff_address: "No. 7, Flower Road, Colombo 07",
    recipient_name: "Dilani Perera",
    recipient_phone: "0773456789",
    size: "Small",
    weight: 1.4,
    assigned_at: "2026-11-05T08:10:00+05:30",
    completed_at: "2026-11-05T10:42:00+05:30",
    failure_reason: null,
    courier_id: 42,
    status_history: deliveredHistory(
      "2026-11-05T08:10:00+05:30",
      "2026-11-05T10:42:00+05:30",
      "POD-ND-2026-H001"
    ),
  },
  {
    parcel_id: 2002,
    tracking_number: "ND-2026-H002",
    status: "cancelled",
    pickup_address: "No. 23, High Level Road, Nugegoda",
    dropoff_address: "No. 5, Pagoda Road, Nugegoda",
    recipient_name: "Ruwan Jayasinghe",
    recipient_phone: "0714567890",
    size: "Medium",
    weight: 2.8,
    assigned_at: "2026-11-04T09:00:00+05:30",
    completed_at: "2026-11-04T11:25:00+05:30",
    failure_reason: "Recipient unavailable at the delivery address.",
    courier_id: 42,
    status_history: cancelledHistory(
      "2026-11-04T09:00:00+05:30",
      "2026-11-04T11:25:00+05:30",
      "Recipient unavailable at the delivery address."
    ),
  },
  {
    parcel_id: 2003,
    tracking_number: "ND-2026-H003",
    status: "delivered",
    pickup_address: "No. 81, Galle Road, Dehiwala",
    dropoff_address: "No. 10, Station Road, Mount Lavinia",
    recipient_name: "Tharindu Silva",
    recipient_phone: "0755678901",
    size: "Large",
    weight: 4.6,
    assigned_at: "2026-11-02T07:45:00+05:30",
    completed_at: "2026-11-02T09:18:00+05:30",
    failure_reason: null,
    courier_id: 42,
    status_history: deliveredHistory(
      "2026-11-02T07:45:00+05:30",
      "2026-11-02T09:18:00+05:30",
      "POD-ND-2026-H003"
    ),
  },
  {
    parcel_id: 2004,
    tracking_number: "ND-2026-H004",
    status: "cancelled",
    pickup_address: "No. 55, Baseline Road, Colombo 09",
    dropoff_address: "No. 12, Kotte Road, Sri Jayawardenepura Kotte",
    recipient_name: "Nadeesha Fernando",
    recipient_phone: "0766789012",
    size: "Small",
    weight: 0.9,
    assigned_at: "2026-10-30T08:20:00+05:30",
    completed_at: "2026-10-30T10:11:00+05:30",
    failure_reason: "Delivery address could not be located.",
    courier_id: 42,
    status_history: cancelledHistory(
      "2026-10-30T08:20:00+05:30",
      "2026-10-30T10:11:00+05:30",
      "Delivery address could not be located."
    ),
  },
  {
    parcel_id: 2005,
    tracking_number: "ND-2026-H005",
    status: "delivered",
    pickup_address: "No. 9, Marine Drive, Colombo 04",
    dropoff_address: "No. 38, Waidya Road, Dehiwala",
    recipient_name: "Sajith Kumara",
    recipient_phone: "0707890123",
    size: "Medium",
    weight: 2,
    assigned_at: "2026-10-27T10:00:00+05:30",
    completed_at: "2026-10-27T12:05:00+05:30",
    failure_reason: null,
    courier_id: 42,
    status_history: deliveredHistory(
      "2026-10-27T10:00:00+05:30",
      "2026-10-27T12:05:00+05:30",
      "POD-ND-2026-H005"
    ),
  },
  {
    parcel_id: 2006,
    tracking_number: "ND-2026-H006",
    status: "cancelled",
    pickup_address: "No. 4, Narahenpita Road, Colombo 05",
    dropoff_address: "No. 19, Dutugemunu Street, Kohuwala",
    recipient_name: "Ishara Wickramasinghe",
    recipient_phone: "0788901234",
    size: "Small",
    weight: 1.1,
    assigned_at: "2026-10-22T13:15:00+05:30",
    completed_at: "2026-10-22T15:40:00+05:30",
    failure_reason: "Recipient refused to accept the parcel.",
    courier_id: 42,
    status_history: cancelledHistory(
      "2026-10-22T13:15:00+05:30",
      "2026-10-22T15:40:00+05:30",
      "Recipient refused to accept the parcel."
    ),
  },
  {
    parcel_id: 2007,
    tracking_number: "ND-2026-H007",
    status: "delivered",
    pickup_address: "No. 101, Kandy Road, Kiribathgoda",
    dropoff_address: "No. 21, Colombo Road, Kelaniya",
    recipient_name: "Malith Bandara",
    recipient_phone: "0729012345",
    size: "Medium",
    weight: 3.2,
    assigned_at: "2026-10-15T07:30:00+05:30",
    completed_at: "2026-10-15T09:02:00+05:30",
    failure_reason: null,
    courier_id: 42,
    status_history: deliveredHistory(
      "2026-10-15T07:30:00+05:30",
      "2026-10-15T09:02:00+05:30",
      "POD-ND-2026-H007"
    ),
  },
  {
    parcel_id: 2008,
    tracking_number: "ND-2026-H008",
    status: "delivered",
    pickup_address: "No. 32, Galle Road, Wellawatte",
    dropoff_address: "No. 6, Templers Road, Mount Lavinia",
    recipient_name: "Shalini de Alwis",
    recipient_phone: "0740123456",
    size: "Large",
    weight: 5.3,
    assigned_at: "2026-10-08T11:20:00+05:30",
    completed_at: "2026-10-08T13:44:00+05:30",
    failure_reason: null,
    courier_id: 42,
    status_history: deliveredHistory(
      "2026-10-08T11:20:00+05:30",
      "2026-10-08T13:44:00+05:30",
      "POD-ND-2026-H008"
    ),
  },
  {
    parcel_id: 2999,
    tracking_number: "ND-2026-OTHER",
    status: "delivered",
    pickup_address: "No. 3, Main Street, Colombo 11",
    dropoff_address: "No. 17, Ward Place, Colombo 07",
    recipient_name: "Other Courier Customer",
    recipient_phone: "0770000000",
    size: "Small",
    weight: 1,
    assigned_at: "2026-11-01T10:00:00+05:30",
    completed_at: "2026-11-01T12:00:00+05:30",
    failure_reason: null,
    courier_id: 77,
    status_history: deliveredHistory(
      "2026-11-01T10:00:00+05:30",
      "2026-11-01T12:00:00+05:30",
      "POD-ND-2026-OTHER"
    ),
  },
];

function deliveredHistory(
  assignedAt: string,
  completedAt: string,
  proofReference: string
): StatusHistoryEntryDTO[] {
  const start = new Date(assignedAt).getTime();
  const end = new Date(completedAt).getTime();
  return [
    { status: "pending", timestamp: assignedAt, note: "Delivery assigned.", proof_reference: null, actor: "System" },
    { status: "picked_up", timestamp: new Date(start + (end - start) * 0.25).toISOString(), note: "Parcel collected.", proof_reference: null, actor: "Courier" },
    { status: "in_transit", timestamp: new Date(start + (end - start) * 0.5).toISOString(), note: "On the way to recipient.", proof_reference: null, actor: "Courier" },
    { status: "out_for_delivery", timestamp: new Date(start + (end - start) * 0.75).toISOString(), note: "Arrived in delivery area.", proof_reference: null, actor: "Courier" },
    { status: "delivered", timestamp: completedAt, note: "Parcel handed to recipient.", proof_reference: proofReference, actor: "Courier" },
  ];
}

function cancelledHistory(
  assignedAt: string,
  completedAt: string,
  failureReason: string
): StatusHistoryEntryDTO[] {
  const start = new Date(assignedAt).getTime();
  const end = new Date(completedAt).getTime();
  return [
    { status: "pending", timestamp: assignedAt, note: "Delivery assigned.", proof_reference: null, actor: "System" },
    { status: "picked_up", timestamp: new Date(start + (end - start) * 0.4).toISOString(), note: "Parcel collected.", proof_reference: null, actor: "Courier" },
    { status: "cancelled", timestamp: completedAt, note: failureReason, proof_reference: null, actor: "Courier" },
  ];
}

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

function detailFromHistory(delivery: HistoricalDelivery): DeliveryDetailDTO {
  return {
    parcel_id: delivery.parcel_id,
    tracking_number: delivery.tracking_number,
    status: delivery.status,
    pickup_address: delivery.pickup_address,
    dropoff_address: delivery.dropoff_address,
    size: delivery.size,
    weight: delivery.weight,
    recipient_name: delivery.recipient_name,
    recipient_phone: delivery.recipient_phone,
    assigned_at: delivery.assigned_at,
    pickup_lat: null,
    pickup_lng: null,
    dropoff_lat: null,
    dropoff_lng: null,
    delivery_instructions: null,
    completed_at: delivery.completed_at,
    failure_reason: delivery.failure_reason,
    status_history: delivery.status_history,
  };
}

export function getMockDeliveryDetail(deliveryId: number): DeliveryDetailDTO {
  const activeDelivery = deliveries.find((item) => item.parcel_id === deliveryId);
  if (activeDelivery) {
    return {
      ...asDelivery(activeDelivery),
      completed_at:
        activeDelivery.status === "delivered" ? activeDelivery.assigned_at : null,
      failure_reason: null,
      status_history: [],
    };
  }
  const historical = historicalDeliveries.find(
    (item) => item.parcel_id === deliveryId
  );
  if (!historical) throw new ApiError(404, "Delivery not found.");
  if (historical.courier_id !== 42) throw new ApiError(403, "Access denied.");
  return detailFromHistory(historical);
}

function colomboDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function listMockDeliveryHistory(
  params: DeliveryHistoryParams = {}
): DeliveryHistoryResponseDTO {
  const { status, from, to, q, page = 1, page_size = 20 } = params;
  if (status && !["delivered", "cancelled"].includes(status)) {
    throw new ApiError(422, "History status must be delivered or cancelled.");
  }
  if (
    (from && Number.isNaN(Date.parse(`${from}T00:00:00+05:30`))) ||
    (to && Number.isNaN(Date.parse(`${to}T00:00:00+05:30`))) ||
    (from && to && from > to)
  ) {
    throw new ApiError(422, "History date range is invalid.");
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError(422, "Page must be a positive integer.");
  }
  if (!Number.isInteger(page_size) || page_size < 1 || page_size > 100) {
    throw new ApiError(422, "Page size must be between 1 and 100.");
  }
  if (q && q.length > 100) throw new ApiError(422, "Search is too long.");

  const normalizedQuery = q?.trim().toLocaleLowerCase();
  const filtered = historicalDeliveries
    .filter((delivery) => delivery.courier_id === 42)
    .filter((delivery) => !status || delivery.status === status)
    .filter((delivery) => {
      const completedDate = colomboDate(delivery.completed_at);
      return (!from || completedDate >= from) && (!to || completedDate <= to);
    })
    .filter(
      (delivery) =>
        !normalizedQuery ||
        delivery.tracking_number.toLocaleLowerCase().includes(normalizedQuery) ||
        delivery.recipient_name.toLocaleLowerCase().includes(normalizedQuery)
    )
    .sort(
      (a, b) =>
        Date.parse(b.completed_at) - Date.parse(a.completed_at) ||
        b.parcel_id - a.parcel_id
    );

  return {
    items: filtered
      .slice((page - 1) * page_size, page * page_size)
      .map(
        ({
          parcel_id,
          tracking_number,
          status: deliveryStatus,
          pickup_address,
          dropoff_address,
          recipient_name,
          completed_at,
          failure_reason,
        }) => ({
          parcel_id,
          tracking_number,
          status: deliveryStatus,
          pickup_address,
          dropoff_address,
          recipient_name,
          completed_at,
          failure_reason,
        })
      ),
    total: filtered.length,
    page,
    page_size,
    history_summary: {
      delivered: filtered.filter((delivery) => delivery.status === "delivered").length,
      cancelled: filtered.filter((delivery) => delivery.status === "cancelled").length,
      total: filtered.length,
    },
  };
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
