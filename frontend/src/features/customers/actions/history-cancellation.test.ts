import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { cancelCustomerHistoryParcelAction } from "./history-cancellation";
import { cancelCustomerParcelAction } from "./parcels";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";

const policy = vi.hoisted(() => ({ enabled: false, message: "Live cancellation disabled" }));
vi.mock("../config/history-cancellation", () => ({ historyCancellationPolicy: policy }));
vi.mock("./parcels", () => ({ cancelCustomerParcelAction: vi.fn() }));

describe("history cancellation server guard", () => {
  beforeEach(() => { vi.resetAllMocks(); policy.enabled = false; });
  it("ships with the actual production feature gate disabled", async () => {
    const actual = await vi.importActual<typeof import("../config/history-cancellation")>("../config/history-cancellation");
    expect(actual.historyCancellationPolicy.enabled).toBe(false);
  });
  it("blocks requests at the server boundary while the production gate is closed", async () => {
    expect(await cancelCustomerHistoryParcelAction("ND-TEST", "Reason")).toEqual({ ok: false, message: policy.message });
    expect(cancelCustomerParcelAction).not.toHaveBeenCalled();
  });
  it.each(["  Changed plans  ", "   ", undefined])("uses the existing action with strict failures and optional reason (%s)", async (reason) => {
    policy.enabled = true; // Test-only override. Never enabled against a backend.
    const parcel = { tracking_id: "ND-TEST", status: "cancelled" } as CustomerParcelDetailDTO;
    vi.mocked(cancelCustomerParcelAction).mockResolvedValue(parcel);
    expect(await cancelCustomerHistoryParcelAction("ND-TEST", reason)).toEqual({ ok: true, parcel });
    expect(cancelCustomerParcelAction).toHaveBeenCalledWith("ND-TEST", reason?.trim() || undefined, false);
  });
  it("returns a serializable HTTP 409 conflict without success", async () => {
    policy.enabled = true;
    vi.mocked(cancelCustomerParcelAction).mockRejectedValue(new ApiError(409, "Not pending"));
    expect(await cancelCustomerHistoryParcelAction("ND-TEST")).toMatchObject({ ok: false, conflict: true, message: expect.stringContaining("no longer be cancelled") });
  });
  it("does not report network failures or unconfirmed responses as success", async () => {
    policy.enabled = true;
    vi.mocked(cancelCustomerParcelAction).mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce({ tracking_id: "ND-TEST", status: "pending" } as CustomerParcelDetailDTO)
      .mockResolvedValueOnce({ tracking_id: "ND-OTHER", status: "cancelled" } as CustomerParcelDetailDTO);
    for (let index = 0; index < 3; index++) expect(await cancelCustomerHistoryParcelAction("ND-TEST")).toMatchObject({ ok: false });
  });
});
