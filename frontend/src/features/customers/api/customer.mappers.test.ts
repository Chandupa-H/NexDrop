import { describe, it, expect } from "vitest";
import {
  mapCustomerProfile,
  mapCustomerDashboardSummary,
  mapCustomerParcelListItem,
  mapCustomerParcelDetail,
  computeCustomerDonutSegments,
} from "./customer.mappers";
import type {
  CustomerMeDTO,
  CustomerDashboardSummaryDTO,
  CustomerParcelListItemDTO,
  CustomerParcelDetailDTO,
} from "./customer.dto";

describe("Customer Mappers", () => {
  it("maps CustomerMeDTO to CustomerProfile correctly", () => {
    const dto: CustomerMeDTO = {
      id: 42,
      full_name: "Kavindu Sandaruwan",
      email: "kavindu@example.com",
      phone: "+94771239876",
      role: "customer",
      default_address: "45/2 Temple Road",
      city: "Colombo 07",
      postal_code: "00700",
    };

    const profile = mapCustomerProfile(dto);
    expect(profile.id).toBe("42");
    expect(profile.fullName).toBe("Kavindu Sandaruwan");
    expect(profile.email).toBe("kavindu@example.com");
    expect(profile.defaultAddress).toBe("45/2 Temple Road");
    expect(profile.city).toBe("Colombo 07");
    expect(profile.postalCode).toBe("00700");
  });

  it("maps CustomerDashboardSummaryDTO to CustomerDashboardSummary with Colombo timezone", () => {
    const summaryDto: CustomerDashboardSummaryDTO = {
      totals: {
        total_orders: 8,
        active_deliveries: 3,
        delivered: 3,
        pending: 1,
        cancelled: 1,
      },
      kpis: [
        { key: "active_deliveries", value: 3, delta_pct: 25 },
        { key: "delivered", value: 3, delta_pct: 15 },
        { key: "pending", value: 1, delta_pct: -50 },
        { key: "total_orders", value: 8, delta_pct: 14 },
      ],
      weekly_orders: [
        { date: "2026-10-30", orders: 2 },
        { date: "2026-10-31", orders: 4 },
      ],
    };

    const result = mapCustomerDashboardSummary(summaryDto, "2026-10-31");

    expect(result.totals.totalOrders).toBe(8);
    expect(result.totals.activeDeliveries).toBe(3);
    expect(result.totals.delivered).toBe(3);
    expect(result.totals.pending).toBe(1);
    expect(result.totals.cancelled).toBe(1);

    // KPI check
    expect(result.kpis.find((k) => k.key === "active_deliveries")?.label).toBe(
      "Active Shipments"
    );
    expect(result.kpis.find((k) => k.key === "delivered")?.tone).toBe("success");

    // Weekly orders check
    expect(result.weeklyOrders[1].isToday).toBe(true);
    expect(result.weeklyOrders[1].dayLabel).toBe("Today");
    expect(result.weeklyOrders[0].isToday).toBe(false);
  });

  it("computes donut segments for customer dashboard", () => {
    const totals = {
      totalOrders: 8,
      activeDeliveries: 3,
      delivered: 3,
      pending: 1,
      cancelled: 1,
    };

    const segments = computeCustomerDonutSegments(totals);
    expect(segments).toHaveLength(4);
    expect(segments.find((s) => s.key === "active")?.value).toBe(3);
    expect(segments.find((s) => s.key === "delivered")?.value).toBe(3);
    expect(segments.find((s) => s.key === "pending")?.value).toBe(1);
    expect(segments.find((s) => s.key === "cancelled")?.value).toBe(1);
  });

  it("maps CustomerParcelListItemDTO to CustomerParcelListItem", () => {
    const itemDto: CustomerParcelListItemDTO = {
      tracking_id: "NXD-CUS-101",
      recipient_name: "Nethmi Silva",
      destination: "Kandy",
      status: "out_for_delivery",
      created_at: "2026-10-31T08:00:00+05:30",
      estimated_fee: 650.0,
      weight_kg: 1.5,
      eta: "2026-10-31T14:30:00+05:30",
    };

    const item = mapCustomerParcelListItem(itemDto);
    expect(item.trackingId).toBe("NXD-CUS-101");
    expect(item.recipientName).toBe("Nethmi Silva");
    expect(item.destination).toBe("Kandy");
    expect(item.status).toBe("out_for_delivery");
    expect(item.estimatedFee).toBe(650.0);
    expect(item.createdAtDisplay).toBeTruthy();
  });

  it("maps CustomerParcelDetailDTO with timeline", () => {
    const detailDto: CustomerParcelDetailDTO = {
      tracking_id: "NXD-CUS-101",
      recipient_name: "Nethmi Silva",
      recipient_phone_masked: "+94 77 *** 4522",
      sender_name: "Kavindu Sandaruwan",
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
      special_instructions: "Call before arrival",
      notes: ["Courier on the way"],
      timeline: [
        {
          status: "pending",
          label: "Order Created",
          occurred_at: "2026-10-31T08:00:00+05:30",
          location: "Online Portal",
        },
      ],
    };

    const detail = mapCustomerParcelDetail(detailDto);
    expect(detail.trackingId).toBe("NXD-CUS-101");
    expect(detail.recipientPhoneMasked).toBe("+94 77 *** 4522");
    expect(detail.timeline).toHaveLength(1);
    expect(detail.timeline[0].label).toBe("Order Created");
    expect(detail.timeline[0].occurredAtDisplay).toBeTruthy();
  });
});
