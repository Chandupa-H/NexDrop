import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get, patch, post, ApiError } = vi.hoisted(() => {
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

  return {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    ApiError: MockApiError,
  };
});

vi.mock("@/lib/api-client", () => ({
  default: { get, patch, post },
  ApiError,
}));

let getCourierDeliveries: typeof import("./courier.api").getCourierDeliveries;
let getDeliveryHistory: typeof import("./courier.api").getDeliveryHistory;
let getParcelsForFilter: typeof import("./courier.api").getParcelsForFilter;
let getCourierAccountProfile: typeof import("./courier.api").getCourierAccountProfile;
let getDashboardSummary: typeof import("./courier.api").getDashboardSummary;
let getAssignedParcels: typeof import("./courier.api").getAssignedParcels;
let updateCourierAccountProfile: typeof import("./courier.api").updateCourierAccountProfile;
let changeCourierPassword: typeof import("./courier.api").changeCourierPassword;

describe("getCourierDeliveries", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({
      getCourierDeliveries,
      getDeliveryHistory,
      getParcelsForFilter,
      getCourierAccountProfile,
      getDashboardSummary,
      getAssignedParcels,
      updateCourierAccountProfile,
      changeCourierPassword,
    } = await import("./courier.api"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends grouped status filters to the backend without a mock fallback", async () => {
    const error = new ApiError(401, "Unauthorized");
    get.mockRejectedValue(error);

    await expect(getCourierDeliveries([
      "picked_up",
      "in_transit",
      "out_for_delivery",
    ])).rejects.toBe(error);
    expect(get).toHaveBeenCalledWith(
      "/courier/deliveries/today?status=picked_up&status=in_transit&status=out_for_delivery"
    );
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

  it("surfaces authentication failures in development instead of returning demo data", async () => {
    const error = new ApiError(401, "Unauthorized");
    get.mockRejectedValue(error);

    await expect(getCourierDeliveries()).rejects.toBe(error);
    expect(get).toHaveBeenCalledWith("/courier/deliveries/today");
  });

  it("still surfaces non-401 failures in development", async () => {
    const error = new ApiError(503, "Service unavailable");
    get.mockRejectedValue(error);

    await expect(getCourierDeliveries()).rejects.toBe(error);
  });

  it("loads the authenticated courier profile from its Courier API", async () => {
    const profile = {
      id: 1,
      full_name: "Kasun Perera",
      email: "kasun@example.com",
      contact_phone: "+94 77 123 4567",
      status: "ACTIVE" as const,
      joined_date: "2026-01-15",
    };
    get.mockResolvedValue(profile);

    await expect(getCourierAccountProfile()).resolves.toEqual(profile);
    expect(get).toHaveBeenCalledWith("/couriers/courier/profile");
  });

  it("shares an in-flight profile request between dashboard and topbar", async () => {
    const profile = {
      id: 1,
      full_name: "Kasun Perera",
      email: "kasun@example.com",
      contact_phone: "+94 77 123 4567",
      status: "ACTIVE" as const,
      joined_date: "2026-01-15",
    };
    let resolveProfile!: (value: typeof profile) => void;
    get.mockReturnValue(
      new Promise<typeof profile>((resolve) => {
        resolveProfile = resolve;
      })
    );

    const dashboardRequest = getCourierAccountProfile();
    const topbarRequest = getCourierAccountProfile();

    expect(get).toHaveBeenCalledTimes(1);
    resolveProfile(profile);
    await expect(
      Promise.all([dashboardRequest, topbarRequest])
    ).resolves.toEqual([profile, profile]);
  });

  it("shares in-flight dashboard summary requests", async () => {
    const summary = { totals: {}, kpis: [], weekly_deliveries: [] };
    let resolveSummary!: (value: typeof summary) => void;
    get.mockReturnValue(
      new Promise<typeof summary>((resolve) => {
        resolveSummary = resolve;
      })
    );

    const firstRequest = getDashboardSummary();
    const secondRequest = getDashboardSummary();

    expect(get).toHaveBeenCalledTimes(1);
    resolveSummary(summary);
    await expect(
      Promise.all([firstRequest, secondRequest])
    ).resolves.toEqual([summary, summary]);
  });

  it("shares in-flight parcel requests with the same filter and page", async () => {
    const parcels = { items: [], total: 0 };
    let resolveParcels!: (value: typeof parcels) => void;
    get.mockReturnValue(
      new Promise<typeof parcels>((resolve) => {
        resolveParcels = resolve;
      })
    );

    const firstRequest = getAssignedParcels({ limit: 6 });
    const secondRequest = getAssignedParcels({ limit: 6 });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/couriers/courier/parcels?limit=6");
    resolveParcels(parcels);
    await expect(
      Promise.all([firstRequest, secondRequest])
    ).resolves.toEqual([parcels, parcels]);
  });

  it("saves only the courier's editable profile fields", async () => {
    const profile = {
      id: 1,
      full_name: "Kasun Fernando",
      email: "kasun@example.com",
      contact_phone: "+94 71 555 1234",
      status: "ACTIVE" as const,
      joined_date: "2026-01-15",
    };
    patch.mockResolvedValue(profile);

    await expect(
      updateCourierAccountProfile({
        full_name: "Kasun Fernando",
        contact_phone: "+94 71 555 1234",
      })
    ).resolves.toEqual(profile);
    expect(patch).toHaveBeenCalledWith("/couriers/courier/profile", {
      full_name: "Kasun Fernando",
      contact_phone: "+94 71 555 1234",
    });
  });

  it("sends courier password changes to the Courier API", async () => {
    post.mockResolvedValue(undefined);
    const request = {
      current_password: "current-password",
      new_password: "new-password-is-long",
      confirm_password: "new-password-is-long",
    };

    await expect(changeCourierPassword(request)).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      "/couriers/courier/profile/change-password",
      request
    );
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

  it("requests courier parcel filters and pagination from the shared API client", async () => {
    const result = { items: [], total: 0 };
    get.mockResolvedValue(result);

    await expect(getParcelsForFilter("failed", 2, 6)).resolves.toEqual(result);
    expect(get).toHaveBeenCalledWith(
      "/couriers/courier/parcels?status=cancelled&limit=6&offset=6"
    );

    get.mockClear();
    await getParcelsForFilter("in_transit_group", 1, 6);
    expect(get).toHaveBeenCalledWith(
      "/couriers/courier/parcels?status=picked_up%2Cin_transit%2Cout_for_delivery&limit=6&offset=0"
    );
  });
});
