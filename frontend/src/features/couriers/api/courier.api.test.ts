import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get, ApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number;
    code?: string;
    data: Record<string, unknown>;

    constructor(
      status: number,
      message: string,
      data: Record<string, unknown> = {}
    ) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }

  return { get: vi.fn(), ApiError: MockApiError };
});

vi.mock("@/lib/api-client", () => ({
  default: { get },
  ApiError,
}));

let getCourierDeliveries: typeof import("./courier.api").getCourierDeliveries;
let getDeliveryHistory: typeof import("./courier.api").getDeliveryHistory;

describe("getCourierDeliveries", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ getCourierDeliveries, getDeliveryHistory } = await import("./courier.api"));
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_COURIER_DELIVERIES", "true");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses mock deliveries after a 401 in development", async () => {
    get.mockRejectedValue(new ApiError(401, "Invalid or missing bearer token"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const deliveries = await getCourierDeliveries();

    expect(get).toHaveBeenCalledWith("/courier/deliveries/today");
    expect(deliveries).toHaveLength(4);
    expect(deliveries.map((delivery) => delivery.status)).toEqual([
      "pending",
      "picked_up",
      "in_transit",
      "delivered",
    ]);
    expect(warning).toHaveBeenCalledOnce();
  });

  it("applies the selected status filter to mock deliveries", async () => {
    get.mockRejectedValue(new ApiError(401, "Unauthorized"));

    const deliveries = await getCourierDeliveries([
      "picked_up",
      "in_transit",
      "out_for_delivery",
    ]);

    expect(deliveries.map((delivery) => delivery.status)).toEqual([
      "picked_up",
      "in_transit",
    ]);
  });

  it("uses real API data when the API succeeds", async () => {
    const result = [
      {
        parcel_id: 8,
        tracking_number: "ND-REAL-008",
        status: "pending",
        pickup_address: "Colombo",
        dropoff_address: "Galle",
        size: null,
        weight: 1,
        recipient_name: "Recipient",
        recipient_phone: "0771234567",
        assigned_at: "2026-11-05T08:00:00+05:30",
      },
    ];
    get.mockResolvedValue(result);

    await expect(getCourierDeliveries("pending")).resolves.toEqual(result);
    expect(get).toHaveBeenCalledWith("/courier/deliveries/today?status=pending");
  });

  it("does not use mocks in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = new ApiError(401, "Unauthorized");
    get.mockRejectedValue(error);

    await expect(getCourierDeliveries()).rejects.toBe(error);
  });

  it("can disable the development fallback with its environment setting", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_COURIER_DELIVERIES", "false");
    const error = new ApiError(401, "Unauthorized");
    get.mockRejectedValue(error);

    await expect(getCourierDeliveries()).rejects.toBe(error);
  });

  it("still surfaces non-401 failures in development", async () => {
    const error = new ApiError(503, "Service unavailable");
    get.mockRejectedValue(error);

    await expect(getCourierDeliveries()).rejects.toBe(error);
  });

  it("requests paginated history with URL-safe filter parameters", async () => {
    const result = {
      items: [],
      total: 0,
      page: 2,
      page_size: 8,
      history_summary: { delivered: 0, cancelled: 0, total: 0 },
    };
    get.mockResolvedValue(result);

    await expect(
      getDeliveryHistory({
        status: "cancelled",
        from: "2026-10-01",
        to: "2026-11-01",
        q: "Ruwan & Nugegoda",
        page: 2,
        page_size: 8,
      })
    ).resolves.toEqual(result);
    expect(get).toHaveBeenCalledWith(
      "/courier/deliveries/history?status=cancelled&from=2026-10-01&to=2026-11-01&q=Ruwan+%26+Nugegoda&page=2&page_size=8"
    );
  });
});
