export type OrderStatus =
  | "created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";

export interface MerchantOrder {
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  status: OrderStatus;
  weightKg: number;
  dimensions?: string;
  codAmount: number; // 0 if prepaid
  isPrepaid: boolean;
  estimatedDelivery: string;
  createdAt: string;
  specialInstructions?: string;
  failureReason?: string;
  courierName?: string;
  courierPhone?: string;
}

export interface MerchantKpis {
  totalOrders: number;
  inTransit: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
  pendingCod: number;
  successRate: number;
}

export interface ApiCredentials {
  merchantId: string;
  businessName: string;
  liveKey: string;
  testKey: string;
  clientId: string;
  clientSecret: string;
  rateLimitPerDay: number;
  usedToday: number;
}

export interface WebhookConfig {
  targetUrl: string;
  secretKey: string;
  isActive: boolean;
  subscribedEvents: string[];
}

export interface WebhookDeliveryLog {
  id: string;
  event: string;
  trackingNumber: string;
  status: number;
  statusText: string;
  timestamp: string;
  durationMs: number;
  payloadSummary: string;
}

