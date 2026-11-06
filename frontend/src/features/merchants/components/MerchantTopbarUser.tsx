"use client";

import { useEffect, useState } from "react";
import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";
import type { DashboardUser } from "@/lib/dashboard/types";
import { MOCK_API_CREDENTIALS } from "../data/mock-merchant-data";

export function MerchantTopbarUser({ profileHref }: { profileHref: string }) {
  const [businessName, setBusinessName] = useState(MOCK_API_CREDENTIALS.businessName);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nexdrop_merchant_application");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.business_name) {
          setBusinessName(parsed.business_name);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const user: DashboardUser = {
    id: "merchant-curr",
    name: businessName,
    roleLabel: "Verified Merchant",
  };

  return <TopbarProfileLink user={user} profileHref={profileHref} />;
}

export function MerchantTopbarUserSkeleton() {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg px-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/50" />
      <div className="hidden sm:block space-y-1">
        <div className="w-24 h-3.5 bg-white/50 rounded" />
        <div className="w-16 h-3 bg-white/40 rounded" />
      </div>
    </div>
  );
}

