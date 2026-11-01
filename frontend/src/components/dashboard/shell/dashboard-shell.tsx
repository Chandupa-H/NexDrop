"use client";

import { useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { MobileNav } from "./mobile-nav";
import { MobileTabBar } from "./mobile-tab-bar";
import { PageContainer } from "./page-container";
import type { DashboardRoleConfig } from "@/lib/dashboard/types";
import "./dashboard-theme.css";

export function DashboardShell({
  config,
  userSlot,
  unreadNotifications = 0,
  children,
}: {
  config: DashboardRoleConfig;
  userSlot: React.ReactNode;
  unreadNotifications?: number;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="dashboard-theme dashboard-shell-grid">
      <a
        href="#main-content"
        className="dashboard-skip-link"
      >
        Skip to content
      </a>

      <DashboardSidebar config={config} />
      <MobileNav
        config={config}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="dashboard-main-column">
        <DashboardTopbar
          config={config}
          userSlot={userSlot}
          unreadNotifications={unreadNotifications}
          mobileMenuOpen={mobileMenuOpen}
          onMenuOpen={() => setMobileMenuOpen(true)}
        />
        <main id="main-content" className="dashboard-page-scroll">
          <PageContainer>{children}</PageContainer>
        </main>
        <MobileTabBar config={config} />
      </div>
    </div>
  );
}
