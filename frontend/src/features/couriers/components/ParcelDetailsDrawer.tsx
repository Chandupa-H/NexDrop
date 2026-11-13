"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import type { ParcelDetail, ActionType } from "../types";
import {
  deleteDeliveryProof,
  getParcelDetail,
  submitFailedDelivery,
  submitSuccessfulDelivery,
  updateParcelStatus,
  uploadDeliveryProof,
} from "../api/courier.api";
import { mapParcelDetail } from "../api/courier.mappers";
import { getNextStatuses, getStatusLabel, getStatusTone } from "../lib/status";
import { StatusBadge } from "@/components/dashboard";

interface ParcelDetailsDrawerProps {
  trackingId: string;
  action?: ActionType;
  onClose: () => void;
  onStatusUpdated: (options?: { closeDrawer?: boolean }) => void;
  onSuccessfulDelivery?: () => void;
}

/**
 * Parcel details modal shown from the courier dashboard.
 * Keeps status updates inside the parcel workflow instead of on a separate page.
 */
export function ParcelDetailsDrawer({
  trackingId,
  action,
  onClose,
  onStatusUpdated,
  onSuccessfulDelivery,
}: ParcelDetailsDrawerProps) {
  const [parcel, setParcel] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAction, setSelectedAction] = useState<"delivered" | "failed" | null>(() => {
    if (action === "upload-proof") return "delivered";
    if (action === "report-failed") return "failed";
    return null;
  });
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Report failed form
  const [failureReason, setFailureReason] = useState<string>("");
  const [failureNote, setFailureNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [proofDeleting, setProofDeleting] = useState(false);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [successConfirmed, setSuccessConfirmed] = useState(false);
  const [failureConfirmed, setFailureConfirmed] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  useEffect(() => {
    const fetchParcel = async () => {
      try {
        setLoading(true);
        setError(null);
        const dto = await getParcelDetail(trackingId);
        setParcel(mapParcelDetail(dto));
      } catch {
        setError("Failed to load parcel details");
      } finally {
        setLoading(false);
      }
    };
    fetchParcel();
  }, [trackingId]);

  useEffect(() => {
    const dialog = document.getElementById(
      "parcel-drawer"
    ) as HTMLDialogElement | null;
    if (dialog && !loading) {
      dialog.showModal();
    }
  }, [loading]);

  const handleClose = () => {
    const dialog = document.getElementById(
      "parcel-drawer"
    ) as HTMLDialogElement | null;
    if (dialog) dialog.close();
    onClose();
  };

  const handleUpdateStatus = async () => {
    if (!parcel) return;
    const [nextStatus] = getNextStatuses(parcel.status);
    if (!nextStatus) return;
    try {
      setStatusSubmitting(true);
      setResultError(null);
      const dto = await updateParcelStatus(trackingId, {
        status: nextStatus,
      });
      setParcel(mapParcelDetail(dto));
      onStatusUpdated({ closeDrawer: false });
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Failed to update parcel status.");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleReportFailed = async () => {
    if (!parcel) return;
    if (!failureReason) {
      setResultError("Select a failure reason before submitting.");
      return;
    }
    if (!failureConfirmed) {
      setResultError("Confirm that you want to record this failed delivery.");
      return;
    }
    try {
      setResultSubmitting(true);
      setResultError(null);
      const dto = await submitFailedDelivery(trackingId, {
        failure_reason: failureReason,
        note: failureNote.trim(),
        confirmed: true,
      });
      setParcel(mapParcelDetail(dto));
      setFailureReason("");
      setFailureNote("");
      setFailureConfirmed(false);
      setSelectedAction(null);
      setResultMessage("Failed delivery recorded successfully.");
      onStatusUpdated({ closeDrawer: false });
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Unable to record the failed delivery.");
    } finally {
      setResultSubmitting(false);
    }
  };

  const handleProofSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setResultError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setResultError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResultError("Proof photo must be 5 MB or smaller.");
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleRemoveProof = async () => {
    setResultError(null);
    if (proofFile) {
      setProofFile(null);
      setProofPreview(null);
      return;
    }
    if (!parcel?.deliveryProof) return;
    try {
      setProofDeleting(true);
      const dto = await deleteDeliveryProof(trackingId);
      setParcel(mapParcelDetail(dto));
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Unable to delete the proof photo.");
    } finally {
      setProofDeleting(false);
    }
  };

  const handleSuccessfulDelivery = async () => {
    if (!parcel) return;
    if (!recipientName.trim()) {
      setResultError("Enter the recipient's name before submitting.");
      return;
    }
    if (!proofFile && !parcel.deliveryProof) {
      setResultError("Upload a delivery proof photo before submitting.");
      return;
    }
    if (!successConfirmed) {
      setResultError("Confirm that the parcel was delivered to the recipient.");
      return;
    }

    try {
      setResultSubmitting(true);
      setResultError(null);
      if (proofFile) {
        setUploadProgress(0);
        const uploaded = await uploadDeliveryProof(trackingId, proofFile, setUploadProgress);
        setParcel(mapParcelDetail(uploaded.parcel));
        setProofFile(null);
        setProofPreview(null);
        setUploadProgress(null);
      }
      const dto = await submitSuccessfulDelivery(trackingId, {
        recipient_name: recipientName.trim(),
        confirmed: true,
      });
      setParcel(mapParcelDetail(dto));
      setSuccessConfirmed(false);
      setSelectedAction(null);
      setResultMessage("Delivery confirmed successfully.");
      onStatusUpdated({ closeDrawer: false });
      onSuccessfulDelivery?.();
    } catch (err) {
      setUploadProgress(null);
      setResultError(err instanceof Error ? err.message : "Unable to complete the delivery result.");
    } finally {
      setResultSubmitting(false);
    }
  };

  if (loading) {
    return (
      <dialog
        id="parcel-drawer"
        aria-labelledby="parcel-loading-title"
        onCancel={(event) => {
          event.preventDefault();
          handleClose();
        }}
        className="fixed left-1/2 top-1/2 z-50 m-0 box-border max-h-[90dvh] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto rounded-3xl border-0 bg-white shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden backdrop:bg-slate-950/60"
      >
        <div className="space-y-5 p-6 sm:p-8" role="status" aria-live="polite">
          <div className="h-28 animate-pulse rounded-2xl bg-emerald-900/90" />
          <h2 id="parcel-loading-title" className="text-sm font-medium text-slate-600">Loading parcel details…</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </dialog>
    );
  }

  if (error || !parcel) {
    return (
      <dialog
        id="parcel-drawer"
        aria-labelledby="parcel-error-title"
        onCancel={(event) => {
          event.preventDefault();
          handleClose();
        }}
        className="fixed left-1/2 top-1/2 z-50 m-0 box-border w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto rounded-3xl border-0 bg-white shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden backdrop:bg-slate-950/60"
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-slate-900 px-5 py-5 text-white sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Parcel details</p>
              <h2 id="parcel-error-title" className="mt-1 text-lg font-semibold">Unable to load parcel</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
              aria-label="Close parcel details"
            >
              ×
            </button>
          </div>
          <div role="alert" className="p-5 text-sm leading-6 text-slate-600 sm:p-6">
            {error || "Parcel not found"}
          </div>
        </div>
      </dialog>
    );
  }

  const nextStatuses = getNextStatuses(parcel.status);
  const canReportFailure = ["picked_up", "in_transit", "out_for_delivery"].includes(
    parcel.status
  );
  const canConfirmDelivery = parcel.status === "out_for_delivery";
  const isCompleted = ["delivered", "failed", "cancelled"].includes(parcel.status);
  const activeAction =
    (selectedAction === "delivered" && canConfirmDelivery) ||
    (selectedAction === "failed" && canReportFailure)
      ? selectedAction
      : null;

  return (
    <dialog
      id="parcel-drawer"
      aria-labelledby="parcel-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      className="fixed left-1/2 top-1/2 z-50 m-0 box-border max-h-[90dvh] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden backdrop:bg-slate-950/60"
    >
      <div className="min-w-0 overflow-hidden">
        <header className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-5 py-6 text-white sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/75">
                Parcel details
              </p>
              <h2 id="parcel-dialog-title" className="mt-2 break-all text-2xl font-semibold tracking-tight sm:text-3xl">
                {parcel.trackingId}
              </h2>
              <div className="mt-3">
                <StatusBadge
                  label={getStatusLabel(parcel.status)}
                  tone={getStatusTone(parcel.status)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close parcel details"
            >
              ×
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          {resultMessage && (
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {resultMessage}
            </p>
          )}

          <section aria-label="Parcel information" className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recipient</p>
              <p className="mt-2 break-words font-semibold text-slate-900">{parcel.customerName}</p>
              <p className="mt-1 text-sm text-slate-600">{parcel.customerPhoneMasked}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Drop-off</p>
              <p className="mt-2 break-words font-semibold text-slate-900">{parcel.destination}</p>
              <p className="mt-1 break-words text-sm leading-5 text-slate-600">{parcel.addressLine}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Assignment</p>
              <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <p><span className="text-slate-500">Assigned</span><span className="ml-2 font-medium text-slate-900">{parcel.assignedAtDisplay}</span></p>
                {parcel.eta && <p><span className="text-slate-500">Estimated arrival</span><span className="ml-2 font-medium text-slate-900">{parcel.eta}</span></p>}
              </div>
            </div>
          </section>

          {parcel.deliveryResult && (
            <section aria-label="Delivery result" className={`min-w-0 break-words rounded-2xl border p-4 ${parcel.deliveryResult.outcome === "failed" ? "border-rose-200 bg-rose-50/60" : "border-emerald-200 bg-emerald-50/60"}`}>
              <h3 className="font-semibold text-slate-900">
                {parcel.deliveryResult.outcome === "failed" ? "Failed delivery" : "Delivery confirmation"}
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                {parcel.deliveryResult.outcome === "failed"
                  ? `Reason: ${parcel.deliveryResult.failureReason?.replaceAll("_", " ") || "Not provided"}`
                  : `Received by ${parcel.deliveryResult.recipientName || parcel.customerName}`}
              </p>
              {parcel.deliveryResult.note && (
                <p className="mt-2 text-sm leading-5 text-slate-600">{parcel.deliveryResult.note}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {new Date(parcel.deliveryResult.recordedAt).toLocaleString()}
              </p>
            </section>
          )}

          {parcel.deliveryProof && (
            <section aria-label="Proof of delivery" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Proof of delivery</h3>
              <Image
                src={parcel.deliveryProof.secureUrl}
                alt="Proof of delivery"
                width={640}
                height={360}
                unoptimized
                className="mt-3 max-h-64 w-full rounded-xl bg-slate-50 object-contain"
              />
            </section>
          )}

          <section aria-label="Status history" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Status history</h3>
              <span className="text-xs text-slate-500">{parcel.timeline.length} {parcel.timeline.length === 1 ? "event" : "events"}</span>
            </div>
            {parcel.timeline.length > 0 ? (
              <ol className="mt-4 space-y-0">
                {parcel.timeline.map((event, idx) => (
                  <li key={`${event.status}-${event.occurredAt}-${idx}`} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < parcel.timeline.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-3 h-full w-px bg-slate-200" />}
                    <span aria-hidden="true" className="relative mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-emerald-600 bg-white" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-sm font-medium text-slate-900">{event.label}</p>
                        <p className="text-xs text-slate-500">{event.occurredAtDisplay}</p>
                      </div>
                      {event.location && <p className="mt-1 text-xs text-slate-600">{event.location}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No status history is available yet.</p>
            )}
          </section>

          {!isCompleted && (
            <section aria-label="Parcel actions" className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Courier action</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {activeAction === "delivered"
                    ? "Confirm this delivery"
                    : activeAction === "failed"
                      ? "Report a failed attempt"
                      : "Choose the next step"}
                </h3>
              </div>

              {resultError && (
                <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {resultError}
                </p>
              )}

              {!activeAction ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {nextStatuses.map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={statusSubmitting}
                      className="flex min-h-14 items-center justify-between rounded-xl bg-emerald-700 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span>{statusSubmitting ? "Updating…" : getStatusLabel(nextStatus)}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                  {canConfirmDelivery && (
                    <button
                      type="button"
                      onClick={() => {
                        setResultError(null);
                        setSelectedAction("delivered");
                      }}
                      className="min-h-14 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                    >
                      Mark as delivered
                    </button>
                  )}
                  {canReportFailure && (
                    <button
                      type="button"
                      onClick={() => {
                        setResultError(null);
                        setSelectedAction("failed");
                      }}
                      className="min-h-14 rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                    >
                      Report failed
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAction(null);
                      setResultError(null);
                    }}
                    className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  >
                    ← Back to actions
                  </button>

                  {activeAction === "delivered" && (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Recipient name</span>
                        <input
                          value={recipientName}
                          onChange={(event) => setRecipientName(event.target.value)}
                          maxLength={255}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Proof photo <span className="text-rose-600">*</span></span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleProofSelection}
                          disabled={resultSubmitting || proofDeleting}
                          className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:border-0 file:bg-slate-100 file:px-3 file:py-2.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        />
                        <span className="mt-1 block text-xs text-slate-500">JPEG, PNG or WebP, up to 5 MB.</span>
                      </label>
                      {(proofPreview || parcel.deliveryProof?.secureUrl) && (
                        <div className="rounded-xl border border-slate-200 p-2">
                          <Image
                            src={proofPreview || parcel.deliveryProof?.secureUrl || ""}
                            alt="Delivery proof preview"
                            width={640}
                            height={360}
                            unoptimized
                            className="max-h-56 w-full rounded-lg bg-slate-50 object-contain"
                          />
                          {parcel.deliveryProof && !proofFile && (
                            <button
                              type="button"
                              onClick={handleRemoveProof}
                              disabled={resultSubmitting || proofDeleting}
                              className="mt-2 text-sm font-medium text-rose-700 hover:underline disabled:opacity-50"
                            >
                              {proofDeleting ? "Removing…" : "Remove uploaded proof"}
                            </button>
                          )}
                        </div>
                      )}
                      {uploadProgress !== null && (
                        <div aria-live="polite" className="text-sm text-slate-600">
                          <div>Uploading proof… {uploadProgress}%</div>
                          <progress value={uploadProgress} max={100} className="mt-1 w-full accent-emerald-700" />
                        </div>
                      )}
                      {parcel.proofCleanupPending && (
                        <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                          The new proof is saved. Cleanup of the previous image will be retried when delivery is confirmed.
                        </p>
                      )}
                      <label className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                        <input
                          type="checkbox"
                          checked={successConfirmed}
                          onChange={(event) => setSuccessConfirmed(event.target.checked)}
                          className="mt-1 accent-emerald-700"
                        />
                        <span>I confirm this parcel was delivered to the named recipient.</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSuccessfulDelivery}
                        disabled={resultSubmitting || proofDeleting}
                        className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                      >
                        {uploadProgress !== null ? `Uploading ${uploadProgress}%…` : resultSubmitting ? "Confirming delivery…" : "Confirm delivered"}
                      </button>
                    </div>
                  )}

                  {activeAction === "failed" && (
                    <div className="space-y-4 rounded-xl border border-rose-200 bg-white p-4">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Reason for failed delivery</span>
                        <select
                          value={failureReason}
                          onChange={(event) => setFailureReason(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                        >
                          <option value="">Choose a reason</option>
                          <option value="address_not_found">Address not found</option>
                          <option value="customer_unavailable">Customer unavailable</option>
                          <option value="refused_delivery">Delivery refused</option>
                          <option value="damaged_parcel">Parcel damaged</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Details <span className="text-slate-400">(optional)</span></span>
                        <textarea
                          value={failureNote}
                          onChange={(event) => setFailureNote(event.target.value)}
                          rows={3}
                          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                          placeholder="Add details that help explain the delivery attempt."
                        />
                      </label>
                      <label className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                        <input
                          type="checkbox"
                          checked={failureConfirmed}
                          onChange={(event) => setFailureConfirmed(event.target.checked)}
                          className="mt-1 accent-rose-600"
                        />
                        <span>I confirm this delivery attempt failed for the selected reason.</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleReportFailed}
                        disabled={!failureReason || !failureConfirmed || resultSubmitting}
                        className="w-full rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resultSubmitting ? "Saving failed delivery…" : "Confirm failed delivery"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}
