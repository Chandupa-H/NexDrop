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
  theme?: "light" | "dark";
}

export function SupabaseAuthForm({
  view = "sign_in",
  redirectTo,
  onSuccessRedirect = "/courier/dashboard",
  providers = ["google"],
  theme = "light",
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
                anchorTextColor: "#557063",
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
            dark: {
              colors: {
                brand: "#22c55e",
                brandAccent: "#16a34a",
                brandButtonText: "#071911",
                defaultButtonBackground: "#11281e",
                defaultButtonBackgroundHover: "#163629",
                defaultButtonBorder: "#1e4534",
                defaultButtonText: "#f1f8f4",
                dividerBackground: "#1e4534",
                inputBackground: "#11281e",
                inputBorder: "#1e4534",
                inputBorderFocus: "#22c55e",
                inputBorderHover: "#2a5f47",
                inputText: "#f1f8f4",
                inputLabelText: "#d1e7dc",
                inputPlaceholder: "#628775",
                anchorTextColor: "#8dd8af",
                anchorTextHoverColor: "#4ade80",
              },
              radii: {
                borderRadiusButton: "1rem",
                buttonBorderRadius: "1rem",
                inputBorderRadius: "1rem",
              },
            },
          },
        }}
        theme={theme}
        providers={providers}
        redirectTo={callbackUrl}
      />
    </div>
  );
}
