import { Suspense } from "react";
import { getDashboardConfig } from "@/lib/dashboard/registry";
import { DashboardShell } from "@/components/dashboard";
import {
  CustomerTopbarUser,
  CustomerTopbarUserSkeleton,
} from "@/features/customers/components/CustomerTopbarUser";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getDashboardConfig("customer");

  return (
    <DashboardShell
      config={config}
      userSlot={
        <Suspense fallback={<CustomerTopbarUserSkeleton />}>
          <CustomerTopbarUser profileHref={config.profileHref ?? `${config.basePath}/profile`} />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
