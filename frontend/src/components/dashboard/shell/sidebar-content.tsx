import Link from "next/link";
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
        <Link href="/" className="hover:opacity-90 transition-opacity block" title="NexDrop Home">
          <BrandLogo />
        </Link>
      </div>
      <SidebarNav config={config} onNavigate={onNavigate} />
      <footer className="dashboard-sidebar-footer">
        <LogoutButton />
      </footer>
    </div>
  );
}
