import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { DEFAULT_AUTHENTICATED_REDIRECT, resolveUserDashboardPath } from "@/lib/auth/routes";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const safeNext =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  if (code) {
    const cookieStore = await cookies();
    const cookiesToSetOnResponse: Array<{
      name: string;
      value: string;
      options: CookieOptions;
    }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((cookie) => {
              cookiesToSetOnResponse.push(cookie);
              try {
                cookieStore.set(cookie.name, cookie.value, cookie.options);
              } catch {
                // Handled explicitly when attaching cookies to the redirect response.
              }
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      let targetPath = safeNext ?? DEFAULT_AUTHENTICATED_REDIRECT;
      if (!safeNext || safeNext === DEFAULT_AUTHENTICATED_REDIRECT) {
        targetPath = await resolveUserDashboardPath(
          supabase,
          data.user?.id,
          DEFAULT_AUTHENTICATED_REDIRECT
        );
      }

      const response = NextResponse.redirect(`${origin}${targetPath}`);
      cookiesToSetOnResponse.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
