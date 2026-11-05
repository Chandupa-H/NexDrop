import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession } },
}));

import apiClient from "./api-client";

describe("Courier delivery API authentication", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("adds the current Supabase bearer token to courier delivery requests", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "courier-access-token" } },
      error: null,
    });

    await apiClient.get("/courier/deliveries?status=pending");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer courier-access-token"
    );
  });

  it("authenticates courier detail, status, location, and tracking endpoints", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "courier-access-token" } },
      error: null,
    });

    await apiClient.get("/courier/deliveries/today");
    await apiClient.get("/courier/deliveries/7");
    await apiClient.patch("/courier/deliveries/7/status", { status: "picked_up" });
    await apiClient.post("/courier/location", { lat: 6.9, lng: 79.8 });
    await apiClient.get("/courier/location/me");
    await apiClient.get("/deliveries/7/tracking");

    expect(fetchMock).toHaveBeenCalledTimes(6);
    for (const [, options] of fetchMock.mock.calls as [string, RequestInit][]) {
      const authorization = new Headers(options.headers).get("Authorization");
      expect(authorization?.startsWith("Bearer ")).toBe(true);
      expect(authorization?.length).toBeGreaterThan(7);
    }
  });

  it("does not require Supabase configuration for public API requests", async () => {
    await apiClient.getHealth();

    expect(getSession).not.toHaveBeenCalled();
  });
});
