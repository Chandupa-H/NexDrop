import {
  formatTime,
  formatDateTime,
  getDateKeyInTimeZone,
  getWeekdayInTimeZone,
} from "@/lib/dashboard/format";
import type { DonutSegment } from "@/lib/dashboard/types";
import type {
  CourierMeDTO,
  DashboardSummaryDTO,
  ParcelListItemDTO,
  ParcelDetailDTO,
  TimelineEventDTO,
} from "./courier.dto";
import type {
  CourierMe,
  DashboardSummary,
  DashboardKPI,
  WeeklyDelivery,
  ParcelListItem,
  ParcelDetail,
  TimelineEvent,
  CourierParcelStatus,
} from "../types";

export function mapCourierProfile(dto: CourierMeDTO): CourierMe {
  return {
    id: String(dto.id),
    fullName: dto.full_name,
    role: dto.role,
  };
}

const KPI_LABELS: Record<string, string> = {
  assigned: "Assigned Today",
  delivered: "Delivered",
  in_transit: "Out for Delivery",
  pending: "Pending",
};

const KPI_TONES: Record<string, "success" | "warning" | "danger"> = {
  assigned: "success",
  delivered: "success",
  in_transit: "warning",
  pending: "warning",
};

export function mapDashboardSummary(dto: DashboardSummaryDTO, todayDate: string): DashboardSummary {
  const kpis: DashboardKPI[] = dto.kpis.map((kpi) => ({
    key: kpi.key,
    label: KPI_LABELS[kpi.key] || kpi.key,
    value: kpi.value,
    deltaPct: kpi.delta_pct,
    tone: KPI_TONES[kpi.key] || "success",
  }));

  const weeklyDeliveries: WeeklyDelivery[] = dto.weekly_deliveries.map((w) => {
    const dateKey = getDateKeyInTimeZone(w.date);
    const dayFull = getWeekdayInTimeZone(w.date);
    const isToday = dateKey === todayDate;

    return {
      date: w.date,
      dayLabel: isToday ? "Today" : dayFull.slice(0, 3),
      dayFull,
      delivered: w.delivered,
      isToday,
    };
  });

  return {
    totals: {
      assigned: dto.totals.assigned,
      delivered: dto.totals.delivered,
      inTransit: dto.totals.in_transit,
      pending: dto.totals.pending,
      failed: dto.totals.failed,
    },
    kpis,
    weeklyDeliveries,
  };
}

export function mapParcelListItem(dto: ParcelListItemDTO): ParcelListItem {
  return {
    trackingId: dto.tracking_id,
    customerName: dto.customer_name,
    destination: dto.destination,
    status: dto.status as CourierParcelStatus,
    assignedAt: dto.assigned_at,
    assignedAtDisplay: formatTime(dto.assigned_at),
    eta: dto.eta,
  };
}

export function mapTimelineEvent(dto: TimelineEventDTO): TimelineEvent {
  return {
    status: dto.status,
    label: dto.label,
    occurredAt: dto.occurred_at,
    occurredAtDisplay: formatDateTime(dto.occurred_at),
    location: dto.location,
  };
}

export function mapParcelDetail(dto: ParcelDetailDTO): ParcelDetail {
  return {
    trackingId: dto.tracking_id,
    customerName: dto.customer_name,
    customerPhoneMasked: dto.customer_phone_masked,
    destination: dto.destination,
    addressLine: dto.address_line,
    status: dto.status as CourierParcelStatus,
    assignedAt: dto.assigned_at,
    assignedAtDisplay: formatTime(dto.assigned_at),
    eta: dto.eta,
    notes: dto.notes,
    timeline: dto.timeline.map(mapTimelineEvent),
    deliveryProof: dto.delivery_proof
      ? { secureUrl: dto.delivery_proof.secure_url, publicId: dto.delivery_proof.public_id }
      : null,
    deliveryResult: dto.delivery_result
      ? {
          outcome: dto.delivery_result.outcome,
          recordedAt: dto.delivery_result.recorded_at,
          recipientName: dto.delivery_result.recipient_name,
          failureReason: dto.delivery_result.failure_reason,
          note: dto.delivery_result.note,
        }
      : null,
    proofCleanupPending: dto.proof_cleanup_pending,
  };
}

/**
 * Convert backend totals into the shared chart segment contract.
 */
export function computeDonutSegments(totals: DashboardSummary["totals"]): DonutSegment[] {
  return [
    {
      key: "delivered",
      label: "Delivered",
      value: totals.delivered,
      tone: "success",
    },
    {
      key: "in_transit",
      label: "In Transit",
      value: totals.inTransit,
      tone: "info",
    },
    {
      key: "pending",
      label: "Pending",
      value: totals.pending,
      tone: "warning",
    },
    {
      key: "failed",
      label: "Failed",
      value: totals.failed,
      tone: "danger",
    },
  ];
}
