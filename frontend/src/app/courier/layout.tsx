import { Suspense } from "react";
import { getDashboardConfig } from "@/lib/dashboard/registry";
import { DashboardShell } from "@/components/dashboard";
import {
  TopbarUser,
  TopbarUserSkeleton,
} from "@/features/couriers/components/TopbarUser";

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO(platform): resolve the role from the session + courier guard via shared auth
  const config = getDashboardConfig("courier");

  return (
    <DashboardShell
      config={config}
      userSlot={
        <Suspense fallback={<TopbarUserSkeleton />}>
          <TopbarUser profileHref={config.profileHref ?? `${config.basePath}/profile`} />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
