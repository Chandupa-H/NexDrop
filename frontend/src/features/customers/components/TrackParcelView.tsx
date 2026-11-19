"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Share2,
  Printer,
  XCircle,
  Calendar,
  Phone,
  User,
  Ruler,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, StatusBadge } from "@/components/dashboard";
import { getCustomerParcelDetail, cancelCustomerParcel } from "../api/customer.api";
import { mapCustomerParcelDetail } from "../api/customer.mappers";
import type { CustomerParcelDetail } from "../types";
import { getCustomerStatusLabel, getCustomerStatusTone, getRemainingDeliverySteps } from "../lib/status";
import { formatDateTime, formatDate } from "@/lib/dashboard/format";

// Delivery stages for the stepper
const DELIVERY_STAGES = [
  { key: "pending", label: "Order Created", desc: "Registered in system" },
  { key: "picked_up", label: "Picked Up", desc: "Collected by courier" },
  { key: "in_transit", label: "In Transit", desc: "At logistics hub" },
  { key: "out_for_delivery", label: "Out for Delivery", desc: "Courier on route" },
  { key: "delivered", label: "Delivered", desc: "Delivered to recipient" },
];

export function TrackParcelView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get("id") || searchParams.get("tracking_id") || "";

  const [inputTrackingId, setInputTrackingId] = useState(queryId);
  const [activeTrackingId, setActiveTrackingId] = useState(queryId);
  const [parcel, setParcel] = useState<CustomerParcelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [printed, setPrinted] = useState(false);

  // Cancellation prompt states
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Sync state if query parameter changes
  useEffect(() => {
    if (queryId && queryId !== activeTrackingId) {
      setInputTrackingId(queryId);
      setActiveTrackingId(queryId);
    }
  }, [queryId, activeTrackingId]);

  // Fetch parcel details whenever activeTrackingId changes
  useEffect(() => {
    if (!activeTrackingId.trim()) {
      setParcel(null);
      setError(null);
      return;
    }

    let active = true;
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);
        const dto = await getCustomerParcelDetail(activeTrackingId.trim());
        if (active) {
          setParcel(mapCustomerParcelDetail(dto));
        }
      } catch {
        if (active) {
          setError(
            `Unable to locate parcel with tracking ID "${activeTrackingId}". Please verify the number and try again.`
          );
          setParcel(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDetail();
    return () => {
      active = false;
    };
  }, [activeTrackingId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputTrackingId.trim();
    if (!cleanId) return;
    setActiveTrackingId(cleanId);
    router.replace(`/customer/track?id=${encodeURIComponent(cleanId)}`);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!parcel) return;
    const shareUrl = `${window.location.origin}/customer/track?id=${encodeURIComponent(parcel.trackingId)}`;
    navigator.clipboard.writeText(shareUrl);
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  };

  const handlePrint = () => {
    setPrinted(true);
    setTimeout(() => setPrinted(false), 2000);
    window.print();
  };

  const handleCancel = async () => {
    if (!parcel) return;
    try {
      setCancelling(true);
      setCancelError(null);
      const updatedDto = await cancelCustomerParcel(parcel.trackingId, {
        reason: cancelReason || "Cancelled by customer via tracking portal",
      });
      setParcel(mapCustomerParcelDetail(updatedDto));
      setShowCancelPrompt(false);
    } catch {
      setCancelError("Failed to cancel parcel. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Determine active step index in the 5-stage lifecycle
  const getStageIndex = (status: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "picked_up":
        return 1;
      case "in_transit":
        return 2;
      case "out_for_delivery":
        return 3;
      case "delivered":
        return 4;
      case "cancelled":
        return -1;
      default:
        return 0;
    }
  };

  const currentStageIndex = parcel ? getStageIndex(parcel.status) : 0;
  const isCancelled = parcel?.status === "cancelled";

  // Intro stage replay state (animates passing through completed stages on refresh / load)
  const [revealedStage, setRevealedStage] = useState<number>(0);
  const [isIntroAnimating, setIsIntroAnimating] = useState<boolean>(false);
  const [introStage, setIntroStage] = useState<number>(0);

  useEffect(() => {
    if (!parcel || parcel.status === "cancelled") {
      setIsIntroAnimating(false);
      setRevealedStage(0);
      setIntroStage(0);
      return;
    }

    const targetStage = getStageIndex(parcel.status);
    if (targetStage <= 0) {
      setRevealedStage(0);
      setIntroStage(0);
      setIsIntroAnimating(false);
      return;
    }

    // Check for prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRevealedStage(targetStage);
      setIntroStage(targetStage);
      setIsIntroAnimating(false);
      return;
    }

    // Start replay from stage 0
    setRevealedStage(0);
    setIntroStage(0);
    setIsIntroAnimating(true);

    let currentStep = 0;
    const stepDuration = 450; // ms per stage

    const intervalId = setInterval(() => {
      currentStep += 1;
      setRevealedStage(currentStep);
      setIntroStage(currentStep);

      if (currentStep >= targetStage) {
        clearInterval(intervalId);
        setIsIntroAnimating(false);
      }
    }, stepDuration);

    return () => {
      clearInterval(intervalId);
    };
  }, [parcel?.trackingId, parcel?.status]);

  return (
    <div className="space-y-6 w-full mx-auto">
      {/* 1. Track Search Hero Box */}
      <div className="w-full">
        <SectionCard
          title="Track a Shipment"
          subtitle="Enter any NexDrop tracking code to view live delivery milestones"
        >
          <form onSubmit={handleSearchSubmit} className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dashboard-muted)]" />
                <input
                  type="text"
                  value={inputTrackingId}
                  onChange={(e) => setInputTrackingId(e.target.value)}
                  placeholder="Enter tracking code"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] text-sm placeholder:text-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !inputTrackingId.trim()}
                className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white font-medium px-6 py-3 h-auto rounded-xl gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" /> Track Parcel
                  </>
                )}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      {/* Error Feedback */}
      {error && !loading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Tracking record not found</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 rounded-2xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] space-y-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 bg-gray-200 rounded-lg" />
            <div className="h-6 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="h-16 w-full bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-100 rounded-xl" />
            <div className="h-48 bg-gray-100 rounded-xl" />
          </div>
        </div>
      )}

      {/* 2. Parcel Details & Stepper */}
      {parcel && !loading && (
        <div className="space-y-6">
          {/* Header Summary Card */}
          <div className="p-6 rounded-2xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] shadow-[var(--dashboard-card-shadow)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--dashboard-hairline)]">
              <div>
                <span className="text-sm font-semibold text-[var(--dashboard-muted)] block">
                  Shipment Tracking Number
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl font-bold text-[var(--dashboard-deep-green)] tracking-tight">
                    {parcel.trackingId}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleCopy(parcel.trackingId)}
                    className="p-1.5 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-control-bg)] transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0"
                    aria-label="Copy Tracking ID"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  label={getCustomerStatusLabel(parcel.status)}
                  tone={getCustomerStatusTone(parcel.status)}
                />
                {parcel.eta && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--dashboard-page-bg)] border border-[var(--dashboard-hairline)] text-sm text-[var(--dashboard-muted)]">
                    <Calendar className="w-4 h-4 text-[var(--dashboard-primary)]" />
                    <span>ETA: <strong className="text-[var(--dashboard-text)]">{formatDate(parcel.eta)}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Route Summary Bar */}
            <div className="p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                <span className="font-semibold text-[var(--dashboard-text)]">{parcel.pickupCity}</span>
                <ArrowRight className="w-4 h-4 text-[var(--dashboard-muted)] shrink-0" />
                <span className="font-bold text-[var(--dashboard-deep-green)]">{parcel.deliveryCity}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--dashboard-muted)]">
                <span>Booked: <strong>{formatDateTime(parcel.createdAt)}</strong></span>
                <span>Weight: <strong>{parcel.weightKg} kg</strong></span>
              </div>
            </div>

            {/* 3. Visual Delivery Progress Stepper (FR-CUS-04) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider">
                  Delivery Milestones Progress
                </h3>
                {isCancelled && (
                  <span className="text-sm font-semibold text-red-600 inline-flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Shipment Cancelled
                  </span>
                )}
              </div>

              {isCancelled ? (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-bold">This parcel was cancelled</p>
                    <p className="text-red-700 mt-0.5">
                      {parcel.notes?.[0] || "Order was cancelled prior to dispatch."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="grid grid-cols-5 gap-2 relative z-10">
                    {DELIVERY_STAGES.map((stage, idx) => {
                      const activeStage = isIntroAnimating ? revealedStage : currentStageIndex;
                      const isCompleted = idx <= activeStage;
                      const isCurrent = idx === activeStage;

                      return (
                        <div key={stage.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                              isCompleted
                                ? "bg-[var(--dashboard-primary)] text-white shadow-sm"
                                : "bg-gray-100 border border-gray-300 text-gray-400"
                            } ${isCurrent ? "ring-4 ring-green-100 ring-offset-1" : ""}`}
                          >
                            {isCompleted ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          <span
                            className={`text-sm mt-2 font-medium transition-colors duration-300 ${
                              isCompleted ? "text-[var(--dashboard-text)] font-semibold" : "text-[var(--dashboard-muted)]"
                            }`}
                          >
                            {stage.label}
                          </span>
                          <span className="text-sm text-[var(--dashboard-muted)] hidden sm:block">
                            {stage.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Horizontal progress track line connecting circle centers */}
                  <div className="absolute top-[18px] sm:top-5 left-[10%] right-[10%] h-1 sm:h-1.5 bg-gray-200 z-0 -translate-y-1/2 rounded-full overflow-hidden">
                    {/* Completed stages (solid green) */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-[var(--dashboard-primary)] transition-all duration-300 rounded-full"
                      style={{
                        width: `${(Math.min(Math.max(0, isIntroAnimating ? revealedStage : currentStageIndex), 4) / 4) * 100}%`,
                      }}
                    />

                    {/* Step beam during intro replay (passing through completed stages) */}
                    {isIntroAnimating && introStage < currentStageIndex && (
                      <div
                        key={`intro-beam-${introStage}`}
                        className="absolute top-0 bottom-0 overflow-hidden"
                        style={{
                          left: `${(introStage / 4) * 100}%`,
                          width: "25%",
                        }}
                      >
                        <div className="h-full w-full relative overflow-hidden">
                          <div className="absolute top-0 bottom-0 w-2/5 rounded-full bg-[var(--dashboard-primary)] animate-progress-beam-step" />
                        </div>
                      </div>
                    )}

                    {/* Live in-progress continuous looping beam (after intro reaches current status, if not delivered) */}
                    {!isIntroAnimating && currentStageIndex >= 0 && currentStageIndex < 4 && (
                      <div
                        className="absolute top-0 bottom-0 overflow-hidden"
                        style={{
                          left: `${(currentStageIndex / 4) * 100}%`,
                          width: "25%",
                        }}
                      >
                        <div className="h-full w-full relative overflow-hidden">
                          <div className="absolute top-0 bottom-0 w-2/5 rounded-full bg-[var(--dashboard-primary)] animate-progress-beam" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Two-Column Layout: Live Timeline vs. Parcel Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Live Event History Timeline */}
            <div className="lg:col-span-7">
              <SectionCard
                title="Shipment Activity Log"
                subtitle="Chronological sequence of courier scans and hub updates"
              >
                <div className="space-y-4 pt-2">
                  {parcel.timeline && parcel.timeline.length > 0 ? (
                    <div className="relative pl-10 space-y-4 before:absolute before:left-[9px] before:top-3.5 before:bottom-3.5 before:w-[2px] before:bg-[var(--dashboard-hairline)]">
                      {parcel.timeline.map((event, i) => (
                        <div key={i} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute -left-10 top-3 w-5 h-5 rounded-full bg-[var(--dashboard-surface)] border-2 border-[var(--dashboard-primary)] flex items-center justify-center shadow-xs z-10">
                            <div className="w-2 h-2 rounded-full bg-[var(--dashboard-primary)]" />
                          </div>

                          <div className="p-3.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] space-y-1.5 hover:border-[var(--dashboard-primary)] transition-colors">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-[var(--dashboard-text)]">
                                {event.label}
                              </span>
                              <span className="text-[var(--dashboard-muted)] flex items-center gap-1.5 text-sm font-normal">
                                <Clock className="w-4 h-4" />
                                {formatDateTime(event.occurredAt)}
                              </span>
                            </div>
                            {event.location && (
                              <p className="text-sm text-[var(--dashboard-muted)] flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Remaining steps to be completed (lighter shade, without times or dates) */}
                      {getRemainingDeliverySteps(parcel).map((step, i) => (
                        <div key={`pending-step-${step.key}-${i}`} className="relative group">
                          {/* Timeline dot - pending light shade */}
                          <div className="absolute -left-10 top-3 w-5 h-5 rounded-full bg-[var(--dashboard-surface)] border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shadow-xs z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                          </div>

                          <div className="p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/20 space-y-1.5 opacity-60">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-gray-400 dark:text-gray-500">
                                {step.label}
                              </span>
                              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Pending
                              </span>
                            </div>
                            {step.location && (
                              <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                {step.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--dashboard-muted)]">No scan activity recorded yet.</p>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Right: Package Specifications & Dispatch Details */}
            <div className="lg:col-span-5 space-y-6">
              <SectionCard
                title="Consignment Details"
                subtitle="Pickup, delivery, and package information"
              >
                <div className="space-y-4 pt-2 text-sm">
                  {/* Sender / Pickup Origin */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--dashboard-page-bg)] border border-[var(--dashboard-hairline)]">
                    <span className="font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider block text-sm">
                      Pickup Origin
                    </span>
                    <p className="text-sm text-[var(--dashboard-text)] flex items-center gap-2 font-normal">
                      <User className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                      {parcel.senderName}
                    </p>
                    <p className="text-sm text-[var(--dashboard-muted)] flex items-center gap-2 pt-0.5">
                      <MapPin className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                      {parcel.pickupAddress}, {parcel.pickupCity}
                    </p>
                  </div>

                  {/* Recipient */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--dashboard-page-bg)] border border-[var(--dashboard-hairline)]">
                    <span className="font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider block text-sm">
                      Recipient
                    </span>
                    <p className="text-sm text-[var(--dashboard-text)] flex items-center gap-2 font-normal">
                      <User className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                      {parcel.recipientName}
                    </p>
                    <p className="text-sm text-[var(--dashboard-muted)] flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                      {parcel.recipientPhoneMasked}
                    </p>
                    <p className="text-sm text-[var(--dashboard-muted)] flex items-center gap-2 pt-0.5">
                      <MapPin className="w-4 h-4 text-[var(--dashboard-primary)] shrink-0" />
                      {parcel.deliveryAddress}, {parcel.deliveryCity}
                    </p>
                  </div>

                  {/* Parcel Specs */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--dashboard-page-bg)] border border-[var(--dashboard-hairline)]">
                    <div>
                      <span className="text-sm font-semibold text-[var(--dashboard-muted)] block uppercase">Weight</span>
                      <span className="font-bold text-[var(--dashboard-text)] block mt-0.5">
                        {parcel.weightKg} kg
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-sm font-semibold text-[var(--dashboard-muted)] block uppercase">Dimensions</span>
                      <span className="font-bold text-[var(--dashboard-text)] block mt-0.5">
                        {parcel.dimensions || "Standard"}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-[var(--dashboard-hairline)] flex justify-between items-center">
                      <span className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase">Delivery Fee</span>
                      <span className="text-sm font-bold text-[var(--dashboard-deep-green)]">
                        Rs. {parcel.fee.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleShare}
                      className={`w-full text-sm font-semibold gap-2 transition-colors cursor-pointer ${
                        shared
                          ? "bg-[var(--dashboard-deep-green)] hover:bg-[var(--dashboard-deep-green)] text-white border-[var(--dashboard-deep-green)]"
                          : "border-[var(--dashboard-hairline)] bg-white text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)] active:bg-[var(--dashboard-deep-green)] active:text-white"
                      }`}
                    >
                      {shared ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" /> Tracking Link Copied
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 text-[var(--dashboard-primary)]" /> Share Tracking Link
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrint}
                      className={`w-full text-sm font-semibold gap-2 transition-colors cursor-pointer ${
                        printed
                          ? "bg-[var(--dashboard-deep-green)] hover:bg-[var(--dashboard-deep-green)] text-white border-[var(--dashboard-deep-green)]"
                          : "border-[var(--dashboard-hairline)] bg-white text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)] active:bg-[var(--dashboard-deep-green)] active:text-white"
                      }`}
                    >
                      <Printer className={`w-4 h-4 ${printed ? "text-white" : "text-[var(--dashboard-primary)]"}`} />
                      <span>{printed ? "Printing Tracking Slip..." : "Print Tracking Slip"}</span>
                    </Button>

                    {/* Pending cancellation */}
                    {parcel.status === "pending" && !showCancelPrompt && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCancelPrompt(true)}
                        className="w-full text-sm font-semibold gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                      >
                        Cancel Delivery Request
                      </Button>
                    )}
                  </div>

                  {/* Cancellation prompt */}
                  {showCancelPrompt && (
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50 space-y-2">
                      <p className="text-sm font-bold text-red-800">Confirm Cancellation?</p>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Reason (e.g. booked by mistake)"
                        className="w-full p-2 text-sm rounded-lg border border-red-300 bg-white text-gray-800 outline-none"
                      />
                      {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowCancelPrompt(false)}
                          disabled={cancelling}
                          className="h-8 px-3 text-sm"
                        >
                          Keep Order
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="h-8 px-4 text-sm bg-red-600 hover:bg-red-700 text-white"
                        >
                          {cancelling ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
