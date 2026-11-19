import type { Metadata } from "next";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Merchant Registration — NexDrop",
  description:
    "Register your business on NexDrop to access our merchant delivery API, create shipments, and track parcels in real time.",
};

export default function MerchantRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1F5F1] flex flex-col">
      {/* Home Navbar replacing the previous minimal header */}
      <Navbar backendHealthy={true} />

      {/* Page content */}
      <main className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        {children}
      </main>

      {/* Footer matching Home */}
      <Footer />
    </div>
  );
}
