import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/courier/dashboard";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let target = next;
      const role = data.user?.user_metadata?.role;
      if (target === "/courier/dashboard") {
        if (role === "merchant") {
          target = "/merchant/dashboard";
        } else if (role === "admin") {
          target = "/admin/merchants";
        }
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}

