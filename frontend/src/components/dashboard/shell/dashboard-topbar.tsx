"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Menu, Search, Home, LogOut, Key, ChevronDown, Package } from "lucide-react";
import { getTopbarTitle } from "@/lib/dashboard/topbar";
import type { DashboardRoleConfig, DashboardUser } from "@/lib/dashboard/types";
import { logoutAction } from "@/lib/auth/logout";

export function DashboardTopbar({
  config,
  userSlot,
  unreadNotifications,
  mobileMenuOpen,
  onMenuOpen,
}: {
  config: DashboardRoleConfig;
  userSlot: React.ReactNode;
  unreadNotifications: number;
  mobileMenuOpen: boolean;
  onMenuOpen: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (mobileSearchOpen) searchRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
        setMobileSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-content">
        <div className="dashboard-topbar-leading">
          <button
            type="button"
            onClick={onMenuOpen}
            className="dashboard-menu-trigger"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-mobile-drawer"
          >
            <Menu aria-hidden="true" />
          </button>

          <div className="dashboard-page-title" aria-live="polite">
            {getTopbarTitle(config, pathname)}
          </div>
        </div>

        <div
          className={`dashboard-search ${
            mobileSearchOpen ? "is-expanded" : ""
          }`}
        >
          <Search className="dashboard-search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder={config.searchPlaceholder}
            aria-label="Search dashboard"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.blur();
                setMobileSearchOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="dashboard-mobile-search-trigger"
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            aria-expanded={mobileSearchOpen}
            onClick={() => {
              if (mobileSearchOpen) {
                setMobileSearchOpen(false);
                searchRef.current?.blur();
              } else {
                setMobileSearchOpen(true);
              }
            }}
          >
            <Search aria-hidden="true" />
          </button>
        </div>

        <div className="dashboard-topbar-actions">
          <NotificationsPopover unreadCount={unreadNotifications} />
          {userSlot}
        </div>
      </div>
    </header>
  );
}

function NotificationsPopover({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="dashboard-notifications" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dashboard-notifications-trigger"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-controls="dashboard-notifications-popover"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 && <span className="dashboard-notification-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div
          id="dashboard-notifications-popover"
          className="dashboard-notifications-popover"
          role="dialog"
          aria-label="Notifications"
        >
          <h2>Notifications</h2>
          <ul aria-live="polite">
            {unreadCount === 0 ? (
              <li>No new notifications</li>
            ) : (
              <li>{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TopbarProfileLink({
  user,
  profileHref,
}: {
  user: DashboardUser;
  profileHref: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("nexdrop_merchant_application");
    } catch {}
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="relative" ref={rootRef}>
      <Link
        href={profileHref}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        className="dashboard-user-link focus:outline-none cursor-pointer"
        aria-label="Open profile"
        aria-expanded={isOpen}
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="dashboard-user-avatar"
          />
        ) : (
          <span className="dashboard-user-avatar" aria-hidden="true">
            {initials}
          </span>
        )}
        <span className="dashboard-user-copy">
          <span className="dashboard-user-name">{user.name}</span>
          <span className="dashboard-user-role">{user.roleLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Link>

      {/* Account Popover Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-2xl z-50 text-xs animate-in fade-in duration-150"
          role="menu"
        >
          {/* User Info Header */}
          <div className="p-3 border-b border-[#E5E7EB] bg-[#F8FAF8] rounded-lg mb-1">
            <span className="font-bold text-gray-900 block truncate text-sm">
              {user.name}
            </span>
            <span className="text-[11px] text-[#064E3B] font-semibold bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
              {user.roleLabel}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="py-1 space-y-0.5">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-[#F0FDF4] hover:text-[#064E3B] font-medium transition-colors"
              role="menuitem"
            >
              <Home className="w-4 h-4 text-[#064E3B]" />
              <span>Return to Home Page</span>
            </Link>

            <Link
              href="/merchant/dashboard?tab=orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-[#F0FDF4] hover:text-[#064E3B] font-medium transition-colors"
              role="menuitem"
            >
              <Package className="w-4 h-4 text-gray-500" />
              <span>All Shipments</span>
            </Link>

            {profileHref && (
              <Link
                href={profileHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-[#F0FDF4] hover:text-[#064E3B] font-medium transition-colors"
                role="menuitem"
              >
                <Key className="w-4 h-4 text-gray-500" />
                <span>API Keys & Integrations</span>
              </Link>
            )}
          </div>

          <div className="border-t border-[#E5E7EB] my-1" />

          {/* Sign Out Action */}
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-semibold transition-colors text-left"
            role="menuitem"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
