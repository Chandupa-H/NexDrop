import { Suspense } from "react";
import { BrandLogo } from "./brand-logo";
import { SidebarNav } from "./sidebar-nav";
import type { DashboardRoleConfig } from "@/lib/dashboard/types";
import { LogoutButton } from "./logout-button";

export function SidebarContent({
  config,
  onNavigate,
}: {
  config: DashboardRoleConfig;
  onNavigate?: () => void;
}) {
  return (
    <div className="dashboard-sidebar-content">
      <div className="dashboard-sidebar-brand">
        <BrandLogo className="hover:opacity-90 transition-opacity block" />
      </div>
      <Suspense fallback={<div className="dashboard-nav flex-1" />}>
        <SidebarNav config={config} onNavigate={onNavigate} />
      </Suspense>
      <footer className="dashboard-sidebar-footer">
        <LogoutButton />
      </footer>
    </div>
  );
}
