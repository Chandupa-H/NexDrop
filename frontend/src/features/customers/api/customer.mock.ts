import type {
  CustomerMeDTO,
  CustomerDashboardSummaryDTO,
  CustomerParcelListDTO,
  CustomerParcelDetailDTO,
} from "./customer.dto";

export const MOCK_CUSTOMER_ME: CustomerMeDTO = {
  id: 1,
  full_name: "Dihini Kankanamage",
  email: "dihini.kankanamage@gmail.com",
  phone: "+94771234567",
  role: "customer",
  default_address: "45/2 Temple Road",
  city: "Colombo 07",
  postal_code: "00700",
};

export const MOCK_CUSTOMER_PARCELS: CustomerParcelDetailDTO[] = [
  {
    tracking_id: "NXD-CUS-101",
    recipient_name: "Kasun Perera",
    recipient_phone_masked: "+94 77 ••• ••89",
    sender_name: "Dihini Kankanamage",
    delivery_address: "12 Peradeniya Road",
    delivery_city: "Kandy",
    pickup_address: "45/2 Temple Road",
    pickup_city: "Colombo 07",
    status: "delivered",
    created_at: "2026-11-06T09:30:00Z",
    eta: "2026-11-08T16:00:00Z",
    fee: 650,
    weight_kg: 1.5,
    dimensions: "25x20x10 cm",
    special_instructions: "Handle with care - fragile electronics",
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-11-06T09:30:00Z",
        location: "Colombo Portal",
      },
      {
        status: "picked_up",
        label: "Picked Up by Courier",
        occurred_at: "2026-11-06T14:15:00Z",
        location: "Colombo 07",
      },
      {
        status: "in_transit",
        label: "Sorted at Central Hub",
        occurred_at: "2026-11-07T03:40:00Z",
        location: "Peliyagoda Hub",
      },
      {
        status: "out_for_delivery",
        label: "Out for Delivery",
        occurred_at: "2026-11-08T08:20:00Z",
        location: "Kandy Dispatch Station",
      },
      {
        status: "delivered",
        label: "Delivered & Signed",
        occurred_at: "2026-11-08T15:45:00Z",
        location: "Kandy Recipient Address",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-102",
    recipient_name: "Nimali Silva",
    recipient_phone_masked: "+94 71 ••• ••42",
    sender_name: "Dihini Kankanamage",
    delivery_address: "88 Galle Road",
    delivery_city: "Galle",
    pickup_address: "45/2 Temple Road",
    pickup_city: "Colombo 07",
    status: "in_transit",
    created_at: "2026-11-08T11:00:00Z",
    eta: "2026-11-10T14:00:00Z",
    fee: 550,
    weight_kg: 0.8,
    dimensions: "20x15x5 cm",
    special_instructions: "Deliver between 9 AM and 5 PM",
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-11-08T11:00:00Z",
        location: "Colombo Portal",
      },
      {
        status: "picked_up",
        label: "Collected from Sender",
        occurred_at: "2026-11-08T16:30:00Z",
        location: "Colombo 07",
      },
      {
        status: "in_transit",
        label: "Arrived at Southern Hub",
        occurred_at: "2026-11-09T05:10:00Z",
        location: "Galle Hub",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-103",
    recipient_name: "Sunil Jayawardena",
    recipient_phone_masked: "+94 76 ••• ••11",
    sender_name: "Dihini Kankanamage",
    delivery_address: "24 Main Street",
    delivery_city: "Negombo",
    pickup_address: "45/2 Temple Road",
    pickup_city: "Colombo 07",
    status: "pending",
    created_at: "2026-11-09T08:15:00Z",
    eta: "2026-11-11T12:00:00Z",
    fee: 420,
    weight_kg: 2.2,
    dimensions: "30x20x15 cm",
    special_instructions: null,
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-11-09T08:15:00Z",
        location: "Colombo Portal",
      },
    ],
  },
];

export function getMockDashboardSummary(): CustomerDashboardSummaryDTO {
  const activeStatuses = new Set(["picked_up", "in_transit", "out_for_delivery"]);
  const activeDeliveries = MOCK_CUSTOMER_PARCELS.filter((p) =>
    activeStatuses.has(p.status)
  ).length;
  const delivered = MOCK_CUSTOMER_PARCELS.filter(
    (p) => p.status === "delivered"
  ).length;
  const pending = MOCK_CUSTOMER_PARCELS.filter(
    (p) => p.status === "pending"
  ).length;
  const cancelled = MOCK_CUSTOMER_PARCELS.filter(
    (p) => p.status === "cancelled"
  ).length;
  const totalOrders = MOCK_CUSTOMER_PARCELS.length;

  const now = new Date();
  const weeklyOrders = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const orders = MOCK_CUSTOMER_PARCELS.filter((p) =>
      p.created_at.startsWith(dateStr)
    ).length;
    weeklyOrders.push({ date: dateStr, orders });
  }

  return {
    totals: {
      total_orders: totalOrders,
      active_deliveries: activeDeliveries,
      delivered,
      pending,
      cancelled,
    },
    kpis: [
      { key: "active_deliveries", value: activeDeliveries, delta_pct: 0 },
      { key: "delivered", value: delivered, delta_pct: 0 },
      { key: "pending", value: pending, delta_pct: 0 },
      { key: "total_orders", value: totalOrders, delta_pct: 0 },
    ],
    weekly_orders: weeklyOrders,
  };
}

export function filterMockParcels(
  status?: string,
  limit = 50,
  offset = 0
): CustomerParcelListDTO {
  let list = MOCK_CUSTOMER_PARCELS;
  if (status && status !== "all") {
    const allowed = status.split(",").map((s) => s.trim());
    if (allowed.includes("active")) {
      const activeGroup = new Set(["picked_up", "in_transit", "out_for_delivery"]);
      list = list.filter((p) => activeGroup.has(p.status));
    } else {
      list = list.filter((p) => allowed.includes(p.status));
    }
  }

  const items = list.slice(offset, offset + limit).map((p) => ({
    tracking_id: p.tracking_id,
    recipient_name: p.recipient_name,
    destination: p.delivery_city,
    status: p.status,
    created_at: p.created_at,
    estimated_fee: p.fee,
    weight_kg: p.weight_kg,
    eta: p.eta,
  }));

  return {
    items,
    total: list.length,
  };
}

export function getMockCustomerParcelDetail(
  trackingId: string
): CustomerParcelDetailDTO {
  const parcel = MOCK_CUSTOMER_PARCELS.find((p) => p.tracking_id === trackingId);
  if (!parcel) {
    throw new Error(`Parcel ${trackingId} not found`);
  }
  return parcel;
}

export function cancelMockCustomerParcel(
  trackingId: string,
  reason?: string
): CustomerParcelDetailDTO {
  const parcel = MOCK_CUSTOMER_PARCELS.find((p) => p.tracking_id === trackingId);
  if (!parcel) {
    throw new Error(`Parcel ${trackingId} not found`);
  }
  parcel.status = "cancelled";
  parcel.timeline.push({
    status: "cancelled",
    label: "Cancelled by Customer",
    occurred_at: new Date().toISOString(),
    location: "Online Portal",
  });
  if (reason) {
    parcel.notes.push(`Cancellation reason: ${reason}`);
  }
  return parcel;
}

export function createMockCustomerParcel(
  payload: {
    recipient_name: string;
    recipient_phone: string;
    delivery_address: string;
    delivery_city: string;
    pickup_address?: string;
    pickup_city?: string;
    weight_kg: number;
    dimensions?: string;
    special_instructions?: string;
    fee?: number;
  }
): CustomerParcelDetailDTO {
  const trackingId = `NXD-CUS-${100 + MOCK_CUSTOMER_PARCELS.length + 1}`;
  const now = new Date().toISOString();
  const parcel: CustomerParcelDetailDTO = {
    tracking_id: trackingId,
    recipient_name: payload.recipient_name,
    recipient_phone_masked:
      payload.recipient_phone.length > 7
        ? payload.recipient_phone.slice(0, 7) + " *** " + payload.recipient_phone.slice(-4)
        : payload.recipient_phone,
    sender_name: MOCK_CUSTOMER_ME.full_name,
    delivery_address: payload.delivery_address,
    delivery_city: payload.delivery_city,
    pickup_address: payload.pickup_address || MOCK_CUSTOMER_ME.default_address,
    pickup_city: payload.pickup_city || MOCK_CUSTOMER_ME.city,
    status: "pending",
    created_at: now,
    eta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    fee: payload.fee || 350.0,
    weight_kg: payload.weight_kg,
    dimensions: payload.dimensions || "20 x 15 x 10 cm",
    special_instructions: payload.special_instructions || null,
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: now,
        location: "Online Portal",
      },
    ],
  };
  MOCK_CUSTOMER_PARCELS.unshift(parcel);
  return parcel;
}

