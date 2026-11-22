import type {
  MerchantOrder,
  MerchantKpis,
  ApiCredentials,
  WebhookConfig,
  WebhookDeliveryLog,
} from "../types";
import {
  isInTransitStatus,
  isTerminalFailureStatus,
} from "../utils/order-status";

export const INITIAL_ORDERS: MerchantOrder[] = [];

export function calculateMerchantKpis(orders: MerchantOrder[]): MerchantKpis {
  const totalOrders = orders.length;
  const inTransit = orders.filter((o) => isInTransitStatus(o.status)).length;
  const outForDelivery = orders.filter((o) => o.status === "out_for_delivery").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const failed = orders.filter((o) => isTerminalFailureStatus(o.status)).length;

  const pendingCod = orders
    .filter((o) => !isTerminalFailureStatus(o.status) && !o.isPrepaid)
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
  merchantId: "",
  businessName: "",
  liveKey: "",
  testKey: "",
  clientId: "",
  clientSecret: "",
  rateLimitPerDay: 10000,
  usedToday: 0,
};

export const MOCK_WEBHOOK_CONFIG: WebhookConfig = {
  targetUrl: "",
  secretKey: "",
  isActive: false,
  subscribedEvents: [],
};

export const MOCK_WEBHOOK_LOGS: WebhookDeliveryLog[] = [];
