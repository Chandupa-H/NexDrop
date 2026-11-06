import type {
  MerchantOrder,
  MerchantKpis,
  ApiCredentials,
  WebhookConfig,
  WebhookDeliveryLog,
} from "../types";

export const INITIAL_ORDERS: MerchantOrder[] = [
  {
    id: "ord-101",
    trackingNumber: "ND-LK-890214",
    recipientName: "Kasun Fernando",
    recipientPhone: "+94 77 123 4567",
    deliveryAddress: "No. 45/2, Galle Road, Bambalapitiya",
    deliveryCity: "Colombo 04",
    status: "delivered",
    weightKg: 1.2,
    dimensions: "20x15x8 cm",
    codAmount: 4200,
    isPrepaid: false,
    estimatedDelivery: "Delivered on Nov 5, 2:30 PM",
    createdAt: "2026-11-04T09:15:00Z",
    specialInstructions: "Call before arrival, fragile ceramic items",
    courierName: "Dinesh Weerasinghe",
    courierPhone: "+94 71 889 0123",
  },
  {
    id: "ord-102",
    trackingNumber: "ND-LK-890215",
    recipientName: "Dilani Jayawardena",
    recipientPhone: "+94 71 987 6543",
    deliveryAddress: "12 Peradeniya Road",
    deliveryCity: "Kandy",
    status: "out_for_delivery",
    weightKg: 2.5,
    dimensions: "30x25x15 cm",
    codAmount: 8500,
    isPrepaid: false,
    estimatedDelivery: "Today by 5:00 PM",
    createdAt: "2026-11-05T08:00:00Z",
    specialInstructions: "Leave at front desk if unavailable",
    courierName: "Pradeep Bandara",
    courierPhone: "+94 77 445 6789",
  },
  {
    id: "ord-103",
    trackingNumber: "ND-LK-890216",
    recipientName: "Mohan Rathnayake",
    recipientPhone: "+94 76 345 6789",
    deliveryAddress: "78 Matara Road",
    deliveryCity: "Galle",
    status: "in_transit",
    weightKg: 0.8,
    dimensions: "15x10x5 cm",
    codAmount: 0,
    isPrepaid: true,
    estimatedDelivery: "Tomorrow by 2:00 PM",
    createdAt: "2026-11-05T14:20:00Z",
    specialInstructions: "Handle with care",
    courierName: "Saman Kumara",
    courierPhone: "+94 70 234 5678",
  },
  {
    id: "ord-104",
    trackingNumber: "ND-LK-890217",
    recipientName: "Anura Senanayake",
    recipientPhone: "+94 77 890 1234",
    deliveryAddress: "105 Colombo Road",
    deliveryCity: "Negombo",
    status: "in_transit",
    weightKg: 3.1,
    dimensions: "35x30x20 cm",
    codAmount: 12000,
    isPrepaid: false,
    estimatedDelivery: "Tomorrow by 6:00 PM",
    createdAt: "2026-11-05T16:45:00Z",
    specialInstructions: "Confirm gate code #401",
  },
  {
    id: "ord-105",
    trackingNumber: "ND-LK-890218",
    recipientName: "Sanduni Silva",
    recipientPhone: "+94 72 456 7890",
    deliveryAddress: "24 Kandy Road",
    deliveryCity: "Kurunegala",
    status: "created",
    weightKg: 1.0,
    dimensions: "20x15x10 cm",
    codAmount: 3100,
    isPrepaid: false,
    estimatedDelivery: "Pending Dispatch",
    createdAt: "2026-11-06T10:10:00Z",
    specialInstructions: "Standard e-commerce apparel pack",
  },
  {
    id: "ord-106",
    trackingNumber: "ND-LK-890219",
    recipientName: "Nuwan Wickramasinghe",
    recipientPhone: "+94 78 567 8901",
    deliveryAddress: "14 Main Street",
    deliveryCity: "Batticaloa",
    status: "failed",
    weightKg: 1.5,
    dimensions: "25x20x10 cm",
    codAmount: 5500,
    isPrepaid: false,
    estimatedDelivery: "Delivery Attempted",
    createdAt: "2026-11-03T11:00:00Z",
    failureReason: "Customer unreachable after 3 delivery attempts; rescheduling required.",
    specialInstructions: "Reattempt scheduled for Monday",
  },
];

export function calculateMerchantKpis(orders: MerchantOrder[]): MerchantKpis {
  const totalOrders = orders.length;
  const inTransit = orders.filter((o) => o.status === "in_transit").length;
  const outForDelivery = orders.filter((o) => o.status === "out_for_delivery").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const failed = orders.filter((o) => o.status === "failed").length;

  const pendingCod = orders
    .filter((o) => o.status !== "failed" && !o.isPrepaid)
    .reduce((sum, o) => sum + o.codAmount, 0);

  const completed = delivered + failed;
  const successRate = completed > 0 ? Math.round((delivered / completed) * 100) : 100;

  return {
    totalOrders,
    inTransit,
    outForDelivery,
    delivered,
    failed,
    pendingCod,
    successRate,
  };
}

export const MOCK_API_CREDENTIALS: ApiCredentials = {
  merchantId: "MER-000492",
  businessName: "Ceylon Artisan Crafts Ltd",
  liveKey: "nd_live_9b4e7a2c1f8849da0367de51b8c2e90471f5a892b",
  testKey: "nd_test_4f1b8c9d2a0e4375a891de63b7c1f8029a5c4e10d",
  clientId: "nexdrop_app_ceyloncrafts_prod",
  clientSecret: "sec_a89d42f701bc93ef7654a10d984c3e21",
  rateLimitPerDay: 10000,
  usedToday: 148,
};

export const MOCK_WEBHOOK_CONFIG: WebhookConfig = {
  targetUrl: "https://ceyloncrafts.lk/api/webhooks/nexdrop",
  secretKey: "whsec_98f42d1e07b8a53c469f1a2e7d80b4c9",
  isActive: true,
  subscribedEvents: [
    "order.created",
    "order.picked_up",
    "order.in_transit",
    "order.out_for_delivery",
    "order.delivered",
    "order.failed",
  ],
};

export const MOCK_WEBHOOK_LOGS: WebhookDeliveryLog[] = [
  {
    id: "wh-log-001",
    event: "order.delivered",
    trackingNumber: "ND-LK-890214",
    status: 200,
    statusText: "OK",
    timestamp: "2026-11-05 14:30:12",
    durationMs: 74,
    payloadSummary: '{"status":"delivered","courier":"Dinesh W.","cod_collected":4200}',
  },
  {
    id: "wh-log-002",
    event: "order.out_for_delivery",
    trackingNumber: "ND-LK-890215",
    status: 200,
    statusText: "OK",
    timestamp: "2026-11-05 08:35:41",
    durationMs: 82,
    payloadSummary: '{"status":"out_for_delivery","assigned_to":"Pradeep Bandara"}',
  },
  {
    id: "wh-log-003",
    event: "order.failed",
    trackingNumber: "ND-LK-890219",
    status: 200,
    statusText: "OK",
    timestamp: "2026-11-03 17:10:04",
    durationMs: 65,
    payloadSummary: '{"status":"failed","reason":"Customer unreachable"}',
  },
  {
    id: "wh-log-004",
    event: "order.created",
    trackingNumber: "ND-LK-890218",
    status: 200,
    statusText: "OK",
    timestamp: "2026-11-06 10:10:15",
    durationMs: 59,
    payloadSummary: '{"status":"created","tracking":"ND-LK-890218","fee":450}',
  },
];

