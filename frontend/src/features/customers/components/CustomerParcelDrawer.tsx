"use client";

import { useEffect, useState } from "react";
import type { CustomerParcelDetail } from "../types";
import { getCustomerParcelDetail } from "../api/customer.api";
import { mapCustomerParcelDetail } from "../api/customer.mappers";
import { cancelCustomerParcelAction } from "../actions/parcels";
import { getCustomerStatusLabel, getCustomerStatusTone } from "../lib/status";
import { StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import {
  X,
  MapPin,
  Clock,
  Printer,
  AlertTriangle,
  Package,
} from "lucide-react";

interface CustomerParcelDrawerProps {
  trackingId: string;
  onClose: () => void;
  onParcelUpdated: () => void;
}

export function CustomerParcelDrawer({
  trackingId,
  onClose,
  onParcelUpdated,
}: CustomerParcelDrawerProps) {
  const [parcel, setParcel] = useState<CustomerParcelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const dto = await getCustomerParcelDetail(trackingId);
        if (active) {
          setParcel(mapCustomerParcelDetail(dto));
        }
      } catch {
        if (active) {
          setError("Failed to load parcel details. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [trackingId]);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCancelDelivery = async () => {
    if (!parcel) return;
    try {
      setCancelling(true);
      setCancelError(null);
      const updatedDto = await cancelCustomerParcelAction(
        trackingId,
        cancelReason || "Cancelled by customer via dashboard"
      );
      setParcel(mapCustomerParcelDetail(updatedDto));
      setShowCancelPrompt(false);
      onParcelUpdated();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Failed to cancel delivery"
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-xl h-full bg-[var(--dashboard-surface)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--dashboard-deep-green)]">
                {trackingId}
              </h2>
              {parcel && (
                <StatusBadge
                  label={getCustomerStatusLabel(parcel.status)}
                  tone={getCustomerStatusTone(parcel.status)}
                />
              )}
            </div>
            <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">
              Shipment Tracking & Details
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)] transition-colors"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-20 bg-[var(--dashboard-neutral-bg)] animate-pulse rounded-xl" />
              <div className="h-32 bg-[var(--dashboard-neutral-bg)] animate-pulse rounded-xl" />
              <div className="h-40 bg-[var(--dashboard-neutral-bg)] animate-pulse rounded-xl" />
            </div>
          ) : error || !parcel ? (
            <div className="text-center py-12 space-y-3">
              <AlertTriangle className="h-10 w-10 text-[var(--dashboard-danger-text)] mx-auto" />
              <p className="text-sm font-medium text-[var(--dashboard-text)]">
                {error || "Parcel not found"}
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Receipt / Status Summary Banner */}
              <div className="p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--dashboard-muted)]">
                    Total Estimated Delivery Fee
                  </p>
                  <p className="text-xl font-bold text-[var(--dashboard-text)]">
                    Rs. {parcel.fee.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintReceipt}
                  className="gap-1.5 text-xs font-medium border-[var(--dashboard-hairline)]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>
              </div>

              {/* Delivery Details Card */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-[var(--dashboard-primary)]" />
                  Parcel Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
                  <div>
                    <span className="text-xs text-[var(--dashboard-muted)] block">
                      Weight
                    </span>
                    <span className="font-semibold text-[var(--dashboard-text)]">
                      {parcel.weightKg} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--dashboard-muted)] block">
                      Dimensions
                    </span>
                    <span className="font-semibold text-[var(--dashboard-text)]">
                      {parcel.dimensions || "Standard Package"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--dashboard-muted)] block">
                      Sender
                    </span>
                    <span className="font-semibold text-[var(--dashboard-text)]">
                      {parcel.senderName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--dashboard-muted)] block">
                      Booked On
                    </span>
                    <span className="text-xs font-medium text-[var(--dashboard-text)]">
                      {parcel.createdAtDisplay}
                    </span>
                  </div>
                </div>

                {parcel.specialInstructions && (
                  <div className="mt-2 pt-2 border-t border-[var(--dashboard-hairline)]">
                    <span className="text-xs text-[var(--dashboard-muted)] block">
                      Special Delivery Instructions:
                    </span>
                    <p className="text-xs text-[var(--dashboard-text)] italic mt-0.5">
                      &quot;{parcel.specialInstructions}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Route & Recipient Card */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[var(--dashboard-primary)]" />
                  Route & Destination
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--dashboard-muted)] mt-1.5 shrink-0" />
                    <div>
                      <span className="text-xs text-[var(--dashboard-muted)] block">
                        Pickup Address
                      </span>
                      <p className="text-xs font-medium text-[var(--dashboard-text)]">
                        {parcel.pickupAddress}, {parcel.pickupCity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--dashboard-primary)] mt-1.5 shrink-0" />
                    <div>
                      <span className="text-xs text-[var(--dashboard-muted)] block">
                        Drop-off Address & Recipient
                      </span>
                      <p className="text-xs font-medium text-[var(--dashboard-text)]">
                        {parcel.deliveryAddress}, {parcel.deliveryCity}
                      </p>
                      <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">
                        Recipient: {parcel.recipientName} ({parcel.recipientPhoneMasked})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[var(--dashboard-primary)]" />
                  Status History Timeline
                </h3>

                <div className="relative pl-6 space-y-4 pt-2 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--dashboard-hairline)]">
                  {parcel.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-[var(--dashboard-surface)] bg-[var(--dashboard-primary)]" />
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--dashboard-text)]">
                          {event.label}
                        </p>
                        <span className="text-[10px] text-[var(--dashboard-muted)]">
                          {event.occurredAtDisplay}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-[11px] text-[var(--dashboard-muted)] mt-0.5">
                          Location: {event.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancellation Option (FR-CUS-05) */}
              {parcel.status === "pending" && (
                <div className="p-4 rounded-xl border border-[var(--dashboard-warning-bg)] bg-[var(--dashboard-warning-bg)]/20">
                  {!showCancelPrompt ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-[var(--dashboard-text)]">
                          Need to cancel this booking?
                        </p>
                        <p className="text-[11px] text-[var(--dashboard-muted)]">
                          Only available while parcel is still in pending status.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancelPrompt(true)}
                        className="text-xs h-8 text-[var(--dashboard-danger-text)] border-[var(--dashboard-danger-text)]/40 hover:bg-[var(--dashboard-danger-bg)]"
                      >
                        Cancel Delivery
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-[var(--dashboard-text)]">
                        Confirm Cancellation
                      </p>
                      <input
                        type="text"
                        placeholder="Reason for cancellation (optional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)]"
                      />
                      {cancelError && (
                        <p className="text-xs text-[var(--dashboard-danger-text)]">
                          {cancelError}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCancelPrompt(false)}
                          disabled={cancelling}
                          className="text-xs h-7"
                        >
                          Keep Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelDelivery}
                          disabled={cancelling}
                          className="text-xs h-7 bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)] border-[var(--dashboard-danger-text)]/40 hover:bg-[var(--dashboard-danger-bg)]/80"
                        >
                          {cancelling ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]/40 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
