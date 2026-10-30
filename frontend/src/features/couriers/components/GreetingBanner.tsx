import { Package, ArrowRight } from "lucide-react";
import type { CourierUser } from "../types";

interface GreetingBannerProps {
  courier: CourierUser;
  /** Pre-computed server-side to avoid hydration mismatch */
  greeting: string;
}

export function GreetingBanner({ courier, greeting }: GreetingBannerProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
      {/* Left: greeting */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(22,163,74,0.12)" }}
          aria-hidden="true"
        >
          <Package className="h-7 w-7 text-[#16A34A]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#5B7266]">{greeting}</p>
          <h1
            className="font-bold text-[#0F2A1D] truncate"
            style={{ fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {courier.name}
          </h1>
          <p className="text-sm text-[#5B7266] mt-0.5">
            Here&apos;s your delivery plan for today.
          </p>
        </div>
      </div>

      {/* Right: hero banner */}
      <div className="courier-greeting-banner relative w-full lg:w-auto lg:min-w-[320px] overflow-hidden rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
        {/* Dot pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <pattern id="greet-dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#greet-dots)" />
        </svg>

        {/* Isometric parcel illustration */}
        <svg
          viewBox="0 0 100 80"
          className="absolute right-0 top-0 h-full opacity-25 pointer-events-none"
          aria-hidden="true"
        >
          {/* Box body */}
          <polygon points="50,15 85,32 85,62 50,78" fill="white" />
          <polygon points="15,32 50,15 50,78 15,62" fill="white" opacity=".7" />
          <polygon points="15,32 50,15 85,32 50,48" fill="white" opacity=".9" />
          {/* Tape strip */}
          <polygon points="38,15 62,15 62,48 38,48" fill="#b6f36b" opacity=".5" />
          {/* Swoosh */}
          <path d="M5 70 Q30 40 70 50" fill="none" stroke="#b6f36b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        <p className="text-white font-bold text-base leading-snug relative z-10">
          Fast. Reliable.
          <br />
          <span className="text-[#b6f36b]">Every Drop Counts.</span>
        </p>

        <button
          type="button"
          aria-label="Learn more about NexDrop"
          className="courier-btn-lime h-10 w-10 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
