import { describe, expect, it } from "vitest";
import {
  getMockDeliveryDetail,
  listMockDeliveryHistory,
} from "./courier.mock";

describe("courier delivery history mock", () => {
  it("returns only terminal deliveries for the mock courier in newest-first order", () => {
    const result = listMockDeliveryHistory();

    expect(result.items).toHaveLength(8);
    expect(result.items.map((item) => item.completed_at)).toEqual(
      [...result.items.map((item) => item.completed_at)].sort().reverse()
    );
    expect(result.items.every((item) => ["delivered", "cancelled"].includes(item.status))).toBe(
      true
    );
    expect(result.items[0].tracking_number).toBe("ND-2026-H001");
  });

  it("applies status, Colombo completion date, search, and pagination filters", () => {
    const cancelled = listMockDeliveryHistory({
      status: "cancelled",
      from: "2026-10-01",
      to: "2026-11-04",
      page: 1,
      page_size: 2,
    });
    expect(cancelled.items).toHaveLength(2);
    expect(cancelled.items.every((item) => item.status === "cancelled")).toBe(true);
    expect(cancelled.total).toBe(3);
    expect(cancelled.history_summary).toEqual({
      delivered: 0,
      cancelled: 3,
      total: 3,
    });

    const search = listMockDeliveryHistory({ q: "H008" });
    expect(search.items.map((item) => item.tracking_number)).toEqual([
      "ND-2026-H008",
    ]);
    expect(listMockDeliveryHistory({ q: "%" }).items).toHaveLength(0);
    expect(listMockDeliveryHistory({ page: 2, page_size: 3 }).items).toHaveLength(3);
  });

  it("validates filters and returns owned details without exposing another courier's data", () => {
    expect(() =>
      listMockDeliveryHistory({ status: "pending" as "delivered" })
    ).toThrowError(/status/);
    expect(() =>
      listMockDeliveryHistory({ from: "2026-11-06", to: "2026-11-05" })
    ).toThrowError(/date range/);
    expect(() => listMockDeliveryHistory({ page_size: 101 })).toThrowError(
      /Page size/
    );

    const detail = getMockDeliveryDetail(2001);
    expect(detail.status_history.at(-1)?.proof_reference).toBe(
      "POD-ND-2026-H001"
    );
    expect(detail.status_history[0].timestamp <= detail.status_history.at(-1)!.timestamp).toBe(
      true
    );
    expect(() => getMockDeliveryDetail(2999)).toThrowError(/Access denied/);
    expect(() => getMockDeliveryDetail(9999)).toThrowError(/not found/);
  });
});
