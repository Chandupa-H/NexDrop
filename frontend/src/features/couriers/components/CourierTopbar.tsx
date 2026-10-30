"use client";

import { useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, Menu, Truck } from "lucide-react";
import type { CourierUser } from "../types";

interface CourierTopbarProps {
  courier: CourierUser;
  onMenuOpen: () => void;
}

export function CourierTopbar({ courier, onMenuOpen }: CourierTopbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <header
      className="courier-topbar sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 h-16 shrink-0"
      role="banner"
    >
      {/* Mobile: hamburger + logo */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={onMenuOpen}
        className="lg:hidden p-2 rounded-xl text-[#5B7266] hover:bg-[#E5EEE8] transition-colors"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="lg:hidden flex items-center gap-2 text-[#0F2A1D] font-bold text-base">
        <Truck className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
        NexDrop
      </span>

      {/* Search */}
      <div className="relative flex-1 max-w-xs hidden sm:block">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5B7266] pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by tracking ID, customer…"
          aria-label="Search parcels by tracking ID or customer name"
          className="w-full pl-9 pr-16 h-11 rounded-xl bg-[#E5EEE8] border-0 text-sm text-[#0F2A1D] placeholder:text-[#5B7266] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/80 text-[10px] font-mono text-[#5B7266] select-none pointer-events-none border border-[#E5EEE8]">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Bell */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2.5 rounded-xl text-[#5B7266] hover:bg-[#E5EEE8] transition-colors"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span
            className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#DC2626]"
            aria-label="You have notifications"
          />
        </button>

        {/* Avatar */}
        <button
          type="button"
          aria-label={`Account menu for ${courier.name}`}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#E5EEE8] transition-colors"
        >
          <div
            className="h-8 w-8 rounded-full bg-[#0b3d2a] flex items-center justify-center text-white text-xs font-bold shrink-0"
            aria-hidden="true"
          >
            {courier.avatarInitials}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <p className="text-sm font-semibold text-[#0F2A1D]">{courier.name}</p>
            <p className="text-xs text-[#5B7266]">{courier.role}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-[#5B7266] hidden md:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
