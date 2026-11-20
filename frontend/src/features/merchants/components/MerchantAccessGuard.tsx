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
        // ── Step 1: Check localStorage cache (fastest path) ──────────────
        const stored = localStorage.getItem("nexdrop_merchant_application");
        const parsed = stored ? JSON.parse(stored) : null;

        if (parsed?.approval_status === "approved") {
          // Immediately grant access from cache, re-validate in background
          if (isMounted) setIsApproved(true);
          // Background refresh to pick up any admin status changes
          try {
            const bgStatus = await apiClient.getMerchantStatusMe().catch(() =>
              supabase.auth.getUser().then(({ data }) =>
                data?.user?.email ? apiClient.getMerchantStatus(data.user.email) : Promise.reject()
              )
            );
            if (bgStatus?.merchant_id) {
              localStorage.setItem(
                "nexdrop_merchant_application",
                JSON.stringify({
                  merchant_id: bgStatus.merchant_id,
                  business_name: bgStatus.business_name,
                  email: bgStatus.merchant_id ? parsed?.email : undefined,
                  approval_status: bgStatus.approval_status,
                })
              );
              if (isMounted && bgStatus.approval_status !== "approved") {
                setIsApproved(false);
                router.replace(`/merchant/application-status?id=${bgStatus.merchant_id}`);
              }
            }
          } catch {
            // Background refresh failed — keep showing dashboard (cached data was approved)
          }
          return;
        }

        // ── Step 2: Get Supabase auth user ────────────────────────────────
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        const email = user?.email;

        if (!user || !email) {
          if (isMounted) router.replace("/login?returnTo=/merchant/dashboard");
          return;
        }

        // ── Step 3: Check Supabase auth metadata (set during registration) ─
        // supabase.auth.updateUser({ data: { role: "merchant" } }) is called
        // on registration, so this is a reliable signal the user IS a merchant.
        const metaRole =
          (user.app_metadata?.role as string | undefined) ||
          (user.user_metadata?.role as string | undefined);

        const isSupabaseMerchant = metaRole?.toLowerCase() === "merchant";

        // ── Step 4: Try backend status lookup ────────────────────────────
        // Primary: authenticated endpoint (JWT-based, most reliable)
        // Fallback: email-string lookup (may fail if email casing mismatch)
        let statusData = null;
        try {
          statusData = await apiClient.getMerchantStatusMe();
        } catch {
          // Authenticated lookup failed — try by email string
          try {
            statusData = await apiClient.getMerchantStatus(email);
          } catch {
            // Both lookups failed — fall through to Supabase metadata fallback
          }
        }

        if (statusData?.merchant_id) {
          const refreshed = {
            merchant_id: statusData.merchant_id,
            business_name: statusData.business_name,
            email,
            approval_status: statusData.approval_status,
          };
          localStorage.setItem("nexdrop_merchant_application", JSON.stringify(refreshed));
          localStorage.setItem("nexdrop_user_role", "merchant");
          document.cookie = "nexdrop_user_role=merchant; path=/; max-age=2592000; SameSite=Lax";

          if (!isMounted) return;

          if (statusData.approval_status === "approved") {
            setIsApproved(true);
          } else {
            router.replace(
              `/merchant/application-status?id=${statusData.merchant_id}`
            );
          }
          return;
        }

        if (!isMounted) return;

        // ── Step 5: Supabase metadata fallback ───────────────────────────
        // If the backend doesn't have a record (e.g. in-memory was cleared on
        // restart) but Supabase metadata confirms they are a merchant, trust it.
        // The localStorage had no "approved" data, so we check "pending" too.
        if (isSupabaseMerchant) {
          // Supabase says merchant — check if there's any cached data about approval
          if (parsed?.merchant_id) {
            if (parsed.approval_status === "approved") {
              setIsApproved(true);
            } else {
              router.replace(
                parsed.merchant_id
                  ? `/merchant/application-status?id=${parsed.merchant_id}`
                  : "/merchant/application-status"
              );
            }
          } else {
            // Backend is down/cleared and no local cache — grant access since
            // Supabase auth metadata confirms merchant role (set on registration)
            localStorage.setItem("nexdrop_user_role", "merchant");
            document.cookie = "nexdrop_user_role=merchant; path=/; max-age=2592000; SameSite=Lax";
            setIsApproved(true);
          }
          return;
        }

        // ── Step 6: No merchant record found anywhere ─────────────────────
        if (parsed?.merchant_id) {
          router.replace(
            parsed.approval_status !== "approved"
              ? `/merchant/application-status?id=${parsed.merchant_id}`
              : "/merchant/register"
          );
        } else {
          router.replace("/merchant/register");
        }
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

