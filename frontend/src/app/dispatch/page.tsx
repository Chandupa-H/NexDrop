"use client";

import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { DispatcherDashboard } from "@/features/dispatch/components/dispatcher-dashboard";
import { useBackendHealth } from "@/hooks/use-health";

export default function DispatchPage() {
  const { isHealthy } = useBackendHealth();

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F1] text-[#1F2937]">
      <Navbar backendHealthy={isHealthy} />
      <main className="flex-1">
        <DispatcherDashboard />
      </main>
      <Footer />
    </div>
  );
}

