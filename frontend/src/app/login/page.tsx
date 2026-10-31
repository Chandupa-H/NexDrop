import Link from "next/link";
import { Sun } from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { LogisticsSceneBackground } from "@/components/auth/logistics-scene-background";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";
import "./auth-theme.css";

export const metadata = {
  title: "Sign In • NexDrop",
  description: "Sign in to open your NexDrop courier, dispatch, and delivery workspace.",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans antialiased text-[#071911] selection:bg-[#22c55e]/20 selection:text-[#071911]">
      {/* 1. Full-bleed Atmospheric Pastel Mint Architectural Scene */}
      <LogisticsSceneBackground />

      {/* 2. Top Navigation Bar */}
      <header className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        {/* Brand Logo (Top Left) */}
        <Link
          href="/"
          className="transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071911] rounded-lg"
          aria-label="NexDrop Home"
        >
          <NexDropLogo size="md" />
        </Link>

        {/* Minimalist Theme / Action Pill (Top Right, matching the screenshot) */}
        <button
          type="button"
          aria-label="Toggle theme"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#435b50] shadow-[0_2px_8px_rgba(7,25,17,0.06)] border border-[#e1ece5] backdrop-blur-sm transition-all hover:bg-white hover:text-[#071911] hover:shadow-[0_4px_12px_rgba(7,25,17,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071911]"
        >
          <Sun className="h-4 w-4" />
        </button>
      </header>

      {/* 3. Dead-Center Authentication Experience */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          {/* Welcome Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-[38px] font-extrabold tracking-tight text-[#071911] leading-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-[15px] text-[#557063] font-normal">
              Sign in to open your workspace.
            </p>
          </div>

          {/* Floating Pristine Card (Matching the screenshot's generous 28px radii and soft shadow) */}
          <div className="w-full rounded-[28px] bg-white/95 p-7 sm:p-9 shadow-[0_20px_48px_rgba(7,25,17,0.06),0_1px_4px_rgba(7,25,17,0.04)] border border-white/80 backdrop-blur-md">
            <SupabaseAuthForm
              providers={["google"]}
              onSuccessRedirect="/courier/dashboard"
            />
          </div>

          {/* Offline Sync Subtitle Note (From screenshot) */}
          <p className="mt-6 max-w-[340px] text-center text-xs leading-relaxed text-[#627c6f]">
            After your first sign-in, NexDrop keeps working offline. Your work syncs when the connection returns.
          </p>
        </div>
      </div>

      {/* 4. Minimalist Bottom Copyright Anchor */}
      <footer className="relative z-20 py-4 text-center text-[11px] text-[#7b9487]/80">
        <span>&copy; 2026 NexDrop Logistics Inc. • All rights reserved.</span>
      </footer>
    </main>
  );
}
