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
  providers = [],
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
    <div className="w-full">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#2563eb",
                brandAccent: "#1d4ed8",
                inputBackground: "#ffffff",
                inputText: "#111827",
                inputBorder: "#e5e7eb",
                inputBorderFocus: "#2563eb",
                inputBorderHover: "#d1d5db",
              },
              radii: {
                borderRadiusButton: "0.5rem",
                buttonBorderRadius: "0.5rem",
                inputBorderRadius: "0.5rem",
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
