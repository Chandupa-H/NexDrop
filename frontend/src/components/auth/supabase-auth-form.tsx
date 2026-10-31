"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa, type ViewType } from "@supabase/auth-ui-shared";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface SupabaseAuthFormProps {
  view?: ViewType;
  redirectTo?: string;
  onSuccessRedirect?: string;
  providers?: Provider[];
}

export function SupabaseAuthForm({
  view = "sign_in",
  redirectTo,
  onSuccessRedirect = "/courier/dashboard",
  providers = ["google"],
}: SupabaseAuthFormProps) {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState<string>("");

  useEffect(() => {
    setCallbackUrl(
      redirectTo || `${window.location.origin}/auth/callback`
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        router.push(onSuccessRedirect);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectTo, onSuccessRedirect]);

  return (
    <div className="w-full nexdrop-auth-card">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#059669",
                brandAccent: "#047857",
                brandButtonText: "#ffffff",
                defaultButtonBackground: "#ffffff",
                defaultButtonBackgroundHover: "#f6fbf8",
                defaultButtonBorder: "#e2ece5",
                defaultButtonText: "#0b3d2a",
                dividerBackground: "#e5eee8",
                inputBackground: "#f8faf8",
                inputBorder: "#e5eee8",
                inputBorderFocus: "#10b981",
                inputBorderHover: "#86efac",
                inputText: "#0b3d2a",
                inputLabelText: "#0b3d2a",
                inputPlaceholder: "#8da194",
                anchorTextColor: "#059669",
                anchorTextHoverColor: "#047857",
              },
              radii: {
                borderRadiusButton: "0.75rem",
                buttonBorderRadius: "0.75rem",
                inputBorderRadius: "0.75rem",
              },
              space: {
                spaceSmall: "4px",
                spaceMedium: "8px",
                spaceLarge: "16px",
                labelBottomMargin: "6px",
                anchorBottomMargin: "4px",
                emailInputSpacing: "6px",
                socialAuthSpacing: "10px",
                buttonPadding: "12px 18px",
                inputPadding: "12px 14px",
              },
            },
          },
        }}
        theme="light"
        providers={providers}
        redirectTo={callbackUrl}
      />
    </div>
  );
}
