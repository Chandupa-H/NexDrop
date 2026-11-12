import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  getDashboardPathForRole,
  resolveUserDashboardPath,
} from "./routes";

describe("auth routes", () => {
  it("maps known roles to their dashboard paths", () => {
    expect(getDashboardPathForRole("admin")).toBe("/admin/dashboard");
    expect(getDashboardPathForRole("courier")).toBe("/courier/dashboard");
    expect(getDashboardPathForRole("merchant")).toBe("/merchant");
    expect(getDashboardPathForRole(null)).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
  });

  it("resolves user role from profiles and falls back safely on missing row or error", async () => {
    const mockAdminClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { roles: { name: "admin" } },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    expect(await resolveUserDashboardPath(mockAdminClient, "user-123")).toBe(
      "/admin/dashboard"
    );

    const mockErrorClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "RLS denied" },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    expect(await resolveUserDashboardPath(mockErrorClient, "user-123")).toBe(
      DEFAULT_AUTHENTICATED_REDIRECT
    );
  });
});

