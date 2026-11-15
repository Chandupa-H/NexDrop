import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "admin" | "courier" | "merchant" | "customer" | "dispatcher" | "unassigned";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin/dashboard",
  courier: "/courier/dashboard",
  merchant: "/merchant/dashboard",
  customer: "/",
  dispatcher: "/dispatcher/dashboard",
};

export const DEFAULT_AUTHENTICATED_REDIRECT = "/register";

export function hasAssignedRole(role?: string | null): boolean {
  return Object.hasOwn(ROLE_DASHBOARD_MAP, role?.trim().toLowerCase() ?? "");
}

export function isRegistrationRoute(pathname: string): boolean {
  return ["/register", "/customer/register", "/merchant/register"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Maps a role name (case-insensitive) to its corresponding home dashboard route.
 */
export function getDashboardPathForRole(role?: string | null): string {
  if (!role) return DEFAULT_AUTHENTICATED_REDIRECT;
  return hasAssignedRole(role)
    ? ROLE_DASHBOARD_MAP[role.trim().toLowerCase()]
    : DEFAULT_AUTHENTICATED_REDIRECT;
}

/**
 * Checks whether a requested URL pathname is a protected internal route
 * that requires an authenticated operational session.
 * Excludes registration/onboarding flows (/register, /customer/register, /merchant/register).
 */
export function isProtectedRoute(pathname: string): boolean {
  // Public merchant onboarding & gateway routes
  if (
    pathname === "/merchant" ||
    pathname === "/merchant/register" ||
    pathname.startsWith("/merchant/register") ||
    pathname === "/merchant/login" ||
    pathname === "/merchant/application-status"
  ) {
    return false;
  }

  // Public customer onboarding & role selection routes
  if (
    pathname === "/customer/register" ||
    pathname.startsWith("/customer/register") ||
    pathname === "/register" ||
    pathname.startsWith("/register")
  ) {
    return false;
  }

  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/courier" ||
    pathname.startsWith("/courier/") ||
    pathname === "/merchant/dashboard" ||
    pathname.startsWith("/merchant/dashboard") ||
    pathname === "/dispatcher" ||
    pathname.startsWith("/dispatcher/")
  );
}

/**
 * Checks if a user role is authorized to view a given route.
 * - Admin users have universal access across operational dashboards.
 * - Courier users can access `/courier/*`.
 * - Merchant users can access `/merchant/*`.
 * - Dispatcher users can access `/dispatcher/*`.
 * - Cross-role access to `/admin/*` is strictly forbidden to non-admins.
 * - Registration routes are available until a role is assigned.
 */
export function isRouteAllowedForRole(pathname: string, role?: string | null): boolean {
  const normalizedRole = role?.trim().toLowerCase() ?? "";

  if (isRegistrationRoute(pathname)) {
    return !hasAssignedRole(normalizedRole);
  }

  // Admin section: strictly admin only
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return normalizedRole === "admin";
  }

  // Courier section: courier or admin
  if (pathname === "/courier" || pathname.startsWith("/courier/")) {
    return normalizedRole === "courier" || normalizedRole === "admin";
  }

  // Dispatcher section: dispatcher or admin
  if (pathname === "/dispatcher" || pathname.startsWith("/dispatcher/")) {
    return normalizedRole === "dispatcher" || normalizedRole === "admin";
  }

  // Merchant section: merchant or admin
  if (pathname === "/merchant" || pathname.startsWith("/merchant/")) {
    // Merchant onboarding pages and public portal landing are accessible to all
    if (
      pathname === "/merchant" ||
      pathname === "/merchant/register" ||
      pathname.startsWith("/merchant/register") ||
      pathname === "/merchant/login" ||
      pathname === "/merchant/application-status"
    ) {
      return true;
    }
    return normalizedRole === "merchant" || normalizedRole === "admin";
  }

  // All other routes (e.g. public pages, /register, /customer/register, home) are open
  return true;
}

/**
 * Safely resolves the user's role name from Supabase auth metadata first,
 * then falls back to `profiles -> roles(name)`.
 */
export async function resolveUserRole(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<string | null> {
  if (!userId) return null;

  try {
    // 1. Check direct auth metadata (fastest & works with or without RLS)
    const { data: authData } = await supabase.auth.getUser();
    const metaRole =
      (authData?.user?.app_metadata?.role as string) ||
      (authData?.user?.user_metadata?.role as string);

    if (
      metaRole &&
      metaRole.toLowerCase() !== "authenticated" &&
      metaRole.toLowerCase() !== "anon"
    ) {
      const normalizedMeta = metaRole.trim().toLowerCase();
      if (normalizedMeta === "merchant") {
        if (typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("nexdrop_merchant_application");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.approval_status === "approved") {
                return "merchant";
              }
            }
          } catch {}
          return "unassigned";
        }
      }
      return normalizedMeta;
    }
  } catch {
    // Continue to database profiles fallback
  }

  try {
    // 2. Query profiles table joined with roles
    const { data, error } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      const rolesValue = (data as { roles?: { name?: string } | Array<{ name?: string }> | null }).roles;
      const roleName = Array.isArray(rolesValue) ? rolesValue[0]?.name : rolesValue?.name;
      if (roleName) return roleName.trim().toLowerCase();
    }
  } catch {
    // Continue to browser fallback
  }

  try {
    // 3. Browser-stored active role (e.g. merchant application submitted/approved)
    if (typeof window !== "undefined") {
      const localRole = localStorage.getItem("nexdrop_user_role");
      if (localRole && ["admin", "courier", "dispatcher", "customer"].includes(localRole.toLowerCase())) {
        return localRole.trim().toLowerCase();
      }
      if (localRole && localRole.toLowerCase() === "merchant") {
        try {
          const stored = localStorage.getItem("nexdrop_merchant_application");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.approval_status === "approved") {
              return "merchant";
            }
          }
        } catch { }
      }
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}

/**
 * Safely resolves the destination route for an authenticated user based on
 * `profiles -> roles` or auth metadata. If a target `preferredPath` is supplied
 * and authorized for that role, it is preserved; otherwise falls back to the
 * user's role dashboard (or /register for new accounts).
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
