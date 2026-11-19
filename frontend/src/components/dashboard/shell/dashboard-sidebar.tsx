import { Suspense } from "react";
import { SidebarContent } from "./sidebar-content";
import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export function DashboardSidebar({ config }: { config: DashboardRoleConfig }) {
  return (
    <aside
      className="dashboard-sidebar-panel"
      aria-label="Sidebar"
    >
      <Suspense fallback={null}>
        <SidebarContent config={config} />
      </Suspense>
    </aside>
  );
}
