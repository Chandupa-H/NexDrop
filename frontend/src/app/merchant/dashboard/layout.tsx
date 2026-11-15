import { Suspense } from "react";
import { getDashboardConfig } from "@/lib/dashboard/registry";
import { DashboardShell } from "@/components/dashboard";
import {
  MerchantTopbarUser,
  MerchantTopbarUserSkeleton,
} from "@/features/merchants/components/MerchantTopbarUser";
import { MerchantAccessGuard } from "@/features/merchants/components/MerchantAccessGuard";

export const metadata = {
  title: "Merchant Dashboard — NexDrop",
  description: "Merchant delivery management portal: parcel dispatch, automated webhooks, and REST API access.",
};

export default function MerchantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getDashboardConfig("merchant");

  return (
    <MerchantAccessGuard>
      <DashboardShell
        config={config}
        userSlot={
          <Suspense fallback={<MerchantTopbarUserSkeleton />}>
            <MerchantTopbarUser profileHref={config.profileHref ?? `${config.basePath}/dashboard?tab=api`} />
          </Suspense>
        }
      >
        {children}
      </DashboardShell>
    </MerchantAccessGuard>
  );
}

