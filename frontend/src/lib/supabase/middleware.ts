import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getDashboardPathForRole,
  isProtectedRoute,
  isRouteAllowedForRole,
  resolveUserRole,
} from "@/lib/auth/routes";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validates the JWT with Supabase and refreshes expired access tokens via cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // 1. Keep already-authenticated users from re-visiting /login (unless verifying email)
  if (
    user &&
    pathname === "/login" &&
    searchParams.get("step") !== "verify"
  ) {
    const role = await resolveUserRole(supabase, user.id);
    const returnTo = searchParams.get("returnTo");

    let destination = getDashboardPathForRole(role);
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      const returnPath = returnTo.split("?")[0];
      if (isRouteAllowedForRole(returnPath, role)) {
        destination = returnTo;
      }
    }

    const redirectUrl = new URL(destination, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // 2. Role-Based Route Guards for protected dashboard routes (/admin, /courier, /merchant)
  if (isProtectedRoute(pathname)) {
    // If user is not authenticated, bounce to /login with returnTo parameter
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      const fullPath = pathname + (request.nextUrl.search || "");
      loginUrl.searchParams.set("returnTo", fullPath);

      const redirectResponse = NextResponse.redirect(loginUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }

    // Authenticated user: verify role authorization
    const role = await resolveUserRole(supabase, user.id);
    if (!isRouteAllowedForRole(pathname, role)) {
      // Forbidden for this role -> bounce to the user's assigned dashboard
      const authorizedDashboard = getDashboardPathForRole(role);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = authorizedDashboard;
      redirectUrl.search = "";

      const redirectResponse = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
