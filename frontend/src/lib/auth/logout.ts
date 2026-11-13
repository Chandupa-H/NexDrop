"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logoutAction(): Promise<never> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Fallback cookie cleanup continues below even if Supabase signOut fails.
  }

  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (/^(sb-)|.*(auth|token|session).*/i.test(cookie.name)) {
      cookieStore.delete(cookie.name);
    }
  }

  redirect("/");
}
