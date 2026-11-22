import { describe, it, expect, beforeEach } from "vitest";
import {
  setActiveCustomerUserKey,
  createMockCustomerParcel,
  filterMockParcels,
  getMockDashboardSummary,
  MOCK_CUSTOMER_PARCELS,
} from "../api/customer.mock";

describe("Customer multi-account confidentiality and parcel isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActiveCustomerUserKey(null);
    MOCK_CUSTOMER_PARCELS.length = 0;
  });

  it("isolates parcels between different logged-in accounts so users never see each other's orders", () => {
    // 1. User A logs in and books an order
    setActiveCustomerUserKey("usera@example.com");
    const parcelA = createMockCustomerParcel({
      recipient_name: "Recipient A",
      recipient_phone: "+94771111111",
      delivery_address: "10 Main Street",
      delivery_city: "Colombo",
      pickup_address: "50 Park Road",
      pickup_city: "Colombo",
      weight_kg: 2.0,
      sender_name: "User A",
      sender_email: "usera@example.com",
    });

    expect(parcelA.tracking_id).toBeDefined();

    // Verify User A sees 1 order
    const summaryA = getMockDashboardSummary();
    expect(summaryA.totals.total_orders).toBe(1);
    const listA = filterMockParcels();
    expect(listA.total).toBe(1);
    expect(listA.items[0].recipient_name).toBe("Recipient A");

    // 2. User logs out and User B logs in
    setActiveCustomerUserKey("userb@example.com");

    // User B's dashboard and history must be clean with 0 orders
    const summaryB = getMockDashboardSummary();
    expect(summaryB.totals.total_orders).toBe(0);
    expect(summaryB.totals.pending).toBe(0);
    const listB = filterMockParcels();
    expect(listB.total).toBe(0);
    expect(listB.items).toHaveLength(0);

    // 3. User B places their own order
    const parcelB = createMockCustomerParcel({
      recipient_name: "Recipient B",
      recipient_phone: "+94772222222",
      delivery_address: "20 Temple Road",
      delivery_city: "Kandy",
      pickup_address: "80 Lake Drive",
      pickup_city: "Kandy",
      weight_kg: 1.5,
      sender_name: "User B",
      sender_email: "userb@example.com",
    });

    expect(parcelB.tracking_id).toBeDefined();

    // Verify User B only sees User B's order
    const updatedSummaryB = getMockDashboardSummary();
    expect(updatedSummaryB.totals.total_orders).toBe(1);
    const updatedListB = filterMockParcels();
    expect(updatedListB.total).toBe(1);
    expect(updatedListB.items[0].recipient_name).toBe("Recipient B");

    // 4. Switch back to User A
    setActiveCustomerUserKey("usera@example.com");
    const recheckedSummaryA = getMockDashboardSummary();
    expect(recheckedSummaryA.totals.total_orders).toBe(1);
    const recheckedListA = filterMockParcels();
    expect(recheckedListA.total).toBe(1);
    expect(recheckedListA.items[0].recipient_name).toBe("Recipient A");
  });
});
