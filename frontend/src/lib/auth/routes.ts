import type { SupabaseClient } from "@supabase/supabase-js";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin/dashboard",
  courier: "/courier/dashboard",
  merchant: "/merchant",
  // Customer and dispatcher dedicated shells are pending registration in registry.ts
  customer: "/courier/dashboard",
  dispatcher: "/courier/dashboard",
};

export const DEFAULT_AUTHENTICATED_REDIRECT = "/courier/dashboard";

export function getDashboardPathForRole(role?: string | null): string {
  if (!role) return DEFAULT_AUTHENTICATED_REDIRECT;
  return ROLE_DASHBOARD_MAP[role.toLowerCase()] ?? DEFAULT_AUTHENTICATED_REDIRECT;
}

/**
 * Safely resolves the destination route for an authenticated user based on
 * `profiles -> roles`, falling back gracefully if no profile row exists yet or
 * database permissions restrict reading it.
 */
export async function resolveUserDashboardPath(
  supabase: SupabaseClient,
  userId?: string | null,
  fallback = DEFAULT_AUTHENTICATED_REDIRECT
): Promise<string> {
  if (!userId) return fallback;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return fallback;

    const rolesValue = (data as { roles?: { name?: string } | Array<{ name?: string }> | null }).roles;
    const roleName = Array.isArray(rolesValue) ? rolesValue[0]?.name : rolesValue?.name;

    return roleName ? getDashboardPathForRole(roleName) : fallback;
  } catch {
    return fallback;
  }
}

