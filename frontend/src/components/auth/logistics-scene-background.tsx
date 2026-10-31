import React from "react";
import Image from "next/image";

interface LogisticsSceneBackgroundProps {
  isDark?: boolean;
}

export function LogisticsSceneBackground({ isDark = false }: LogisticsSceneBackgroundProps) {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* 1. Photorealistic 3D Logistics City & Fleet Illustration */}
      <div
        className={`relative w-full h-full transition-all duration-700 ease-out ${
          isDark
            ? "brightness-[0.28] contrast-[1.12] saturate-[0.8] hue-rotate-[10deg]"
            : "brightness-100 contrast-100"
        }`}
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

      {/* 2. Soft Light Mode Central Ambient Glow (Focuses attention on the floating card) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isDark ? "opacity-0" : "opacity-100"
        } bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(244,249,246,0.65)_0%,rgba(235,245,240,0.25)_65%,transparent_100%)]`}
      />

      {/* 3. Dark Mode Nocturnal Atmosphere Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isDark ? "opacity-100" : "opacity-0"
        } bg-[radial-gradient(ellipse_70%_60%_at_50%_48%,rgba(5,18,12,0.85)_0%,rgba(6,20,14,0.7)_50%,rgba(4,13,9,0.92)_100%)]`}
      />
    </div>
  );
}
