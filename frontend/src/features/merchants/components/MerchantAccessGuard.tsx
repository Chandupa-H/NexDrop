"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import apiClient from "@/lib/api-client";

export function MerchantAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        let stored = localStorage.getItem("nexdrop_merchant_application");
        let parsed = stored ? JSON.parse(stored) : null;

        // If local cache is missing (e.g. fresh sign-in after logout), restore from backend
        if (!parsed) {
          const { data: authData } = await supabase.auth.getUser();
          const email = authData?.user?.email;
          if (email) {
            try {
              const statusData = await apiClient.getMerchantStatus(email);
              if (statusData?.merchant_id) {
                parsed = {
                  merchant_id: statusData.merchant_id,
                  business_name: statusData.business_name,
                  email,
                  approval_status: statusData.approval_status,
                };
                localStorage.setItem("nexdrop_merchant_application", JSON.stringify(parsed));
                localStorage.setItem("nexdrop_user_role", "merchant");
                document.cookie = "nexdrop_user_role=merchant; path=/; max-age=2592000; SameSite=Lax";
              }
            } catch {
              // Not a registered merchant
            }
          }
        }

        if (!isMounted) return;

        if (!parsed) {
          router.replace("/merchant/register");
          return;
        }

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
        if (isMounted) {
          router.replace("/merchant/register");
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
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

