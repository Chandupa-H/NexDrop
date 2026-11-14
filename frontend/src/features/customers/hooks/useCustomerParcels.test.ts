import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCustomerParcels } from "./useCustomerParcels";
import { fetchCustomerParcelsAction } from "../actions/parcels";
import type { CustomerParcelListDTO } from "../api/customer.dto";
import type { CustomerTableFilter } from "../types";

vi.mock("../actions/parcels", () => ({ fetchCustomerParcelsAction: vi.fn() }));

describe("useCustomerParcels", () => {
  it("keeps server-provided dashboard data without an extra initial fetch", () => {
    vi.mocked(fetchCustomerParcelsAction).mockClear();
    const { result } = renderHook(() => useCustomerParcels("all", [], 7));
    expect(result.current.total).toBe(7);
    expect(result.current.loading).toBe(false);
    expect(fetchCustomerParcelsAction).not.toHaveBeenCalled();
  });
  it("ignores a late successful response after a filter change", async () => {
    let resolveOld!: (data: CustomerParcelListDTO) => void;
    vi.mocked(fetchCustomerParcelsAction).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ items: [], total: 2 });
    const { result, rerender } = renderHook(({ filter }: { filter: CustomerTableFilter }) =>
      useCustomerParcels(filter, [], 0, { fetchOnMount: true }), { initialProps: { filter: "all" as CustomerTableFilter } });
    expect(result.current.loading).toBe(true);
    rerender({ filter: "pending" });
    await waitFor(() => expect(result.current.total).toBe(2));
    await act(async () => resolveOld({ items: [], total: 99 }));
    expect(result.current.total).toBe(2);
  });
});
