"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerParcelDetail } from "../api/customer.api";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";
import { formatDateTime } from "@/lib/dashboard/format";
import { getCustomerStatusLabel, getCustomerStatusTone } from "../lib/status";
import { formatReceiptEstimate, isCustomerReceiptEligible } from "../lib/receipt";
import "./customer-receipt.css";

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not available";
}

function bookingDate(value: string): string {
  return value && Number.isFinite(Date.parse(value)) ? formatDateTime(value) : "Not available";
}

export function CustomerReceiptRoute() {
  const trackingId = useSearchParams().get("trackingId")?.trim() ?? "";
  return <CustomerReceiptView key={trackingId} trackingId={trackingId} />;
}

export function CustomerReceiptView({ trackingId }: { trackingId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    trackingId: string; attempt: number; parcel?: CustomerParcelDetailDTO; error?: string;
  } | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

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
  const print = () => {
    if (!eligible) return;
    setPrintError(null);
    try { window.print(); }
    catch { setPrintError("Printing could not be opened. Try your browser's Print menu."); }
  };

  return (
    <div className="customer-receipt-page space-y-6">
      <div className="space-y-4">
        <Link href="/customer/history" className="inline-flex min-h-10 items-center text-sm text-primary underline">Back to Delivery History</Link>
        <PageHeader title="Shipment Receipt" subtitle="View a delivered shipment summary and save a printable copy." />
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
        <>
          <div className="space-y-3">
            <Button className="min-h-11" onClick={print}>Print / Save as PDF</Button>
            <p className="text-sm text-muted-foreground">In the print dialog, choose Save as PDF where supported. This opens your browser's print dialog; no PDF is downloaded automatically.</p>
            {printError && <p role="alert" className="text-destructive">{printError}</p>}
          </div>
          <article className="customer-receipt-paper space-y-6 rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-8" aria-label="Shipment receipt">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="text-xl font-bold text-primary">NexDrop</p>
                <h2 className="mt-2 text-lg font-semibold">Shipment receipt</h2>
                <p className="mt-1 break-all text-sm">Tracking number: {parcel.tracking_id}</p>
              </div>
              <StatusBadge label={getCustomerStatusLabel("delivered")} tone={getCustomerStatusTone("delivered")} />
            </header>
            <div className="rounded-lg border border-border p-4 text-sm">
              <p className="font-semibold">Shipment summary only — not proof of payment</p>
              <p className="mt-2">The service may return demo or generated data. Shipment details and fee estimates are not independently verified. Confirmed payment details are not available.</p>
            </div>
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Sender (as supplied)</dt><dd className="mt-1 break-words font-medium">{text(parcel.sender_name)}</dd></div>
              <div><dt className="text-muted-foreground">Recipient</dt><dd className="mt-1 break-words font-medium">{text(parcel.recipient_name)}</dd></div>
              <div><dt className="text-muted-foreground">Recipient phone (masked)</dt><dd className="mt-1">{text(parcel.recipient_phone_masked)}</dd></div>
              <div><dt className="text-muted-foreground">Delivery destination</dt><dd className="mt-1 break-words">{[parcel.delivery_address, parcel.delivery_city].filter(Boolean).join(", ") || "Not available"}</dd></div>
              <div><dt className="text-muted-foreground">Booked on (Asia/Colombo)</dt><dd className="mt-1">{bookingDate(parcel.created_at)}</dd></div>
              <div><dt className="text-muted-foreground">Confirmed delivery date</dt><dd className="mt-1">Not available — the service does not provide a verified delivery timestamp.</dd></div>
            </dl>
            <section className="border-t border-border pt-5" aria-label="Fee information">
              <h3 className="font-semibold">Fee information</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><dt>Estimated delivery fee (unverified)</dt><dd className="font-semibold">{formatReceiptEstimate(parcel.fee)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt>Confirmed payment amount</dt><dd>Not available</dd></div>
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">The estimate is supplied by the parcel service. It does not establish the final charge, payment status, taxes, or a payment transaction.</p>
            </section>
          </article>
        </>
      )}
    </div>
  );
}
