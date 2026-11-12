import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api-client";
import { getCustomerParcels } from "./customer.api";

vi.mock("@/lib/api-client", () => ({ default: { get: vi.fn() } }));

describe("customer parcel list API", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([undefined, "all"])("omits a restrictive status query for All Orders (%s)", async (status) => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [], total: 25 });
    await expect(getCustomerParcels({ status, limit: 10, offset: 10 }, false))
      .resolves.toEqual({ items: [], total: 25 });
    expect(apiClient.get).toHaveBeenCalledWith("/customers/customer/parcels?limit=10&offset=10");
  });
  it("sends real pagination parameters through the centralized client", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0 });
    await expect(getCustomerParcels({ status: "delivered", limit: 10, offset: 10 }, false))
      .resolves.toEqual({ items: [], total: 0 });
    expect(apiClient.get).toHaveBeenCalledWith("/customers/customer/parcels?status=delivered&limit=10&offset=10");
  });
  it("propagates history failures rather than returning frontend mocks", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("Unavailable"));
    await expect(getCustomerParcels({ limit: 10 }, false)).rejects.toThrow("Unavailable");
  });
});
