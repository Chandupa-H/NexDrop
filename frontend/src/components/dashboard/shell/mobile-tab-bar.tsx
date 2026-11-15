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

  const isActive = (href: string, match: "exact" | "prefix" = "prefix") => {
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
        const active = item.availability === "live" && isActive(item.href, item.match);
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
