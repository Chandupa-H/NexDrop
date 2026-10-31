import React from "react";

interface NexDropLogoProps {
  className?: string;
  variant?: "light" | "dark" | "default";
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function NexDropLogo({
  className = "",
  variant = "default",
  size = "md",
  showText = true,
}: NexDropLogoProps) {
  const sizeMap = {
    sm: { icon: 28, text: "text-lg", sub: "text-[9px]" },
    md: { icon: 38, text: "text-2xl", sub: "text-[11px]" },
    lg: { icon: 48, text: "text-3xl", sub: "text-xs" },
    xl: { icon: 64, text: "text-4xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  // Variant color definitions
  const nexColor =
    variant === "dark"
      ? "text-white"
      : variant === "light"
      ? "text-emerald-950"
      : "text-emerald-950";

  const dropColor = "text-emerald-500";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic 3D Parcel & Speed-Wings Logo Mark */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform duration-300 hover:scale-105"
        aria-label="NexDrop Logo Mark"
      >
        <defs>
          <linearGradient id="boxTopGrad" x1="28" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e2ad72" />
            <stop offset="1" stopColor="#c58e53" />
          </linearGradient>
          <linearGradient id="boxLeftGrad" x1="20" y1="28" x2="38" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b4783c" />
            <stop offset="1" stopColor="#8d5622" />
          </linearGradient>
          <linearGradient id="boxRightGrad" x1="38" y1="28" x2="56" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9a6229" />
            <stop offset="1" stopColor="#6e3f14" />
          </linearGradient>
          <linearGradient id="ribbonGrad1" x1="4" y1="36" x2="46" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4ade80" />
            <stop offset="0.6" stopColor="#22c55e" />
            <stop offset="1" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="ribbonGrad2" x1="6" y1="26" x2="40" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#bef264" />
            <stop offset="0.7" stopColor="#4ade80" />
            <stop offset="1" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="ribbonGrad3" x1="10" y1="16" x2="34" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ecfccb" />
            <stop offset="0.5" stopColor="#86efac" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#15803d" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Aerodynamic Speed Ribbon Lines (Lower Wing) */}
        <path
          d="M6 44C16 44 26 41 35 34C40 30 46 32 44 38C42 44 32 50 18 50C10 50 6 46 6 44Z"
          fill="url(#ribbonGrad1)"
          filter="url(#softGlow)"
        />

        {/* Isometric 3D Parcel Box */}
        <g filter="url(#softGlow)">
          {/* Top Face */}
          <path d="M37 14L53 23L37 32L21 23L37 14Z" fill="url(#boxTopGrad)" />
          {/* Box Seam/Tape Top */}
          <path d="M29 18.5L45 27.5" stroke="#8d5622" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
          {/* Left Face */}
          <path d="M21 23L37 32V51L21 42V23Z" fill="url(#boxLeftGrad)" />
          {/* Right Face */}
          <path d="M37 32L53 23V42L37 51V32Z" fill="url(#boxRightGrad)" />
          {/* Box Tape Down Center */}
          <path d="M37 32V51" stroke="#6e3f14" strokeWidth="2.5" opacity="0.5" />
        </g>

        {/* Dynamic Forward Speed Ribbon Bands (Mid & Top Wings) */}
        <path
          d="M8 29C18 29 28 32 37 38C32 42 22 42 14 37C10 34.5 8 31 8 29Z"
          fill="url(#ribbonGrad2)"
        />
        <path
          d="M12 18C20 18 28 22 34 27C30 30 22 30 16 26C13 24 12 20 12 18Z"
          fill="url(#ribbonGrad3)"
        />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${currentSize.text}`}>
            <span className={nexColor}>Nex</span>
            <span className={dropColor}>Drop</span>
          </div>
          <span
            className={`font-medium tracking-wider uppercase text-emerald-600/80 mt-0.5 ${currentSize.sub}`}
          >
            Courier & Logistics
          </span>
        </div>
      )}
    </div>
  );
}

