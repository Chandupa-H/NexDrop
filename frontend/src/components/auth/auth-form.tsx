"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveUserDashboardPath } from "@/lib/auth/routes";

interface AuthFormProps {
  isDark?: boolean;
  mode: "sign_in" | "sign_up";
  onModeChange: (mode: "sign_in" | "sign_up") => void;
  onSuccessRedirect?: string;
  onRequireVerification: (email: string) => void;
}

export function AuthForm({
  isDark = false,
  mode,
  onModeChange,
  onSuccessRedirect,
  onRequireVerification,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = () => {
    setError(null);
    const nextMode = mode === "sign_in" ? "sign_up" : "sign_in";
    onModeChange(nextMode);
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback${onSuccessRedirect ? `?next=${encodeURIComponent(onSuccessRedirect)}` : ""}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setIsGoogleLoading(false);
      }
    } catch {
      setError("Failed to initialize Google authentication.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in both your email and password.");
      return;
    }

    if (mode === "sign_up" && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "sign_in") {
        // Sign In Flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || "Invalid email or password.");
          setIsLoading(false);
          return;
        }

        if (data.session) {
          const target = await resolveUserDashboardPath(
            supabase,
            data.user?.id,
            onSuccessRedirect
          );
          router.replace(target);
          router.refresh();
        }
      } else {
        // Sign Up Flow - brand new accounts redirect to /register to choose Customer or Merchant
        const signUpDestination = "/register";
        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(signUpDestination)}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
          },
        });

        if (signUpError) {
          if (signUpError.message?.toLowerCase().includes("rate limit")) {
            setError(
              "Supabase email rate limit exceeded (free-tier default SMTP allows ~3-4 emails/hr). To test freely, turn off 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email."
            );
          } else {
            setError(signUpError.message);
          }
          setIsLoading(false);
          return;
        }

        // If session is returned immediately (email confirmation disabled in Supabase)
        if (data.session) {
          router.replace(signUpDestination);
          router.refresh();
          return;
        }

        // Standard flow: Email confirmation is required! Trigger OTP verification view
        setIsLoading(false);
        onRequireVerification(email);
      }
    } catch {
      setError("An unexpected authentication error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* 1. Google OAuth One-Click Button */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isGoogleLoading || isLoading}
        className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isDark
            ? "bg-[#142c21] text-[#f1f8f4] border-1.5 border-[#1e4735] shadow-[0_2px_6px_rgba(0,0,0,0.3)] hover:bg-[#1a382a] hover:border-[#2a6147]"
            : "bg-white text-[#071911] border-1.5 border-[#e1ece5] shadow-[0_1px_3px_rgba(7,25,17,0.04)] hover:bg-[#f7faf8] hover:border-[#c5ded2]"
        }`}
      >
        {isGoogleLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{mode === "sign_in" ? "Sign in with Google" : "Sign up with Google"}</span>
      </button>

      {/* 2. Styled Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div
          className={`w-full border-t transition-colors ${
            isDark ? "border-[#1e4735]" : "border-[#e5eee8]"
          }`}
        />
        <span
          className={`absolute px-3 text-[11px] font-bold uppercase tracking-wider ${
            isDark ? "bg-[#0c1f17] text-[#628775]" : "bg-white text-[#7b9487]"
          }`}
        >
          or
        </span>
      </div>

      {/* 3. Credentials Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className={`block text-xs font-bold mb-1.5 transition-colors ${
              isDark ? "text-[#d1fae5]" : "text-[#071911]"
            }`}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            disabled={isLoading}
            className={`w-full h-12 px-4 rounded-2xl text-sm font-medium transition-all duration-150 focus:outline-none ${
              isDark
                ? "bg-[#142c21] text-[#f1f8f4] border border-[#1e4735] placeholder-[#628775] focus:border-[#22c55e] focus:bg-[#0d2218] focus:ring-1 focus:ring-[#22c55e]"
                : "bg-[#eff4f1] text-[#071911] border border-transparent placeholder-[#7b9487] focus:border-[#071911] focus:bg-white focus:ring-1 focus:ring-[#071911]"
            }`}
          />
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className={`block text-xs font-bold transition-colors ${
                isDark ? "text-[#d1fae5]" : "text-[#071911]"
              }`}
            >
              Password
            </label>
            {mode === "sign_in" && (
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact your workspace administrator to reset your credentials.");
                }}
                className={`text-[11px] font-semibold transition-colors ${
                  isDark
                    ? "text-[#6ee7b7] hover:text-[#a7f3d0]"
                    : "text-[#1e3b2e] hover:text-[#071911] hover:underline"
                }`}
              >
                Forgot password?
              </a>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "sign_up" ? "Min. 6 characters" : "••••••••••••"}
              disabled={isLoading}
              className={`w-full h-12 pl-4 pr-11 rounded-2xl text-sm font-medium transition-all duration-150 focus:outline-none ${
                isDark
                  ? "bg-[#142c21] text-[#f1f8f4] border border-[#1e4735] placeholder-[#628775] focus:border-[#22c55e] focus:bg-[#0d2218] focus:ring-1 focus:ring-[#22c55e]"
                  : "bg-[#eff4f1] text-[#071911] border border-transparent placeholder-[#7b9487] focus:border-[#071911] focus:bg-white focus:ring-1 focus:ring-[#071911]"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors cursor-pointer ${
                isDark ? "text-[#628775] hover:text-[#d1fae5]" : "text-[#7b9487] hover:text-[#071911]"
              }`}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className={`w-full flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium ${
              isDark
                ? "bg-red-950/70 border border-red-800 text-red-200"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className={`w-full h-12 mt-1.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? "bg-[#22c55e] text-[#05140d] shadow-[0_4px_16px_rgba(34,197,94,0.35)] hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.45)]"
              : "bg-[#071911] text-white shadow-[0_4px_12px_rgba(7,25,17,0.15)] hover:bg-[#04100b] hover:shadow-[0_6px_18px_rgba(7,25,17,0.22)]"
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{mode === "sign_in" ? "Signing In..." : "Creating Account..."}</span>
            </>
          ) : (
            <>
              <span>{mode === "sign_in" ? "Sign In" : "Create Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* 4. Footer Mode Toggle */}
      <div className="mt-5 text-center text-xs font-semibold">
        {mode === "sign_in" ? (
          <p className={isDark ? "text-[#a7f3d0]" : "text-[#1e3b2e]"}>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={toggleMode}
              className={`font-bold hover:underline cursor-pointer ${
                isDark ? "text-white" : "text-[#071911]"
              }`}
            >
              Sign up
            </button>
          </p>
        ) : (
          <p className={isDark ? "text-[#a7f3d0]" : "text-[#1e3b2e]"}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={toggleMode}
              className={`font-bold hover:underline cursor-pointer ${
                isDark ? "text-white" : "text-[#071911]"
              }`}
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
