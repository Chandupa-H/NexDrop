import { Suspense } from "react";
import { getDashboardConfig } from "@/lib/dashboard/registry";
import { DashboardShell } from "@/components/dashboard";
import {
  DispatcherTopbarUser,
  DispatcherTopbarUserSkeleton,
} from "@/features/dispatcher/components/DispatcherTopbarUser";

export default function DispatcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getDashboardConfig("dispatcher");

  return (
    <DashboardShell
      config={config}
      userSlot={
        <Suspense fallback={<DispatcherTopbarUserSkeleton />}>
          <DispatcherTopbarUser
            profileHref={config.profileHref ?? `${config.basePath}/profile`}
          />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}

