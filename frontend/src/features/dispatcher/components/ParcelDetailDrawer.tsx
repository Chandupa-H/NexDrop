"use client";

import { useEffect, useState } from "react";
import { X, Package, MapPin, Phone, User, Calendar, Scale, Box, FileText, Hash, Shield } from "lucide-react";
import { getUnassignedParcelDetail } from "../api/dispatcher.api";
import { mapUnassignedParcelDetail, type UnassignedParcelDetailViewModel } from "../api/dispatcher.mappers";
import { StatusBadge } from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ParcelDetailDrawerProps {
  parcelId: number | null;
  onClose: () => void;
}

export function ParcelDetailDrawer({ parcelId, onClose }: ParcelDetailDrawerProps) {
  const [parcel, setParcel] = useState<UnassignedParcelDetailViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parcelId) {
      setParcel(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getUnassignedParcelDetail(parcelId)
      .then((dto) => {
        if (isMounted) {
          setParcel(mapUnassignedParcelDetail(dto));
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch unassigned parcel details:", err);
          setError("Unable to load parcel details. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [parcelId]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!parcelId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <aside
        className="relative z-10 w-full max-w-lg bg-[var(--dashboard-surface)] border-l border-[var(--dashboard-border)] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--dashboard-primary)]/10 text-[var(--dashboard-primary)] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 id="drawer-title" className="text-lg font-bold text-[var(--dashboard-text)]">
                Parcel Details
              </h2>
              {parcel && (
                <span className="font-mono text-xs text-[var(--dashboard-muted)]">
                  {parcel.trackingNumber}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={() => parcelId && getUnassignedParcelDetail(parcelId)} className="mt-3">
                Retry
              </Button>
            </div>
          )}

          {parcel && !loading && (
            <>
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dashboard-warning-bg)]/30 border border-[var(--dashboard-warning-bg)]">
                <div>
                  <p className="text-xs font-semibold text-[var(--dashboard-warning-text)] uppercase tracking-wider">
                    Allocation Status
                  </p>
                  <p className="text-sm font-medium text-[var(--dashboard-text)] mt-0.5">
                    Unassigned — Awaiting Courier Dispatch
                  </p>
                </div>
                <StatusBadge label="Pending" tone="warning" />
              </div>

              {/* Recipient Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dashboard-muted)]">
                  Recipient Information
                </h3>
                <div className="p-4 rounded-xl bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-[var(--dashboard-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[var(--dashboard-muted)]">Recipient Name</p>
                      <p className="text-sm font-semibold text-[var(--dashboard-text)]">{parcel.recipientName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[var(--dashboard-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[var(--dashboard-muted)]">Contact Number</p>
                      <a
                        href={`tel:${parcel.recipientPhone}`}
                        className="text-sm font-medium text-[var(--dashboard-primary)] hover:underline"
                      >
                        {parcel.recipientPhone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[var(--dashboard-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[var(--dashboard-muted)]">Delivery Address</p>
                      <p className="text-sm text-[var(--dashboard-text)]">{parcel.deliveryAddress}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-[var(--dashboard-border)]/50 rounded text-[var(--dashboard-text)]">
                        {parcel.deliveryCity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Specifications */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dashboard-muted)]">
                  Package Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[var(--dashboard-muted)]">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Weight</span>
                    </div>
                    <p className="text-base font-bold text-[var(--dashboard-text)]">{parcel.weightKg} kg</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[var(--dashboard-muted)]">
                      <Box className="w-3.5 h-3.5" />
                      <span>Dimensions</span>
                    </div>
                    <p className="text-base font-bold text-[var(--dashboard-text)]">
                      {parcel.dimensions ? `${parcel.dimensions} cm` : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {parcel.specialInstructions && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dashboard-muted)]">
                    Special Instructions
                  </h3>
                  <div className="p-4 rounded-xl bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[var(--dashboard-muted)] shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--dashboard-text)] leading-relaxed">
                      {parcel.specialInstructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Registration Metadata */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dashboard-muted)]">
                  Audit Metadata
                </h3>
                <div className="p-4 rounded-xl bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] space-y-2 text-xs text-[var(--dashboard-muted)]">
                  <div className="flex justify-between py-1 border-b border-[var(--dashboard-border)]/50">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Internal Parcel ID
                    </span>
                    <span className="font-mono text-[var(--dashboard-text)]">{parcel.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--dashboard-border)]/50">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Sender Account ID
                    </span>
                    <span className="font-mono text-[var(--dashboard-text)]">{parcel.senderId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--dashboard-border)]/50">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Registered At
                    </span>
                    <span className="text-[var(--dashboard-text)]">{parcel.formattedCreatedAt}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Last Status Change
                    </span>
                    <span className="text-[var(--dashboard-text)]">{parcel.formattedUpdatedAt}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </div>
  );
}

