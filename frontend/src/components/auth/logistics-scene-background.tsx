import React from "react";

export function LogisticsSceneBackground() {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Sky atmospheric gradient */}
          <linearGradient id="skyGrad" x1="720" y1="0" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f3f8f5" />
            <stop offset="0.35" stopColor="#ebf5f0" />
            <stop offset="0.7" stopColor="#e2efe8" />
            <stop offset="1" stopColor="#d8ebe1" />
          </linearGradient>

          {/* Distant fog mist */}
          <linearGradient id="mistFog" x1="0" y1="200" x2="0" y2="500" gradientUnits="userSpaceOnUse">
            <stop stopColor="#eaf3ef" stopOpacity="0.85" />
            <stop offset="1" stopColor="#eaf3ef" stopOpacity="0" />
          </linearGradient>

          {/* Road Overpass Gradient */}
          <linearGradient id="roadGrad" x1="0" y1="350" x2="1440" y2="500" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e0eee6" />
            <stop offset="0.5" stopColor="#d5e8de" />
            <stop offset="1" stopColor="#cce2d6" />
          </linearGradient>

          {/* Warehouse wall shading */}
          <linearGradient id="wallShadeLeft" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#dbeee4" />
            <stop offset="1" stopColor="#cfe6da" />
          </linearGradient>
          <linearGradient id="wallShadeRight" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#c3ded0" />
            <stop offset="1" stopColor="#b5d6c5" />
          </linearGradient>
          <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#f1f8f4" />
            <stop offset="1" stopColor="#e2f0e8" />
          </linearGradient>

          {/* Truck shadows */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="0" dy="8" />
            <feComponentTransfer><feFuncA type="linear" slope="0.12" /></feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Base Sky Background */}
        <rect width="1440" height="900" fill="url(#skyGrad)" />

        {/* 2. Far Distant Silhouette - Port Cranes, TV Tower & Skyline (Pastel Mint) */}
        <g opacity="0.45" stroke="#9bbfae" strokeWidth="1.2">
          {/* Distant TV/Telecom Tower */}
          <line x1="1050" y1="120" x2="1050" y2="340" strokeWidth="2.5" />
          <circle cx="1050" cy="180" r="14" fill="#d2e7dd" strokeWidth="1.8" />
          <circle cx="1050" cy="220" r="8" fill="#d2e7dd" strokeWidth="1.5" />
          <line x1="1040" y1="340" x2="1050" y2="120" strokeWidth="1.2" />
          <line x1="1060" y1="340" x2="1050" y2="120" strokeWidth="1.2" />

          {/* Distant Harbor Gantry Cranes (Left) */}
          {/* Crane 1 */}
          <path d="M120 380 L160 260 L240 260 L280 380 M180 260 L140 380 M220 260 L260 380" />
          <line x1="100" y1="260" x2="310" y2="260" strokeWidth="2.5" />
          <line x1="100" y1="260" x2="200" y2="190" strokeWidth="1.5" />
          <line x1="200" y1="190" x2="310" y2="260" strokeWidth="1.5" />

          {/* Crane 2 */}
          <path d="M260 370 L290 280 L350 280 L380 370 M305 280 L275 370 M335 280 L365 370" />
          <line x1="240" y1="280" x2="400" y2="280" strokeWidth="2.2" />
          <line x1="240" y1="280" x2="320" y2="220" strokeWidth="1.5" />
          <line x1="320" y1="220" x2="400" y2="280" strokeWidth="1.5" />

          {/* Crane 3 (Right) */}
          <path d="M1220 360 L1250 270 L1310 270 L1340 360" />
          <line x1="1200" y1="270" x2="1360" y2="270" strokeWidth="2" />
          <line x1="1200" y1="270" x2="1280" y2="210" strokeWidth="1.5" />
          <line x1="1280" y1="210" x2="1360" y2="270" strokeWidth="1.5" />
        </g>

        {/* Distant Stacked Shipping Containers */}
        <g opacity="0.55">
          {/* Left Container Yard */}
          <rect x="180" y="340" width="46" height="20" rx="2" fill="#a4cbba" stroke="#87af9d" strokeWidth="0.8" />
          <rect x="230" y="340" width="46" height="20" rx="2" fill="#bcdfd0" stroke="#87af9d" strokeWidth="0.8" />
          <rect x="205" y="320" width="46" height="20" rx="2" fill="#87af9d" stroke="#6d9684" strokeWidth="0.8" />
          <rect x="280" y="345" width="46" height="20" rx="2" fill="#c7e6d8" stroke="#87af9d" strokeWidth="0.8" />

          {/* Right Container Yard */}
          <rect x="1140" y="330" width="46" height="20" rx="2" fill="#98c2b0" stroke="#7ea896" strokeWidth="0.8" />
          <rect x="1190" y="330" width="46" height="20" rx="2" fill="#bcdfd0" stroke="#7ea896" strokeWidth="0.8" />
          <rect x="1165" y="310" width="46" height="20" rx="2" fill="#7ea896" stroke="#648e7c" strokeWidth="0.8" />
        </g>

        {/* 3. Midground: Elevated Curved Highway Overpass System */}
        {/* Supporting Concrete Overpass Pillars */}
        <g fill="#bfdcce" stroke="#9ec5b3" strokeWidth="1">
          <rect x="310" y="440" width="18" height="90" rx="3" />
          <rect x="490" y="470" width="18" height="80" rx="3" />
          <rect x="920" y="480" width="18" height="90" rx="3" />
          <rect x="1120" y="430" width="18" height="110" rx="3" />
          <rect x="1280" y="390" width="18" height="130" rx="3" />
        </g>

        {/* High-level Highway Flyover (Sweeping Curve Across Horizon) */}
        <path
          d="M-50 490 C 250 480, 520 440, 780 430 C 1040 420, 1260 370, 1490 350 L 1490 378 C 1260 398, 1040 448, 780 458 C 520 468, 250 508, -50 518 Z"
          fill="url(#roadGrad)"
          stroke="#b2d4c4"
          strokeWidth="1.5"
        />
        {/* Highway Barrier Rail */}
        <path
          d="M-50 488 C 250 478, 520 438, 780 428 C 1040 418, 1260 368, 1490 348"
          stroke="#9fc6b4"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Dashed Center Road Markings */}
        <path
          d="M-50 504 C 250 494, 520 454, 780 444 C 1040 434, 1260 384, 1490 364"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeDasharray="14 14"
          opacity="0.85"
          fill="none"
        />

        {/* Small Distant Delivery Truck on Highway (Far Left) */}
        <g transform="translate(260, 465) scale(0.48)" opacity="0.85">
          {/* Shadow */}
          <rect x="10" y="38" width="90" height="14" rx="7" fill="#8dafa0" opacity="0.4" />
          {/* Trailer */}
          <rect x="10" y="6" width="62" height="32" rx="3" fill="#ffffff" stroke="#c0dacf" strokeWidth="1.5" />
          <path d="M12 22 L70 22" stroke="#22c55e" strokeWidth="2.5" />
          {/* Cab */}
          <path d="M72 16 L88 16 L94 28 L94 38 L72 38 Z" fill="#ebf5f0" stroke="#b2d4c4" strokeWidth="1.5" />
          {/* Windshield */}
          <path d="M76 19 L85 19 L89 26 L76 26 Z" fill="#8cb9a6" />
          {/* Wheels */}
          <circle cx="28" cy="40" r="6" fill="#4d6f60" />
          <circle cx="82" cy="40" r="6" fill="#4d6f60" />
        </g>

        {/* Another Truck on Overpass (Far Right) */}
        <g transform="translate(1040, 410) scale(0.44)" opacity="0.85">
          <rect x="10" y="38" width="85" height="12" rx="6" fill="#8dafa0" opacity="0.35" />
          <rect x="10" y="8" width="58" height="30" rx="3" fill="#ffffff" stroke="#c0dacf" strokeWidth="1.5" />
          <path d="M12 23 L66 23" stroke="#22c55e" strokeWidth="2" />
          <path d="M68 18 L84 18 L90 28 L90 38 L68 38 Z" fill="#ebf5f0" stroke="#b2d4c4" strokeWidth="1.5" />
          <circle cx="26" cy="40" r="5" fill="#4d6f60" />
          <circle cx="78" cy="40" r="5" fill="#4d6f60" />
        </g>

        {/* 4. Foreground: Isometric Warehouse Logistics Center */}
        {/* Ground Surface (Subtle Green-Tinted Concrete Floor) */}
        <path
          d="M-50 560 L 1490 520 L 1490 950 L -50 950 Z"
          fill="#dceee4"
        />

        {/* Roadway & Truck Parking Stalls in Foreground */}
        <path
          d="M-50 630 L 1490 600 L 1490 780 L -50 820 Z"
          fill="#eaf4ee"
          stroke="#cbdfd4"
          strokeWidth="1.5"
        />
        {/* Road center dash */}
        <path
          d="M-50 720 L 1490 690"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeDasharray="20 20"
          opacity="0.9"
        />

        {/* Left Warehouse Complex (Building 1) */}
        <g filter="url(#softShadow)">
          {/* Main Warehouse Wall Left */}
          <polygon points="40,650 360,590 360,770 40,830" fill="url(#wallShadeLeft)" stroke="#a9cbbd" strokeWidth="1.2" />
          {/* Main Warehouse Wall Right */}
          <polygon points="360,590 520,620 520,800 360,770" fill="url(#wallShadeRight)" stroke="#97baa9" strokeWidth="1.2" />
          {/* Warehouse Roof */}
          <polygon points="40,650 200,560 520,620 360,590" fill="url(#roofGrad)" stroke="#c3ded1" strokeWidth="1.2" />

          {/* Loading Dock Doors (Bay 1, Bay 2, Bay 3) */}
          {/* Bay 1 */}
          <rect x="90" y="680" width="56" height="85" rx="3" fill="#c5dfd2" stroke="#87af9e" strokeWidth="1.2" />
          <line x1="90" y1="700" x2="146" y2="700" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="90" y1="720" x2="146" y2="720" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="90" y1="740" x2="146" y2="740" stroke="#87af9e" strokeWidth="0.8" />
          <rect x="110" y="666" width="16" height="8" rx="2" fill="#22c55e" opacity="0.8" />

          {/* Bay 2 */}
          <rect x="180" y="660" width="56" height="85" rx="3" fill="#c5dfd2" stroke="#87af9e" strokeWidth="1.2" />
          <line x1="180" y1="680" x2="236" y2="680" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="180" y1="700" x2="236" y2="700" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="180" y1="720" x2="236" y2="720" stroke="#87af9e" strokeWidth="0.8" />
          <rect x="200" y="646" width="16" height="8" rx="2" fill="#22c55e" opacity="0.8" />

          {/* Bay 3 */}
          <rect x="270" y="640" width="56" height="85" rx="3" fill="#c5dfd2" stroke="#87af9e" strokeWidth="1.2" />
          <line x1="270" y1="660" x2="326" y2="660" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="270" y1="680" x2="326" y2="680" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="270" y1="700" x2="326" y2="700" stroke="#87af9e" strokeWidth="0.8" />
          <rect x="290" y="626" width="16" height="8" rx="2" fill="#22c55e" opacity="0.8" />
        </g>

        {/* Right Warehouse Complex (Building 2) */}
        <g filter="url(#softShadow)">
          <polygon points="1080,590 1440,530 1440,750 1080,810" fill="url(#wallShadeLeft)" stroke="#a9cbbd" strokeWidth="1.2" />
          <polygon points="940,620 1080,590 1080,810 940,840" fill="url(#wallShadeRight)" stroke="#97baa9" strokeWidth="1.2" />
          <polygon points="940,620 1260,510 1440,530 1080,590" fill="url(#roofGrad)" stroke="#c3ded1" strokeWidth="1.2" />

          {/* Loading Dock Doors */}
          <rect x="1140" y="630" width="60" height="90" rx="3" fill="#c5dfd2" stroke="#87af9e" strokeWidth="1.2" />
          <line x1="1140" y1="655" x2="1200" y2="655" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="1140" y1="680" x2="1200" y2="680" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="1140" y1="705" x2="1200" y2="705" stroke="#87af9e" strokeWidth="0.8" />
          <rect x="1162" y="616" width="16" height="8" rx="2" fill="#22c55e" opacity="0.8" />

          <rect x="1240" y="610" width="60" height="90" rx="3" fill="#c5dfd2" stroke="#87af9e" strokeWidth="1.2" />
          <line x1="1240" y1="635" x2="1300" y2="635" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="1240" y1="660" x2="1300" y2="660" stroke="#87af9e" strokeWidth="0.8" />
          <line x1="1240" y1="685" x2="1300" y2="685" stroke="#87af9e" strokeWidth="0.8" />
          <rect x="1262" y="596" width="16" height="8" rx="2" fill="#22c55e" opacity="0.8" />
        </g>

        {/* 5. Detailed Foreground NexDrop Delivery Trucks (Matching the screenshot!) */}
        {/* Truck 1: Foreground Left Center (Driving into hub) */}
        <g transform="translate(260, 830) scale(1.1)" filter="url(#softShadow)">
          {/* Ground drop shadow */}
          <ellipse cx="60" cy="50" rx="58" ry="12" fill="#698f7e" opacity="0.32" />

          {/* White Box Trailer */}
          <polygon points="5,5 85,5 85,42 5,42" fill="#ffffff" stroke="#b6d5c6" strokeWidth="1.5" />
          {/* NexDrop vibrant green signature stripe on trailer */}
          <path d="M5 24 L85 24" stroke="#16a34a" strokeWidth="4" />
          <path d="M5 28 L85 28" stroke="#a3e635" strokeWidth="2" />
          {/* Tiny logo text */}
          <text x="24" y="20" fill="#0b3d2a" fontSize="8" fontWeight="bold" fontFamily="sans-serif">NexDrop</text>

          {/* Modern Truck Cab */}
          <path d="M85 14 L106 14 L114 26 L114 42 L85 42 Z" fill="#f4faf6" stroke="#a9ccbd" strokeWidth="1.5" />
          {/* Cab Windshield */}
          <path d="M90 17 L102 17 L108 26 L90 26 Z" fill="#88bca7" opacity="0.8" stroke="#689f89" strokeWidth="0.8" />
          {/* Headlight */}
          <circle cx="112" cy="36" r="3" fill="#fef08a" />
          {/* Wheels */}
          <circle cx="28" cy="44" r="8" fill="#2d4a3c" stroke="#5a806f" strokeWidth="1.5" />
          <circle cx="30" cy="44" r="3" fill="#a4cbba" />
          <circle cx="98" cy="44" r="8" fill="#2d4a3c" stroke="#5a806f" strokeWidth="1.5" />
          <circle cx="100" cy="44" r="3" fill="#a4cbba" />
        </g>

        {/* Truck 2: Center Midground (Parked / maneuvering) */}
        <g transform="translate(670, 740) scale(0.85)" filter="url(#softShadow)">
          <ellipse cx="55" cy="48" rx="52" ry="10" fill="#698f7e" opacity="0.28" />
          <polygon points="5,5 78,5 78,40 5,40" fill="#ffffff" stroke="#b6d5c6" strokeWidth="1.5" />
          <path d="M5 22 L78 22" stroke="#16a34a" strokeWidth="3" />
          <path d="M98 14 L80 14 L78 40 L108 40 L108 24 Z" fill="#f4faf6" stroke="#a9ccbd" strokeWidth="1.5" />
          <path d="M83 17 L94 17 L102 24 L83 24 Z" fill="#88bca7" opacity="0.8" />
          <circle cx="26" cy="42" r="7" fill="#2d4a3c" />
          <circle cx="92" cy="42" r="7" fill="#2d4a3c" />
        </g>

        {/* Truck 3: Foreground Right (Exiting gate) */}
        <g transform="translate(950, 795) scale(1.05)" filter="url(#softShadow)">
          <ellipse cx="60" cy="50" rx="58" ry="12" fill="#698f7e" opacity="0.3" />
          <polygon points="5,5 85,5 85,42 5,42" fill="#ffffff" stroke="#b6d5c6" strokeWidth="1.5" />
          <path d="M5 24 L85 24" stroke="#16a34a" strokeWidth="4" />
          <text x="24" y="20" fill="#0b3d2a" fontSize="8" fontWeight="bold" fontFamily="sans-serif">NexDrop</text>
          <path d="M85 14 L106 14 L114 26 L114 42 L85 42 Z" fill="#f4faf6" stroke="#a9ccbd" strokeWidth="1.5" />
          <path d="M90 17 L102 17 L108 26 L90 26 Z" fill="#88bca7" opacity="0.8" />
          <circle cx="112" cy="36" r="3" fill="#fef08a" />
          <circle cx="28" cy="44" r="8" fill="#2d4a3c" />
          <circle cx="98" cy="44" r="8" fill="#2d4a3c" />
        </g>

        {/* Landscaping / Round Green Planters / Bush Orbs (From the screenshot!) */}
        <g opacity="0.85">
          {/* Planter 1 */}
          <ellipse cx="480" cy="790" rx="32" ry="12" fill="#a8cfbe" stroke="#87b29f" strokeWidth="1" />
          <circle cx="470" cy="784" r="8" fill="#589a7a" />
          <circle cx="484" cy="782" r="10" fill="#6ba989" />
          <circle cx="496" cy="786" r="7" fill="#589a7a" />

          {/* Planter 2 */}
          <ellipse cx="880" cy="760" rx="36" ry="13" fill="#a8cfbe" stroke="#87b29f" strokeWidth="1" />
          <circle cx="868" cy="754" r="9" fill="#589a7a" />
          <circle cx="882" cy="750" r="11" fill="#6ba989" />
          <circle cx="898" cy="754" r="8" fill="#589a7a" />
        </g>

        {/* 6. Soft Central Radial Fog Overlay (Ensures dead-center form card pops with maximum contrast) */}
        <radialGradient id="centerFocusMist" cx="50%" cy="46%" r="45%" fx="50%" fy="46%">
          <stop offset="0%" stopColor="#f3f9f6" stopOpacity="0.88" />
          <stop offset="45%" stopColor="#ecf5f1" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e0efe7" stopOpacity="0" />
        </radialGradient>
        <rect width="1440" height="900" fill="url(#centerFocusMist)" />
      </svg>
    </div>
  );
}

