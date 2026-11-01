"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { LogisticsSceneBackground } from "@/components/auth/logistics-scene-background";
import { AuthForm } from "@/components/auth/auth-form";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export function LoginView() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [authStep, setAuthStep] = useState<"credentials" | "verify_email">("credentials");
  const [pendingEmail, setPendingEmail] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "sign_up") {
      setAuthMode("sign_up");
    }

    const stepParam = params.get("step");
    const emailParam = params.get("email");
    if (stepParam === "verify") {
      setAuthStep("verify_email");
      if (emailParam) {
        setPendingEmail(emailParam);
      }
    }

    const themeParam = params.get("theme");
    if (themeParam === "dark") {
      setIsDark(true);
      return;
    }
    if (themeParam === "light") {
      setIsDark(false);
      return;
    }
    const saved = localStorage.getItem("nexdrop-theme");
    if (saved === "dark") {
      setIsDark(true);
    } else {
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem("nexdrop-theme", nextTheme ? "dark" : "light");
  };

  const getHeaderTitle = () => {
    if (authStep === "verify_email") {
      return "Confirm your email";
    }
    return authMode === "sign_up" ? "Create an account" : "Welcome back";
  };

  const getHeaderSubtitle = () => {
    if (authStep === "verify_email") {
      return "Enter the 6-digit confirmation code below.";
    }
    return authMode === "sign_up"
      ? "Sign up to start dispatching and delivering."
      : "Sign in to open your workspace.";
  };

  return (
    <div className={isDark ? "dark-theme" : "light-theme"}>
      <main
        className={`relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans antialiased transition-colors duration-500 ${
          isDark ? "text-[#f1f8f4]" : "text-[#071911]"
        }`}
      >
        {/* 1. Full-bleed 3D Logistics City & Fleet Illustration */}
        <LogisticsSceneBackground isDark={isDark} />

        {/* 2. Top Navigation Bar */}
        <header className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
          {/* Brand Logo */}
          <Link
            href="/"
            className="transition-transform duration-200 hover:scale-[1.02] focus:outline-none rounded-lg"
            aria-label="NexDrop Home"
          >
            <NexDropLogo variant={isDark ? "dark" : "default"} size="md" />
          </Link>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 focus:outline-none ${
              isDark
                ? "bg-[#0c1f17]/95 text-emerald-300 border border-[#1b3f2f] shadow-[0_2px_12px_rgba(0,0,0,0.5)] hover:bg-[#142c21]"
                : "bg-white/95 text-[#071911] border border-[#e1ece5] shadow-[0_2px_8px_rgba(7,25,17,0.08)] hover:bg-white"
            }`}
          >
            {mounted && isDark ? (
              <Moon className="h-4 w-4 text-emerald-300 transition-transform duration-300" />
            ) : (
              <Sun className="h-4 w-4 text-[#071911] transition-transform duration-300" />
            )}
          </button>
        </header>

        {/* 3. Dead-Center Authentication Experience */}
        <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <div className="w-full max-w-[420px] flex flex-col items-center">
            {/* Dynamic Welcome Header */}
            <div className="text-center mb-6">
              <h1
                className={`text-3xl sm:text-[38px] font-extrabold tracking-tight leading-tight transition-colors duration-300 ${
                  isDark
                    ? "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
                    : "text-[#071911] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
                }`}
              >
                {getHeaderTitle()}
              </h1>
              <p
                className={`mt-1.5 text-[15px] font-semibold transition-colors duration-300 ${
                  isDark
                    ? "text-[#a7f3d0]"
                    : "text-[#1e3b2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
                }`}
              >
                {getHeaderSubtitle()}
              </p>
            </div>

            {/* Floating Card: Pure White in Light Mode, Frosted Obsidian in Dark Mode */}
            <div
              className={`w-full rounded-[28px] p-7 sm:p-9 backdrop-blur-md transition-all duration-300 ${
                isDark
                  ? "bg-[#0c1f17]/95 border border-[#1b3f2f] shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
                  : "bg-white border border-[#e5eee8] shadow-[0_20px_50px_rgba(7,25,17,0.09)]"
              }`}
            >
              {authStep === "verify_email" ? (
                <VerifyEmailForm
                  email={pendingEmail || "courier@nexdrop.com"}
                  isDark={isDark}
                  onSuccessRedirect="/courier/dashboard"
                  onChangeEmail={() => setAuthStep("credentials")}
                />
              ) : (
                <AuthForm
                  isDark={isDark}
                  mode={authMode}
                  onModeChange={setAuthMode}
                  onSuccessRedirect="/courier/dashboard"
                  onRequireVerification={(email) => {
                    setPendingEmail(email);
                    setAuthStep("verify_email");
                  }}
                />
              )}
            </div>

            {/* Offline Sync Subtitle Note */}
            <p
              className={`mt-6 max-w-[340px] text-center text-xs font-semibold leading-relaxed transition-colors duration-300 ${
                isDark
                  ? "text-emerald-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
                  : "text-[#1e3b2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
              }`}
            >
              After your first sign-in, NexDrop keeps working offline. Your work syncs when the connection returns.
            </p>
          </div>
        </div>

        {/* 4. Minimalist Bottom Copyright */}
        <footer
          className={`relative z-20 py-4 text-center text-[11px] font-semibold transition-colors duration-300 ${
            isDark
              ? "text-emerald-300/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
              : "text-[#1e3b2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
          }`}
        >
          <span>&copy; 2026 NexDrop Logistics Inc. • All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
