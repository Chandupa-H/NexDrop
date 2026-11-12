"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, PackageCheck, Search, X } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssignedParcels, getCourierProofs, getParcelDetail } from "../api/courier.api";
import type { CourierProofListDTO, CourierProofRecordDTO, ParcelDetailDTO } from "../api/courier.dto";
import { ParcelDetailsDrawer } from "./ParcelDetailsDrawer";

const EMPTY_ELIGIBLE_PARCELS: ParcelDetailDTO[] = [];

function formatColomboDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}

export function ProofOfDeliveryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState("");
  const [selectedProof, setSelectedProof] = useState<CourierProofRecordDTO | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorQuery, setSelectorQuery] = useState("");
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);
  const [eligibleRefreshVersion, setEligibleRefreshVersion] = useState(0);
  const [eligibleResult, setEligibleResult] = useState<{
    key: string;
    parcels: ParcelDetailDTO[] | null;
    error: boolean;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: CourierProofListDTO | null;
    error: boolean;
  } | null>(null);

  const params = useMemo(
    () => ({ q: query.trim() || undefined, date: deliveryDate || undefined, status: status ? status as "delivered" | "failed" : undefined }),
    [query, deliveryDate, status]
  );

  const requestKey = `${params.q ?? ""}:${params.date ?? ""}:${params.status ?? ""}:${requestVersion}`;
  const loading = result?.key !== requestKey;
  const error = result?.key === requestKey && result.error;
  const data = result?.key === requestKey ? result.data : null;
  const eligibleRequestKey = String(eligibleRefreshVersion);
  const eligibleLoading = selectorOpen && eligibleResult?.key !== eligibleRequestKey;
  const eligibleError = selectorOpen && eligibleResult?.key === eligibleRequestKey && eligibleResult.error;
  const eligibleParcels = eligibleResult?.key === eligibleRequestKey
    ? eligibleResult.parcels ?? EMPTY_ELIGIBLE_PARCELS
    : EMPTY_ELIGIBLE_PARCELS;
  const matchingEligibleParcels = useMemo(() => {
    const needle = selectorQuery.trim().toLocaleLowerCase();
    if (!needle) return eligibleParcels;
    return eligibleParcels.filter((parcel) =>
      parcel.tracking_id.toLocaleLowerCase().includes(needle) ||
      parcel.customer_name.toLocaleLowerCase().includes(needle)
    );
  }, [eligibleParcels, selectorQuery]);

  useEffect(() => {
    let active = true;
    getCourierProofs(params)
      .then((response) => {
        if (active) setResult({ key: requestKey, data: response, error: false });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [params, requestKey]);

  useEffect(() => {
    if (!selectorOpen) return;
    let active = true;
    getAssignedParcels({ status: "out_for_delivery", limit: 100 })
      .then(({ items }) => Promise.all(items.map((parcel) => getParcelDetail(parcel.tracking_id))))
      .then((parcels) => {
        if (active) {
          setEligibleResult({
            key: eligibleRequestKey,
            parcels: parcels.filter((parcel) => parcel.status === "out_for_delivery"),
            error: false,
          });
        }
      })
      .catch(() => {
        if (active) setEligibleResult({ key: eligibleRequestKey, parcels: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [eligibleRequestKey, selectorOpen]);

  useEffect(() => {
    if (!selectedProof) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedProof(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedProof]);

  const clearFilters = () => {
    setQuery("");
    setDeliveryDate("");
    setStatus("");
  };
  const openParcelSelector = () => {
    setSuccessMessage(null);
    setEligibleRefreshVersion((version) => version + 1);
    setSelectorOpen(true);
  };
  const handleParcelDetailsClose = () => {
    setSelectedTrackingId(null);
    setSelectorOpen(true);
  };
  const handleDeliveryStatusUpdated = () => {
    setEligibleRefreshVersion((version) => version + 1);
    router.refresh();
  };
  const handleSuccessfulDelivery = () => {
    setSelectedTrackingId(null);
    setSelectorOpen(false);
    setSuccessMessage("Delivery confirmed. The proof has been added to your delivery history.");
    setRequestVersion((version) => version + 1);
  };
  const hasFilters = Boolean(query || deliveryDate || status);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <PageHeader
        title="Proof of Delivery"
        subtitle="Review delivery confirmations and recipient proof images."
        action={(
          <Button type="button" onClick={openParcelSelector}>
            <PackageCheck className="mr-2 size-4" aria-hidden="true" />
            Add Delivery Proof
          </Button>
        )}
      />

      {successMessage && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{successMessage}</span>
          <button type="button" aria-label="Dismiss success message" onClick={() => setSuccessMessage(null)} className="rounded p-1 hover:bg-emerald-100"><X className="size-4" aria-hidden="true" /></button>
        </div>
      )}

      <section aria-label="Proof summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loading && !data ? (
          [0, 1, 2].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Proof Records" value={data?.summary.total_proofs ?? 0} icon="package" tone="neutral" />
            <StatCard label="Successful Deliveries" value={data?.summary.successful_deliveries ?? 0} icon="check-circle" tone="success" />
            <StatCard label="Parcels with Proof" value={data?.summary.parcels_with_proof ?? 0} icon="package" tone="info" />
          </>
        )}
      </section>

      <Card className="grid min-w-0 grid-cols-1 gap-4 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.9fr)_minmax(180px,0.75fr)]">
        <label className="relative block min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search tracking number or recipient"
            className="pl-9"
            placeholder="Tracking number or recipient"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">Delivery date</span>
          <span className="min-w-0 flex-1">
            <Input className="min-w-0" aria-label="Filter by delivery date" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
          </span>
        </label>
        <div className="min-w-0">
          <Select
            aria-label="Filter by delivery status"
            className="min-w-0"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: "", label: "All statuses" },
              { value: "delivered", label: "Delivered" },
              { value: "failed", label: "Failed" },
            ]}
          />
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading proof records">
          {[0, 1, 2].map((item) => <Card key={item} className="space-y-4 p-4"><Skeleton className="aspect-[4/3] w-full rounded-lg" /><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-3/4" /></Card>)}
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div><h2 className="font-semibold">Unable to load proof records</h2><p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p></div>
          <Button type="button" onClick={() => setRequestVersion((version) => version + 1)}>Try Again</Button>
        </Card>
      ) : !data?.items.length ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <Camera className="size-9 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{hasFilters ? "No proof records match your filters" : "No proof records yet"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{hasFilters ? "Try changing or clearing your search and filters." : "Successful delivery proof images will appear here."}</p>
          </div>
          {hasFilters && <Button type="button" variant="outline" onClick={clearFilters}>Clear filters</Button>}
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">Showing {data.total} proof {data.total === 1 ? "record" : "records"}</p>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((record) => (
              <Card key={record.public_id} className="flex min-w-0 flex-col gap-3 border-border/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="break-all text-sm font-semibold">{record.tracking_number}</h2>
                  <StatusBadge label={record.status === "delivered" ? "Delivered" : record.status} tone={record.status === "delivered" ? "success" : "danger"} />
                </div>
                <button type="button" className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setSelectedProof(record)} aria-label={`View proof for ${record.tracking_number}`}>
                  <Image src={record.secure_url} alt={`Proof photo for ${record.tracking_number}`} width={960} height={720} unoptimized className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                </button>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{record.recipient_name}</p>
                  <time className="block text-xs text-muted-foreground" dateTime={record.delivered_at}>{formatColomboDate(record.delivered_at)}</time>
                  <p className="break-words text-muted-foreground">{record.delivery_address}</p>
                </div>
                <Button type="button" variant="outline" className="mt-auto w-full" onClick={() => setSelectedProof(record)}>View Proof</Button>
              </Card>
            ))}
          </div>
        </>
      )}

      {selectedProof && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProof(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="proof-modal-title" className="relative max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proof of Delivery</p><h2 id="proof-modal-title" className="mt-1 break-all text-xl font-semibold">{selectedProof.tracking_number}</h2></div>
              <Button type="button" variant="ghost" size="sm" aria-label="Close proof image" onClick={() => setSelectedProof(null)}><X className="size-5" aria-hidden="true" />Close</Button>
            </div>
            <Image src={selectedProof.secure_url} alt={`Full proof photo for ${selectedProof.tracking_number}`} width={1200} height={900} unoptimized className="mx-auto max-h-[58dvh] w-auto max-w-full rounded-lg object-contain" />
            <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Recipient</dt><dd className="mt-0.5 font-medium">{selectedProof.recipient_name}</dd></div>
              <div><dt className="text-muted-foreground">Delivered</dt><dd className="mt-0.5 font-medium">{formatColomboDate(selectedProof.delivered_at)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Delivery address</dt><dd className="mt-0.5 font-medium">{selectedProof.delivery_address}</dd></div>
            </dl>
          </section>
        </div>
      )}

      {selectorOpen && !selectedTrackingId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectorOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="eligible-parcels-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="eligible-parcels-title" className="text-xl font-semibold">Add Delivery Proof</h2>
                <p className="mt-1 text-sm text-muted-foreground">Select a parcel that is out for delivery to confirm its delivery.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" aria-label="Close parcel selector" onClick={() => setSelectorOpen(false)}><X className="size-5" aria-hidden="true" />Close</Button>
            </div>

            <label className="relative mt-5 block min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Search eligible parcels" className="pl-9" placeholder="Search tracking number or recipient" maxLength={100} value={selectorQuery} onChange={(event) => setSelectorQuery(event.target.value)} />
            </label>

            {eligibleLoading ? (
              <div className="mt-4 space-y-3" aria-label="Loading eligible parcels">
                {[0, 1].map((item) => <Card key={item} className="space-y-3 p-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-3/4" /></Card>)}
              </div>
            ) : eligibleError ? (
              <Card className="mt-4 flex flex-col items-center gap-3 p-6 text-center">
                <AlertCircle className="size-7 text-destructive" aria-hidden="true" />
                <div><h3 className="font-semibold">Unable to load eligible parcels</h3><p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p></div>
                <Button type="button" variant="outline" onClick={() => setEligibleRefreshVersion((version) => version + 1)}>Try Again</Button>
              </Card>
            ) : matchingEligibleParcels.length === 0 ? (
              <Card className="mt-4 flex flex-col items-center gap-3 p-7 text-center">
                <Camera className="size-8 text-muted-foreground" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold">{eligibleParcels.length === 0 ? "No eligible parcels" : "No parcels match your search"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{eligibleParcels.length === 0 ? "Only parcels currently out for delivery can be confirmed here." : "Try another tracking number or recipient name."}</p>
                </div>
              </Card>
            ) : (
              <ul className="mt-4 space-y-3">
                {matchingEligibleParcels.map((parcel) => (
                  <li key={parcel.tracking_id}>
                    <Card className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-all font-semibold">{parcel.tracking_id}</h3>
                          <StatusBadge label="Out for delivery" tone="warning" />
                        </div>
                        <p className="text-sm font-medium">{parcel.customer_name}</p>
                        <p className="break-words text-sm text-muted-foreground">{parcel.address_line}</p>
                      </div>
                      <Button type="button" className="shrink-0" onClick={() => { setSelectedTrackingId(parcel.tracking_id); setSelectorOpen(false); }}>
                        Select parcel
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {selectedTrackingId && (
        <ParcelDetailsDrawer
          trackingId={selectedTrackingId}
          action="upload-proof"
          onClose={handleParcelDetailsClose}
          onStatusUpdated={handleDeliveryStatusUpdated}
          onSuccessfulDelivery={handleSuccessfulDelivery}
        />
      )}
    </div>
  );
}
