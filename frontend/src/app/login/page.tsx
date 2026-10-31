import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  PackageCheck,
} from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";
import "./auth-theme.css";

export const metadata = {
  title: "Sign In • NexDrop Logistics",
  description:
    "Sign in to your NexDrop courier, dispatch, and delivery management portal.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex bg-[#f2f7f3] font-sans antialiased text-[#0b3d2a]">
      {/* =====================================================================
          LEFT COLUMN: Immersive Brand & Logistics Showcase (Desktop & Tablet)
          ===================================================================== */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between overflow-hidden bg-[#062419] p-12 text-white">
        {/* Background ambient lighting effects (Forest Emerald & Lime Glow) */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-[#a3e635]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        {/* Top Header / Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90">
            <NexDropLogo variant="dark" size="lg" />
          </Link>
        </div>

        {/* Center Content / Hero Messaging */}
        <div className="relative z-10 max-w-xl my-auto py-10 space-y-8">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full bg-emerald-950/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-[#a3e635] animate-pulse" />
            <span>Fast. Reliable. Every Drop Counts.</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.15]">
            Delivering{" "}
            <span className="bg-gradient-to-r from-[#b6f36b] via-[#4ade80] to-[#22c55e] bg-clip-text text-transparent">
              Sri Lanka Forward.
            </span>
          </h1>

          <p className="text-base text-emerald-100/80 leading-relaxed font-normal">
            Next-generation logistics platform empowering automated courier dispatch,
            intelligent parcel routing, and transparent real-time tracking across
            the island.
          </p>

          {/* Logistics Feature Showcase Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Live Shipment Preview Card */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md transition-all hover:bg-white/[0.07] hover:border-emerald-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-[#a3e635]">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-200">
                    Live Shipment
                  </span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-300">
                  In Transit
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-emerald-100/60 font-mono">NXD001247</div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  Colombo ➔ Kandy Hub
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80 mt-2">
                  <Clock className="h-3 w-3" />
                  <span>Est. delivery today, 4:30 PM</span>
                </div>
              </div>
            </div>

            {/* "Deliver Smarter Together" Promo Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900/60 to-emerald-950/80 border border-emerald-500/25 p-4 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#a3e635]/20 text-[#a3e635]">
                  <PackageCheck className="h-4 w-4" />
                </div>
                <div className="h-6 w-6 rounded-full bg-[#a3e635] flex items-center justify-center text-[#062419]">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold text-[#b6f36b] uppercase tracking-wider">
                  NexDrop Network
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  Deliver Smarter Together
                </div>
                <p className="text-[11px] text-emerald-200/70 mt-1">
                  Connecting merchants, drivers, and hubs seamlessly.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Value Badges */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-emerald-200/90 font-medium">
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-[#a3e635]" />
              <span>Island-wide Network</span>
            </div>
            <span className="text-emerald-700">•</span>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#a3e635]" />
              <span>GPS Tracking</span>
            </div>
            <span className="text-emerald-700">•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#a3e635]" />
              <span>Secure & Insured</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-emerald-200/50 pt-6 border-t border-white/10">
          <span>&copy; 2026 NexDrop Logistics Inc.</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#a3e635]" />
            Enterprise Edition
          </span>
        </div>
      </div>

      {/* =====================================================================
          RIGHT COLUMN: Authentication Card & Form
          ===================================================================== */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile-only Header Logo */}
          <div className="flex lg:hidden flex-col items-center mb-8 text-center">
            <Link href="/" className="transition-opacity hover:opacity-90">
              <NexDropLogo variant="default" size="lg" />
            </Link>
          </div>

          {/* Authentication Card Container */}
          <div className="rounded-3xl bg-white p-8 sm:p-10 shadow-[0_20px_50px_rgba(6,36,25,0.06)] border border-[#e5eee8]">
            {/* Header Titles */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md mb-2.5">
                <span>Secure Portal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b3d2a] tracking-tight">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-[#5b7266]">
                Sign in to access your parcel dispatch, driver tracking, and analytics.
              </p>
            </div>

            {/* Supabase Pre-built Auth UI with custom NexDrop Theme */}
            <SupabaseAuthForm
              providers={["google"]}
              onSuccessRedirect="/courier/dashboard"
            />
          </div>

          {/* Security & Support Footer */}
          <div className="mt-8 flex flex-col items-center gap-3 text-center text-xs text-[#5b7266]">
            <div className="flex items-center gap-1.5 font-medium text-emerald-800/80">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Protected by 256-bit SSL Encryption &amp; Supabase Auth</span>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <Link href="/" className="hover:text-emerald-700 transition-colors">
                Back to Home
              </Link>
              <span>•</span>
              <a
                href="mailto:support@nexdrop.lk"
                className="hover:text-emerald-700 transition-colors"
              >
                Need help?
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
