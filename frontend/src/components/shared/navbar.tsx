import Link from "next/link";
import { Package, ShieldCheck, Activity } from "lucide-react";

interface NavbarProps {
  backendHealthy?: boolean | null;
}

export function Navbar({ backendHealthy }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-10 w-10 rounded-lg bg-[#064E3B] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Package className="h-6 w-6 text-[#A3E635]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-[#064E3B]">
              Nex<span className="text-[#16A34A]">Drop</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-[#64748B] -mt-1">
              Courier Platform
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#1F2937]">
          <a href="#features" className="hover:text-[#16A34A] transition-colors">
            Modules
          </a>
          <a href="#architecture" className="hover:text-[#16A34A] transition-colors">
            Architecture
          </a>
          <a href="#api" className="hover:text-[#16A34A] transition-colors">
            API Specs
          </a>
          <a href="#team" className="hover:text-[#16A34A] transition-colors">
            Team Workspace
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E5E7EB] bg-[#F1F5F1]">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                backendHealthy === true
                  ? "bg-[#16A34A] animate-pulse"
                  : backendHealthy === false
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-[#1F2937] hidden sm:inline">
              Backend API:
            </span>
            <span className="font-semibold">
              {backendHealthy === true
                ? "Connected"
                : backendHealthy === false
                ? "Connecting..."
                : "Standby"}
            </span>
          </div>

          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[#064E3B] text-white hover:bg-[#085a44] transition-colors"
          >
            <Activity className="h-3.5 w-3.5 text-[#A3E635]" />
            FastAPI Docs
          </a>
        </div>
      </div>
    </header>
  );
}
