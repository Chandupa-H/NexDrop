/**
 * Live route map with up-next parcel details.
 * Props:
 * - upNext: ParcelListItem | null - next in-transit parcel
 * - onUpdateStatus: () => void - called when "Update status" button is clicked
 */

import { SectionCard, EmptyState } from "@/components/dashboard";
import { Phone, Navigation, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParcelListItem } from "../types";

export function LiveRouteCard({
  upNext,
  onUpdateStatus,
}: {
  upNext: ParcelListItem | null;
  onUpdateStatus: () => void;
}) {
  return (
    <SectionCard
      title="Live Route"
      action={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            Live
          </div>
          <button
            disabled
            className="text-sm text-[var(--dashboard-primary)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1"
          >
            View map <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative h-48 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl overflow-hidden">
          {/* TODO: replace with real map (Leaflet/Mapbox) + WebSocket live location */}
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="400" height="200" fill="#e0f2fe" />
            <rect width="400" height="200" fill="url(#grid)" />
            <circle cx="100" cy="150" r="6" fill="#16A34A" stroke="white" strokeWidth="2" />
            <text x="100" y="170" textAnchor="middle" fontSize="10" fill="#64748b">Colombo</text>
            <circle cx="300" cy="80" r="6" fill="#16A34A" stroke="white" strokeWidth="2" />
            <text x="300" y="70" textAnchor="middle" fontSize="10" fill="#64748b">Kandy</text>
            <path d="M 100 150 Q 200 100 300 80" stroke="#16A34A" strokeWidth="3" fill="none" strokeDasharray="8 4" />
            <g transform="translate(220, 110)">
              <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#16A34A" />
              <rect x="-6" y="-8" width="12" height="4" rx="1" fill="#0B5D2E" />
              <circle cx="0" cy="0" r="3" fill="white" />
            </g>
          </svg>
          {upNext && (
            <div className="absolute bottom-3 left-3 bg-white px-3 py-1.5 rounded-lg shadow-md text-xs font-medium">
              In Transit - {upNext.trackingId}
            </div>
          )}
        </div>

        {upNext ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Up Next</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--dashboard-muted)]">Customer</span>
                <span className="font-medium">{upNext.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--dashboard-muted)]">Destination</span>
                <span className="font-medium">{upNext.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--dashboard-muted)]">ETA</span>
                <span className="font-medium">{upNext.eta || "—"}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={onUpdateStatus} className="flex-1">
                Update status
              </Button>
              <button
                disabled
                title="Call customer"
                className="w-10 h-10 rounded-lg border border-[var(--dashboard-hairline)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                disabled
                title="Navigate"
                className="w-10 h-10 rounded-lg border border-[var(--dashboard-hairline)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="truck"
            title="No active deliveries"
            description="You don't have any parcels in transit right now."
          />
        )}
      </div>
    </SectionCard>
  );
}
