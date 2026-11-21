"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { getCustomerParcelDetail } from "../api/customer.api";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";
import { formatDateTime } from "@/lib/dashboard/format";
import { getCustomerStatusLabel, getCustomerStatusTone } from "../lib/status";
import { formatReceiptEstimate, isCustomerReceiptEligible } from "../lib/receipt";
import { SRI_LANKA_HUBS, SERVICE_TIERS } from "../constants/destinations";
import "./customer-receipt.css";

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not available";
}

function bookingDate(value: string): string {
  return value && Number.isFinite(Date.parse(value)) ? formatDateTime(value) : "Not available";
}

function confirmedDeliveryDate(parcel: CustomerParcelDetailDTO): string {
  if (parcel.delivered_at && Number.isFinite(Date.parse(parcel.delivered_at))) {
    return formatDateTime(parcel.delivered_at);
  }
  if (Array.isArray(parcel.timeline)) {
    const deliveredEvent = parcel.timeline.find((e) => e.status === "delivered");
    if (deliveredEvent?.occurred_at && Number.isFinite(Date.parse(deliveredEvent.occurred_at))) {
      return formatDateTime(deliveredEvent.occurred_at);
    }
  }
  return "Not available";
}

function recipientPhone(parcel: CustomerParcelDetailDTO): string {
  if (parcel.recipient_phone && parcel.recipient_phone.trim()) {
    return parcel.recipient_phone.trim();
  }
  if (parcel.recipient_phone_masked && parcel.recipient_phone_masked.trim()) {
    return parcel.recipient_phone_masked.trim();
  }
  return "Not available";
}

function getRateBreakdown(parcel: CustomerParcelDetailDTO) {
  const fee = typeof parcel.fee === "number" && Number.isFinite(parcel.fee) && parcel.fee > 0 ? parcel.fee : null;
  if (fee === null) return null;

  const city = parcel.delivery_city?.trim() || "";
  const hub = city
    ? SRI_LANKA_HUBS.find(
        (h) =>
          h.city.toLowerCase() === city.toLowerCase() ||
          city.toLowerCase().includes(h.city.toLowerCase()) ||
          h.city.toLowerCase().includes(city.toLowerCase())
      )
    : undefined;

  const destinationCity = hub?.city || city || "Island-wide Delivery";
  const distanceKm = hub?.distanceKm;
  const dimensions = parcel.dimensions?.trim() || "Standard Parcel";
  const weightKg = typeof parcel.weight_kg === "number" && parcel.weight_kg > 0 ? parcel.weight_kg : 1.0;

  // Derive service tier from fee level
  let tier = SERVICE_TIERS[0]; // standard
  if (fee >= 800) {
    tier = SERVICE_TIERS[2]; // same_day
  } else if (fee >= 550) {
    tier = SERVICE_TIERS[1]; // express
  }

  const basePickupFee = Math.min(250, fee);
  const weightFee = Math.min(Math.round(weightKg * 80), fee - basePickupFee);
  let tierSurcharge = Math.min(tier.surcharge, fee - basePickupFee - weightFee);
  if (tierSurcharge < 0) tierSurcharge = 0;
  let distanceFee = fee - basePickupFee - weightFee - tierSurcharge;
  if (distanceFee < 0) {
    tierSurcharge = Math.max(0, tierSurcharge + distanceFee);
    distanceFee = 0;
  }

  return {
    destinationCity,
    distanceKm,
    dimensions,
    weightKg,
    tierName: tier.name,
    tierSpeed: tier.speed,
    basePickupFee,
    distanceFee,
    weightFee,
    tierSurcharge,
  };
}

export function CustomerReceiptRoute() {
  const searchParams = useSearchParams();
  const trackingId = searchParams.get("trackingId")?.trim() ?? "";
  const from = searchParams.get("from")?.trim() ?? "";
  return <CustomerReceiptView key={trackingId} trackingId={trackingId} from={from} />;
}

export function CustomerReceiptView({
  trackingId,
  from,
}: {
  trackingId: string;
  from?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    trackingId: string; attempt: number; parcel?: CustomerParcelDetailDTO; error?: string;
  } | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string>("");

  useEffect(() => {
    setPrintedAt(formatDateTime(new Date().toISOString()));
  }, []);

  useEffect(() => {
    if (!trackingId) return;
    let active = true;
    getCustomerParcelDetail(trackingId, false)
      .then((parcel) => {
        if (!active) return;
        if (parcel.tracking_id?.toUpperCase() !== trackingId.toUpperCase()) {
          throw new Error("Shipment mismatch");
        }
        setResult({ trackingId, attempt, parcel });
      })
      .catch(() => {
        if (active) setResult({ trackingId, attempt, error: "Unable to load this shipment receipt. Please try again." });
      });
    return () => { active = false; };
  }, [trackingId, attempt]);

  const current = result?.trackingId === trackingId && result.attempt === attempt ? result : null;
  const parcel = current?.parcel;
  const eligible = !!parcel && isCustomerReceiptEligible(parcel.status, parcel.tracking_id);
  const breakdown = parcel ? getRateBreakdown(parcel) : null;
  const print = () => {
    if (!eligible) return;
    setPrintError(null);
    const originalTitle = typeof document !== "undefined" ? document.title : "";
    try {
      if (typeof document !== "undefined") document.title = "";
      window.print();
    } catch {
      setPrintError("Printing could not be opened. Try your browser's Print menu.");
    } finally {
      if (typeof document !== "undefined") document.title = originalTitle;
    }
  };

  const isFromTrack = from === "track";
  const backHref = isFromTrack
    ? (trackingId ? `/customer/track?id=${encodeURIComponent(trackingId)}` : "/customer/track")
    : "/customer/history";
  const backLabel = isFromTrack ? "Back to Track Parcel" : "Back to Delivery History";

  return (
    <div className="customer-receipt-page space-y-6">
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-[var(--dashboard-primary)] transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{backLabel}</span>
        </Link>
        <PageHeader
          title="Shipment Receipt"
          subtitle="View a delivered shipment summary and save a printable copy."
          action={
            eligible ? (
              <div className="flex flex-col items-end gap-1">
                <Button className="min-h-11 shadow-sm" onClick={print}>
                  Print / Save as PDF
                </Button>
                {printError && <p role="alert" className="text-destructive text-sm">{printError}</p>}
              </div>
            ) : undefined
          }
        />
      </div>
      {!trackingId ? (
        <p role="status">Shipment receipt unavailable. Select a delivered shipment from Delivery History.</p>
      ) : !current ? (
        <div role="status" className="space-y-3">
          <span>Loading shipment receipt...</span>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : current.error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-border bg-card p-5">
          <p>{current.error}</p>
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
        </div>
      ) : !eligible || !parcel ? (
        <div role="status" className="rounded-xl border border-border bg-card p-5">
          Shipment receipt unavailable. A receipt summary is available only for a delivered shipment with a tracking number.
        </div>
      ) : (
        <article className="customer-receipt-paper space-y-6 rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-8" aria-label="Shipment receipt">
          <header className="border-b border-border pb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="receipt-logo -ml-1 sm:-ml-2 print:-ml-3.5">
                <NexDropLogo size="md" />
              </div>
              <div className="text-right flex flex-col items-end gap-1.5 sm:gap-2">
                {printedAt && (
                  <p className="text-xs text-muted-foreground font-medium">
                    {printedAt}
                  </p>
                )}
                <div className="receipt-status-badge">
                  <StatusBadge label={getCustomerStatusLabel("delivered")} tone={getCustomerStatusTone("delivered")} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Official Delivery Receipt
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border/60 pt-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Shipment receipt</h2>
                <p className="text-sm text-muted-foreground">NexDrop Logistics (Pvt) Ltd - Express Courier Network</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">Tracking number: {parcel.tracking_id}</p>
              </div>
            </div>
          </header>
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Sender</dt><dd className="mt-1 break-words font-semibold">{text(parcel.sender_name)}</dd></div>
            <div><dt className="text-muted-foreground">Recipient</dt><dd className="mt-1 break-words font-semibold">{text(parcel.recipient_name)}</dd></div>
            <div><dt className="text-muted-foreground">Recipient phone</dt><dd className="mt-1 font-semibold">{recipientPhone(parcel)}</dd></div>
            <div><dt className="text-muted-foreground">Delivery destination</dt><dd className="mt-1 break-words font-semibold">{[parcel.delivery_address, parcel.delivery_city].filter(Boolean).join(", ") || "Not available"}</dd></div>
            <div><dt className="text-muted-foreground">Booked on (Asia/Colombo)</dt><dd className="mt-1 font-semibold">{bookingDate(parcel.created_at)}</dd></div>
            <div><dt className="text-muted-foreground">Confirmed delivery date</dt><dd className="mt-1 font-semibold">{confirmedDeliveryDate(parcel)}</dd></div>
          </dl>
          <section className="border-t border-border pt-5 space-y-4" aria-label="Fee information">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Rate & Fee Breakdown</h3>
              <span className="text-sm text-muted-foreground">Standard Doorstep Delivery Tariff</span>
            </div>
            {breakdown ? (
              <div className="space-y-4 pt-1">
                {/* Route & Shipment Specifications card (above) */}
                <div className="space-y-2.5 p-4 rounded-lg border border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20 text-sm print:border-gray-200 print:bg-transparent">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-base text-foreground">
                      <MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0 print:text-emerald-800" />
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 print:text-black">
                        {breakdown.destinationCity}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Speed: <span className="font-semibold text-foreground">{breakdown.tierName} ({breakdown.tierSpeed})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30 print:border-gray-200 text-sm text-muted-foreground">
                    <div className="text-left">
                      <span>Distance: </span>
                      <span className="font-semibold text-foreground">{breakdown.distanceKm ? `~${breakdown.distanceKm} km` : "Standard Hub"}</span>
                    </div>
                    <div className="sm:text-center">
                      <span>Dimensions: </span>
                      <span className="font-semibold text-foreground">{breakdown.dimensions}</span>
                    </div>
                    <div className="sm:text-right">
                      <span>Weight: </span>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-400 print:text-black">
                        {breakdown.weightKg.toFixed(1)} kg (Billable: {breakdown.weightKg.toFixed(1)} kg)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Price Breakdown (below) */}
                <dl className="space-y-2.5 text-sm pt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Base Pickup Fee</dt>
                    <dd className="font-semibold text-foreground">Rs. {breakdown.basePickupFee.toFixed(2)}</dd>
                  </div>
                  {breakdown.distanceFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <dt>Distance Fee {breakdown.distanceKm ? `(${breakdown.distanceKm} km @ Rs. 3.50/km)` : ""}</dt>
                      <dd className="font-semibold text-foreground">Rs. {breakdown.distanceFee.toFixed(2)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Weight Fee ({breakdown.weightKg.toFixed(1)} kg @ Rs. 80/kg)</dt>
                    <dd className="font-semibold text-foreground">Rs. {breakdown.weightFee.toFixed(2)}</dd>
                  </div>
                  {breakdown.tierSurcharge > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <dt>{breakdown.tierName} Surcharge</dt>
                      <dd className="font-semibold text-foreground">+ Rs. {breakdown.tierSurcharge.toFixed(2)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-400 print:text-emerald-900">
                    <dt className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      Standard Transit Insurance
                    </dt>
                    <dd className="font-semibold">Free</dd>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-400 print:text-emerald-900">
                    <dt className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      6-Digit Handover OTP Security
                    </dt>
                    <dd className="font-semibold">Included</dd>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border font-semibold text-foreground print:border-gray-300">
                    <dt className="text-base font-bold text-foreground">Delivery fee</dt>
                    <dd className="text-base font-bold text-foreground">{formatReceiptEstimate(parcel.fee)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt>Delivery fee</dt>
                  <dd className="font-semibold">{formatReceiptEstimate(parcel.fee)}</dd>
                </div>
              </dl>
            )}
          </section>
          <footer className="mt-auto border-t border-border pt-6 text-sm text-muted-foreground space-y-4" aria-label="Receipt footer">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">NexDrop Logistics (Pvt) Ltd</p>
              <p>Central Operations: Peliyagoda Hub, Colombo, Sri Lanka</p>
              <p>Hotline: +94 11 234 5678 - Email: support@nexdrop.lk - Web: nexdrop.lk</p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/40 pt-3 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Verified Proof of Delivery</p>
                <p>Computer-generated document. No physical signature required.</p>
              </div>
              <p className="font-medium text-emerald-800 dark:text-emerald-400">Thank you for shipping with NexDrop!</p>
            </div>
          </footer>
        </article>
      )}
    </div>
  );
}
