import { getDashboardConfig } from "@/lib/dashboard/registry";
import { DashboardShell } from "@/components/dashboard";
import { AdminTopbarUser } from "@/features/admin/components/AdminTopbarUser";

export const metadata = {
  title: "Admin Dashboard — NexDrop",
  description: "NexDrop administrative dashboard for platform, fleet, and logistics management.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getDashboardConfig("admin");

  return (
    <DashboardShell
      config={config}
      userSlot={
        <AdminTopbarUser profileHref={config.profileHref ?? `${config.basePath}/profile`} />
      }
    >
      {children}
    </DashboardShell>
  );
}
