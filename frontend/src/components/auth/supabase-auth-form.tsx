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
    <div className="w-full waypoint-auth-card">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
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
        theme="light"
        providers={providers}
        redirectTo={callbackUrl}
      />
    </div>
  );
}
