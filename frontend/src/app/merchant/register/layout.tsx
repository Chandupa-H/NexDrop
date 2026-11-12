import type { Metadata } from "next";
import Link from "next/link";

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
      {/* Minimal branded header */}
      <header className="bg-white border-b border-[#E5E7EB] h-16 flex items-center px-6 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="NexDrop home">
          {/* Logo mark */}
          <div className="h-8 w-8 rounded-lg bg-[#064E3B] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#A3E635]" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-lg font-bold text-[#064E3B] tracking-tight">
            Nex<span className="text-[#16A34A]">Drop</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-[#64748B] hidden sm:block">
            Already have an account?
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-[#064E3B] hover:text-[#16A34A] transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-4 px-6">
        <p className="text-center text-xs text-[#64748B]">
          © 2026 NexDrop. All rights reserved. &nbsp;·&nbsp;
          <Link href="/privacy" className="hover:text-[#064E3B] transition-colors">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" className="hover:text-[#064E3B] transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
