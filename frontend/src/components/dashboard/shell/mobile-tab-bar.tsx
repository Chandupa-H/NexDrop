"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { iconMap } from "./icon-map";
import type { DashboardRoleConfig, NavItem } from "@/lib/dashboard/types";

function MobileTabBarContent({ config }: { config: DashboardRoleConfig }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = config.nav.flatMap((section) => section.items).slice(0, 5);

  const isActive = (href: string, match: "exact" | "prefix" = "prefix", itemId?: string) => {
    const fromParam = searchParams?.get("from") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") : null);

    // When viewing receipt redirected from track parcel page, highlight Track Parcel instead of Delivery History
    if (pathname.startsWith("/customer/history/receipt") && fromParam === "track") {
      if (href === "/customer/track" || itemId === "track") return true;
      if (href === "/customer/history" || itemId === "history") return false;
    }

    const [itemPath, itemQuery] = href.split("?");
    const pathMatches =
      match === "exact" ? pathname === itemPath : pathname.startsWith(itemPath);
    if (!pathMatches) return false;

    if (itemQuery) {
      const itemParams = new URLSearchParams(itemQuery);
      const itemTab = itemParams.get("tab");
      const currentTab = searchParams.get("tab") || "orders";
      return itemTab === currentTab;
    }
    const currentTab = searchParams.get("tab");
    return !currentTab;
  };

  return (
    <nav className="dashboard-mobile-tab-bar" aria-label="Dashboard tabs">
      {items.map((item: NavItem) => {
        const Icon = iconMap[item.icon];
        const active = item.availability === "live" && isActive(item.href, item.match, item.id);
        const classes = `dashboard-mobile-tab${active ? " is-active" : ""}${
          item.availability === "planned" ? " is-planned" : ""
        }`;

        return item.availability === "planned" ? (
          <span key={item.id} className={classes} aria-disabled="true">
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </span>
        ) : (
          <Link
            key={item.id}
            href={item.href}
            className={classes}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar({ config }: { config: DashboardRoleConfig }) {
  return (
    <Suspense fallback={null}>
      <MobileTabBarContent config={config} />
    </Suspense>
  );
}
