import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyPolicyContent } from "@/components/legal/legal-content";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy — NexDrop",
  description: "Privacy Policy and Data Protection standards for the NexDrop platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F1] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] h-16 flex items-center px-6 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="NexDrop home">
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
          <Link
            href="/login"
            className="text-sm font-medium text-[#064E3B] hover:text-[#16A34A] transition-colors"
          >
            Sign In
          </Link>
          <Link href="/merchant/register">
            <Button variant="secondary" size="sm">
              Register
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10 px-4 flex justify-center">
        <div className="w-full max-w-3xl bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 sm:p-10">
          <PrivacyPolicyContent />

          <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Link href="/merchant/register">
              <Button variant="secondary" size="md">
                ← Back to Merchant Registration
              </Button>
            </Link>
            <Link href="/terms">
              <span className="text-xs text-[#064E3B] hover:text-[#16A34A] underline font-medium">
                View Terms of Service →
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-4 px-6">
        <p className="text-center text-xs text-[#64748B]">
          © {new Date().getFullYear()} NexDrop. All rights reserved. &nbsp;·&nbsp;
          <Link href="/privacy" className="hover:text-[#064E3B] transition-colors font-semibold">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" className="hover:text-[#064E3B] transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
