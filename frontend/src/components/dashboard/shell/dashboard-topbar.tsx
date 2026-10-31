"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { getTopbarTitle } from "@/lib/dashboard/topbar";
import type { DashboardRoleConfig, DashboardUser } from "@/lib/dashboard/types";

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
  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={profileHref} className="dashboard-user-link" aria-label="Open profile">
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
    </Link>
  );
}
