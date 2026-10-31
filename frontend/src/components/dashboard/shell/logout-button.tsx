"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/logout";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="dashboard-logout-button"
      aria-busy={isPending}
      onClick={() =>
        startTransition(async () => {
          await logoutAction();
        })
      }
    >
      <LogOut aria-hidden="true" />
      <span>{isPending ? "Signing out..." : "Log out"}</span>
    </button>
  );
}
