"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa, type ViewType } from "@supabase/auth-ui-shared";
import type { Provider, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import apiClient from "@/lib/api-client";

interface SupabaseAuthFormProps {
  view?: ViewType;
  redirectTo?: string;
  onSuccessRedirect?: string;
  providers?: Provider[];
  isDark?: boolean;
}

async function resolveDestination(user: User | null, fallbackRedirect: string): Promise<string> {
  // 1. Honor explicit redirect query if not the default courier dashboard fallback
  if (fallbackRedirect && fallbackRedirect !== "/courier/dashboard") {
    return fallbackRedirect;
  }

  const metaRole = user?.user_metadata?.role;
  let localRole: string | null = null;
  let localMerchantApp: { merchant_id?: number; email?: string; approval_status?: string } | null = null;

  if (typeof window !== "undefined") {
    try {
      localRole = localStorage.getItem("nexdrop_user_role");
      const saved = localStorage.getItem("nexdrop_merchant_application");
      if (saved) localMerchantApp = JSON.parse(saved);
    } catch {}
  }

  // 2. Administrator role detection
  if (metaRole === "admin" || localRole === "admin" || user?.email?.toLowerCase().includes("admin")) {
    return "/admin/merchants";
  }

  // 3. Merchant application detection & live approval status check
  const isMerchantCandidate =
    metaRole === "merchant" ||
    localRole === "merchant" ||
    !!localMerchantApp?.merchant_id;

  const emailToQuery = user?.email || localMerchantApp?.email;

  if (emailToQuery) {
    try {
      const identifier = localMerchantApp?.merchant_id
        ? String(localMerchantApp.merchant_id)
        : emailToQuery;
      const statusData = await apiClient.getMerchantStatus(identifier);
      if (statusData) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("nexdrop_user_role", "merchant");
            localStorage.setItem(
              "nexdrop_merchant_application",
              JSON.stringify({
                merchant_id: statusData.merchant_id,
                business_name: statusData.business_name,
                email: emailToQuery,
                approval_status: statusData.approval_status,
              })
            );
          } catch {}
        }
        if (statusData.approval_status === "approved") {
          return "/merchant/dashboard";
        }
        return `/merchant/application-status?id=${statusData.merchant_id}`;
      }
    } catch {
      // Backend check unreachable or 404, fallback to local application cache
      if (isMerchantCandidate) {
        if (localMerchantApp?.approval_status === "approved") {
          return "/merchant/dashboard";
        }
        return "/merchant/application-status";
      }
    }
  } else if (isMerchantCandidate) {
    return "/merchant/dashboard";
  }

  return "/courier/dashboard";
}

export function SupabaseAuthForm({
  view = "sign_in",
  redirectTo,
  onSuccessRedirect = "/courier/dashboard",
  providers = ["google"],
  isDark = false,
}: SupabaseAuthFormProps) {
  const router = useRouter();

  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

  const callbackUrl = redirectTo || (origin ? `${origin}/auth/callback` : undefined);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        const dest = await resolveDestination(session.user, onSuccessRedirect);
        router.push(dest);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, onSuccessRedirect]);

  return (
    <div className="w-full waypoint-auth-card">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: isDark
              ? {
                  colors: {
                    brand: "#22c55e",
                    brandAccent: "#16a34a",
                    brandButtonText: "#05140d",
                    defaultButtonBackground: "#142c21",
                    defaultButtonBackgroundHover: "#1a382a",
                    defaultButtonBorder: "#1e4735",
                    defaultButtonText: "#f1f8f4",
                    dividerBackground: "#1e4735",
                    inputBackground: "#142c21",
                    inputBorder: "#1e4735",
                    inputBorderFocus: "#22c55e",
                    inputBorderHover: "#2a6147",
                    inputText: "#f1f8f4",
                    inputLabelText: "#d1fae5",
                    inputPlaceholder: "#628775",
                    anchorTextColor: "#6ee7b7",
                    anchorTextHoverColor: "#a7f3d0",
                  },
                  radii: {
                    borderRadiusButton: "1rem",
                    buttonBorderRadius: "1rem",
                    inputBorderRadius: "1rem",
                  },
                  space: {
                    spaceSmall: "4px",
                    spaceMedium: "8px",
                    spaceLarge: "16px",
                    labelBottomMargin: "4px",
                    anchorBottomMargin: "4px",
                    emailInputSpacing: "6px",
                    socialAuthSpacing: "10px",
                    buttonPadding: "13px 18px",
                    inputPadding: "12px 16px",
                  },
                }
              : {
                  colors: {
                    brand: "#071911",
                    brandAccent: "#04100b",
                    brandButtonText: "#ffffff",
                    defaultButtonBackground: "#ffffff",
                    defaultButtonBackgroundHover: "#f7faf8",
                    defaultButtonBorder: "#e1ece5",
                    defaultButtonText: "#071911",
                    dividerBackground: "#e5eee8",
                    inputBackground: "#eff4f1",
                    inputBorder: "transparent",
                    inputBorderFocus: "#071911",
                    inputBorderHover: "#d8e6de",
                    inputText: "#071911",
                    inputLabelText: "#071911",
                    inputPlaceholder: "#7b9487",
                    anchorTextColor: "#1e3b2e",
                    anchorTextHoverColor: "#071911",
                  },
                  radii: {
                    borderRadiusButton: "1rem",
                    buttonBorderRadius: "1rem",
                    inputBorderRadius: "1rem",
                  },
                  space: {
                    spaceSmall: "4px",
                    spaceMedium: "8px",
                    spaceLarge: "16px",
                    labelBottomMargin: "4px",
                    anchorBottomMargin: "4px",
                    emailInputSpacing: "6px",
                    socialAuthSpacing: "10px",
                    buttonPadding: "13px 18px",
                    inputPadding: "12px 16px",
                  },
                },
          },
        }}
        theme={isDark ? "dark" : "light"}
        providers={providers}
        redirectTo={callbackUrl}
      />
    </div>
  );
}
