"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { LogisticsSceneBackground } from "@/components/auth/logistics-scene-background";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";

export function LoginView() {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Reset any legacy stuck dark state from localStorage
    localStorage.removeItem("nexdrop-theme");
    document.documentElement.classList.remove("dark");
    setIsDark(false);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <main className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans antialiased text-[#071911] selection:bg-[#22c55e]/20 transition-colors duration-500">
        {/* 1. Full-bleed 3D Logistics City & Fleet Illustration */}
        <LogisticsSceneBackground isDark={isDark} />

        {/* 2. Top Navigation Bar */}
        <header className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
          {/* Brand Logo */}
          <Link
            href="/"
            className="transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071911] rounded-lg"
            aria-label="NexDrop Home"
          >
            <NexDropLogo size="md" />
          </Link>

          {/* Theme Toggle Pill (Sun in Light Mode, Moon in Dark Mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#071911] shadow-[0_2px_8px_rgba(7,25,17,0.08)] border border-[#e1ece5] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071911]"
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-emerald-600 transition-transform duration-300" />
            ) : (
              <Sun className="h-4 w-4 text-[#071911] transition-transform duration-300" />
            )}
          </button>
        </header>

        {/* 3. Dead-Center Authentication Experience */}
        <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <div className="w-full max-w-[420px] flex flex-col items-center">
            {/* Welcome Header (Bold, solid black #071911 typography - 100% visible and punchy) */}
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-[38px] font-extrabold tracking-tight text-[#071911] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                Welcome back
              </h1>
              <p className="mt-1.5 text-[15px] font-semibold text-[#1e3b2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Sign in to open your workspace.
              </p>
            </div>

            {/* Floating Pure White Card (ALWAYS pure white #ffffff, matching Waypoint Go) */}
            <div className="w-full rounded-[28px] bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(7,25,17,0.09),0_1px_4px_rgba(7,25,17,0.04)] border border-[#e5eee8]">
              <SupabaseAuthForm
                providers={["google"]}
                onSuccessRedirect="/courier/dashboard"
              />
            </div>

            {/* Offline Sync Subtitle Note */}
            <p className="mt-6 max-w-[340px] text-center text-xs font-semibold leading-relaxed text-[#1e3b2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              After your first sign-in, NexDrop keeps working offline. Your work syncs when the connection returns.
            </p>
          </div>
        </div>

        {/* 4. Minimalist Bottom Copyright */}
        <footer className="relative z-20 py-4 text-center text-[11px] font-semibold text-[#1e3b2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
          <span>&copy; 2026 NexDrop Logistics Inc. • All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
