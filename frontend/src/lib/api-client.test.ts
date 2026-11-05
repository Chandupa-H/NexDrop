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
    fetchMock.mockResolvedValue(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
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

  it("does not require Supabase configuration for public API requests", async () => {
    await apiClient.getHealth();

    expect(getSession).not.toHaveBeenCalled();
  });
});
