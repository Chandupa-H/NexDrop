"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Truck, ArrowRight } from "lucide-react";
import { SectionCard, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import type { CustomerParcelListItem } from "../types";
import { getCustomerStatusLabel, getCustomerStatusTone } from "../lib/status";

interface QuickTrackCardProps {
  recentParcels?: CustomerParcelListItem[];
}

export function QuickTrackCard({ recentParcels = [] }: QuickTrackCardProps) {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingId.trim();
    if (!clean) return;
    router.push(`/customer/track?id=${encodeURIComponent(clean)}`);
  };

  return (
    <SectionCard
      title="Live Parcel Tracking"
      subtitle="Instantly look up milestone progress or courier scan updates"
    >
      <div className="space-y-4 pt-1">
        <form onSubmit={handleTrackSubmit} className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dashboard-muted)]" />
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-muted)] outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!trackingId.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white text-xs h-7 px-3 rounded-lg cursor-pointer"
            >
              Track
            </Button>
          </div>
        </form>

        {/* Recent Trackers List */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider block">
            Recent Shipments
          </span>
          {recentParcels.length === 0 ? (
            <p className="text-sm text-[var(--dashboard-muted)]">No active parcels to track.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentParcels.slice(0, 3).map((p) => (
                <Link
                  key={p.trackingId}
                  href={`/customer/track?id=${encodeURIComponent(p.trackingId)}`}
                  className="p-3 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] hover:border-[var(--dashboard-primary)] transition-colors flex items-center justify-between gap-2 group block"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)] shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--dashboard-text)] group-hover:text-[var(--dashboard-primary)] transition-colors">
                        {p.trackingId}
                      </p>
                      <p className="text-sm text-[var(--dashboard-muted)] truncate">
                        To: {p.recipientName} ({p.destination})
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <StatusBadge
                      label={getCustomerStatusLabel(p.status)}
                      tone={getCustomerStatusTone(p.status)}
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
