import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  getDashboardPathForRole,
  isProtectedRoute,
  isRouteAllowedForRole,
  resolveUserRole,
  resolveUserDashboardPath,
  hasAssignedRole,
  isRegistrationRoute,
} from "./routes";

describe("auth routes", () => {
  it.each(["admin", "courier", "merchant", "dispatcher", "customer"])(
    "redirects assigned %s users away from registration destinations",
    async (role) => {
      const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { app_metadata: { role } } } }) } } as unknown as SupabaseClient;
      for (const path of ["/register", "/register?next=home", "/customer/register", "/merchant/register"]) {
        expect(await resolveUserDashboardPath(client, "assigned-user", path)).toBe(getDashboardPathForRole(role));
      }
    }
  );

  it.each([null, "unassigned", "unknown"])("keeps onboarding available for %s roles", async (role) => {
    const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { app_metadata: { role } } } }) } } as unknown as SupabaseClient;
    expect(hasAssignedRole(role)).toBe(false);
    expect(await resolveUserDashboardPath(client, "new-user", "/register")).toBe("/register");
    expect(isRouteAllowedForRole("/merchant/register", role)).toBe(true);
  });

  it("matches registration route boundaries and normalizes assigned roles", () => {
    expect(isRegistrationRoute("/register/details")).toBe(true);
    expect(isRegistrationRoute("/register-other")).toBe(false);
    expect(hasAssignedRole(" Admin ")).toBe(true);
    expect(getDashboardPathForRole(" Admin ")).toBe("/admin/dashboard");
  });
  it("maps known roles to their dashboard paths", () => {
    expect(getDashboardPathForRole("admin")).toBe("/admin/dashboard");
    expect(getDashboardPathForRole("courier")).toBe("/courier/dashboard");
    expect(getDashboardPathForRole("merchant")).toBe("/merchant");
    expect(getDashboardPathForRole("dispatcher")).toBe("/dispatcher/dashboard");
    expect(getDashboardPathForRole("customer")).toBe("/");
    expect(getDashboardPathForRole(null)).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
  });

  it("identifies protected vs public routes correctly", () => {
    expect(isProtectedRoute("/admin")).toBe(true);
    expect(isProtectedRoute("/admin/dashboard")).toBe(true);
    expect(isProtectedRoute("/courier/dashboard")).toBe(true);
    expect(isProtectedRoute("/dispatcher/dashboard")).toBe(true);
    expect(isProtectedRoute("/merchant")).toBe(true);
    expect(isProtectedRoute("/merchant/orders")).toBe(true);

    expect(isProtectedRoute("/merchant/register")).toBe(false);
    expect(isProtectedRoute("/customer/register")).toBe(false);
    expect(isProtectedRoute("/register")).toBe(false);
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/auth/callback")).toBe(false);
    expect(isProtectedRoute("/privacy")).toBe(false);
  });

  it("enforces role-based route access accurately", () => {
    // Admin access
    expect(isRouteAllowedForRole("/admin/dashboard", "admin")).toBe(true);
    expect(isRouteAllowedForRole("/courier/dashboard", "admin")).toBe(true);
    expect(isRouteAllowedForRole("/dispatcher/dashboard", "admin")).toBe(true);
    expect(isRouteAllowedForRole("/merchant", "admin")).toBe(true);

    // Courier access
    expect(isRouteAllowedForRole("/courier/dashboard", "courier")).toBe(true);
    expect(isRouteAllowedForRole("/admin/dashboard", "courier")).toBe(false);
    expect(isRouteAllowedForRole("/dispatcher/dashboard", "courier")).toBe(false);
    expect(isRouteAllowedForRole("/merchant", "courier")).toBe(false);

    // Dispatcher access
    expect(isRouteAllowedForRole("/dispatcher/dashboard", "dispatcher")).toBe(true);
    expect(isRouteAllowedForRole("/admin/dashboard", "dispatcher")).toBe(false);
    expect(isRouteAllowedForRole("/courier/dashboard", "dispatcher")).toBe(false);

    // Merchant access
    expect(isRouteAllowedForRole("/merchant", "merchant")).toBe(true);
    expect(isRouteAllowedForRole("/admin/dashboard", "merchant")).toBe(false);
    expect(isRouteAllowedForRole("/courier/dashboard", "merchant")).toBe(false);

    // Unauthenticated or unknown role
    expect(isRouteAllowedForRole("/admin", null)).toBe(false);
    expect(isRouteAllowedForRole("/", null)).toBe(true);
    expect(isRouteAllowedForRole("/register", null)).toBe(true);
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
