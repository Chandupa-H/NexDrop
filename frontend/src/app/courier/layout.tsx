"use client";

// TODO(platform): protect with courier role via shared auth

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import "./courier-theme.css";
import { CourierSidebar } from "@/features/couriers/components/CourierSidebar";
import { CourierTopbar } from "@/features/couriers/components/CourierTopbar";
import { MOCK_COURIER } from "@/features/couriers/data/mock";

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  // Sync mobile drawer using native <dialog>
  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;

    if (mobileMenuOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [mobileMenuOpen]);

  return (
    <div className="courier-theme flex h-screen overflow-hidden">
      {/* ── Desktop Sidebar (fixed 264px) ────────────────────────── */}
      <div className="hidden lg:flex shrink-0 h-full">
        <CourierSidebar />
      </div>

      {/* ── Mobile Sidebar Drawer (native <dialog>) ──────────────── */}
      <dialog
        ref={mobileDialogRef}
        onClose={() => setMobileMenuOpen(false)}
        onClick={(e) => {
          if (e.target === mobileDialogRef.current) {
            setMobileMenuOpen(false);
          }
        }}
        className="courier-nav-drawer lg:hidden"
        aria-label="Navigation drawer"
      >
        <div className="relative flex h-full">
          <CourierSidebar onClose={() => setMobileMenuOpen(false)} />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="absolute top-4 -right-12 h-9 w-9 rounded-full bg-white text-[#0F2A1D] flex items-center justify-center shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </dialog>

      {/* ── Main App Shell ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <CourierTopbar
          courier={MOCK_COURIER}
          onMenuOpen={() => setMobileMenuOpen(true)}
        />
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
