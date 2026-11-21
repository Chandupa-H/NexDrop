"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import apiClient, { ApiError } from "@/lib/api-client";

export function MerchantAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          if (isMounted) router.replace("/login?returnTo=/merchant/dashboard");
          return;
        }

        const statusData = await apiClient.getMerchantStatusMe();
        if (!isMounted) return;

        try {
          localStorage.setItem(
            "nexdrop_merchant_application",
            JSON.stringify({
              merchant_id: statusData.merchant_id,
              business_name: statusData.business_name,
              email: authData.user.email,
              approval_status: statusData.approval_status,
            })
          );
          localStorage.setItem("nexdrop_user_role", "merchant");
          document.cookie =
            "nexdrop_user_role=merchant; path=/; max-age=2592000; SameSite=Lax";
        } catch {
          // The backend status remains authoritative if browser storage is unavailable.
        }

        if (statusData.approval_status === "approved") {
          setIsApproved(true);
          return;
        }

        router.replace(`/merchant/application-status?id=${statusData.merchant_id}`);
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login?returnTo=/merchant/dashboard");
          return;
        }
        setVerificationError(
          error instanceof ApiError && error.status === 404
            ? "No backend merchant application is linked to this account. An administrator must link and approve the merchant profile before dashboard and webhook access is available."
            : "Merchant access could not be verified with the backend. Please try again later."
        );
      }
    }

    void checkAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (verificationError) {
    return (
      <main className="min-h-screen bg-[#F1F5F1] flex items-center justify-center p-6">
        <section
          className="max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <h1 className="text-lg font-bold text-gray-900">
            Merchant access could not be verified
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{verificationError}</p>
        </section>
      </main>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-[#F1F5F1] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="text-xs text-gray-500 font-medium">
            Verifying merchant authorization…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
