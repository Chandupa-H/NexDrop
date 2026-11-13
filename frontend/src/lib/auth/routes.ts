import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "admin" | "courier" | "merchant" | "customer" | "dispatcher";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin/dashboard",
  courier: "/courier/dashboard",
  merchant: "/merchant",
  dispatcher: "/dispatcher/dashboard",
  customer: "/courier/dashboard",
};

export const DEFAULT_AUTHENTICATED_REDIRECT = "/courier/dashboard";

/**
 * Maps a role name (case-insensitive) to its corresponding home dashboard route.
 */
export function getDashboardPathForRole(role?: string | null): string {
  if (!role) return DEFAULT_AUTHENTICATED_REDIRECT;
  return ROLE_DASHBOARD_MAP[role.toLowerCase()] ?? DEFAULT_AUTHENTICATED_REDIRECT;
}

/**
 * Checks whether a requested URL pathname is a protected internal route
 * that requires an authenticated session.
 */
export function isProtectedRoute(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/courier" ||
    pathname.startsWith("/courier/") ||
    pathname === "/merchant" ||
    pathname.startsWith("/merchant/")
  );
}

/**
 * Checks if a user role is authorized to view a given route.
 * - Admin users have universal access across operational dashboards.
 * - Courier users can access `/courier/*`.
 * - Merchant users can access `/merchant/*`.
 * - Cross-role access to `/admin/*` is strictly forbidden to non-admins.
 */
export function isRouteAllowedForRole(pathname: string, role?: string | null): boolean {
  const normalizedRole = role?.trim().toLowerCase() ?? "";

  // Admin section: strictly admin only
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return normalizedRole === "admin";
  }

  // Courier section: courier or admin
  if (pathname === "/courier" || pathname.startsWith("/courier/")) {
    return normalizedRole === "courier" || normalizedRole === "admin";
  }

  // Merchant section: merchant or admin
  if (pathname === "/merchant" || pathname.startsWith("/merchant/")) {
    return normalizedRole === "merchant" || normalizedRole === "admin";
  }

  // All other routes (e.g. public pages) are open
  return true;
}

/**
 * Safely resolves the user's role name from `profiles -> roles(name)`.
 */
export async function resolveUserRole(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    const rolesValue = (data as { roles?: { name?: string } | Array<{ name?: string }> | null }).roles;
    const roleName = Array.isArray(rolesValue) ? rolesValue[0]?.name : rolesValue?.name;

    return roleName ? roleName.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Safely resolves the destination route for an authenticated user based on
 * `profiles -> roles`. If a target `preferredPath` is supplied and authorized
 * for that role, it is preserved; otherwise falls back to the user's role dashboard.
 */
export async function resolveUserDashboardPath(
  supabase: SupabaseClient,
  userId?: string | null,
  preferredPath?: string | null
): Promise<string> {
  const roleName = await resolveUserRole(supabase, userId);

  if (preferredPath && preferredPath.startsWith("/") && !preferredPath.startsWith("//")) {
    const basePath = preferredPath.split("?")[0];
    if (isRouteAllowedForRole(basePath, roleName)) {
      return preferredPath;
    }
  }

  return roleName ? getDashboardPathForRole(roleName) : DEFAULT_AUTHENTICATED_REDIRECT;
}
