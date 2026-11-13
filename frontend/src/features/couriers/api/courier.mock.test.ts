import { describe, expect, it } from "vitest";
import {
  decodeMockRoute,
  getMockTracking,
  listMockDeliveries,
  postMockLocation,
  updateMockDeliveryStatus,
} from "./courier.mock";

describe("courier delivery mock", () => {
  it("uses four distinct Colombo deliveries and status-specific routes", () => {
    const deliveries = listMockDeliveries();
    expect(deliveries.map((delivery) => delivery.tracking_number)).toEqual([
      "ND-2026-001",
      "ND-2026-002",
      "ND-2026-003",
      "ND-2026-004",
    ]);
    expect(deliveries.map((delivery) => delivery.status)).toEqual([
      "pending",
      "picked_up",
      "in_transit",
      "delivered",
    ]);
    expect(deliveries.map((delivery) => [
      delivery.pickup_lat,
      delivery.pickup_lng,
      delivery.dropoff_lat,
      delivery.dropoff_lng,
    ])).toEqual([
      [6.9147, 79.8521, 6.9094, 79.8933],
      [6.8649, 79.8997, 6.848, 79.9267],
      [6.8896, 79.8553, 6.8518, 79.865],
      [6.8744, 79.8603, 6.8389, 79.8636],
    ]);

    const coordinates = deliveries.flatMap((delivery) => [
      [delivery.pickup_lat, delivery.pickup_lng],
      [delivery.dropoff_lat, delivery.dropoff_lng],
    ]);
    expect(new Set(coordinates.map((point) => point.join(","))).size).toBe(8);
    for (const [lat, lng] of coordinates) {
      expect(lat).toBeGreaterThan(6.8);
      expect(lat).toBeLessThan(7.0);
      expect(lng).toBeGreaterThan(79.8);
      expect(lng).toBeLessThan(80.0);
    }

    const pending = getMockTracking(1001);
    expect(pending.next_action).toBe("Navigate to pickup location");
    expect(pending.simulation_route?.[0]).toEqual({ lat: 6.9344, lng: 79.8428 });
    expect(pending.simulation_route?.at(-1)).toEqual({ lat: 6.9147, lng: 79.8521 });
    for (const deliveryId of [1001, 1002, 1003]) {
      for (const point of getMockTracking(deliveryId).simulation_route ?? []) {
        expect(point.lat).toBeGreaterThan(6.8);
        expect(point.lat).toBeLessThan(7.0);
        expect(point.lng).toBeGreaterThan(79.8);
        expect(point.lng).toBeLessThan(80.0);
      }
    }

    updateMockDeliveryStatus(1001, "picked_up");
    const pickedUp = getMockTracking(1001);
    expect(pickedUp.next_destination).toEqual({
      address: "No. 42, Nawala Road, Rajagiriya",
      lat: 6.9094,
      lng: 79.8933,
    });
    expect(pickedUp.next_action).toBe("Navigate to delivery location");
    const delivered = getMockTracking(1004);
    expect(delivered.delivery.status).toBe("delivered");
    expect(delivered.next_destination).toBeNull();
    expect(delivered.location_source).toBe("unavailable");
  });

  it("enforces the real delivery status chain and location bounds", () => {
    expect(() => updateMockDeliveryStatus(1002, "delivered")).toThrow(
      "Invalid transition"
    );
    expect(() => postMockLocation({ lat: 91, lng: 79.9, deliveryId: 1002 })).toThrow(
      "Latitude or longitude is invalid."
    );
    expect(decodeMockRoute("ox|h@_tlfN~WcB~WcBf^gEn_@wQ")).toHaveLength(5);
  });
});
