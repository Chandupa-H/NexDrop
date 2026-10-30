/**
 * MOCK DATA — Courier Dashboard v2
 * ---------------------------------------------------------------------------
 * All data is synthetic for UI development only.
 * Replace with real API calls when backend is ready:
 *   TODO(api): GET /api/v1/courier/dashboard/summary
 *   TODO(api): GET /api/v1/courier/parcels  (confirm paths with Platform)
 *
 * Hydration note: All dates use pre-formatted display strings (assignedAtDisplay)
 * so no toLocale* calls happen during client render.
 * ---------------------------------------------------------------------------
 */

import type {
  AssignedParcel,
  CourierUser,
  DashboardSummary,
  DeliveryStatusBreakdown,
  WeeklyDeliveryData,
} from "../types";

// ---------------------------------------------------------------------------
// Logged-in courier
// ---------------------------------------------------------------------------
export const MOCK_COURIER: CourierUser = {
  id: "COU-001",
  name: "Ashan Perera",
  role: "Courier",
  avatarInitials: "AP",
};

// ---------------------------------------------------------------------------
// KPI summary
// Invariant: assignedToday === delivered + outForDelivery + pending + failed
//            25            ===     16     +       5       +    3   +   1
// ---------------------------------------------------------------------------
export const MOCK_SUMMARY: DashboardSummary = {
  assignedToday: 25,
  assignedTodayDelta: 12,
  delivered: 16,
  deliveredDelta: 8,
  outForDelivery: 5,
  outForDeliveryDelta: 24,
  pending: 3,
  pendingDelta: -5,
  failed: 1,
};

// ---------------------------------------------------------------------------
// 6 parcels — Oct 31 2026, Sri Lankan customers
// NXD001247 = Up Next (In Transit, displayed on Live Route card)
// ---------------------------------------------------------------------------
export const MOCK_PARCELS: AssignedParcel[] = [
  {
    id: "p1",
    trackingId: "NXD001248",
    customerName: "Kavindu Perera",
    customerInitials: "KP",
    phone: "+94 77 *** 4521",
    destination: "45 Galle Rd, Colombo 03",
    city: "Colombo",
    status: "DELIVERED",
    assignedAt: "2026-10-31T08:20:00+05:30",
    assignedAtDisplay: "08:20 AM",
    weight: 2.4,
  },
  {
    id: "p2",
    trackingId: "NXD001247",
    customerName: "Nethmi Silva",
    customerInitials: "NS",
    phone: "+94 71 *** 8832",
    destination: "12 Peradeniya Rd, Kandy",
    city: "Kandy",
    status: "IN_TRANSIT",
    assignedAt: "2026-10-31T08:30:00+05:30",
    assignedAtDisplay: "08:30 AM",
    weight: 1.8,
    notes: "Leave at reception if unavailable",
  },
  {
    id: "p3",
    trackingId: "NXD001246",
    customerName: "Sahan Wijesinghe",
    customerInitials: "SW",
    phone: "+94 76 *** 3310",
    destination: "78 Matara Rd, Galle",
    city: "Galle",
    status: "PENDING",
    assignedAt: "2026-10-31T09:00:00+05:30",
    assignedAtDisplay: "09:00 AM",
    weight: 3.2,
  },
  {
    id: "p4",
    trackingId: "NXD001245",
    customerName: "Isuru Madushan",
    customerInitials: "IM",
    phone: "+94 70 *** 6619",
    destination: "23 Beach Rd, Matara",
    city: "Matara",
    status: "DELIVERED",
    assignedAt: "2026-10-31T07:45:00+05:30",
    assignedAtDisplay: "07:45 AM",
    weight: 0.9,
  },
  {
    id: "p5",
    trackingId: "NXD001244",
    customerName: "Amaya Jayasuriya",
    customerInitials: "AJ",
    phone: "+94 75 *** 2204",
    destination: "9 Ampitiya Rd, Kandy",
    city: "Kandy",
    status: "OUT_FOR_DELIVERY",
    assignedAt: "2026-10-31T09:30:00+05:30",
    assignedAtDisplay: "09:30 AM",
    weight: 5.1,
  },
  {
    id: "p6",
    trackingId: "NXD001243",
    customerName: "Tharindu Bandara",
    customerInitials: "TB",
    phone: "+94 72 *** 9947",
    destination: "14 Galle Fort, Galle",
    city: "Galle",
    status: "FAILED",
    assignedAt: "2026-10-31T07:00:00+05:30",
    assignedAtDisplay: "07:00 AM",
    weight: 1.5,
    notes: "Customer unreachable — second attempt scheduled",
  },
];

// ---------------------------------------------------------------------------
// Weekly bar-chart — Sun to Sat (Sat = today, count=16 matches Delivered KPI)
// ---------------------------------------------------------------------------
export const MOCK_WEEKLY_DATA: WeeklyDeliveryData[] = [
  { day: "Sunday",    shortDay: "Sun",   count: 8,  isToday: false },
  { day: "Monday",    shortDay: "Mon",   count: 22, isToday: false },
  { day: "Tuesday",   shortDay: "Tue",   count: 31, isToday: false },
  { day: "Wednesday", shortDay: "Wed",   count: 18, isToday: false },
  { day: "Thursday",  shortDay: "Thu",   count: 35, isToday: false },
  { day: "Friday",    shortDay: "Fri",   count: 27, isToday: false },
  { day: "Saturday",  shortDay: "Today", count: 16, isToday: true  },
];

// ---------------------------------------------------------------------------
// Donut breakdown
// Total must equal MOCK_SUMMARY.assignedToday = 25
// "In Transit" groups outForDelivery (picked_up + in_transit + out_for_delivery)
// ---------------------------------------------------------------------------
export const MOCK_STATUS_BREAKDOWN: DeliveryStatusBreakdown[] = [
  { label: "Delivered",  count: 16, strokeColor: "#16A34A", bgColor: "#E3F6E8", textColor: "#12703A" },
  { label: "In Transit", count: 5,  strokeColor: "#1D4ED8", bgColor: "#E4EEFF", textColor: "#1D4ED8" },
  { label: "Pending",    count: 3,  strokeColor: "#D97706", bgColor: "#FFF1D6", textColor: "#9A5B00" },
  { label: "Failed",     count: 1,  strokeColor: "#DC2626", bgColor: "#FDE4E4", textColor: "#B42318" },
];
