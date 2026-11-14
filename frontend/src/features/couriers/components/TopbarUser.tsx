"use client";

import { useEffect, useState } from "react";
import { getCourierAccountProfile } from "../api/courier.api";
import { mapCourierProfile } from "../api/courier.mappers";
import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";
import type { DashboardUser } from "@/lib/dashboard/types";

export function TopbarUser({ profileHref }: { profileHref: string }) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    getCourierAccountProfile()
      .then((profileDto) => {
        if (!active) return;
        const profile = mapCourierProfile(profileDto);
        setUser({
          id: profile.id,
          name: profile.fullName,
          roleLabel: profile.role
            .split(/[_\s]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" "),
        });
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return (
      <span className="px-2 text-xs text-destructive" role="status">
        Profile unavailable
      </span>
    );
  }
  if (!user) return <TopbarUserSkeleton />;

  return <TopbarProfileLink user={user} profileHref={profileHref} />;
}

/**
 * Skeleton matching the profile link size to prevent layout shift.
 */
export function TopbarUserSkeleton() {
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
