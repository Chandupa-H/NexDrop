/**
 * Frontend view models for Customer module (camelCase).
 */

import type { DashboardTone } from "@/lib/dashboard/types";

export type CustomerParcelStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type CustomerTableFilter =
  | "all"
  | "active"
  | "delivered"
  | "pending"
  | "cancelled";

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  defaultAddress: string;
  city: string;
  postalCode: string;
}

export interface CustomerDashboardTotals {
  totalOrders: number;
  activeDeliveries: number;
  delivered: number;
  pending: number;
  cancelled: number;
}

export interface CustomerDashboardKPI {
  key: string;
  label: string;
  value: number;
  deltaPct: number;
  tone: DashboardTone;
}

export interface CustomerWeeklyOrder {
  date: string;
  dayLabel: string;
  dayFull: string;
  orders: number;
  isToday: boolean;
}

export interface CustomerDashboardSummary {
  greeting?: string;
  totals: CustomerDashboardTotals;
  kpis: CustomerDashboardKPI[];
  weeklyOrders: CustomerWeeklyOrder[];
}

export interface CustomerParcelListItem {
  trackingId: string;
  recipientName: string;
  destination: string;
  status: CustomerParcelStatus;
  createdAt: string;
  createdAtDisplay: string;
  estimatedFee: number;
  weightKg: number;
  eta: string | null;
}

export interface CustomerTimelineEvent {
  status: string;
  label: string;
  occurredAt: string;
  occurredAtDisplay: string;
  location: string | null;
}

export interface CustomerParcelDetail {
  trackingId: string;
  recipientName: string;
  recipientPhoneMasked: string;
  senderName: string;
  deliveryAddress: string;
  deliveryCity: string;
  pickupAddress: string;
  pickupCity: string;
  status: CustomerParcelStatus;
  createdAt: string;
  createdAtDisplay: string;
  eta: string | null;
  fee: number;
  weightKg: number;
  dimensions?: string | null;
  specialInstructions?: string | null;
  notes: string[];
  timeline: CustomerTimelineEvent[];
}
