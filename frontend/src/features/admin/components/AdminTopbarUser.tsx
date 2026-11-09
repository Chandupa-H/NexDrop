import { TopbarProfileLink } from "@/components/dashboard/shell/dashboard-topbar";
import type { DashboardUser } from "@/lib/dashboard/types";

export function AdminTopbarUser({ profileHref }: { profileHref: string }) {
  const user: DashboardUser = {
    id: "admin-master",
    name: "Alex Vance",
    roleLabel: "Super Admin",
  };

  return <TopbarProfileLink user={user} profileHref={profileHref} />;
}
