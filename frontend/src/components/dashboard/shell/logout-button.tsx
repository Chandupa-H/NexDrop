"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/logout";

function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="dashboard-logout-button"
      aria-busy={pending}
      disabled={pending}
    >
      <LogOut aria-hidden="true" />
      <span>{pending ? "Signing out..." : "Log out"}</span>
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <LogoutSubmitButton />
    </form>
  );
}
