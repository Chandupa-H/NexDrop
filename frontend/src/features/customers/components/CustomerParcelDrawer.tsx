"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CustomerParcelDetail } from "../types";
import { getCustomerParcelDetail } from "../api/customer.api";
import { mapCustomerParcelDetail } from "../api/customer.mappers";
import { cancelCustomerParcelAction } from "../actions/parcels";
import { cancelCustomerHistoryParcelAction } from "../actions/history-cancellation";
import { historyCancellationPolicy } from "../config/history-cancellation";
import { getCustomerStatusLabel, getCustomerStatusTone, getRemainingDeliverySteps } from "../lib/status";
import { isCustomerReceiptEligible } from "../lib/receipt";
import { StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import {
  X,
  MapPin,
  Clock,
  Printer,
  AlertTriangle,
  Package,
  Navigation,
  ShieldCheck,
  Copy,
  Check,
  KeyRound,
  FileText,
} from "lucide-react";

interface CustomerParcelDrawerProps {
  trackingId: string;
  onClose: () => void;
  onParcelUpdated: () => void;
  readOnly?: boolean;
  /** Reuse pending confirmation in history; live submission also requires the server gate. */
  historyCancellation?: boolean;
}

export function CustomerParcelDrawer({
  trackingId,
  onClose,
  onParcelUpdated,
  readOnly = false,
  historyCancellation = false,
}: CustomerParcelDrawerProps) {
  const [parcel, setParcel] = useState<CustomerParcelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const cancellationInFlight = useRef(false);
  const reasonId = `cancel-reason-${trackingId}`;

  const handleCopyPasscode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const dto = await getCustomerParcelDetail(trackingId, !historyCancellation);
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
  }, [trackingId, historyCancellation]);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCancelDelivery = async () => {
    if (!parcel || parcel.status !== "pending" || cancellationInFlight.current || (readOnly && !historyCancellation)) return;
    if (historyCancellation && !historyCancellationPolicy.enabled) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError("Please provide a reason for cancellation.");
      return;
    }
    cancellationInFlight.current = true;
    try {
      setCancelling(true);
      setCancelError(null);
      let updatedDto;
      if (historyCancellation) {
        const result = await cancelCustomerHistoryParcelAction(trackingId, trimmedReason);
        if (!result.ok) {
          setCancelError(result.message);
          if (result.conflict) onParcelUpdated();
          return;
        }
        updatedDto = result.parcel;
      } else {
        updatedDto = await cancelCustomerParcelAction(trackingId, trimmedReason);
      }
      setParcel(mapCustomerParcelDetail(updatedDto));
      setShowCancelPrompt(false);
      if (historyCancellation) setCancelSuccess(true);
      onParcelUpdated();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Failed to cancel delivery"
      );
    } finally {
      cancellationInFlight.current = false;
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
            <p className="text-sm text-[var(--dashboard-muted)] mt-0.5">
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
        <div
          className={`flex-1 overflow-y-auto no-scrollbar p-6 ${
            !loading && (error || !parcel)
              ? "flex flex-col items-center justify-center"
              : "space-y-6"
          }`}
        >
          {loading ? (
            <div className="space-y-4 w-full">
              <div className="h-20 bg-[var(--dashboard-neutral-bg)] animate-pulse rounded-xl" />
              <div className="h-32 bg-[var(--dashboard-neutral-bg)] animate-pulse rounded-xl" />
              <div className="h-40 bg-[var(--dashboard-neutral-bg)] animate-pulse rounded-xl" />
            </div>
          ) : error || !parcel ? (
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-3 my-auto w-full max-w-sm">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-[var(--dashboard-danger-text)] mb-1">
                <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-base font-semibold text-[var(--dashboard-text)]">
                {error || "Parcel not found"}
              </p>
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl px-5 text-sm cursor-pointer shadow-xs">
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Receipt / Status Summary Banner */}
              <div className="p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--dashboard-muted)]">
                    Total Estimated Delivery Fee
                  </p>
                  <p className="text-xl font-bold text-[var(--dashboard-text)]">
                    Rs. {parcel.fee.toFixed(2)}
                  </p>
                </div>
                {!readOnly && <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintReceipt}
                  className="gap-1.5 text-sm font-medium border-[var(--dashboard-hairline)]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>}
              </div>

              {/* Delivery Details Card */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-[var(--dashboard-primary)]" />
                  Parcel Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
                  <div>
                    <span className="text-sm text-[var(--dashboard-muted)] block">
                      Weight
                    </span>
                    <span className="font-semibold text-[var(--dashboard-text)]">
                      {parcel.weightKg} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-[var(--dashboard-muted)] block">
                      Dimensions
                    </span>
                    <span className="font-semibold text-[var(--dashboard-text)]">
                      {parcel.dimensions || "Standard Package"}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-[var(--dashboard-muted)] block">
                      Sender
                    </span>
                    <span className="font-semibold text-[var(--dashboard-text)]">
                      {parcel.senderName}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-[var(--dashboard-muted)] block">
                      Booked On
                    </span>
                    <span className="text-sm font-medium text-[var(--dashboard-text)]">
                      {parcel.createdAtDisplay}
                    </span>
                  </div>
                </div>

                {parcel.specialInstructions && (
                  <div className="mt-2 pt-2 border-t border-[var(--dashboard-hairline)]">
                    <span className="text-sm text-[var(--dashboard-muted)] block">
                      Special Delivery Instructions:
                    </span>
                    <p className="text-sm text-[var(--dashboard-text)] italic mt-0.5">
                      &quot;{parcel.specialInstructions}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Route & Recipient Card */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[var(--dashboard-primary)]" />
                  Route & Destination
                </h3>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--dashboard-muted)] mt-1.5 shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-[var(--dashboard-muted)] block">
                        Pickup Address
                      </span>
                      <p className="text-sm font-medium text-[var(--dashboard-text)] mt-0.5">
                        {parcel.pickupAddress}, {parcel.pickupCity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--dashboard-primary)] mt-1.5 shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-[var(--dashboard-muted)] block">
                        Drop-off Address & Recipient
                      </span>
                      <p className="text-sm font-medium text-[var(--dashboard-text)] mt-0.5">
                        {parcel.deliveryAddress}, {parcel.deliveryCity}
                      </p>
                      <p className="text-sm text-[var(--dashboard-muted)] mt-1">
                        Recipient: {parcel.recipientName} ({parcel.recipientPhone || parcel.recipientPhoneMasked})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Passcode (OTP) Security Card */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]/40">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2d4638]">
                    Delivery Passcode (OTP)
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-sm text-[var(--dashboard-muted)] block">6-Digit Secure Handover Code</span>
                    <span className="font-mono text-2xl font-bold tracking-widest text-[var(--dashboard-deep-green)]">
                      {parcel.deliveryPasscode || "482915"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPasscode(parcel.deliveryPasscode || "482915")}
                    className="h-8 px-3 gap-1.5 text-xs font-semibold border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] hover:bg-[var(--dashboard-control-bg)] text-[var(--dashboard-deep-green)] cursor-pointer shrink-0 shadow-xs"
                  >
                    {copiedPasscode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[var(--dashboard-primary)]" /> Copy OTP
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-[var(--dashboard-muted)] leading-relaxed">
                  {parcel.status === "delivered" || parcel.deliveryPasscodeVerified
                    ? "This delivery was completed and secured via digital OTP verification at the recipient's doorstep."
                    : "Share this passcode with the recipient. The courier will prompt for it before releasing the parcel."}
                </p>
              </div>

              {/* Status Timeline */}
              <div className="space-y-3 p-4 rounded-xl border border-[var(--dashboard-hairline)]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[var(--dashboard-primary)]" />
                  Status History Timeline
                </h3>

                <div className="relative pl-6 space-y-4 pt-2 before:absolute before:left-[4px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--dashboard-hairline)]">
                  {parcel.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--dashboard-primary)] z-10" />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                          {event.label}
                        </p>
                        <span className="text-sm text-[var(--dashboard-muted)] shrink-0">
                          {event.occurredAtDisplay}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">
                          Location: {event.location}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Remaining steps if not delivered / cancelled */}
                  {getRemainingDeliverySteps(parcel).map((step, idx) => (
                    <div key={`pending-${step.key}-${idx}`} className="relative opacity-60">
                      <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border border-dashed border-gray-400 bg-gray-200 dark:bg-gray-700 z-10" />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                          {step.label}
                        </p>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
                          Pending
                        </span>
                      </div>
                      {step.location && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Location: {step.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancellation Option (FR-CUS-05) */}
              {cancelSuccess && <p role="status" className="text-sm text-primary">Delivery cancelled.</p>}
              {(!readOnly || historyCancellation) && parcel.status === "pending" && (
                <div className="p-4 rounded-xl border border-red-200/80 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20">
                  {historyCancellation && !historyCancellationPolicy.enabled && (
                    <p className="mb-3 text-sm text-amber-800 dark:text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed">{historyCancellationPolicy.message}</p>
                  )}
                  {!showCancelPrompt ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--dashboard-text)]">
                          Need to cancel this booking?
                        </p>
                        <p className="text-sm text-[var(--dashboard-muted)] mt-0.5">
                          Only available while parcel is still in pending status.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(true)}
                        className="text-sm h-9 px-3.5 rounded-xl border border-red-300 dark:border-red-800/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium transition-colors cursor-pointer"
                      >
                        Cancel Delivery
                      </button>
                    </div>
                  ) : (
                    <div role="group" aria-labelledby={`cancel-title-${trackingId}`} className="space-y-3">
                      <p id={`cancel-title-${trackingId}`} className="text-sm font-bold text-red-600 dark:text-red-400">
                        Confirm Cancellation
                      </p>
                      <label htmlFor={reasonId} className="block text-sm font-medium text-[var(--dashboard-text)]">
                        Reason for cancellation
                      </label>
                      <input
                        id={reasonId}
                        type="text"
                        required
                        aria-required="true"
                        disabled={cancelling}
                        value={cancelReason}
                        onChange={(e) => {
                          setCancelReason(e.target.value);
                          if (cancelError) setCancelError(null);
                        }}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      />
                      {cancelError && (
                        <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {cancelError}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowCancelPrompt(false)}
                          disabled={cancelling}
                          className="text-sm px-3 py-1.5 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)] font-medium transition-colors cursor-pointer"
                        >
                          Keep Order
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelivery}
                          disabled={cancelling || (historyCancellation && !historyCancellationPolicy.enabled)}
                          className="text-sm px-4 py-2 rounded-xl font-bold bg-[#EF4444] hover:bg-[#DC2626] active:bg-[#B91C1C] text-white transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:bg-[#EF4444] disabled:text-white"
                        >
                          {cancelling ? "Cancelling..." : "Confirm Cancel"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]/40 flex items-center gap-2 flex-wrap ${
            parcel ? "justify-between" : "justify-end"
          }`}
        >
          {parcel && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/customer/track?id=${encodeURIComponent(parcel.trackingId)}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--dashboard-primary)] text-white hover:bg-[var(--dashboard-primary)]/90 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                Full Tracking Page
              </Link>
              {isCustomerReceiptEligible(parcel.status, parcel.trackingId) && (
                <Link
                  href={`/customer/history/receipt?trackingId=${encodeURIComponent(parcel.trackingId)}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:text-[var(--dashboard-primary)] hover:border-[var(--dashboard-primary)]/40 hover:bg-[var(--dashboard-control-bg)] transition-colors shadow-2xs cursor-pointer"
                  aria-label={`View shipment receipt for ${parcel.trackingId}`}
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--dashboard-primary)]" />
                  <span>View Receipt</span>
                </Link>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="text-sm">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
