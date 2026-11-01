"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (/(auth|token|session)/i.test(cookie.name)) {
      cookieStore.delete(cookie.name);
    }
  }

  redirect("/");
}
