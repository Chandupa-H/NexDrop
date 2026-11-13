"use client";

import Link from "next/link";
import { LogIn, UserPlus, LayoutDashboard, LogOut } from "lucide-react";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";

interface NavbarProps {
  backendHealthy?: boolean | null;
}

export function Navbar({ backendHealthy }: NavbarProps) {
  const { user, dashboardHref, isDashboardAccessible = true, isLoading, signOut } = useAuthUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";

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

          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 rounded-lg bg-[#E5E7EB]/70 animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-[#E5E7EB]/70 animate-pulse" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-[#F1F5F1] text-xs font-semibold text-[#064E3B]"
                title={user.email ?? displayName}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#064E3B] text-[10px] font-bold text-[#A3E635] uppercase">
                  {displayName.charAt(0)}
                </span>
                <span className="max-w-[140px] truncate">{displayName}</span>
              </div>

              {isDashboardAccessible ? (
                <Link href={dashboardHref}>
                  <Button variant="primary" size="sm" className="font-bold shadow-sm">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled
                  className="font-bold shadow-sm opacity-50 cursor-not-allowed"
                  title="Dashboard accessible after registration and admin approval"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="font-semibold text-[#64748B] hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <>
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
                <Button variant="primary" size="sm" className="font-bold shadow-sm">
                  <UserPlus className="h-3.5 w-3.5" />
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
