"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function MerchantAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nexdrop_merchant_application");
      if (!stored) {
        router.replace("/merchant/register");
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.approval_status !== "approved") {
        router.replace(
          parsed.merchant_id
            ? `/merchant/application-status?id=${parsed.merchant_id}`
            : "/merchant/application-status"
        );
        return;
      }
      setIsApproved(true);
    } catch {
      router.replace("/merchant/register");
    }
  }, [router]);

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-[#F1F5F1] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="text-xs text-gray-500 font-medium">Verifying merchant authorization…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

