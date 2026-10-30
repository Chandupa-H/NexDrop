"use client";

import { Truck, Phone, Navigation, Clock } from "lucide-react";
import type { ActionType, AssignedParcel } from "../types";

interface LiveRouteCardProps {
  upNextParcel: AssignedParcel;
  onOpenAction: (parcel: AssignedParcel, action?: ActionType) => void;
}

// TODO: replace with real map (Leaflet/Mapbox) + WebSocket live location
export function LiveRouteCard({ upNextParcel, onOpenAction }: LiveRouteCardProps) {
  return (
    <div className="ct-card flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2A1D]" style={{ letterSpacing: "-0.01em" }}>
            Live Route
          </h2>
          <p className="text-xs text-[#5B7266] mt-0.5">Current active delivery</p>
        </div>

        {/* Live Badge */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: "#E3F6E8", color: "#12703A" }}
        >
          <span
            className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse"
            aria-hidden="true"
          />
          Live
        </span>
      </div>

      {/* Map Graphic Placeholder */}
      <div
        className="relative rounded-2xl overflow-hidden min-h-[170px] flex-1 flex flex-col justify-between p-3 select-none"
        role="img"
        aria-label="Route map showing active transit from Colombo to Kandy"
        style={{
          background: "linear-gradient(145deg, #e4efe7 0%, #d8ebd9 50%, #cbe4ce 100%)",
        }}
      >
        {/* Subtle Map Grid Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="roadGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#0B3D2A" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roadGrid)" />
        </svg>

        {/* Route SVG */}
        <svg
          viewBox="0 0 240 130"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Broad pale road */}
          <path
            d="M 40 100 C 70 85, 110 80, 140 55 C 165 35, 180 35, 205 25"
            fill="none"
            stroke="#ffffff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Dashed green route line */}
          <path
            d="M 40 100 C 70 85, 110 80, 140 55 C 165 35, 180 35, 205 25"
            fill="none"
            stroke="#16A34A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />

          {/* Colombo Origin Pin */}
          <circle cx="40" cy="100" r="5" fill="#0B3D2A" />
          <circle cx="40" cy="100" r="2.5" fill="white" />
          <text x="32" y="116" fontSize="8" fill="#0B3D2A" fontWeight="700">
            Colombo
          </text>

          {/* Kandy Destination Pin */}
          <circle cx="205" cy="25" r="5" fill="#DC2626" />
          <circle cx="205" cy="25" r="2.5" fill="white" />
          <text x="186" y="16" fontSize="8" fill="#DC2626" fontWeight="700">
            Kandy
          </text>

          {/* Truck Marker midway */}
          <g transform="translate(136, 56)">
            <circle r="12" fill="white" stroke="#16A34A" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
            <rect x="-6" y="-4" width="9" height="7" rx="1" fill="#16A34A" />
            <rect x="3" y="-2" width="4.5" height="5" rx="0.5" fill="#0B3D2A" />
            <circle cx="-4" cy="4" r="1.8" fill="#0F2A1D" />
            <circle cx="5" cy="4" r="1.8" fill="#0F2A1D" />
          </g>
        </svg>

        {/* Top spacer */}
        <div />

        {/* Floating In-Transit Chip */}
        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm border border-[#E5EEE8]/80">
          <div className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#0F2A1D] truncate">
              In Transit — {upNextParcel.trackingId}
            </p>
            <p className="text-[10px] text-[#5B7266] truncate">
              Colombo → Kandy · ETA 10:45 AM
            </p>
          </div>
          <Truck className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
        </div>
      </div>

      {/* Up Next Block */}
      <div className="rounded-xl p-3.5 bg-[#F2F7F3] border border-[#E5EEE8] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">
              Up Next
            </span>
            <p className="text-sm font-bold text-[#0F2A1D] truncate mt-0.5">
              {upNextParcel.customerName}
            </p>
            <p className="text-xs text-[#5B7266] truncate">
              {upNextParcel.destination}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-xs text-[#5B7266] bg-white px-2 py-1 rounded-lg border border-[#E5EEE8]">
            <Clock className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
            <span className="font-semibold text-[#0F2A1D]">10:45 AM</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAction(upNextParcel, "update-status")}
            className="flex-1 h-9 rounded-xl text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
          >
            Update status
          </button>

          {/* Disabled Call Button */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Phone calling requires carrier integration"
            aria-label="Call customer (Coming soon)"
            className="h-9 w-9 rounded-xl border border-[#E5EEE8] bg-white text-[#5B7266]/50 flex items-center justify-center cursor-not-allowed"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Disabled Navigate Button */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Navigation opens with Mapbox/Google Maps integration"
            aria-label="Navigate to destination (Coming soon)"
            className="h-9 w-9 rounded-xl border border-[#E5EEE8] bg-white text-[#5B7266]/50 flex items-center justify-center cursor-not-allowed"
          >
            <Navigation className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
