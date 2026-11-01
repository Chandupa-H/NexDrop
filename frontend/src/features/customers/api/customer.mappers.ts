import {
  formatDateTime,
  getDateKeyInTimeZone,
  getWeekdayInTimeZone,
} from "@/lib/dashboard/format";
import type { DonutSegment } from "@/lib/dashboard/types";
import type {
  CustomerMeDTO,
  CustomerDashboardSummaryDTO,
  CustomerParcelListItemDTO,
  CustomerParcelDetailDTO,
  CustomerTimelineEventDTO,
} from "./customer.dto";
import type {
  CustomerProfile,
  CustomerDashboardSummary,
  CustomerDashboardKPI,
  CustomerWeeklyOrder,
  CustomerParcelListItem,
  CustomerParcelDetail,
  CustomerTimelineEvent,
  CustomerParcelStatus,
} from "../types";

export function mapCustomerProfile(dto: CustomerMeDTO): CustomerProfile {
  return {
    id: String(dto.id),
    fullName: dto.full_name,
    email: dto.email,
    phone: dto.phone,
    role: dto.role,
    defaultAddress: dto.default_address,
    city: dto.city,
    postalCode: dto.postal_code,
  };
}

const KPI_LABELS: Record<string, string> = {
  active_deliveries: "Active Shipments",
  delivered: "Delivered",
  pending: "Pending Requests",
  total_orders: "Total Orders",
};

const KPI_TONES: Record<string, "info" | "success" | "warning" | "neutral"> = {
  active_deliveries: "info",
  delivered: "success",
  pending: "warning",
  total_orders: "neutral",
};

export function mapCustomerDashboardSummary(
  dto: CustomerDashboardSummaryDTO,
  todayDate: string
): CustomerDashboardSummary {
  const kpis: CustomerDashboardKPI[] = dto.kpis.map((kpi) => ({
    key: kpi.key,
    label: KPI_LABELS[kpi.key] || kpi.key,
    value: kpi.value,
    deltaPct: kpi.delta_pct,
    tone: KPI_TONES[kpi.key] || "neutral",
  }));

  const weeklyOrders: CustomerWeeklyOrder[] = dto.weekly_orders.map((w) => {
    const dateKey = getDateKeyInTimeZone(w.date);
    const dayFull = getWeekdayInTimeZone(w.date);
    const isToday = dateKey === todayDate;

    return {
      date: w.date,
      dayLabel: isToday ? "Today" : dayFull.slice(0, 3),
      dayFull,
      orders: w.orders,
      isToday,
    };
  });

  return {
    totals: {
      totalOrders: dto.totals.total_orders,
      activeDeliveries: dto.totals.active_deliveries,
      delivered: dto.totals.delivered,
      pending: dto.totals.pending,
      cancelled: dto.totals.cancelled,
    },
    kpis,
    weeklyOrders,
  };
}

export function mapCustomerParcelListItem(
  dto: CustomerParcelListItemDTO
): CustomerParcelListItem {
  return {
    trackingId: dto.tracking_id,
    recipientName: dto.recipient_name,
    destination: dto.destination,
    status: dto.status as CustomerParcelStatus,
    createdAt: dto.created_at,
    createdAtDisplay: formatDateTime(dto.created_at),
    estimatedFee: dto.estimated_fee,
    weightKg: dto.weight_kg,
    eta: dto.eta,
  };
}

export function mapCustomerTimelineEvent(
  dto: CustomerTimelineEventDTO
): CustomerTimelineEvent {
  return {
    status: dto.status,
    label: dto.label,
    occurredAt: dto.occurred_at,
    occurredAtDisplay: formatDateTime(dto.occurred_at),
    location: dto.location,
  };
}

export function mapCustomerParcelDetail(
  dto: CustomerParcelDetailDTO
): CustomerParcelDetail {
  return {
    trackingId: dto.tracking_id,
    recipientName: dto.recipient_name,
    recipientPhoneMasked: dto.recipient_phone_masked,
    senderName: dto.sender_name,
    deliveryAddress: dto.delivery_address,
    deliveryCity: dto.delivery_city,
    pickupAddress: dto.pickup_address,
    pickupCity: dto.pickup_city,
    status: dto.status as CustomerParcelStatus,
    createdAt: dto.created_at,
    createdAtDisplay: formatDateTime(dto.created_at),
    eta: dto.eta,
    fee: dto.fee,
    weightKg: dto.weight_kg,
    dimensions: dto.dimensions,
    specialInstructions: dto.special_instructions,
    notes: dto.notes,
    timeline: dto.timeline.map(mapCustomerTimelineEvent),
  };
}

/**
 * Convert backend totals into DonutSegment array for DonutChart.
 */
export function computeCustomerDonutSegments(
  totals: CustomerDashboardSummary["totals"]
): DonutSegment[] {
  return [
    {
      key: "active",
      label: "Active",
      value: totals.activeDeliveries,
      tone: "info",
    },
    {
      key: "delivered",
      label: "Delivered",
      value: totals.delivered,
      tone: "success",
    },
    {
      key: "pending",
      label: "Pending",
      value: totals.pending,
      tone: "warning",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: totals.cancelled,
      tone: "danger",
    },
  ];
}
