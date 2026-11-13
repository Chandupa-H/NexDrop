import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  backendHealthy?: boolean | null;
}

export function Navbar({ backendHealthy }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group focus:outline-none">
          <NexDropLogo size="sm" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-[#1F2937]/80">
          <Link href="/#modules" className="hover:text-[#16A34A] transition-colors">
            Modules
          </Link>
          <Link href="/#calculator" className="hover:text-[#16A34A] transition-colors">
            Pricing
          </Link>
          <Link href="/#architecture" className="hover:text-[#16A34A] transition-colors">
            Architecture
          </Link>
          <Link href="/#team" className="hover:text-[#16A34A] transition-colors">
            Squads
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subtle Backend API Health Chip */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border border-[#E5E7EB] bg-[#F1F5F1]">
            <span
              className={`h-2 w-2 rounded-full ${
                backendHealthy === true
                  ? "bg-[#16A34A] animate-pulse"
                  : backendHealthy === false
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-[#64748B] text-[11px]">API:</span>
            <span className="font-semibold text-[11px] text-[#064E3B]">
              {backendHealthy === true
                ? "Online"
                : backendHealthy === false
                ? "Connecting..."
                : "Standby"}
            </span>
          </div>

          {/* Authentication Navigation Actions */}
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="font-semibold text-[#064E3B] hover:text-[#043327] hover:bg-[#F1F5F1]"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Button>
          </Link>

          <Link href="/login?view=sign_up">
            <Button
              variant="primary"
              size="sm"
              className="font-bold shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
