"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconMap } from "./icon-map";
import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export function SidebarNav({
  config,
  onNavigate,
}: {
  config: DashboardRoleConfig;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string, match: "exact" | "prefix" = "prefix") => {
    if (match === "exact") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="dashboard-sidebar-navigation" aria-label="Main navigation">
      {config.nav.filter((section) => section.items.length > 0).map((section) => (
        <div key={section.id} className="dashboard-nav-section">
          {section.label && (
            <div className="dashboard-nav-section-label">
              {section.label}
            </div>
          )}
          <ul className="dashboard-nav-list">
            {section.items.map((item) => {
              const Icon = iconMap[item.icon];
              const active = item.availability === "live" && isActive(item.href, item.match);
              const isPlanned = item.availability === "planned";

              if (isPlanned) {
                return (
                  <li key={item.id}>
                    <div
                      className="dashboard-nav-item is-planned"
                      aria-disabled="true"
                      title="Coming soon"
                    >
                      <Icon aria-hidden="true" />
                      <span className="dashboard-nav-item-label">{item.label}</span>
                      <span className="dashboard-nav-item-badge">Soon</span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`dashboard-nav-item${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span className="dashboard-nav-item-label">{item.label}</span>
                    {item.badge && (
                      <span className="dashboard-nav-item-badge">{item.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
