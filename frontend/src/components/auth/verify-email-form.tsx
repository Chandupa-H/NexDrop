"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveUserDashboardPath } from "@/lib/auth/routes";

interface VerifyEmailFormProps {
  email: string;
  isDark?: boolean;
  onSuccessRedirect?: string;
  onChangeEmail: () => void;
}

export function VerifyEmailForm({
  email,
  isDark = false,
  onSuccessRedirect = "/courier/dashboard",
  onChangeEmail,
}: VerifyEmailFormProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = useCallback(async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join("").trim();
    if (code.length < 6) {
      setError("Please enter all 6 digits of your confirmation code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid or expired passcode. Please try again.");
        setIsLoading(false);
        return;
      }

      const target = await resolveUserDashboardPath(
        supabase,
        data.user?.id ?? data.session?.user?.id,
        onSuccessRedirect
      );
      router.replace(target);
      router.refresh();
    } catch {
      setError("Verification failed. Please check the code or click the link in your email.");
      setIsLoading(false);
    }
  }, [digits, email, onSuccessRedirect, router]);

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleaned = value.replace(/\D/g, "");

    // Handle multi-character input (paste or fast typing)
    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 6).split("");
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedDigits[i] || "";
      }
      setDigits(newDigits);
      const nextFocus = Math.min(cleaned.length, 5);
      inputRefs.current[nextFocus]?.focus();

      if (newDigits.every((d) => d !== "")) {
        handleVerify(newDigits.join(""));
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // If a digit was entered, move to the next field
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (cleaned && index === 5 && newDigits.every((d) => d !== "")) {
      handleVerify(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();

    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setResendStatus(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        if (resendError.message?.toLowerCase().includes("rate limit")) {
          setError(
            "Email rate limit reached for this hour. Please wait a bit or turn off 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email."
          );
        } else {
          setError(resendError.message);
        }
      } else {
        setResendStatus("New passcode sent to your inbox!");
        setCooldown(60);
      }
    } catch {
      setError("Failed to resend confirmation email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Icon Badge */}
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
          isDark
            ? "bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
            : "bg-emerald-50 border border-emerald-200 text-[#071911] shadow-[0_2px_8px_rgba(7,25,17,0.06)]"
        }`}
      >
        <Mail className="w-7 h-7 animate-pulse" />
      </div>

      {/* Target Email Indicator */}
      <div className="text-center mb-6">
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-emerald-400" : "text-[#1e3b2e]"
          }`}
        >
          Verification sent to
        </p>
        <p
          className={`text-sm font-bold mt-0.5 truncate max-w-[280px] sm:max-w-[340px] ${
            isDark ? "text-white" : "text-[#071911]"
          }`}
          title={email}
        >
          {email}
        </p>
      </div>

      {/* 6-Digit Passcode Inputs */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full mb-5">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            className={`w-11 h-14 sm:w-12 sm:h-15 text-center text-xl sm:text-2xl font-black rounded-xl transition-all duration-150 focus:outline-none ${
              isDark
                ? "bg-[#142c21] text-white border-2 border-[#1e4735] focus:border-[#22c55e] focus:bg-[#0d2218] focus:shadow-[0_0_12px_rgba(34,197,94,0.35)]"
                : "bg-[#eff4f1] text-[#071911] border-2 border-transparent focus:border-[#071911] focus:bg-white focus:shadow-[0_2px_8px_rgba(7,25,17,0.12)]"
            }`}
            aria-label={`Digit ${idx + 1}`}
          />
        ))}
      </div>

      {/* Error Message Alert */}
      {error && (
        <div
          className={`w-full flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium mb-4 ${
            isDark
              ? "bg-red-950/70 border border-red-800 text-red-200"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Resend Success Alert */}
      {resendStatus && (
        <div
          className={`w-full flex items-center gap-2 p-3 rounded-xl text-xs font-medium mb-4 ${
            isDark
              ? "bg-emerald-950/70 border border-emerald-800 text-emerald-200"
              : "bg-emerald-50 border border-emerald-200 text-emerald-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{resendStatus}</span>
        </div>
      )}

      {/* Primary Verification Button */}
      <button
        type="button"
        onClick={() => handleVerify()}
        disabled={isLoading || digits.join("").length < 6}
        className={`w-full h-12 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isDark
            ? "bg-[#22c55e] text-[#05140d] shadow-[0_4px_16px_rgba(34,197,94,0.35)] hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.45)]"
            : "bg-[#071911] text-white shadow-[0_4px_12px_rgba(7,25,17,0.15)] hover:bg-[#04100b] hover:shadow-[0_6px_18px_rgba(7,25,17,0.22)]"
        }`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifying Passcode...</span>
          </>
        ) : (
          <>
            <span>Verify &amp; Continue</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Helper Links: Resend and Change Email */}
      <div className="w-full flex flex-col items-center gap-2.5 mt-5 text-xs font-semibold">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className={`transition-colors cursor-pointer disabled:cursor-not-allowed ${
            isDark
              ? "text-emerald-400 hover:text-emerald-300 disabled:text-emerald-700"
              : "text-[#071911] hover:underline disabled:text-neutral-400"
          }`}
        >
          {isResending
            ? "Sending new passcode..."
            : cooldown > 0
            ? `Resend code in ${cooldown}s`
            : "Didn't receive the code? Resend"}
        </button>

        <button
          type="button"
          onClick={onChangeEmail}
          className={`hover:underline cursor-pointer ${
            isDark ? "text-emerald-300/70 hover:text-emerald-200" : "text-[#1e3b2e]"
          }`}
        >
          Entered the wrong email? Change email
        </button>
      </div>

      {/* Alternative Magic Link Hint */}
      <div
        className={`w-full mt-5 pt-4 border-t text-center text-[11px] leading-relaxed font-medium ${
          isDark ? "border-[#1e4735] text-[#9ec4b2]" : "border-[#e5eee8] text-[#4b6b5c]"
        }`}
      >
        <span>Tip: You can also open the confirmation link directly from your email to verify automatically.</span>
      </div>
    </div>
  );
}

