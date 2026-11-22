"use client";

import { useEffect, useState } from "react";
import { getCustomerProfile } from "../api/customer.api";
import { mapCustomerProfile } from "../api/customer.mappers";
import { customerDashboardConfig } from "../config/dashboard.config";
import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";
import type { DashboardUser } from "@/lib/dashboard/types";

/**
 * Client component that fetches customer profile and renders the user chip.
 * Avoids unstable Date.now() server prerendering issues and dynamically
 * reflects the active user session in the browser.
 */
export function CustomerTopbarUser({ profileHref }: { profileHref: string }) {
  const [user, setUser] = useState<DashboardUser | null>(null);

  useEffect(() => {
    let active = true;
    getCustomerProfile()
      .then((profileDto) => {
        if (!active) return;
        const profile = mapCustomerProfile(profileDto);
        setUser({
          id: profile.id,
          name: profile.fullName,
          roleLabel: customerDashboardConfig.roleLabel,
        });
      })
      .catch(() => {
        // Fallback on error
      });

    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return <CustomerTopbarUserSkeleton />;
  }

  return <TopbarProfileLink user={user} profileHref={profileHref} />;
}

/**
 * Skeleton matching the profile link size to prevent layout shift.
 */
export function CustomerTopbarUserSkeleton() {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg px-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/50" />
      <div className="hidden sm:block space-y-1">
        <div className="w-20 h-3.5 bg-white/50 rounded" />
        <div className="w-16 h-3 bg-white/40 rounded" />
      </div>
    </div>
  );
}
