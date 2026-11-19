import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCustomerParcelsAction } from "./parcels";
import { getCustomerParcels } from "../api/customer.api";

vi.mock("../api/customer.api", () => ({ getCustomerParcels: vi.fn(), cancelCustomerParcel: vi.fn() }));

describe("fetchCustomerParcelsAction", () => {
  beforeEach(() => vi.clearAllMocks());
  it("retains dashboard defaults", async () => {
    await fetchCustomerParcelsAction("all");
    expect(getCustomerParcels).toHaveBeenCalledWith({ status: undefined, limit: 10, offset: 0 }, true);
  });
  it("maps active filters and page numbers to API pagination", async () => {
    await fetchCustomerParcelsAction("active", 3, false);
    expect(getCustomerParcels).toHaveBeenCalledWith({ status: "picked_up,in_transit,out_for_delivery", limit: 10, offset: 20 }, false);
  });
  it("normalizes invalid page numbers", async () => {
    await fetchCustomerParcelsAction("pending", -1);
    expect(getCustomerParcels).toHaveBeenCalledWith({ status: "pending", limit: 10, offset: 0 }, true);
  });
  it.each([
    ["pending", "pending"],
    ["delivered", "delivered"],
    ["cancelled", "cancelled"],
  ] as const)("maps the %s filter without changing pagination totals", async (filter, status) => {
    const page = { items: [], total: 17 };
    vi.mocked(getCustomerParcels).mockResolvedValueOnce(page);
    await expect(fetchCustomerParcelsAction(filter, 2, false)).resolves.toBe(page);
    expect(getCustomerParcels).toHaveBeenCalledWith({ status, limit: 10, offset: 10 }, false);
  });
});
