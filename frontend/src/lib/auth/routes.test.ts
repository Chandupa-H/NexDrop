import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  getDashboardPathForRole,
  isProtectedRoute,
  isRouteAllowedForRole,
  resolveUserRole,
  resolveUserDashboardPath,
} from "./routes";

describe("auth routes", () => {
  it("maps known roles to their dashboard paths", () => {
    expect(getDashboardPathForRole("admin")).toBe("/admin/dashboard");
    expect(getDashboardPathForRole("courier")).toBe("/courier/dashboard");
    expect(getDashboardPathForRole("merchant")).toBe("/merchant");
    expect(getDashboardPathForRole("customer")).toBe("/");
    expect(getDashboardPathForRole("dispatcher")).toBe("/courier/dashboard");
    expect(getDashboardPathForRole(null)).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
  });

  it("identifies protected vs public routes correctly", () => {
    expect(isProtectedRoute("/admin")).toBe(true);
    expect(isProtectedRoute("/admin/dashboard")).toBe(true);
    expect(isProtectedRoute("/courier/dashboard")).toBe(true);
    expect(isProtectedRoute("/merchant")).toBe(true);
    expect(isProtectedRoute("/merchant/orders")).toBe(true);

    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/auth/callback")).toBe(false);
    expect(isProtectedRoute("/privacy")).toBe(false);
  });

  it("enforces role-based route access accurately", () => {
    // Admin access
    expect(isRouteAllowedForRole("/admin/dashboard", "admin")).toBe(true);
    expect(isRouteAllowedForRole("/courier/dashboard", "admin")).toBe(true);
    expect(isRouteAllowedForRole("/merchant", "admin")).toBe(true);

    // Courier access
    expect(isRouteAllowedForRole("/courier/dashboard", "courier")).toBe(true);
    expect(isRouteAllowedForRole("/admin/dashboard", "courier")).toBe(false);
    expect(isRouteAllowedForRole("/merchant", "courier")).toBe(false);

    // Merchant access
    expect(isRouteAllowedForRole("/merchant", "merchant")).toBe(true);
    expect(isRouteAllowedForRole("/admin/dashboard", "merchant")).toBe(false);
    expect(isRouteAllowedForRole("/courier/dashboard", "merchant")).toBe(false);

    // Unauthenticated or unknown role
    expect(isRouteAllowedForRole("/admin", null)).toBe(false);
    expect(isRouteAllowedForRole("/", null)).toBe(true);
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

    expect(await resolveUserRole(mockAdminClient, "user-123")).toBe("admin");
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

    expect(await resolveUserRole(mockErrorClient, "user-123")).toBeNull();
    expect(await resolveUserDashboardPath(mockErrorClient, "user-123")).toBe(
      DEFAULT_AUTHENTICATED_REDIRECT
    );
  });

  it("preserves preferred path if authorized, or falls back to role dashboard if forbidden", async () => {
    const mockCourierClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { roles: { name: "courier" } },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    // Courier requested /courier/profile -> allowed, preserves it
    expect(
      await resolveUserDashboardPath(mockCourierClient, "user-courier", "/courier/profile")
    ).toBe("/courier/profile");

    // Courier attempted /admin/dashboard -> forbidden, falls back to /courier/dashboard
    expect(
      await resolveUserDashboardPath(mockCourierClient, "user-courier", "/admin/dashboard")
    ).toBe("/courier/dashboard");
  });
});
