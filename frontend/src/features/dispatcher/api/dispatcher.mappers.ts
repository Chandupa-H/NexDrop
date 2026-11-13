import type {
  DispatcherMeDTO,
  DispatcherStatsDTO,
  UnassignedParcelItemDTO,
  UnassignedParcelListDTO,
  UnassignedParcelDetailDTO,
} from "./dispatcher.dto";
import type { DonutSegment, NavIconName, DashboardTone } from "@/lib/dashboard/types";
import { formatDateTime } from "@/lib/dashboard/format";

export interface DispatcherProfile {
  id: string;
  fullName: string;
  role: string;
}

export interface DispatcherDashboardKPI {
  key: string;
  label: string;
  value: number;
  icon: NavIconName;
  tone: DashboardTone;
  description: string;
}

export interface DispatcherStatsViewModel {
  totalParcels: number;
  unassignedParcels: number;
  activeDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  kpis: DispatcherDashboardKPI[];
}

export interface UnassignedParcelItemViewModel {
  id: number;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  weightKg: number;
  dimensions: string | null;
  status: string;
  createdAt: string;
  formattedDate: string;
}

export interface UnassignedParcelListViewModel {
  items: UnassignedParcelItemViewModel[];
  total: number;
  limit: number;
  offset: number;
  cities: string[];
}

export interface UnassignedParcelDetailViewModel {
  id: number;
  trackingNumber: string;
  senderId: number;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  weightKg: number;
  dimensions: string | null;
  status: string;
  specialInstructions: string | null;
  createdAt: string;
  updatedAt: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
}

export function mapDispatcherProfile(dto: DispatcherMeDTO): DispatcherProfile {
  return {
    id: String(dto.id),
    fullName: dto.full_name,
    role: dto.role,
  };
}

export function mapDispatcherStats(dto: DispatcherStatsDTO): DispatcherStatsViewModel {
  const kpis: DispatcherDashboardKPI[] = [
    {
      key: "total_parcels",
      label: "Total Parcels",
      value: dto.total_parcels,
      icon: "package",
      tone: "neutral",
      description: "Total platform parcels recorded",
    },
    {
      key: "unassigned_parcels",
      label: "Unassigned Parcels",
      value: dto.unassigned_parcels,
      icon: "clock",
      tone: "warning",
      description: "Awaiting courier assignment",
    },
    {
      key: "active_deliveries",
      label: "Active Deliveries",
      value: dto.active_deliveries,
      icon: "truck",
      tone: "info",
      description: "In transit or out for delivery",
    },
    {
      key: "completed_deliveries",
      label: "Completed Deliveries",
      value: dto.completed_deliveries,
      icon: "check-circle",
      tone: "success",
      description: "Successfully delivered parcels",
    },
    {
      key: "failed_deliveries",
      label: "Failed Deliveries",
      value: dto.failed_deliveries,
      icon: "alert-triangle",
      tone: "danger",
      description: "Cancelled or rejected orders",
    },
  ];

  return {
    totalParcels: dto.total_parcels,
    unassignedParcels: dto.unassigned_parcels,
    activeDeliveries: dto.active_deliveries,
    completedDeliveries: dto.completed_deliveries,
    failedDeliveries: dto.failed_deliveries,
    kpis,
  };
}

export function computeDispatcherDonutSegments(stats: DispatcherStatsViewModel): DonutSegment[] {
  return [
    {
      key: "active",
      label: "Active Deliveries",
      value: stats.activeDeliveries,
      tone: "info",
    },
    {
      key: "unassigned",
      label: "Unassigned",
      value: stats.unassignedParcels,
      tone: "warning",
    },
    {
      key: "completed",
      label: "Completed",
      value: stats.completedDeliveries,
      tone: "success",
    },
    {
      key: "failed",
      label: "Failed",
      value: stats.failedDeliveries,
      tone: "danger",
    },
  ];
}

export function mapUnassignedParcelItem(dto: UnassignedParcelItemDTO): UnassignedParcelItemViewModel {
  return {
    id: dto.id,
    trackingNumber: dto.tracking_number,
    recipientName: dto.recipient_name,
    recipientPhone: dto.recipient_phone,
    deliveryAddress: dto.delivery_address,
    deliveryCity: dto.delivery_city,
    weightKg: dto.weight_kg,
    dimensions: dto.dimensions ?? null,
    status: dto.status,
    createdAt: dto.created_at,
    formattedDate: formatDateTime(dto.created_at),
  };
}

export function mapUnassignedParcelList(dto: UnassignedParcelListDTO): UnassignedParcelListViewModel {
  return {
    items: dto.items.map(mapUnassignedParcelItem),
    total: dto.total,
    limit: dto.limit,
    offset: dto.offset,
    cities: dto.cities,
  };
}

export function mapUnassignedParcelDetail(dto: UnassignedParcelDetailDTO): UnassignedParcelDetailViewModel {
  return {
    id: dto.id,
    trackingNumber: dto.tracking_number,
    senderId: dto.sender_id,
    recipientName: dto.recipient_name,
    recipientPhone: dto.recipient_phone,
    deliveryAddress: dto.delivery_address,
    deliveryCity: dto.delivery_city,
    weightKg: dto.weight_kg,
    dimensions: dto.dimensions ?? null,
    status: dto.status,
    specialInstructions: dto.special_instructions ?? null,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    formattedCreatedAt: formatDateTime(dto.created_at),
    formattedUpdatedAt: formatDateTime(dto.updated_at),
  };
}
