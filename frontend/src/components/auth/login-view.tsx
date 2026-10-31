"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { LogisticsSceneBackground } from "@/components/auth/logistics-scene-background";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";

export function LoginView() {
  // Always default to false (Light Theme) unless user explicitly saved "dark"
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("nexdrop-theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem("nexdrop-theme", nextTheme ? "dark" : "light");
    if (nextTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <main className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans antialiased text-[#071911] dark:text-[#f1f8f4] selection:bg-[#22c55e]/20 transition-colors duration-500">
        {/* 1. Full-bleed Atmospheric Architectural Scene */}
        <LogisticsSceneBackground isDark={isDark} />

        {/* 2. Top Navigation Bar */}
        <header className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
          {/* Brand Logo */}
          <Link
            href="/"
            className="transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071911] dark:focus-visible:ring-[#22c55e] rounded-lg"
            aria-label="NexDrop Home"
          >
            <NexDropLogo variant={isDark ? "dark" : "default"} size="md" />
          </Link>

          {/* Theme Toggle Pill (In Light mode shows Sun icon matching screenshot; Moon in Dark mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-[#0c1f17]/90 text-[#435b50] dark:text-[#a7f3d0] shadow-[0_2px_8px_rgba(7,25,17,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] border border-[#e1ece5] dark:border-[#1b3d2c] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white dark:hover:bg-[#122c20] hover:text-[#071911] dark:hover:text-[#4ade80] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071911] dark:focus-visible:ring-[#22c55e]"
          >
            {mounted && isDark ? (
              <Moon className="h-4 w-4 text-emerald-300 transition-transform duration-300" />
            ) : (
              <Sun className="h-4 w-4 text-[#435b50] transition-transform duration-300" />
            )}
          </button>
        </header>

        {/* 3. Dead-Center Authentication Experience */}
        <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <div className="w-full max-w-[420px] flex flex-col items-center">
            {/* Welcome Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-[38px] font-extrabold tracking-tight text-[#071911] dark:text-white leading-tight transition-colors duration-300">
                Welcome back
              </h1>
              <p className="mt-1.5 text-[15px] text-[#557063] dark:text-[#9ec4b2] font-normal transition-colors duration-300">
                Sign in to open your workspace.
              </p>
            </div>

            {/* Floating Pristine Card */}
            <div className="w-full rounded-[28px] bg-white/95 dark:bg-[#0c1f17]/95 p-7 sm:p-9 shadow-[0_20px_48px_rgba(7,25,17,0.06),0_1px_4px_rgba(7,25,17,0.04)] dark:shadow-[0_24px_56px_rgba(0,0,0,0.55),0_1px_4px_rgba(34,197,94,0.12)] border border-white/80 dark:border-[#1b3d2c]/80 backdrop-blur-md transition-all duration-300">
              <SupabaseAuthForm
                providers={["google"]}
                onSuccessRedirect="/courier/dashboard"
                theme={isDark ? "dark" : "light"}
              />
            </div>

            {/* Offline Sync Subtitle Note */}
            <p className="mt-6 max-w-[340px] text-center text-xs leading-relaxed text-[#627c6f] dark:text-[#7ea896] transition-colors duration-300">
              After your first sign-in, NexDrop keeps working offline. Your work syncs when the connection returns.
            </p>
          </div>
        </div>

        {/* 4. Minimalist Bottom Copyright */}
        <footer className="relative z-20 py-4 text-center text-[11px] text-[#7b9487]/80 dark:text-[#4d705f] transition-colors duration-300">
          <span>&copy; 2026 NexDrop Logistics Inc. • All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
