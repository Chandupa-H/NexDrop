"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconMap } from "./icon-map";
import type { DashboardRoleConfig, NavItem } from "@/lib/dashboard/types";

export function MobileTabBar({ config }: { config: DashboardRoleConfig }) {
  const pathname = usePathname();
  const items = config.nav.flatMap((section) => section.items).slice(0, 5);

  return (
    <nav className="dashboard-mobile-tab-bar" aria-label="Dashboard tabs">
      {items.map((item: NavItem) => {
        const Icon = iconMap[item.icon];
        const active =
          item.availability === "live" &&
          (item.match === "exact"
            ? pathname === item.href
            : pathname.startsWith(item.href));
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
