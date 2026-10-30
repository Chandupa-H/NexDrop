"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { COURIER_NAV } from "../nav";

interface CourierSidebarProps {
  onClose?: () => void;
}

export function CourierSidebar({ onClose }: CourierSidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className="courier-sidebar-bg flex flex-col h-full w-[264px]"
      role="navigation"
      aria-label="Courier navigation"
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        {/* Inline SVG mark */}
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#b6f36b,#6fd64a)" }}>
          <Truck className="h-5 w-5 text-[#0b3d2a]" aria-hidden="true" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight select-none">NexDrop</span>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20 text-white/70 uppercase tracking-widest shrink-0">
          Courier
        </span>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {COURIER_NAV.map((item) => {
          const Icon = item.icon;
          const isCurrent = pathname === item.href;

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                role="link"
                aria-disabled="true"
                title="Coming soon"
                className="courier-nav-disabled flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/60 select-none"
                tabIndex={0}
                onKeyDown={(e) => e.preventDefault()}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b6f36b] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0b3d2a]",
                isCurrent
                  ? "courier-nav-active font-semibold"
                  : "text-white/70 hover:text-white hover:bg-white/8"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Promo card ───────────────────────────────────────── */}
      <div className="courier-promo-card mx-3 mb-4 rounded-2xl p-4 shrink-0 overflow-hidden relative">
        {/* Dot-pattern decoration */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Inline parcel SVG illustration */}
        <svg
          viewBox="0 0 80 60"
          className="absolute right-0 top-0 h-24 opacity-20 pointer-events-none"
          aria-hidden="true"
        >
          <rect x="15" y="20" width="40" height="30" rx="3" fill="white" />
          <rect x="15" y="20" width="40" height="8" rx="3" fill="white" opacity=".6" />
          <line x1="35" y1="20" x2="35" y2="50" stroke="#0b3d2a" strokeWidth="1.5" />
          <path d="M10 35 Q35 10 70 25" fill="none" stroke="#b6f36b" strokeWidth="2" strokeDasharray="4 2" />
        </svg>

        <p className="text-white font-bold text-sm leading-snug relative z-10">
          Deliver Smarter
          <br />
          Together
        </p>
        <button
          type="button"
          aria-label="Learn more"
          className="courier-btn-lime mt-3 h-9 w-9 rounded-full flex items-center justify-center relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
