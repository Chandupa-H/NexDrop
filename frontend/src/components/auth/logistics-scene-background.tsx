import React from "react";
import Image from "next/image";

interface LogisticsSceneBackgroundProps {
  isDark?: boolean;
}

export function LogisticsSceneBackground({ isDark = false }: LogisticsSceneBackgroundProps) {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none transition-colors duration-500"
      aria-hidden="true"
    >
      {/* 1. Photorealistic 3D Logistics City & Fleet Illustration with Living Ambient Breathe */}
      <div
        className="relative w-full h-full animate-scene-live transition-all duration-700 ease-out"
        style={{
          filter: isDark
            ? "brightness(0.74) contrast(1.16) saturate(1.22) hue-rotate(-6deg)"
            : "none",
        }}
      >
        <Image
          src="/images/auth-bg.jpg"
          alt="NexDrop Logistics Hub"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* 2. Light Mode Central Ambient Mist Diffuser (Ensures the white card and text pop with perfect contrast) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isDark ? "opacity-0" : "opacity-100"
        } bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(244,249,246,0.58)_0%,rgba(235,245,240,0.18)_65%,transparent_100%)]`}
      />

      {/* 3. Dark Mode Refined Nocturnal Overlay (High visibility for logistics hub while providing contrast behind the card) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isDark ? "opacity-100" : "opacity-0"
        } bg-[radial-gradient(ellipse_60%_52%_at_50%_50%,rgba(6,22,15,0.6)_0%,rgba(5,18,12,0.32)_50%,rgba(3,12,8,0.48)_100%)]`}
      />

      {/* 4. Live Dynamic Logistics HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Live GPS Pin Sonar Pulse at the Map Pin (Right Junction ~91.2% x 54.5%) */}
        <div
          className="absolute hidden md:flex items-center justify-center pointer-events-none"
          style={{ left: "91.2%", top: "54.5%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className={`w-12 h-12 rounded-full border-2 ${
              isDark ? "border-emerald-400/80 bg-emerald-500/20" : "border-emerald-600/70 bg-emerald-500/15"
            } animate-sonar-ping`}
          />
          <div
            className={`absolute w-3 h-3 rounded-full ${
              isDark ? "bg-emerald-400 shadow-[0_0_10px_#22c55e]" : "bg-emerald-600 shadow-[0_0_6px_#10b981]"
            }`}
          />
        </div>

        {/* Live Warehouse Dock Dispatch Radar (Left Logistics Yard ~14% x 70%) */}
        <div
          className="absolute hidden md:flex items-center justify-center pointer-events-none"
          style={{ left: "14%", top: "70%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className={`w-10 h-10 rounded-full border-2 ${
              isDark ? "border-emerald-400/70 bg-emerald-500/15" : "border-emerald-500/50 bg-emerald-400/10"
            } animate-sonar-ping`}
            style={{ animationDelay: "1.2s" }}
          />
          <div
            className={`absolute w-2 h-2 rounded-full ${
              isDark ? "bg-emerald-300 shadow-[0_0_8px_#34d399]" : "bg-emerald-500"
            }`}
          />
        </div>

        {/* Live Highway Delivery Fleet Beacon (Right Road ~84% x 76%) */}
        <div
          className="absolute hidden md:flex items-center justify-center pointer-events-none"
          style={{ left: "84%", top: "76%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 ${
              isDark ? "border-emerald-400/60" : "border-emerald-500/40"
            } animate-sonar-ping`}
            style={{ animationDelay: "2.1s" }}
          />
          <div
            className={`absolute w-2 h-2 rounded-full ${
              isDark ? "bg-emerald-400 shadow-[0_0_8px_#22c55e]" : "bg-emerald-500"
            }`}
          />
        </div>

        {/* Subtle Nocturnal Atmospheric Light Motes (Dark Mode only) */}
        {isDark && (
          <>
            <div
              className="absolute w-2 h-2 rounded-full bg-emerald-400/60 blur-[1px] animate-mote-1 pointer-events-none"
              style={{ left: "22%", top: "42%" }}
            />
            <div
              className="absolute w-2.5 h-2.5 rounded-full bg-teal-300/50 blur-[1px] animate-mote-2 pointer-events-none"
              style={{ left: "78%", top: "35%" }}
            />
            <div
              className="absolute w-2 h-2 rounded-full bg-emerald-300/60 blur-[1px] animate-mote-3 pointer-events-none"
              style={{ left: "88%", top: "68%" }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/70 blur-[0.5px] animate-mote-1 pointer-events-none"
              style={{ left: "10%", top: "82%", animationDelay: "3s" }}
            />
          </>
        )}
      </div>
    </div>
  );
}
