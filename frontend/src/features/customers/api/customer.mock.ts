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
    recipient_name: "Nethmi Silva",
    recipient_phone_masked: "+94 771 *** 4522",
    sender_name: "Dihini Kankanamage",
    delivery_address: "56 Temple Street, Kandy",
    delivery_city: "Kandy",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "out_for_delivery",
    created_at: "2026-10-31T08:00:00+05:30",
    eta: "2026-10-31T14:30:00+05:30",
    fee: 650.0,
    weight_kg: 1.5,
    dimensions: "25 x 15 x 10 cm",
    special_instructions: "Please call before arriving.",
    notes: ["Assigned to courier Samantha Perera"],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-31T08:00:00+05:30",
        location: "Online Portal",
      },
      {
        status: "picked_up",
        label: "Picked Up",
        occurred_at: "2026-10-31T09:15:00+05:30",
        location: "Colombo 07 Hub",
      },
      {
        status: "in_transit",
        label: "In Transit to Kandy Hub",
        occurred_at: "2026-10-31T11:00:00+05:30",
        location: "Central Expressway",
      },
      {
        status: "out_for_delivery",
        label: "Out for Delivery",
        occurred_at: "2026-10-31T13:30:00+05:30",
        location: "Kandy City",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-102",
    recipient_name: "Amaya Jayasuriya",
    recipient_phone_masked: "+94 772 *** 5633",
    sender_name: "Dihini Kankanamage",
    delivery_address: "78 Hill Street, Kandy",
    delivery_city: "Kandy",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "in_transit",
    created_at: "2026-10-31T07:30:00+05:30",
    eta: "2026-10-31T16:00:00+05:30",
    fee: 520.0,
    weight_kg: 0.8,
    dimensions: "20 x 10 x 5 cm",
    special_instructions: "Fragile items inside.",
    notes: ["Dispatched from Colombo Sorting Facility"],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-31T07:30:00+05:30",
        location: "Online Portal",
      },
      {
        status: "picked_up",
        label: "Picked Up",
        occurred_at: "2026-10-31T08:45:00+05:30",
        location: "Colombo 07",
      },
      {
        status: "in_transit",
        label: "In Transit",
        occurred_at: "2026-10-31T10:15:00+05:30",
        location: "Kadawatha Interchange",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-103",
    recipient_name: "Sachini Ratnayake",
    recipient_phone_masked: "+94 773 *** 6744",
    sender_name: "Dihini Kankanamage",
    delivery_address: "34 Bambalapitiya, Colombo 04",
    delivery_city: "Colombo",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "picked_up",
    created_at: "2026-10-31T09:00:00+05:30",
    eta: "2026-10-31T15:00:00+05:30",
    fee: 380.0,
    weight_kg: 0.5,
    dimensions: "15 x 10 x 5 cm",
    special_instructions: "Leave at front desk with security.",
    notes: ["Courier assigned"],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-31T09:00:00+05:30",
        location: "Online Portal",
      },
      {
        status: "picked_up",
        label: "Picked Up from Sender",
        occurred_at: "2026-10-31T10:00:00+05:30",
        location: "Colombo 07",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-104",
    recipient_name: "Thilina Kumara",
    recipient_phone_masked: "+94 774 *** 7855",
    sender_name: "Dihini Kankanamage",
    delivery_address: "12 Main Road, Galle",
    delivery_city: "Galle",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "pending",
    created_at: "2026-10-31T09:45:00+05:30",
    eta: "2026-11-01T12:00:00+05:30",
    fee: 750.0,
    weight_kg: 2.2,
    dimensions: "30 x 20 x 15 cm",
    special_instructions: "Hand over to recipient only.",
    notes: ["Waiting for dispatch allocation"],
    timeline: [
      {
        status: "pending",
        label: "Delivery Request Received",
        occurred_at: "2026-10-31T09:45:00+05:30",
        location: "Online Portal",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-105",
    recipient_name: "Dilshan Fernando",
    recipient_phone_masked: "+94 773 *** 6743",
    sender_name: "Dihini Kankanamage",
    delivery_address: "67 Fort Road, Galle",
    delivery_city: "Galle",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "delivered",
    created_at: "2026-10-30T09:15:00+05:30",
    eta: null,
    fee: 820.0,
    weight_kg: 2.5,
    dimensions: "35 x 25 x 15 cm",
    special_instructions: null,
    notes: ["Delivered and signed by recipient"],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-30T09:15:00+05:30",
        location: "Online Portal",
      },
      {
        status: "picked_up",
        label: "Picked Up",
        occurred_at: "2026-10-30T10:30:00+05:30",
        location: "Colombo 07 Hub",
      },
      {
        status: "in_transit",
        label: "In Transit",
        occurred_at: "2026-10-30T13:00:00+05:30",
        location: "Southern Expressway",
      },
      {
        status: "out_for_delivery",
        label: "Out for Delivery",
        occurred_at: "2026-10-30T15:30:00+05:30",
        location: "Galle Fort",
      },
      {
        status: "delivered",
        label: "Delivered Successfully",
        occurred_at: "2026-10-30T16:45:00+05:30",
        location: "67 Fort Road, Galle",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-106",
    recipient_name: "Harini Jayawardena",
    recipient_phone_masked: "+94 774 *** 7854",
    sender_name: "Dihini Kankanamage",
    delivery_address: "89 Peradeniya Road, Kandy",
    delivery_city: "Kandy",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "delivered",
    created_at: "2026-10-29T11:00:00+05:30",
    eta: null,
    fee: 450.0,
    weight_kg: 1.0,
    dimensions: "20 x 15 x 8 cm",
    special_instructions: null,
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-29T11:00:00+05:30",
        location: "Online Portal",
      },
      {
        status: "delivered",
        label: "Delivered",
        occurred_at: "2026-10-29T18:00:00+05:30",
        location: "Kandy",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-107",
    recipient_name: "Anusha Perera",
    recipient_phone_masked: "+94 775 *** 8965",
    sender_name: "Dihini Kankanamage",
    delivery_address: "12 Duplication Road, Colombo 04",
    delivery_city: "Colombo",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "delivered",
    created_at: "2026-10-28T14:20:00+05:30",
    eta: null,
    fee: 350.0,
    weight_kg: 0.4,
    dimensions: "15 x 10 x 5 cm",
    special_instructions: null,
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-28T14:20:00+05:30",
        location: "Online Portal",
      },
      {
        status: "delivered",
        label: "Delivered",
        occurred_at: "2026-10-28T16:30:00+05:30",
        location: "Colombo 04",
      },
    ],
  },
  {
    tracking_id: "NXD-CUS-108",
    recipient_name: "Roshan Silva",
    recipient_phone_masked: "+94 776 *** 9076",
    sender_name: "Dihini Kankanamage",
    delivery_address: "34 Dalada Veediya, Kandy",
    delivery_city: "Kandy",
    pickup_address: "45/2 Temple Road, Colombo 07",
    pickup_city: "Colombo",
    status: "cancelled",
    created_at: "2026-10-27T10:00:00+05:30",
    eta: null,
    fee: 490.0,
    weight_kg: 1.1,
    dimensions: "20 x 15 x 10 cm",
    special_instructions: null,
    notes: ["Cancelled by customer: item no longer required."],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-10-27T10:00:00+05:30",
        location: "Online Portal",
      },
      {
        status: "cancelled",
        label: "Cancelled by Customer",
        occurred_at: "2026-10-27T10:35:00+05:30",
        location: "Online Portal",
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

  return {
    totals: {
      total_orders: totalOrders,
      active_deliveries: activeDeliveries,
      delivered,
      pending,
      cancelled,
    },
    kpis: [
      { key: "active_deliveries", value: activeDeliveries, delta_pct: 25 },
      { key: "delivered", value: delivered, delta_pct: 15 },
      { key: "pending", value: pending, delta_pct: -50 },
      { key: "total_orders", value: totalOrders, delta_pct: 14 },
    ],
    weekly_orders: [
      { date: "2026-10-25", orders: 1 },
      { date: "2026-10-26", orders: 2 },
      { date: "2026-10-27", orders: 1 },
      { date: "2026-10-28", orders: 1 },
      { date: "2026-10-29", orders: 1 },
      { date: "2026-10-30", orders: 1 },
      { date: "2026-10-31", orders: 4 },
    ],
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
